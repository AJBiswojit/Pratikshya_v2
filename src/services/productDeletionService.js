/**
 * PRATIKSHYA FASHON — Safe product deletion service (Phase 3F).
 *
 * "Delete" in this architecture is a lifecycle decision, not a row drop.
 *
 *   ACTIVE PRODUCT ──▶ ARCHIVE / RETIRE ──▶ no longer storefront-visible
 *
 * Archiving is the default retirement path and already exists as the
 * canonical `archiveProduct` workflow command. PERMANENT deletion is a
 * separate, far narrower door that this service owns:
 *
 *   · Super Admin only (resolved from the principal register)
 *   · the product must be a DRAFT that never reached the storefront
 *   · no orders reference it
 *   · no inventory records or stock movements reference it
 *   · no customer reviews stand against it
 *   · no business lifecycle history (submit/approve/publish/archive)
 *   · the caller re-types the Product ID as an explicit confirmation
 *
 * Media is never physically deleted by deleting a product. Owned media
 * records are detached back to the UNASSIGNED library so the photographs
 * remain available and no other product can silently inherit them.
 * Marketing media is never touched.
 *
 * Everything else — publishing, archiving, restoring — stays with the
 * canonical workflow command service. This module adds no second
 * lifecycle; it adds the one missing terminal decision with its
 * dependency rules in a single place.
 */

import catalogRepository, { PRODUCT_STATUS } from "./catalogRepository.js";
import mediaRepository from "./media/mediaRepository.js";
import { unassignMediaFromProduct } from "./media/mediaOwnershipService.js";
import { MEDIA_SCOPES } from "../config/mediaTypes.js";
import { resolvePrincipal } from "./workflow/productWorkflowCommands.js";
import { ORDERS_STORAGE_KEY } from "./orders/orderService.js";
import { INVENTORY_STORAGE_KEYS } from "./inventory/inventoryRepository.js";
import { readStorage } from "../utils/shopping.js";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "./employees/activityService.js";

/**
 * Lifecycle/business events that prove a product has a history worth
 * keeping. Expressed as a PATTERN, not by naming the canonical actions —
 * this module only READS the diary; the workflow command service remains
 * the sole producer of these events.
 */
const BLOCKING_ACTIVITY_PATTERN =
  /^(PRODUCT_(SUBMITTED|APPROVED|REJECTED|PUBLISHED|UNPUBLISHED|ARCHIVED|RESTORED)(_\w+)?|INVENTORY_MOVEMENT|RETURN_\w+)$/;

const note = (action, summary, actor, productId = null) => {
  try {
    recordActivity(loadActivity(), {
      ...describeActor(actor),
      targetProductId: productId,
      action,
      summary,
    });
  } catch {
    /* The diary is an enhancement; a failure never blocks. */
  }
};

const adminOnly = (principal) => {
  const resolved = resolvePrincipal(principal);
  if (!resolved.ok) return { ok: false, error: resolved.message, code: resolved.code };
  if (resolved.principal.kind !== "admin") {
    return {
      ok: false,
      error: "Only a Super Admin can retire or delete products.",
      code: "FORBIDDEN",
    };
  }
  return { ok: true, principal: resolved.principal };
};

/* ------------------------------------------------------------------ */
/* Dependency inspection (read-only)                                   */
/* ------------------------------------------------------------------ */

/** Orders that reference the product — read directly, without seeding demo data. */
const orderReferences = (productId) => {
  const orders = readStorage(ORDERS_STORAGE_KEY, null);
  if (!Array.isArray(orders)) return [];
  const id = String(productId);
  return orders.filter((order) =>
    (order?.items ?? []).some((item) => String(item?.productId ?? "") === id)
  );
};

const inventoryReferences = (productId) => {
  const id = String(productId);
  const rows = readStorage(INVENTORY_STORAGE_KEYS.INVENTORY, null);
  const movements = readStorage(INVENTORY_STORAGE_KEYS.MOVEMENTS, null);
  return {
    records: Array.isArray(rows)
      ? rows.filter((row) => String(row?.productId ?? "") === id)
      : [],
    movements: Array.isArray(movements)
      ? movements.filter((row) => String(row?.productId ?? "") === id)
      : [],
  };
};

const blockingActivity = (productId) => {
  const id = String(productId);
  try {
    return loadActivity().filter(
      (entry) =>
        String(entry?.targetProductId ?? "") === id &&
        BLOCKING_ACTIVITY_PATTERN.test(String(entry.action ?? ""))
    );
  } catch {
    return [];
  }
};

const ownedMediaOf = (productId) => {
  const id = String(productId);
  return mediaRepository
    .getAll()
    .filter(
      (media) => media.scope === MEDIA_SCOPES.PRODUCT && String(media.productId ?? "") === id
    );
};

/**
 * The full dependency picture for one product. Read-only; safe to render.
 */
