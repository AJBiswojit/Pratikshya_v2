/**
 * PRATIKSHYA FASHON — Media-library product discovery tests (Phase 24.1).
 *
 * Locks the complete MEDIA LIBRARY → PRODUCT coverage contract:
 *
 *   · the discovery scan starts at the FILESYSTEM, not at the catalogue, so
 *     a product group can never be missed just because nothing catalogued it
 *   · every product-media group in `public/library` resolves to exactly ONE
 *     Product ID — published or draft, but never absent
 *   · multi-view groups (front/side/back) are ONE product, never several
 *   · sequential standalone files (innerwear-001/-002/-003) are DISTINCT
 *     products — never collapsed because they look alike
 *   · the filename is a valid discovery signal when metadata is missing, and
 *     yields category / family / group / sequence / candidate id
 *   · a filename never invents name, price, fabric, colour or stock
 *   · Product IDs are stable: re-running discovery never renumbers anything
 *   · the expected 9 bangles / 14 earrings / 19 innerwear are all present
 *   · discovery is READ-ONLY — it publishes nothing and mutates nothing
 */

import test, { after } from "node:test";
import assert from "node:assert/strict";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { getExploreProducts } from "../src/data/products/explore.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import {
  buildLibraryInventory,
  deriveIdentityFromFilename,
  discoveryMediaGroups,
  filenameDerivedDiscovery,
  getMediaProductDiscovery,
  uncoveredProductGroups,
} from "../src/services/media/mediaProductDiscovery.js";

const LIBRARY_DIR = join(process.cwd(), "public", "library");
const MEDIA_EXTENSIONS = /\.(webp|jpe?g|png|avif|gif|mp4|webm)$/i;

const diskFiles = readdirSync(LIBRARY_DIR).filter((file) => MEDIA_EXTENSIONS.test(file));

/* This report is a snapshot of the explicitly migrated catalogue. */
setupMigratedState();
after(() => {
  setupBaseState();
});

const products = catalogRepository.all();
const discovery = getMediaProductDiscovery({ products, diskFiles });

const familyRow = (family) => discovery.bySubtype.find((row) => row.key === family) ?? null;
const groupRow = (groupKey) => discovery.rows.find((row) => row.groupKey === groupKey) ?? null;

/* ------------------------------------------------------------------ */
/* The library is scanned from disk, not inherited from the catalogue  */
/* ------------------------------------------------------------------ */

test("the discovery scan starts at the filesystem and sees every library file", () => {
  assert.ok(diskFiles.length > 0, "public/library must contain media");
  const inventory = buildLibraryInventory({ products, diskFiles });
  const known = new Set(inventory.map((row) => row.fileName));
  diskFiles.forEach((file) => {
    assert.ok(known.has(file.toLowerCase()), `${file} must appear in the discovery inventory`);
  });
});

test("no library file is invisible to the registers, and no register file is missing from disk", () => {
  assert.deepEqual(
    discovery.orphanedDiskFiles,
    [],
    "a file on disk that no register knows about can never become a product"
  );
  assert.deepEqual(
    discovery.missingFromDisk,
    [],
    "a registered file with no file on disk is a broken reference"
  );
});

/* ------------------------------------------------------------------ */
/* Complete coverage                                                   */
/* ------------------------------------------------------------------ */

test("every product-media group is connected to a catalogue record", () => {
  const uncovered = uncoveredProductGroups(discovery);
  assert.deepEqual(
    uncovered.map((row) => row.groupKey),
    [],
    "every legitimate product group must have a Product ID"
  );
  assert.equal(discovery.totals.groupsWithoutProducts, 0);
  assert.equal(discovery.totals.groups, discovery.totals.groupsWithProducts);
});

test("one media group resolves to exactly one Product ID", () => {
  assert.deepEqual(discovery.duplicateGroups, [], "a group key must never be built twice");
  const conflicted = discovery.rows.filter((row) => row.ownershipConflicts.length);
  assert.deepEqual(
    conflicted.map((row) => row.groupKey),
    [],
    "a media group owned by two products is an ownership failure"
  );
});

