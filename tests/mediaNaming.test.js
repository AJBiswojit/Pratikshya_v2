/** Generic imported-media naming plus canonical product ownership. */

import test from "node:test";
import assert from "node:assert/strict";

import { products } from "../src/data/catalog/products.js";
import { toStorefrontProduct } from "../src/data/products/index.js";
import { buildMediaGroups } from "../src/services/media/mediaGroups.js";
import { getViewOrderScore, parseMediaFilename } from "../src/services/media/mediaNaming.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";

test("generic view suffixes group imported angles without changing identity", () => {
  const names = [
    "catalogue-item-001-front.webp",
    "catalogue-item-001-side.webp",
    "catalogue-item-001-back.webp",
  ];
  const parsed = names.map(parseMediaFilename);
  assert.ok(parsed.every((item) => item.groupKey === "catalogue-item-001"));
  assert.deepEqual(parsed.map((item) => item.view), ["front", "side", "back"]);
  assert.ok(parsed.every((item) => item.isStandalone === false));

  const groups = buildMediaGroups(names);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].count, 3);
});

test("independent filenames remain independent groups", () => {
  const groups = buildMediaGroups(["catalogue-item-001.webp", "catalogue-item-002.webp"]);
  assert.equal(groups.length, 2);
  assert.ok(groups.every((group) => group.isStandalone));
});

test("view ordering remains deterministic", () => {
  assert.ok(getViewOrderScore("front") < getViewOrderScore("side"));
  assert.ok(getViewOrderScore("side") < getViewOrderScore("back"));
  assert.ok(getViewOrderScore("back") < getViewOrderScore("detail"));
  assert.ok(getViewOrderScore("front") < getViewOrderScore("front-close"));
});

test("canonical media identity comes from Product ID ownership, not filename inference", () => {
  for (const authored of products) {
    const set = getProductMediaSet(toStorefrontProduct(authored));
    assert.equal(set.productId, authored.id);
    assert.equal(set.primary.productId, authored.id);
    assert.equal(set.primary.src, authored.media.primary);
    assert.ok(set.gallery.every((media) => media.productId === authored.id));
    assert.ok([set.primary, ...set.gallery].every((media) => media.src.includes(`/${authored.id}/`)));
  }
});

test("the naming parser does not assign or mutate a Product ID", () => {
  const parsed = parseMediaFilename("catalogue-item-001-front.webp");
  assert.equal(parsed.productId, undefined);
  assert.equal(parsed.groupKey, "catalogue-item-001");
});
