/**
 * PRATIKSHYA FASHON — Media ownership service (Phase 2, Step E).
 *
 * The ONE safe command boundary for media ownership changes. Ordinary
 * callers must not perform dangerous cross-product reassignment directly;
 * this service centralizes:
 *
 *   1. authenticate the actor (admin principal — register lookup)
 *   2. authorize the operation (Super Admin for ownership changes)
 *   3. validate source and target products
 *   4. apply identity locks (confirmed Kids plates KID-001…KID-021)
 *   5. enforce marketing ↔ product scope isolation
 *   6. require an explicit transfer confirmation for contested reassignment
 *   7. update ownership (one owner per asset)
 *   8. clean stale previous-owner authored claims
 *   9. preserve audit history (shared activity diary)
 *  10. revalidate both products (read-only report)
 *
 * During Phase 2 NO ownership data is changed by introducing this service —
 * it is the future authoritative door. Existing lower-level repository
 * methods (`mediaRepository.assignToProduct`, …) remain temporarily as
 * internal compatibility methods until every caller migrates.
 *
 * SECURITY NOTE — frontend/localStorage demo. Backend enforcement remains
 * required when the backend is introduced.
 */

import mediaRepository from "./mediaRepository.js";
import catalogRepository from "../catalogRepository.js";
import {
  MEDIA_SCOPES,
  PRODUCT_MEDIA_ROLES,
  isVideo,
} from "../../config/mediaTypes.js";
import { isConfirmedKidsProductId, kidsProductIdForFile, kidsMediaFileForProductId } from "../kidsProductIdentity.js";
import { checkCategoryMediaSafety, isMarketingFileName } from "./mediaCategorySafety.js";
import { getProductMediaSet } from "./productMediaSet.js";
import { validateProductForPublish } from "../workflow/productPublishValidator.js";
import { resolvePrincipal } from "../workflow/productWorkflowCommands.js";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../employees/activityService.js";

const nowIso = () => new Date().toISOString();

const fileNameOf = (media) =>
  String(
    media?.currentFilename ||
      media?.fileName ||
      (media?.src || media?.url || "").split("/").pop() ||
      media?.id ||
      ""
  );

const identityMatcher =
  (identityKeys) =>
  (value) => {
    if (!value) return false;
    const id = typeof value === "string" ? value : value?.id ?? value?.src ?? "";
    return identityKeys.has(String(id));
  };

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
  if (!resolved.ok) {
    return { ok: false, error: resolved.message, code: resolved.code };
  }
  if (resolved.principal.kind !== "admin") {
    return {
      ok: false,
      error: "Employee identities cannot change media ownership.",
      code: "FORBIDDEN",
    };
  }
  return { ok: true, principal: resolved.principal };
};

const assertProductTarget = (targetProductId) => {
  const product = catalogRepository.find(targetProductId);
  if (!product) {
    return { ok: false, error: "Target product not found." };
  }
  return { ok: true, product };
};

/** Revalidates a product (read-only) and summarizes the result. */
const revalidateProduct = (product) => {
  if (!product) return null;
  const validation = validateProductForPublish(product, {});
  return {
    productId: product.id,
    ok: validation.ok,
    blocking: validation.blocking.map((issue) => issue.message),
  };
};

/**
 * Validates one ownership operation before touching the register.
 * Returns either { ok: true, ... } or { ok: false, error }.
 */
const validateOwnershipChange = ({ media, targetProductId, product, confirm, op }) => {
  if (!media) return { ok: false, error: "Media not found." };

  /* Marketing isolation — MARKETING → PRODUCT requires an explicit
     authorized command; in Phase 2 it is refused outright. */
  if (media.scope === MEDIA_SCOPES.MARKETING) {
    return {
      ok: false,
      error: `${fileNameOf(media)} is marketing-scoped — marketing media cannot become product media without an explicit authorized command.`,
    };
  }
  if (op !== "assign" && media.scope === MEDIA_SCOPES.UNASSIGNED && !media.productId) {
    return { ok: false, error: `${fileNameOf(media)} is not assigned to any product.` };
  }

  /* Phase 3F — house/hero artwork is marketing photography by identity.
     A NEW assignment of it as product media is refused outright; legacy
     product-scoped house plates keep their existing ownership and can
     still be detached or renamed with their product. */
  if (op === "assign" && targetProductId && isMarketingFileName(fileNameOf(media))) {
    return {
      ok: false,
      error: `${fileNameOf(media)} is house/marketing artwork — marketing imagery cannot become product media.`,
    };
  }

  /* Phase 3F — category ↔ media-family safety. A men's product can never
     own bangle photography, innerwear can never own saree photography, and
     so on. Filenames are judged only where the ingested naming convention
     applies; unnamed scratch/studio files are not guessed at. On a rename
     the target record does not exist yet — the unchanged source category
     is validated instead. */
  if (targetProductId) {
    const targetRecord = catalogRepository.find(targetProductId);
    const targetCategory = targetRecord?.category ?? product?.category ?? null;
    if (targetCategory) {
      const safety = checkCategoryMediaSafety(fileNameOf(media), targetCategory);
      if (!safety.ok) {
        return { ok: false, error: safety.reason, code: "CATEGORY_MEDIA_MISMATCH" };
      }
    }
  }

  /* Confirmed Kids plate lock — kids-002.webp may never become KID-001's
     media, and a KID product can only own its own plate. */
  const confirmedOwner = kidsProductIdForFile(fileNameOf(media));
  if (
    confirmedOwner &&
    String(targetProductId ?? "").toUpperCase() !== confirmedOwner
  ) {
    return {
      ok: false,
      error: `${fileNameOf(media)} is the confirmed media of ${confirmedOwner} — it cannot be transferred to ${targetProductId}.`,
      confirmedOwnerProductId: confirmedOwner,
    };
  }
  if (targetProductId && isConfirmedKidsProductId(targetProductId)) {
    const expected = kidsMediaFileForProductId(targetProductId);
    if (expected && fileNameOf(media) !== expected) {
      return {
        ok: false,
        error: `${targetProductId} may only own its confirmed plate ${expected}, not ${fileNameOf(media)}.`,
      };
    }
  }

  /* Contested reassignment requires explicit confirmation. */
  if (
    op === "transfer" &&
    media.productId &&
    String(media.productId) !== String(targetProductId) &&
    !confirm
  ) {
    return {
      ok: false,
      error: "MEDIA_ALREADY_ASSIGNED",
      media,
      ownerProductId: media.productId,
      ownerProductName: product?.name ?? null,
      ownerProductStatus: product?.status ?? null,
      message: "Reassigning owned media requires explicit confirmation.",
    };
  }

  return { ok: true };
};

