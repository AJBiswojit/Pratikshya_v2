/**
 * PRATIKSHYA FASHON — Media ingestion tests (Phase 21.4).
 *
 * Pure helpers only. No ImageMagick, no filesystem scan of public/.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  RESERVED_PRODUCT_IDS,
  assignDeterministicNames,
  assignProductSlots,
  assignUsageRoles,
  buildIngestionRecords,
  buildMediaId,
  classifyPath,
  detectDuplicates,
  slugifyName,
  summariseIngestion,
} from "../scripts/lib/mediaIngestion.mjs";

test("slugifyName is lowercase, hyphenated and stable", () => {
  assert.equal(slugifyName("Women's Saree Final FINAL 2.JPG"), "womens-saree-final-final-2-jpg");
  assert.equal(slugifyName("silk saree 1"), "silk-saree-1");
  assert.equal(slugifyName(slugifyName("Banarasi Pata")), "banarasi-pata");
});

test("buildMediaId is deterministic for the same path", () => {
  const a = buildMediaId("media/women/saree/silk sarees/silk saree1/a.png");
  const b = buildMediaId("media/women/saree/silk sarees/silk saree1/a.png");
  const c = buildMediaId("media/women/saree/silk sarees/silk saree2/a.png");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^pm-ing-[0-9a-f]{12}$/);
});

test("folder paths map onto existing taxonomy and never invent a category", () => {
  assert.equal(classifyPath("media/women/saree/silk sarees/silk saree1/a.png").categoryId, "sarees");
  assert.equal(classifyPath("media/women/saree/silk sarees/silk saree1/a.png").subcategoryName, "Silk Saree");
  assert.equal(classifyPath("media/women/saree/baranasi/pata1/a.jpeg").subcategoryName, "Banarasi Saree");
  assert.equal(classifyPath("media/women/lehnga/lehnga1/a.png").categoryId, "lehengas");
  assert.equal(classifyPath("media/women/marriage/g1/a.png").categoryId, "bridal-couture");
  assert.equal(classifyPath("media/men/sherwani_marriage/s1/a.jpeg").subcategoryName, "Sherwani");
  assert.equal(classifyPath("media/men/Kurta pajama/kurta_pajama1/a.png").subcategoryName, "Kurta Pajama");
  assert.equal(classifyPath("media/accesories/earrings/a.jpeg").subcategoryName, "Earrings");
  assert.equal(classifyPath("media/accesories/bangles/a.jpeg").categoryId, "bangles");
  assert.equal(classifyPath("media/kids/a.jpeg").categoryId, "kidswear");
  assert.equal(classifyPath("media/women/innerwear/a.jpeg").categoryId, "innerwear");

  const anklet = classifyPath("media/accesories/anklet/a.jpeg");
  assert.equal(anklet.categoryId, null);
  assert.equal(anklet.mappingStatus, "UNMAPPED");

  const bandhani = classifyPath("media/women/saree/bandhani/b1/a.png");
  assert.equal(bandhani.categoryId, "sarees");
  assert.equal(bandhani.subcategoryName, null);
  assert.equal(bandhani.mappingStatus, "NEEDS_REVIEW");
});

test("house plates migrate into the canonical library without becoming products", () => {
  const named = assignDeterministicNames([
    {
      originalPath: "images/atelier-fabric.jpg",
      namePrefix: "house-atelier-fabric",
      house: true,
    },
  ]);
  assert.equal(named[0].currentFilename, "house-atelier-fabric.jpg");
  assert.equal(named[0].optimizedPath, "library/house-atelier-fabric.jpg");
  assert.equal(named[0].skipOptimize, true);
  assert.equal(named[0].productId, undefined);
});

test("deterministic names increment inside a prefix and do not drift on reorder", () => {
  const files = [
    { originalPath: "media/women/saree/silk sarees/silk saree1/b.png", namePrefix: "women-saree-silk" },
    { originalPath: "media/women/saree/silk sarees/silk saree1/a.png", namePrefix: "women-saree-silk" },
  ];
  const first = assignDeterministicNames(files);
  const second = assignDeterministicNames([...files].reverse());
  assert.equal(first[0].currentFilename, second[0].currentFilename);
  assert.equal(first[1].currentFilename, second[1].currentFilename);
  assert.equal(first.find((item) => item.originalPath.endsWith("a.png")).currentFilename, "women-saree-silk-001.webp");
});

test("exact checksum matches are DUPLICATE and the first path is canonical", () => {
  const items = detectDuplicates([
    { originalPath: "media/a/one.png", checksum: "aaa", width: 100, height: 100, sizeBytes: 10 },
    { originalPath: "media/a/two.png", checksum: "aaa", width: 100, height: 100, sizeBytes: 10 },
    { originalPath: "media/a/three.png", checksum: "bbb", width: 400, height: 600, sizeBytes: 80 },
  ]);
  const one = items.find((item) => item.originalPath.endsWith("one.png"));
  const two = items.find((item) => item.originalPath.endsWith("two.png"));
  const three = items.find((item) => item.originalPath.endsWith("three.png"));
  assert.equal(one.duplicateStatus, "UNIQUE");
  assert.equal(two.duplicateStatus, "DUPLICATE");
  assert.equal(two.duplicateOf, buildMediaId("media/a/one.png"));
  assert.equal(three.duplicateStatus, "UNIQUE");
});

test("product-set folders slot onto catalogue products in the same style", () => {
  const products = [
    { id: "pf-006", name: "Mulberry Silk", category: "sarees", subcategory: "Silk Saree" },
    { id: "pf-005", name: "Ivory Kanjivaram", category: "sarees", subcategory: "Silk Saree" },
    { id: "pf-010", name: "Banarasi Gold", category: "sarees", subcategory: "Banarasi Saree" },
  ];
  const items = [
    { originalPath: "media/women/saree/silk sarees/silk saree1/a.png", categoryId: "sarees", subcategoryName: "Silk Saree" },
    { originalPath: "media/women/saree/silk sarees/silk saree1/b.png", categoryId: "sarees", subcategoryName: "Silk Saree" },
  ];
  const slotted = assignProductSlots(items, products, RESERVED_PRODUCT_IDS);
  assert.equal(slotted[0].productId, "pf-006");
  assert.equal(slotted[0].role, "COVER");
  assert.equal(slotted[1].productId, "pf-006");
  assert.equal(slotted[1].role, "GALLERY");
  assert.ok(!slotted.some((item) => item.productId === "pf-005"));
});

test("bandhani and chanderi stay off the product register — no invented SKU", () => {
  const products = [
    { id: "pf-003", name: "Berhampuri", category: "sarees", subcategory: "Pato Saree" },
    { id: "pf-006", name: "Mulberry Silk", category: "sarees", subcategory: "Silk Saree" },
  ];
  const items = [
    { originalPath: "media/women/saree/bandhani/b1/a.png", categoryId: "sarees", subcategoryName: null },
    { originalPath: "media/women/saree/chanderi/c1/a.png", categoryId: "sarees", subcategoryName: null },
  ];
  const slotted = assignProductSlots(items, products);
  assert.equal(slotted[0].productId, null);
  assert.equal(slotted[1].productId, null);
  assert.equal(slotted[0].mappingStatus, "NEEDS_REVIEW");
});

test("anklets and dump folders are not slotted onto a product", () => {
  const products = [{ id: "pf-056", name: "Temple Jhumka", category: "jewellery", subcategory: "Earrings" }];
  const items = [
    { originalPath: "media/accesories/anklet/a.jpeg", categoryId: null, dump: true },
    { originalPath: "media/kids/a.jpeg", categoryId: "kidswear", dump: true },
  ];
  const slotted = assignProductSlots(items, products);
  assert.equal(slotted[0].productId, null);
  assert.equal(slotted[1].productId, null);
});

test("AI Mirror roles are never applied to jewellery or innerwear", () => {
  const jewellery = assignUsageRoles(
    { originalPath: "media/accesories/earrings/a.jpeg", categoryId: "jewellery", productId: "pf-056" },
    { isFirstInSet: true, product: { id: "pf-056" } }
  );
  const innerwear = assignUsageRoles(
    { originalPath: "media/women/innerwear/a.jpeg", categoryId: "innerwear", productId: "pf-065" },
    { isFirstInSet: true, product: { id: "pf-065" } }
  );
  const saree = assignUsageRoles(
    { originalPath: "media/women/saree/silk sarees/silk saree1/a.png", categoryId: "sarees", productId: "pf-006" },
    { isFirstInSet: true, product: { id: "pf-006", isNew: true } }
  );
  assert.ok(!jewellery.includes("AI_MIRROR"));
  assert.ok(!innerwear.includes("AI_MIRROR"));
  assert.ok(saree.includes("AI_MIRROR"));
  assert.ok(saree.includes("AI_SHOPPING"));
  assert.ok(saree.includes("NEW_ARRIVAL"));
});

test("the full pipeline is idempotent for the same inputs", () => {
  const files = [
    {
      originalPath: "media/women/saree/silk sarees/silk saree1/a.png",
      filename: "a.png",
      extension: ".png",
      sizeBytes: 1200,
      width: 1200,
      height: 1600,
      checksum: "hash-a",
    },
    {
      originalPath: "media/accesories/anklet/b.jpeg",
      filename: "b.jpeg",
      extension: ".jpeg",
      sizeBytes: 800,
      width: 800,
      height: 1000,
      checksum: "hash-b",
    },
  ];
  const products = [{ id: "pf-006", name: "Mulberry Silk", category: "sarees", subcategory: "Silk Saree" }];
  const first = buildIngestionRecords(files, { products });
  const second = buildIngestionRecords(files, { products });
  assert.deepEqual(
    first.map((item) => item.currentFilename),
    second.map((item) => item.currentFilename)
  );
  assert.deepEqual(
    first.map((item) => item.id),
    second.map((item) => item.id)
  );
  assert.equal(first.find((item) => item.originalPath.includes("anklet")).mappingStatus, "UNMAPPED");
  const report = summariseIngestion(first);
  assert.equal(report.total, 2);
  assert.equal(report.unmapped, 1);
  assert.equal(report.mappedToProducts, 1);
});