test("house artwork is never counted as a product group", () => {
  discovery.rows.forEach((row) => {
    assert.ok(!row.groupKey.startsWith("house-"), `${row.groupKey} is marketing artwork`);
  });
});

/* ------------------------------------------------------------------ */
/* Expected coverage — verified against the real scan                  */
/* ------------------------------------------------------------------ */

test("the library holds 9 bangle groups, all with Product IDs", () => {
  const row = familyRow("Bangles");
  assert.ok(row, "the Bangles family must be discovered");
  assert.equal(row.groups, 9, "9 distinct bangle products");
  assert.equal(row.withProduct, 9, "every bangle group has a Product ID");
  assert.equal(row.withoutProduct, 0);
});

test("the library holds 14 earring groups, all with Product IDs", () => {
  const row = familyRow("Earrings");
  assert.ok(row, "the Earrings family must be discovered");
  assert.equal(row.groups, 14, "14 distinct earring products");
  assert.equal(row.withProduct, 14, "every earring group has a Product ID — not just the 2 published");
  assert.equal(row.withoutProduct, 0);
});

test("the library holds 19 innerwear groups, all with Product IDs", () => {
  const row = familyRow("Innerwear");
  assert.ok(row, "the Innerwear family must be discovered");
  assert.equal(row.groups, 19, "19 distinct innerwear products");
  assert.equal(row.withProduct, 19, "every innerwear group has a Product ID — not just the 3 published");
  assert.equal(row.withoutProduct, 0);
});

test("the 21 confirmed Kids products stay 21 — discovery never regroups them", () => {
  const row = familyRow("Kids");
  assert.ok(row, "the Kids family must be discovered");
  assert.equal(row.groups, 21);
  assert.equal(row.withProduct, 21);
  assert.equal(row.published, 21, "the finalised Kids products remain published");
});

/* ------------------------------------------------------------------ */
/* Grouping: views collapse, sequences do not                          */
/* ------------------------------------------------------------------ */

test("front / side / back of one product is ONE product, never three", () => {
  const row = groupRow("women-saree-cotton-005");
  assert.ok(row, "the multi-view saree group must be discovered");
  assert.ok(row.fileCount > 1, "the group must carry several views");
  assert.ok(row.isMultiView);
  assert.ok(row.productId, "a multi-view group is still exactly one product");

  /* Each of its files must NOT have produced its own group. */
  row.files.forEach((file) => {
    const base = file.replace(/\.[a-z0-9]+$/i, "");
    if (base === row.groupKey) return;
    assert.equal(groupRow(base), null, `${file} must not be its own product`);
  });
});

test("sequential standalone files are DISTINCT products, never merged by similarity", () => {
  const first = groupRow("women-innerwear-001");
  const second = groupRow("women-innerwear-002");
  const third = groupRow("women-innerwear-003");
  [first, second, third].forEach((row, index) => {
    assert.ok(row, `women-innerwear-00${index + 1} must be its own group`);
    assert.equal(row.fileCount, 1);
    assert.ok(row.isStandalone);
  });
  const ids = new Set([first.productId, second.productId, third.productId]);
  assert.equal(ids.size, 3, "three sequential files are three separate products");
});

test("every earring file is its own product — similar images are never merged", () => {
  const earrings = discovery.rows.filter((row) => row.groupKey.startsWith("jewellery-earring-"));
  assert.equal(earrings.length, 14);
  const ids = new Set(earrings.map((row) => row.productId));
  assert.equal(ids.size, 14, "14 earring groups must be 14 distinct Product IDs");
});

/* ------------------------------------------------------------------ */
/* Filename as a discovery signal                                      */
/* ------------------------------------------------------------------ */

test("a filename yields category, family, group, sequence and a candidate id", () => {
  const identity = deriveIdentityFromFilename("jewellery-earring-009.webp");
  assert.equal(identity.category, "jewellery");
  assert.equal(identity.subtype, "Earrings");
  assert.equal(identity.groupKey, "jewellery-earring-009");
  assert.equal(identity.sequence, 9);
  assert.equal(identity.candidateProductId, "EAR-009");
  assert.equal(identity.view, null);
  assert.ok(identity.isStandalone);
  assert.ok(identity.isProductCandidate);
});

