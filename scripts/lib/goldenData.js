/**
 * PRATIKSHYA FASHON — Workflow golden-data capture & comparison.
 *
 * Phase 2 (workflow foundation) is a compatibility-first refactor: it must
 * not change product/media/Kids/taxonomy/storefront data. This module is the
 * single place that captures the "golden" data snapshot and compares two
 * snapshots, so the pre-implementation baseline and the post-implementation
 * audit use exactly the same lens.
 *
 * The snapshot is deliberately restricted to deterministic, identity-level
 * facts (IDs, statuses, ownership, mappings, assignments). Volatile fields
 * (updatedAt, activity timestamps, …) are never captured.
 *
 * Imported from scripts and audits only — never from application code.
 */

import catalogRepository from "../../src/services/catalogRepository.js";
import mediaRepository from "../../src/services/media/mediaRepository.js";
import taxonomyRepository from "../../src/services/taxonomyRepository.js";
import { getAllGroups } from "../../src/services/media/productMediaGroups.js";
import { getLiveStorefrontProducts } from "../../src/data/products/index.js";
import {
  CONFIRMED_KIDS_IDENTITIES,
  kidsFileNameOf,
} from "../../src/services/kidsProductIdentity.js";

const sortByKey = (list, key = "id") =>
  [...list].sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? "")));

const fileNameOf = (media) =>
  String(
    media?.currentFilename ||
      media?.fileName ||
      (media?.src || media?.url || "").split("/").pop() ||
      media?.id ||
      ""
  );

/**
 * Captures the complete workflow-relevant data state. Returns a plain JSON
 * object that can be written to disk and compared deterministically.
 */