/**
 * Phase 3C — READ-ONLY preflight for a transfer. Runs exactly the same
 * ownership rules the transfer command runs (Kids plate lock, marketing
 * isolation, contested confirmation) but writes nothing, so a caller that
 * must move several assets atomically — e.g. a Product ID rename — can
 * refuse the whole operation before any part of it persists.
 *
 * It deliberately reuses `validateOwnershipChange`: there is one ownership
 * rule set, not a second copy for preflight.
 */
export const validateMediaOwnershipTransfer = ({
  mediaId,
  targetProductId,
  principal = null,
  confirm = false,
  requireTargetProduct = true,
} = {}) => {
  const auth = adminOnly(principal);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  const media = mediaRepository.getById(mediaId);
  if (!media) return { ok: false, error: "Media not found." };

  if (requireTargetProduct) {
    const target = assertProductTarget(targetProductId);
    if (!target.ok) return target;
  }

  const previousOwnerId = media.productId ? String(media.productId) : null;
  const owner = previousOwnerId ? catalogRepository.find(previousOwnerId) : null;

  return validateOwnershipChange({
    media,
    targetProductId,
    product: owner,
    confirm,
    op: "transfer",
  });
};

/**
 * The safe transfer command. Moves media ownership to another product,
 * strips the previous owner's stale authored references, records the
 * transfer in the shared diary and revalidates both products.
 */
export const transferMediaOwnership = ({
  mediaId,
  targetProductId,
  principal = null,
  confirm = false,
  actor = null,
} = {}) => {
  const auth = adminOnly(principal);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  const media = mediaRepository.getById(mediaId);
  if (!media) return { ok: false, error: "Media not found." };
  const target = assertProductTarget(targetProductId);
  if (!target.ok) return target;

  const previousOwnerId = media.productId ? String(media.productId) : null;
  const owner = previousOwnerId ? catalogRepository.find(previousOwnerId) : null;

  const check = validateOwnershipChange({
    media,
    targetProductId,
    product: owner,
    confirm,
    op: "transfer",
  });
  if (!check.ok) return check;

  const moving = previousOwnerId !== null && previousOwnerId !== String(targetProductId);
  const moved = mediaRepository.assignToProduct(mediaId, targetProductId, null, {
    confirmReassign: true,
  });
  if (!moved) return { ok: false, error: "Could not reassign media." };

  let previousOwnerStripped = false;
  if (moving && previousOwnerId) {
    if (owner) {
      const identityKeys = new Set(
        [moved.id, moved.fileName, moved.currentFilename, moved.originalFilename, moved.url]
          .filter(Boolean)
          .map((value) => String(value))
      );
      const matches = identityMatcher(identityKeys);
      const patch = {};
      if (owner.image != null && matches(owner.image)) patch.image = undefined;
      if (owner.hoverImage != null && matches(owner.hoverImage)) patch.hoverImage = undefined;
      if (Array.isArray(owner.additionalImages)) {
        patch.additionalImages = owner.additionalImages.filter((entry) => !matches(entry));
      }
      patch.reviewFlags = [...new Set([...(owner.reviewFlags ?? []), "MEDIA_OWNERSHIP_MOVED"])];
      /* Phase 3E — this strip is part of the ONE transfer action; the
         PRODUCT_MEDIA_TRANSFERRED event below is its activity record.
         A generic PRODUCT_EDITED here would double-log the transfer. */
      catalogRepository.updateProduct(previousOwnerId, patch, auth.principal.actor ?? actor, {
        activity: null,
      });
      previousOwnerStripped = true;
    }
  }

  note(
    ACTIVITY_ACTIONS.PRODUCT_MEDIA_TRANSFERRED,
    `Transferred ${fileNameOf(moved)} ${previousOwnerId ? `from ${previousOwnerId}` : "from the library"} to ${targetProductId}`,
    actor ?? auth.principal.actor,
    targetProductId
  );

  return {
    ok: true,
    media: moved,
    previousOwnerId,
    previousOwnerStripped,
    revalidation: {
      target: revalidateProduct(target.product),
      previousOwner: revalidateProduct(owner),
    },
  };
};