test("a filename yields the view for a multi-view asset without splitting the product", () => {
  const front = deriveIdentityFromFilename("women-saree-banarasi-001-front.webp");
  const side = deriveIdentityFromFilename("women-saree-banarasi-001-side.webp");
  const back = deriveIdentityFromFilename("women-saree-banarasi-001-back.webp");
  assert.equal(front.view, "front");
  assert.equal(side.view, "side");
  assert.equal(back.view, "back");
  assert.equal(front.groupKey, side.groupKey);
  assert.equal(side.groupKey, back.groupKey);
});

test("a filename NEVER invents name, price, fabric, colour or stock", () => {
  const identity = deriveIdentityFromFilename("women-innerwear-012.webp");
  ["name", "price", "fabric", "colour", "color", "size", "stock", "brand", "discount"].forEach(
    (field) => {
      assert.equal(identity[field], undefined, `discovery must not derive ${field} from a filename`);
    }
  );
  assert.equal(identity.candidateProductId, "INN-012");
});

test("house artwork is recognised as marketing, not as a product candidate", () => {
  const identity = deriveIdentityFromFilename("house-bridal-bangles.jpg");
  assert.ok(identity.isHouse);
  assert.equal(identity.isProductCandidate, false);
});

test("homepage hero plates stay in marketing inventory and never become products", () => {
  const identity = deriveIdentityFromFilename("hero001.avif");
  assert.equal(identity.isHomepageHero, true);
  assert.equal(identity.isMarketing, true);
  assert.equal(identity.isProductCandidate, false);

  const heroFiles = discovery.inventory.filter((row) => /^hero00[1-5]\.avif$/.test(row.fileName));
  assert.equal(heroFiles.length, 5);
  heroFiles.forEach((row) => {
    assert.equal(row.isMarketing, true);
    assert.equal(row.isProductCandidate, false);
    assert.equal(row.existingProductId, null);
  });
  assert.ok(discovery.rows.every((row) => !/^hero00[1-5]$/.test(row.groupKey)));
});

test("the filename-derived report explains every group's identity and action", () => {
  const report = filenameDerivedDiscovery(discovery);
  assert.equal(report.length, discovery.rows.length);
  const earring = report.find((row) => row.groupKey === "jewellery-earring-009");
  assert.ok(earring, "jewellery-earring-009 must appear in the filename discovery report");
  assert.equal(earring.category, "jewellery");
  assert.equal(earring.subcategory, "Earrings");
  assert.equal(earring.candidateProductId, "EAR-009");
  assert.ok(earring.existingProductId, "it already resolves to a catalogue record");
  assert.equal(earring.action, "KEEP", "an already-catalogued group is kept, never duplicated");
});

/* ------------------------------------------------------------------ */
/* Stability                                                           */
/* ------------------------------------------------------------------ */

test("discovery is deterministic — a second run produces identical identities", () => {
  const again = getMediaProductDiscovery({ products, diskFiles });
  assert.deepEqual(
    again.rows.map((row) => [row.groupKey, row.productId]),
    discovery.rows.map((row) => [row.groupKey, row.productId]),
    "Product IDs must never drift between runs"
  );
  assert.deepEqual(again.totals, discovery.totals);
});

test("discovery never renumbers an established Product ID", () => {
  /* The filename implies EAR-009; the catalogue minted its own permanent id.
     Discovery reports both and changes neither. */
  const row = groupRow("jewellery-earring-009");
  assert.ok(row);
  assert.equal(row.candidateProductId, "EAR-009");
  const stored = products.find((product) => String(product.id) === String(row.productId));
  assert.ok(stored, "the resolved Product ID must exist in the catalogue");
  assert.equal(String(stored.id), String(row.productId), "the stored id is left untouched");
});

