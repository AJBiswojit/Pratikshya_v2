/**
 * PRATIKSHYA FASHON — Kids category validator (Phase 2, Step C).
 *
 * Kids is NOT a second workflow. Kids products travel the SAME canonical
 * lifecycle and the SAME universal publish validator as every other
 * category. This module is a category plug-in: it adds Kids-specific
 * validation rules to the universal result.
 *
 * The immutable plate protection applies ONLY to the confirmed legacy
 * identities KID-001 … KID-021 (kids-001.webp … kids-021.webp). Future Kids
 * products that are not part of the confirmed 21 do NOT inherit the plate
 * lock — they keep the shared mapping/ownership rules plus the Kids
 * category rules (name, subcategory, inventory, no foreign department
 * metadata).
 *
 * Returned issues share the universal issue shape:
 *   { code, section, message, severity, blocksPublish, source }
 */

import taxonomyRepository from "../taxonomyRepository.js";
import mediaRepository from "../media/mediaRepository.js";
import { getProductMediaSet } from "../media/productMediaSet.js";
import { MEDIA_SCOPES } from "../../config/mediaTypes.js";
import {
  getGroupById,
  createGroup,
  setGroupDecision,
  setGroupProduct,
  GROUP_DECISIONS,
} from "../media/productMediaGroups.js";
import {
  isConfirmedKidsProductId,
  isKidsProductId,
  kidsFileNameOf,
  kidsMediaFileForProductId,
  kidsProductIdForFile,
  kidsNameLooksForeign,
  kidsSubcategoryLooksForeign,
  confirmedKidsIdentityFor,
  wouldMergeConfirmedKids,
} from "../kidsProductIdentity.js";

export const KIDS_VALIDATOR_SOURCE = "KIDS";
const kidsGroupIdFor = (productId) => `kids-confirmed-${String(productId).toLowerCase()}`;

/** Is the confirmed SEPARATE_PRODUCT decision on record for this product? */
export const kidsIdentityConfirmed = (productId) => {
  if (!isConfirmedKidsProductId(productId)) return false;
  const group = getGroupById(kidsGroupIdFor(productId));
  return group?.decision === GROUP_DECISIONS.SEPARATE_PRODUCTS;
};

/**
 * Records the system-owned SEPARATE_PRODUCT decision for a confirmed Kids
 * identity when it is missing — exactly the self-heal the legacy Kids
 * finalization performs on read. The decision is a house invariant, not an
 * admin task, so only a genuine persistence failure may block publishing on
 * it. Additive and idempotent; never changes identity, media or ownership.
 */
export const ensureKidsIdentityRecorded = (productId, identity = null) => {
  if (!isConfirmedKidsProductId(productId)) return false;
  if (kidsIdentityConfirmed(productId)) return false;
  const entry = identity ?? confirmedKidsIdentityFor(productId);
  if (!entry) return false;
  const groupId = kidsGroupIdFor(productId);
  const existing = getGroupById(groupId);
  const media = mediaRepository
    .getAll()
    .find((item) => kidsFileNameOf(item) === entry.file) ?? null;
  if (!existing) {
    createGroup(
      {
        id: groupId,
        groupKey: entry.groupKey,
        label: `${productId} · ${entry.file}`,
        mediaIds: media ? [media.id] : [],
        productId,
        source: "MANUAL",
        reason:
          "Phase 22.2 — confirmed by the house: one Kids media asset is one separate Kids product.",
      },
      "Kids validator"
    );
  }
  setGroupDecision(groupId, GROUP_DECISIONS.SEPARATE_PRODUCTS, "Kids validator");
  setGroupProduct(groupId, productId, "Kids validator");
  return true;
};

/** A product the Kids validator is responsible for. */
export const isKidsProduct = (product) =>
  Boolean(
    product &&
      (isConfirmedKidsProductId(product.id) ||
        isKidsProductId(product.id) ||
        product.category === "kidswear")
  );

/** Valid Kids inventory: a positive stock count or explicit made-to-order. */
export const kidsInventoryValid = (product) => {
  if (!product) return false;
  const stock = Number(product.stock ?? 0);
  if (!Number.isFinite(stock) || stock < 0) return false;
  if (product.availability === "made-to-order") return true;
  return stock > 0;
};

