/**
 * PRATIKSHYA FASHON — Resolver-facing rules tested against the ingestion
 * helpers (Node ESM, no Vite extension map required).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  USAGE_ROLES,
  assignUsageRoles,
  classifyPath,
} from "../scripts/lib/mediaIngestion.mjs";

test("category isolation — a jewellery folder never becomes a saree", () => {
  const earrings = classifyPath("media/accesories/earrings/a.jpeg");
  const saree = classifyPath("media/women/saree/silk sarees/silk saree1/a.png");
  assert.equal(earrings.categoryId, "jewellery");
  assert.equal(saree.categoryId, "sarees");
  assert.notEqual(earrings.categoryId, saree.categoryId);
});

test("AI Mirror role is withheld from jewellery, bangles, anklets and innerwear", () => {
  const cases = [
    ["media/accesories/earrings/a.jpeg", "jewellery", "pf-056"],
    ["media/accesories/bangles/a.jpeg", "bangles", "pf-046"],
    ["media/women/innerwear/a.jpeg", "innerwear", "pf-065"],
  ];
  cases.forEach(([path, categoryId, productId]) => {
    const roles = assignUsageRoles(
      { originalPath: path, categoryId, productId },
      { isFirstInSet: true, product: { id: productId } }
    );
    assert.ok(!roles.includes(USAGE_ROLES.AI_MIRROR), path);
  });
});

test("eligible apparel product sets receive AI Shopping and AI Mirror roles", () => {
  const roles = assignUsageRoles(
    {
      originalPath: "media/men/sherwani_marriage/s1/a.jpeg",
      categoryId: "menswear",
      productId: "pf-071",
    },
    { isFirstInSet: true, isFirstInCategory: true, product: { id: "pf-071", originalPrice: 49000 } }
  );
  assert.ok(roles.includes(USAGE_ROLES.AI_MIRROR));
  assert.ok(roles.includes(USAGE_ROLES.AI_SHOPPING));
  assert.ok(roles.includes(USAGE_ROLES.SALE));
  assert.ok(roles.includes(USAGE_ROLES.PRODUCT_PRIMARY));
});