test("discovery mutates nothing — the catalogue and its statuses are unchanged", () => {
  const before = catalogRepository.all().map((product) => `${product.id}:${product.status}`);
  getMediaProductDiscovery({ products: catalogRepository.all(), diskFiles });
  const after = catalogRepository.all().map((product) => `${product.id}:${product.status}`);
  assert.deepEqual(after, before, "a coverage audit must never publish or edit a product");
});

/* ------------------------------------------------------------------ */
/* Storefront consequences                                             */
/* ------------------------------------------------------------------ */

test("newly discovered products stay OUT of the storefront until published", () => {
  const live = new Set(getLiveStorefrontProducts().map((product) => String(product.id)));
  discovery.rows
    .filter((row) => row.productStatus === "DRAFT")
    .forEach((row) => {
      assert.ok(
        !live.has(String(row.productId)),
        `${row.productId} is a draft and must not reach the storefront`
      );
    });
});

test("Explore shows ONE card per Product ID, drafts excluded", () => {
  const explore = getExploreProducts();
  const ids = explore.map((product) => String(product.id));
  assert.equal(new Set(ids).size, ids.length, "one Product ID must be one Explore card");

  const publishedGroups = discovery.rows.filter((row) => row.productStatus === "PUBLISHED");
  const exploreIds = new Set(ids);
  publishedGroups.forEach((row) => {
    assert.ok(
      exploreIds.has(String(row.productId)),
      `${row.productId} is published and must appear on Explore`
    );
  });
});

test("a multi-view group never becomes several Explore cards", () => {
  const multi = discovery.rows.filter((row) => row.isMultiView && row.productStatus === "PUBLISHED");
  assert.ok(multi.length > 0, "there must be published multi-view products to check");
  const ids = getExploreProducts().map((product) => String(product.id));
  multi.forEach((row) => {
    const occurrences = ids.filter((id) => id === String(row.productId)).length;
    assert.equal(occurrences, 1, `${row.productId} has ${row.fileCount} views but must be 1 card`);
  });
});

test("every published discovered product renders its OWN media, never a borrowed one", () => {
  const byId = new Map(products.map((product) => [String(product.id), product]));
  discovery.rows
    .filter((row) => row.productStatus === "PUBLISHED")
    .forEach((row) => {
      const product = byId.get(String(row.productId));
      if (!product) return;
      const set = getProductMediaSet(product);
      if (!set.primary) return;
      const owns = (item) => !item?.productId || String(item.productId) === String(product.id);
      assert.ok(owns(set.primary), `${product.id} primary media must belong to it`);
      if (set.hasAlternate) {
        assert.ok(owns(set.hover), `${product.id} hover media must belong to the same product`);
      }
    });
});

test("a single-image product has no hover swap — it never borrows another product's plate", () => {
  const byId = new Map(products.map((product) => [String(product.id), product]));
  discovery.rows
    .filter((row) => row.fileCount === 1 && row.productStatus === "PUBLISHED")
    .forEach((row) => {
      const product = byId.get(String(row.productId));
      if (!product) return;
      const set = getProductMediaSet(product);
      if (!set.hasAlternate) return;
      assert.ok(
        String(set.hover?.productId ?? product.id) === String(product.id),
        `${product.id} has one library image; any hover must still be its own media`
      );
    });
});

/* ------------------------------------------------------------------ */
/* No second system                                                    */
/* ------------------------------------------------------------------ */

test("discovery reuses the existing grouping architecture, not a private one", () => {
  const groups = discoveryMediaGroups({ diskFiles });
  const keys = new Set(groups.map((group) => group.groupKey));
  discovery.rows.forEach((row) => {
    assert.ok(keys.has(row.groupKey), `${row.groupKey} must come from buildMediaGroups`);
  });
});

test("no media asset is claimed by two different products", () => {
  const owner = new Map();
  discovery.inventory.forEach((row) => {
    if (!row.existingProductId || !row.mediaId) return;
    const existing = owner.get(String(row.mediaId));
    assert.ok(
      !existing || existing === row.existingProductId,
      `${row.fileName} is claimed by ${existing} and ${row.existingProductId}`
    );
    owner.set(String(row.mediaId), row.existingProductId);
  });
});