/** A subcategory that exists in the Kids taxonomy and is not foreign. */
export const kidsSubcategoryValid = (product) => {
  const value = String(product?.subcategory ?? "").trim();
  if (!value) return false;
  if (kidsSubcategoryLooksForeign(value)) return false;
  try {
    const options = taxonomyRepository.subcategoryOptionsFor("kidswear") ?? [];
    if (!options.length) return true;
    return options.some((option) => String(option).toLowerCase() === value.toLowerCase());
  } catch {
    return true;
  }
};

/**
 * Media owned by a product in the register — the owner side of the
 * one-plate rule (a KID product must never own another KID's plate).
 */
const ownedPlateIssues = (product) => {
  const issues = [];
  const expected = kidsMediaFileForProductId(product.id);
  mediaRepository
    .getAll()
    .filter((media) => media.scope === MEDIA_SCOPES.PRODUCT && String(media.productId ?? "") === String(product.id))
    .forEach((media) => {
      const file = kidsFileNameOf(media);
      const belongsTo = kidsProductIdForFile(file);
      if (belongsTo && belongsTo !== product.id) {
        issues.push({
          code: "KIDS_CROSS_PRODUCT_OWNERSHIP",
          section: "category",
          message: `${product.id} owns ${file}, which is the confirmed media of ${belongsTo}.`,
          severity: "error",
          blocksPublish: true,
          source: KIDS_VALIDATOR_SOURCE,
        });
      }
      if (expected && file === expected && String(media.productId ?? "") !== String(product.id)) {
        /* The register side is owned elsewhere — covered by the universal
           ownership conflict; only surface here when the plate is missing. */
      }
    });
  return issues;
};

/**
 * Kids-specific publish validation. Returns an array of universal-shaped
 * issues; an empty array means the Kids category rules hold.
 */