/**
 * Initial mapping: attaches UNASSIGNED media to a product. Admin-only.
 * Refuses marketing media and confirmed Kids cross-plate assignments.
 */
export const assignMediaToProduct = ({
  mediaId,
  productId,
  role = null,
  principal = null,
  actor = null,
} = {}) => {
  const auth = adminOnly(principal);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  const media = mediaRepository.getById(mediaId);
  if (!media) return { ok: false, error: "Media not found." };
  const target = assertProductTarget(productId);
  if (!target.ok) return target;

  if (media.productId && String(media.productId) !== String(productId)) {
    return {
      ok: false,
      error: "MEDIA_ALREADY_ASSIGNED",
      ownerProductId: media.productId,
      message: "This media is already owned by another product — use the safe transfer command with confirmation.",
    };
  }

  const check = validateOwnershipChange({ media, targetProductId: productId, product: null, confirm: true, op: "assign" });
  if (!check.ok) return check;

  /* A video can never become the cover. */
  const safeRole =
    role ??
    (isVideo(media) ? PRODUCT_MEDIA_ROLES.PRODUCT_VIDEO : null);

  const attached = mediaRepository.assignToProduct(mediaId, productId, safeRole, {
    confirmReassign: true,
  });
  if (!attached) return { ok: false, error: "Could not assign media." };

  note(
    ACTIVITY_ACTIONS.PRODUCT_MEDIA_TRANSFERRED,
    `Assigned ${fileNameOf(attached)} to ${productId}`,
    actor ?? auth.principal.actor,
    productId
  );

  return {
    ok: true,
    media: attached,
    revalidation: { target: revalidateProduct(target.product) },
  };
};

/** Detaches media from its product back to the unassigned library. Admin-only. */
export const unassignMediaFromProduct = ({ mediaId, principal = null, actor = null } = {}) => {
  const auth = adminOnly(principal);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  const media = mediaRepository.getById(mediaId);
  if (!media) return { ok: false, error: "Media not found." };
  const previousOwnerId = media.productId ? String(media.productId) : null;
  if (!previousOwnerId) return { ok: true, media, alreadyUnassigned: true };

  const owner = catalogRepository.find(previousOwnerId);
  const detached = mediaRepository.assignToProduct(mediaId, null);
  if (!detached) return { ok: false, error: "Could not detach media." };

  if (owner) {
    const identityKeys = new Set(
      [media.id, media.fileName, media.currentFilename, media.originalFilename, media.url]
        .filter(Boolean)
        .map((value) => String(value))
    );
    const matches = identityMatcher(identityKeys);
    const patch = {};
    if (owner.image != null && matches(owner.image)) patch.image = undefined;
    if (owner.hoverImage != null && matches(owner.hoverImage)) patch.hoverImage = undefined;
    if (Array.isArray(owner.additionalImages)) {
      patch.additionalImages = owner.additionalImages.filter((entry) => !matches(entry));
    }
    patch.reviewFlags = [...new Set([...(owner.reviewFlags ?? []), "MEDIA_UNASSIGNED"])];
    /* Phase 3E — the PRODUCT_MEDIA_UNASSIGNED event below is the ONE
       activity record for this action; no generic PRODUCT_EDITED beside it. */
    catalogRepository.updateProduct(previousOwnerId, patch, auth.principal.actor ?? actor, {
      activity: null,
    });
  }

  note(
    ACTIVITY_ACTIONS.PRODUCT_MEDIA_UNASSIGNED,
    `Unassigned ${fileNameOf(detached)} from ${previousOwnerId}`,
    actor ?? auth.principal.actor,
    previousOwnerId
  );

  return {
    ok: true,
    media: detached,
    previousOwnerId,
    revalidation: { previousOwner: revalidateProduct(owner) },
  };
};

/** Read-only: the canonical media set + ownership facts for one product. */
export const getOwnershipView = (product) => {
  if (!product) return null;
  return {
    productId: product.id,
    mediaSet: getProductMediaSet(product),
    registerOwned: mediaRepository
      .getAll()
      .filter((item) => item.scope === MEDIA_SCOPES.PRODUCT && String(item.productId ?? "") === String(product.id))
      .map((item) => ({ id: item.id, fileName: fileNameOf(item), role: item.role, status: item.status })),
  };
};

export default {
  transferMediaOwnership,
  validateMediaOwnershipTransfer,
  assignMediaToProduct,
  unassignMediaFromProduct,
  getOwnershipView,
};