export const getProductDependencies = (productId) => {
  const product = catalogRepository.find(productId);
  if (!product) return null;

  const orders = orderReferences(product.id);
  const inventory = inventoryReferences(product.id);
  const activity = blockingActivity(product.id);
  const ownedMedia = ownedMediaOf(product.id);
  const everPublished = Boolean(product.publishedAt) || product.status === PRODUCT_STATUS.PUBLISHED;

  return {
    productId: product.id,
    name: product.name,
    status: product.status,
    everPublished,
    orders: orders.length,
    inventoryRecords: inventory.records.length,
    inventoryMovements: inventory.movements.length,
    reviews: Number(product.reviewCount ?? 0),
    lifecycleEvents: activity.length,
    ownedMedia: ownedMedia.map((media) => ({
      id: media.id,
      fileName:
        media.currentFilename ||
        media.fileName ||
        (media.url || "").split("/").pop() ||
        media.id,
      role: media.role ?? null,
    })),
  };
};

/**
 * What may the admin do with this product right now?
 *
 *   { canArchive, canRestore, canDelete, deleteBlockers: [...] }
 *
 * Every blocker is a human-readable sentence, so the UI simply lists them.
 */
export const getProductLifecycleOptions = (productId) => {
  const product = catalogRepository.find(productId);
  if (!product) return null;
  const deps = getProductDependencies(productId);

  const blockers = [];
  if (product.status === PRODUCT_STATUS.PUBLISHED) {
    blockers.push("The product is live on the storefront — unpublish or archive it instead.");
  } else if (product.status !== PRODUCT_STATUS.DRAFT) {
    blockers.push(`The product is ${product.status} — only an untouched draft can be deleted.`);
  }
  if (deps.everPublished && product.status !== PRODUCT_STATUS.PUBLISHED) {
    blockers.push("The product has been published before — archive it to preserve history.");
  }
  if (deps.orders > 0) {
    blockers.push(`${deps.orders} order(s) reference this product — archive only.`);
  }
  if (deps.reviews > 0) {
    blockers.push(`${deps.reviews} customer review(s) stand against this product — archive only.`);
  }
  if (deps.inventoryRecords > 0 || deps.inventoryMovements > 0) {
    blockers.push("Inventory records or stock movements reference this product — archive only.");
  }
  if (deps.lifecycleEvents > 0) {
    blockers.push(
      `${deps.lifecycleEvents} workflow/business event(s) are recorded for this product — archive only.`
    );
  }

  return {
    productId: product.id,
    name: product.name,
    status: product.status,
    canArchive:
      product.status !== PRODUCT_STATUS.ARCHIVED,
    canRestore: product.status === PRODUCT_STATUS.ARCHIVED,
    canDelete: blockers.length === 0,
    deleteBlockers: blockers,
    dependencies: deps,
  };
};

/* ------------------------------------------------------------------ */
/* The permanent-delete command                                        */
/* ------------------------------------------------------------------ */

/**
 * Permanently removes a dependency-free DRAFT from the register.
 *
 * Requires `confirmProductId` to equal the Product ID exactly — the UI
 * asks the admin to re-type it. Owned media records are detached back to
 * the UNASSIGNED library (never physically deleted, never reassigned to
 * another product). Records the one PRODUCT_DELETED diary event.
 */
export const deleteProductPermanently = ({
  productId,
  confirmProductId = null,
  principal = null,
  actor = null,
} = {}) => {
  const auth = adminOnly(principal);
  if (!auth.ok) return auth;

  const product = catalogRepository.find(productId);
  if (!product) return { ok: false, error: "Product not found." };

  if (String(confirmProductId ?? "").trim() !== String(product.id)) {
    return {
      ok: false,
      error: `Type the Product ID (${product.id}) to confirm permanent deletion.`,
      code: "CONFIRMATION_REQUIRED",
    };
  }

  const options = getProductLifecycleOptions(product.id);
  if (!options.canDelete) {
    return {
      ok: false,
      error: options.deleteBlockers[0] ?? "This product cannot be deleted.",
      blockers: options.deleteBlockers,
      code: "DELETE_BLOCKED",
    };
  }

  /* Detach owned media to the library THROUGH the canonical ownership
     service — preserve the assets, free the ownership. Nothing physical is
     removed, nothing is reassigned to another product. */
  const detached = [];
  ownedMediaOf(product.id).forEach((media) => {
    const freed = unassignMediaFromProduct({
      mediaId: media.id,
      principal: auth.principal.actor ?? principal,
      actor: actor ?? auth.principal.actor,
    });
    if (freed.ok) detached.push(media.id);
  });

  const removed = catalogRepository.removeProductRecord(product.id);
  if (!removed.ok) return removed;

  note(
    ACTIVITY_ACTIONS.PRODUCT_DELETED,
    `Permanently deleted draft ${product.id} · ${product.name}${
      detached.length ? ` (released ${detached.length} media asset(s) to the library)` : ""
    }`,
    actor ?? auth.principal.actor,
    product.id
  );

  return { ok: true, productId: product.id, releasedMediaIds: detached };
};

export default {
  getProductDependencies,
  getProductLifecycleOptions,
  deleteProductPermanently,
};