export const captureGoldenData = () => {
  const products = catalogRepository.all();
  const media = mediaRepository.getAll();
  const storefront = getLiveStorefrontProducts();

  const productRows = products.map((product) => ({
    id: String(product.id),
    status: product.status ?? null,
    reviewState: product.review?.state ?? null,
    reviewFlags: [...(product.reviewFlags ?? [])].sort(),
    assignedEmployeeId: product.assignedEmployeeId ?? null,
    primaryMediaId: product.primaryMediaId ?? null,
    mediaIds: [...(product.mediaIds ?? [])].sort(),
    galleryMediaIds: [...(product.galleryMediaIds ?? [])].sort(),
    image: typeof product.image === "string" ? product.image : product.image?.id ?? product.image?.src ?? null,
    hoverImage:
      typeof product.hoverImage === "string"
        ? product.hoverImage
        : product.hoverImage?.id ?? product.hoverImage?.src ?? null,
    category: product.category ?? null,
    subcategory: product.subcategory ?? null,
    price: Number(product.price) || 0,
    stock: Number(product.stock ?? 0) || 0,
    availability: product.availability ?? null,
    published: product.status === "PUBLISHED",
  }));

  const mediaRows = media.map((item) => ({
    id: String(item.id),
    productId: item.productId ? String(item.productId) : null,
    scope: item.scope ?? null,
    placement: item.placement ?? null,
    status: item.status ?? null,
    type: item.type ?? null,
    role: item.role ?? null,
    fileName: fileNameOf(item),
  }));

  const kidsRows = CONFIRMED_KIDS_IDENTITIES.map((identity) => {
    const product = products.find((p) => String(p.id) === identity.productId) ?? null;
    const plate = media.find((item) => kidsFileNameOf(item) === identity.file) ?? null;
    return {
      productId: identity.productId,
      mediaFile: identity.file,
      mediaId: plate?.id ?? null,
      ownerProductId: plate?.productId ? String(plate.productId) : null,
      productExists: Boolean(product),
      status: product?.status ?? null,
      reviewState: product?.review?.state ?? null,
    };
  });

  const taxonomy = {
    categories: sortByKey(taxonomyRepository.categories()).map((entry) => ({
      id: entry.id,
      status: entry.status ?? null,
    })),
    subcategories: sortByKey(taxonomyRepository.subcategories(), "id").map((entry) => ({
      id: entry.id,
      categoryId: entry.categoryId ?? null,
      status: entry.status ?? null,
    })),
    collections: sortByKey(taxonomyRepository.collections()).map((entry) => ({
      id: entry.id,
      status: entry.status ?? null,
    })),
  };

  const marketingMedia = media
    .filter((item) => item.scope === "MARKETING")
    .map((item) => ({ id: String(item.id), placement: item.placement ?? null }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const publishedProductIds = products
    .filter((p) => p.status === "PUBLISHED")
    .map((p) => String(p.id))
    .sort();

  const storefrontProductIds = storefront.map((p) => String(p.id)).sort();

  const groups = getAllGroups()
    .map((group) => ({
      id: String(group.id),
      groupKey: group.groupKey ?? null,
      decision: group.decision ?? null,
      status: group.status ?? null,
      productId: group.productId ? String(group.productId) : null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    counts: {
      products: productRows.length,
      media: mediaRows.length,
      published: publishedProductIds.length,
      storefront: storefrontProductIds.length,
      marketingMedia: marketingMedia.length,
      kidsProducts: kidsRows.filter((row) => row.productExists).length,
    },
    products: sortByKey(productRows),
    media: sortByKey(mediaRows),
    kids: kidsRows,
    publishedProductIds,
    storefrontProductIds,
    taxonomy,
    marketingMedia,
    groups,
  };
};

/** Returns a list of human-readable difference strings between two snapshots. */
export const compareGoldenData = (baseline, current) => {
  const differences = [];

  const diffIds = (label, before, after) => {
    const b = before ?? [];
    const a = after ?? [];
    const bSet = new Set(b);
    const aSet = new Set(a);
    const removed = b.filter((id) => !aSet.has(id));
    const added = a.filter((id) => !bSet.has(id));
    if (removed.length) differences.push(`${label}: removed [${removed.join(", ")}]`);
    if (added.length) differences.push(`${label}: added [${added.join(", ")}]`);
  };

  diffIds("product IDs", baseline?.products?.map((p) => p.id), current?.products?.map((p) => p.id));
  diffIds("media IDs", baseline?.media?.map((m) => m.id), current?.media?.map((m) => m.id));
  diffIds("published product IDs", baseline?.publishedProductIds, current?.publishedProductIds);
  diffIds("storefront-visible product IDs", baseline?.storefrontProductIds, current?.storefrontProductIds);

  if (baseline?.counts?.products !== current?.counts?.products) {
    differences.push(`product count: ${baseline?.counts?.products} → ${current?.counts?.products}`);
  }
  if (baseline?.counts?.media !== current?.counts?.media) {
    differences.push(`media count: ${baseline?.counts?.media} → ${current?.counts?.media}`);
  }

  const productById = new Map((current?.products ?? []).map((p) => [p.id, p]));
  for (const before of baseline?.products ?? []) {
    const after = productById.get(before.id);
    if (!after) continue;
    for (const field of [
      "status",
      "reviewState",
      "assignedEmployeeId",
      "primaryMediaId",
      "category",
      "subcategory",
      "price",
      "stock",
      "availability",
      "published",
    ]) {
      if (String(before[field] ?? "") !== String(after[field] ?? "")) {
        differences.push(
          `product ${before.id} .${field}: ${JSON.stringify(before[field])} → ${JSON.stringify(after[field])}`
        );
      }
    }
    if (JSON.stringify(before.reviewFlags) !== JSON.stringify(after.reviewFlags)) {
      differences.push(
        `product ${before.id} .reviewFlags: ${JSON.stringify(before.reviewFlags)} → ${JSON.stringify(after.reviewFlags)}`
      );
    }
    if (JSON.stringify(before.mediaIds) !== JSON.stringify(after.mediaIds)) {
      differences.push(`product ${before.id} .mediaIds changed`);
    }
    if (JSON.stringify(before.galleryMediaIds) !== JSON.stringify(after.galleryMediaIds)) {
      differences.push(`product ${before.id} .galleryMediaIds changed`);
    }
    if (JSON.stringify(before.image) !== JSON.stringify(after.image)) {
      differences.push(`product ${before.id} .image changed`);
    }
    if (JSON.stringify(before.hoverImage) !== JSON.stringify(after.hoverImage)) {
      differences.push(`product ${before.id} .hoverImage changed`);
    }
  }

  const mediaById = new Map((current?.media ?? []).map((m) => [m.id, m]));
  for (const before of baseline?.media ?? []) {
    const after = mediaById.get(before.id);
    if (!after) continue;
    for (const field of ["productId", "scope", "placement", "status", "type", "role", "fileName"]) {
      if (String(before[field] ?? "") !== String(after[field] ?? "")) {
        differences.push(
          `media ${before.id} .${field}: ${JSON.stringify(before[field])} → ${JSON.stringify(after[field])}`
        );
      }
    }
  }

  for (let index = 0; index < (baseline?.kids ?? []).length; index += 1) {
    const before = baseline.kids[index];
    const after = current?.kids?.[index];
    if (!after) {
      differences.push(`Kids row ${index}: missing in current snapshot`);
      continue;
    }
    for (const field of [
      "productId",
      "mediaFile",
      "mediaId",
      "ownerProductId",
      "productExists",
      "status",
      "reviewState",
    ]) {
      if (String(before[field] ?? "") !== String(after[field] ?? "")) {
        differences.push(
          `Kids ${before.productId} .${field}: ${JSON.stringify(before[field])} → ${JSON.stringify(after[field])}`
        );
      }
    }
  }

  const flat = (list, keys) =>
    JSON.stringify((list ?? []).map((entry) => keys.map((key) => entry[key])));
  if (flat(baseline?.taxonomy?.categories, ["id", "status"]) !== flat(current?.taxonomy?.categories, ["id", "status"])) {
    differences.push("taxonomy categories changed");
  }
  if (
    flat(baseline?.taxonomy?.subcategories, ["id", "categoryId", "status"]) !==
    flat(current?.taxonomy?.subcategories, ["id", "categoryId", "status"])
  ) {
    differences.push("taxonomy subcategories changed");
  }
  if (flat(baseline?.taxonomy?.collections, ["id", "status"]) !== flat(current?.taxonomy?.collections, ["id", "status"])) {
    differences.push("taxonomy collections changed");
  }
  if (flat(baseline?.marketingMedia, ["id", "placement"]) !== flat(current?.marketingMedia, ["id", "placement"])) {
    differences.push("marketing media changed");
  }
  if (flat(baseline?.groups, ["id", "groupKey", "decision", "status", "productId"]) !== flat(current?.groups, ["id", "groupKey", "decision", "status", "productId"])) {
    differences.push("media group decisions changed");
  }

  return differences;
};

export const goldenDataOK = (differences) => differences.length === 0;