export const validateKidsProduct = (product, context = {}) => {
  const issues = [];
  if (!product) return issues;
  if (!isKidsProduct(product)) return issues;

  const confirmed = isConfirmedKidsProductId(product.id);
  const expected = kidsMediaFileForProductId(product.id);
  const set = getProductMediaSet(product);

  /* 1. Category must be Kids Wear for every Kids record. */
  if (product.category !== "kidswear") {
    issues.push({
      code: "KIDS_CATEGORY_MISMATCH",
      section: "category",
      message: `Category must be Kids Wear — ${product.id} is currently “${product.category || "unset"}”.`,
      severity: "error",
      blocksPublish: true,
      source: KIDS_VALIDATOR_SOURCE,
    });
  }

  /* 2. Name must read like a Kids product (no foreign department words). */
  if (kidsNameLooksForeign(product.name)) {
    issues.push({
      code: "KIDS_NAME_FOREIGN",
      section: "category",
      message: `NAME REVIEW REQUIRED — “${product.name}” reads like another department's product, not a Kids product.`,
      severity: "error",
      blocksPublish: true,
      source: KIDS_VALIDATOR_SOURCE,
    });
  }

  /* 3. Subcategory: present, valid in the Kids taxonomy, not foreign. */
  const subcategory = String(product.subcategory ?? "").trim();
  if (!subcategory) {
    issues.push({
      code: "KIDS_SUBCATEGORY_REQUIRED",
      section: "category",
      message: "SUBCATEGORY REVIEW REQUIRED — choose a Kids Wear subcategory before publishing.",
      severity: "error",
      blocksPublish: true,
      source: KIDS_VALIDATOR_SOURCE,
    });
  } else if (!kidsSubcategoryValid(product)) {
    issues.push({
      code: "KIDS_SUBCATEGORY_INVALID",
      section: "category",
      message:
        "SUBCATEGORY REVIEW REQUIRED — choose a valid Kids Wear subcategory from the existing taxonomy.",
      severity: "error",
      blocksPublish: true,
      source: KIDS_VALIDATOR_SOURCE,
    });
  }

  /* 4. Inventory: deliberate state required (stock > 0 or made-to-order). */
  if (!kidsInventoryValid(product)) {
    issues.push({
      code: "KIDS_INVENTORY_INVALID",
      section: "category",
      message:
        "Inventory state invalid — set a stock quantity (or mark the piece made-to-order) before publishing.",
      severity: "error",
      blocksPublish: true,
      source: KIDS_VALIDATOR_SOURCE,
    });
  }

  /* ---- Confirmed identity protection (KID-001 … KID-021 only) ---- */
  if (confirmed) {
    /* 5. The SEPARATE_PRODUCT decision must be on record. It is a
       system-owned invariant, so it is recorded lazily (like the legacy
       Kids finalization); only a genuine persistence failure blocks. */
    ensureKidsIdentityRecorded(product.id, confirmedKidsIdentityFor(product.id));
    if (!kidsIdentityConfirmed(product.id)) {
      issues.push({
        code: "KIDS_IDENTITY_UNCONFIRMED",
        section: "category",
        message: `Confirmed product identity missing — record the SEPARATE_PRODUCT decision for ${product.id} first.`,
        severity: "error",
        blocksPublish: true,
        source: KIDS_VALIDATOR_SOURCE,
      });
    }

    /* 6. The confirmed plate must be this product's primary media. */
    if (expected) {
      if (!set.primary) {
        issues.push({
          code: "KIDS_PRIMARY_MISSING",
          section: "category",
          message: `Primary media missing — ${product.id} must own ${expected}.`,
          severity: "error",
          blocksPublish: true,
          source: KIDS_VALIDATOR_SOURCE,
        });
      } else {
        const primaryFile = kidsFileNameOf(set.primary);
        if (primaryFile && primaryFile !== expected) {
          const belongsTo = kidsProductIdForFile(primaryFile);
          if (belongsTo) {
            issues.push({
              code: "KIDS_WRONG_PRIMARY",
              section: "category",
              message: `${product.id} shows ${primaryFile} as its primary image; its confirmed plate is ${expected} (belongs to ${belongsTo}).`,
              severity: "error",
              blocksPublish: true,
              source: KIDS_VALIDATOR_SOURCE,
            });
          }
        }
      }
    }

    /* 7. No-merge: one confirmed Kids product may never combine two plates. */
    const platesInSet = [set.primary, ...(set.gallery ?? [])];
    if (wouldMergeConfirmedKids(platesInSet)) {
      issues.push({
        code: "KIDS_MERGE_REFUSED",
        section: "category",
        message: `${product.id} resolves multiple confirmed Kids plates — confirmed Kids products are separate and cannot be merged.`,
        severity: "error",
        blocksPublish: true,
        source: KIDS_VALIDATOR_SOURCE,
      });
    }

    /* 8. No cross-product ownership in the register for a confirmed plate. */
    issues.push(...ownedPlateIssues(product));

    /* 9. Claims of other confirmed plates are reported (claims side). */
    const claimedFiles = [
      ...(Array.isArray(product.mediaIds) ? product.mediaIds : []),
      ...(Array.isArray(product.galleryMediaIds) ? product.galleryMediaIds : []),
      product.primaryMediaId,
    ]
      .filter(Boolean)
      .map((id) => mediaRepository.getById(String(id)))
      .filter(Boolean);
    claimedFiles.forEach((media) => {
      const file = kidsFileNameOf(media);
      const belongsTo = kidsProductIdForFile(file);
      if (belongsTo && belongsTo !== product.id) {
        issues.push({
          code: "KIDS_CROSS_PRODUCT_MEDIA",
          section: "category",
          message: `${product.id} references ${file}, which is the confirmed media of ${belongsTo}.`,
          severity: "error",
          blocksPublish: true,
          source: KIDS_VALIDATOR_SOURCE,
        });
      }
    });
  }

  /* Deduplicate identical (code, message) pairs. */
  const seen = new Set();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * The category validator registry. The universal publish validator consults
 * it after its own checks — categories without a validator get no extra
 * rules. Future categories register here instead of creating new lifecycles.
 */
export const CATEGORY_VALIDATORS = {
  kidswear: validateKidsProduct,
};

export default {
  KIDS_VALIDATOR_SOURCE,
  CATEGORY_VALIDATORS,
  isKidsProduct,
  kidsIdentityConfirmed,
  kidsInventoryValid,
  kidsSubcategoryValid,
  validateKidsProduct,
};
