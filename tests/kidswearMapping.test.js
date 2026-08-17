/**
 * PRATIKSHYA FASHON — Kidswear media-to-product remap tests.
 *
 * The 21 library plates in `public/library/kids-001.webp … kids-021.webp`
 * are the source of truth for the Kids catalogue. These tests lock the
 * remap in place:
 *
 *   · every Kids image belongs to exactly one valid Kids product
 *   · no Kids product carries women's, men's or bridal media
 *   · no product resolves another product's media
 *   · hover is same-product-only and never invented for standalone plates
 *   · names, taxonomy, prices, routes and admin/employee access stay valid
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getLiveStorefrontProducts, getProductBySlug, getProductById, productHref } from "../src/data/products/index.js";
import { subcategoriesByCategory } from "../src/data/products/index.js";
import { colorSwatches, navigationScopes } from "../src/data/products/taxonomy.js";
import {
  getProductCardMedia,
  getProductMediaSet,
  isProductOwnedMedia,
  PRODUCT_MEDIA_STATUS,
} from "../src/services/media/productMediaSet.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import catalogRepository, { CATALOGUE_SYNC_VERSION, replaceStaleKidswearRows } from "../src/services/catalogRepository.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";

const __dirname = join(fileURLToPath(import.meta.url), "..");

const KIDS_LIBRARY = Array.from({ length: 21 }, (_, index) => `kids-${String(index + 1).padStart(3, "0")}.webp`);

const kidsProducts = () => getLiveStorefrontProducts().filter((product) => product.category === "kidswear");

const fileOf = (source) => {
  if (!source) return null;
  return source.fileName || source.currentFilename || (source.src || source.url || "").split("/").pop() || source.id || null;
};

const registerRecordsFor = (fileName) => {
  const name = basename(fileName);
  return mediaRepository.getAll().filter((item) => {
    const file = (item.url || item.thumbnail || "").split("/").pop();
    return file === name;
  });
};

/* ------------------------------------------------------------------ */
/* 1. Library plates are real and exactly 21                            */
/* ------------------------------------------------------------------ */

test("all 21 kids library plates exist on disk", () => {
  KIDS_LIBRARY.forEach((file) => {
    const path = join(__dirname, "..", "public", "library", file);
    assert.ok(existsSync(path), `${file} missing from public/library`);
    const bytes = readFileSync(path);
    assert.ok(bytes.length > 0, `${file} is empty`);
  });
});

/* ------------------------------------------------------------------ */
/* 2. One image → one Kids product                                     */
/* ------------------------------------------------------------------ */

test("every kids product owns exactly one kids library plate as primary", () => {
  const products = kidsProducts();
  assert.equal(products.length, 21, "expected exactly 21 kidswear products");

  const used = new Map();
  products.forEach((product) => {
    const set = getProductMediaSet(product);
    const primary = fileOf(set.primary);
    assert.ok(primary, `${product.id} has no primary media`);
    assert.ok(
      primary.startsWith("kids-") && primary.endsWith(".webp"),
      `${product.id} primary ${primary} is not a kids library plate`
    );
    assert.ok(KIDS_LIBRARY.includes(primary), `${product.id} primary ${primary} is not in the 21-plate library`);
    const id = String(product.id);
    if (used.has(primary)) {
      assert.fail(`duplicate media: ${primary} is primary for both ${used.get(primary)} and ${id}`);
    }
    used.set(primary, id);
  });

  assert.equal(used.size, 21, "the 21 plates must map 1-to-1 to the 21 kids products");
  assert.deepEqual(
    [...used.keys()].sort(),
    [...KIDS_LIBRARY].sort(),
    "every library plate must be the primary of exactly one kids product"
  );
});

test("kids products do not repeat another kids product's image anywhere in their set", () => {
  const products = kidsProducts();
  const owner = new Map();
  const offenders = [];
  products.forEach((product) => {
    const set = getProductMediaSet(product);
    set.gallery.forEach((item) => {
      const file = fileOf(item);
      if (!file) return;
      if (owner.has(file) && owner.get(file) !== String(product.id)) {
        offenders.push(`${file} shared by ${owner.get(file)} and ${product.id}`);
      }
      owner.set(file, String(product.id));
    });
  });
  assert.deepEqual(offenders, [], offenders.join("\n"));
});

/* ------------------------------------------------------------------ */
/* 3. No women's / men's / bridal media on Kids products               */
/* ------------------------------------------------------------------ */

const NON_KIDS_MEDIA = /^(women|men|groom|bridal|house-bridal|jewellery|house-groom)/i;

test("no kids product resolves women's, men's or bridal media", () => {
  const offenders = [];
  kidsProducts().forEach((product) => {
    const set = getProductMediaSet(product);
    set.gallery.forEach((item) => {
      const file = fileOf(item) || "";
      if (!file) return;
      assert.ok(
        file.startsWith("kids-") || file.startsWith("house-kids"),
        `${product.id} resolves non-kids media ${file}`
      );
      if (NON_KIDS_MEDIA.test(file)) offenders.push(`${product.id} → ${file}`);
    });
  });
  assert.deepEqual(offenders, []);
});

/* ------------------------------------------------------------------ */
/* 4. Hover rules                                                      */
/* ------------------------------------------------------------------ */

test("hover is only a same-product alternate — never another product's plate", () => {
  kidsProducts().forEach((product) => {
    const set = getProductMediaSet(product);
    if (set.hasAlternate) {
      assert.ok(set.hover, `${product.id} claims an alternate but has no hover`);
      const hoverProductId = set.hover.productId ? String(set.hover.productId) : null;
      assert.equal(
        hoverProductId,
        String(product.id),
        `${product.id} hover belongs to ${hoverProductId ?? "no product"}`
      );
    }
  });
});

test("standalone plates do not invent a hover image", () => {
  kidsProducts().forEach((product) => {
    const set = getProductMediaSet(product);
    if (!set.hasAlternate) {
      assert.equal(set.status, PRODUCT_MEDIA_STATUS.NO_ALTERNATE, `${product.id} standalone status`);
    }
    const card = getProductCardMedia(product);
    if (!set.hasAlternate) {
      assert.equal(card.hoverImage, undefined, `${product.id} card invented a hover`);
      assert.ok(!card.hoverImage, `${product.id} must not swap on hover`);
    } else {
      assert.ok(card.hoverImage, `${product.id} alternate exists but card hides hover`);
      const hoverOwner = card.hoverImage.productId ? String(card.hoverImage.productId) : null;
      assert.equal(hoverOwner, String(product.id), `${product.id} hover owner mismatch`);
      const hoverFile = fileOf(card.hoverImage);
      const primaryFile = fileOf(card.image);
      assert.ok(hoverFile && primaryFile, `${product.id} hover/primary must carry files`);
    }
  });
});

test("no kids product borrows another product's primary for hover", () => {
  const primaries = new Map();
  kidsProducts().forEach((product) => {
    const set = getProductMediaSet(product);
    primaries.set(String(product.id), fileOf(set.primary));
  });
  kidsProducts().forEach((product) => {
    const set = getProductMediaSet(product);
    const hover = set.hasAlternate ? fileOf(set.hover) : null;
    if (!hover) return;
    primaries.forEach((primary, ownerId) => {
      if (ownerId === String(product.id)) return;
      assert.notEqual(hover, primary, `${product.id} hover borrows ${ownerId}'s primary ${primary}`);
    });
  });
});

/* ------------------------------------------------------------------ */
/* 5. Register ownership                                               */
/* ------------------------------------------------------------------ */

test("media register records for kids plates name a valid kids product", () => {
  KIDS_LIBRARY.forEach((file) => {
    const records = registerRecordsFor(file);
    assert.ok(records.length > 0, `${file} missing from the media register`);
    records.forEach((record) => {
      if (record.productId) {
        const product = getProductById(record.productId);
        assert.ok(product, `${file} register record points at missing product ${record.productId}`);
        assert.equal(product.category, "kidswear", `${file} register record points at non-kids product ${record.productId}`);
      }
    });
  });
});

test("every register record in a kids product's set carries that product's id", () => {
  kidsProducts().forEach((product) => {
    const set = getProductMediaSet(product);
    set.gallery.forEach((item) => {
      if (item.fromRepository) {
        assert.ok(
          isProductOwnedMedia(item, product.id) || item.productId === String(product.id) || item.productId === product.id,
          `${product.id} set contains repository media ${fileOf(item)} owned by ${item.productId}`
        );
      }
    });
  });
});

/* ------------------------------------------------------------------ */
/* 6. Names, taxonomy, prices                                          */
/* ------------------------------------------------------------------ */

const FORCED_FESTIVE = /(?:Kurta|Lehenga|Sherwani|Ethnic Set|Festive|Bridal|Wedding|Groom|Couture|Blush|Marigold|Navy)/i;
const KIDS_SUBCATEGORIES = ["Boys Casual Set", "Boys T-Shirt & Shorts Set", "Girls Casual Set", "Girls Dress"];

test("kids product names match the casual kids taxonomy", () => {
  kidsProducts().forEach((product) => {
    assert.doesNotMatch(product.name, FORCED_FESTIVE, `${product.id} name forces a festive/ethnic label: ${product.name}`);
    assert.ok(KIDS_SUBCATEGORIES.includes(product.subcategory), `${product.id} subcategory ${product.subcategory} is not a kids casual subcategory`);
    assert.equal(product.gender, "Kids", `${product.id} gender`);
    assert.equal(product.currency, "INR", `${product.id} currency`);
  });
});

test("kids products never carry adult ceremony occasions or badges", () => {
  const banned = new Set(["Bridal", "Wedding", "Reception", "Sangeet", "Mehendi", "Haldi", "Puja", "Festive"]);
  const bannedBadges = new Set(["Bridal", "Groom", "Couture", "Made to Order"]);
  kidsProducts().forEach((product) => {
    (product.occasion ?? []).forEach((occasion) => {
      assert.ok(!banned.has(occasion), `${product.id} carries occasion ${occasion}`);
    });
    (product.badges ?? []).forEach((badge) => {
      assert.ok(!bannedBadges.has(badge), `${product.id} carries badge ${badge}`);
    });
  });
});

test("every declared kids colour resolves to a swatch", () => {
  kidsProducts().forEach((product) => {
    (product.colors ?? []).forEach((color) => {
      assert.ok(colorSwatches[color], `${product.id} colour ${color} has no swatch`);
    });
  });
});

test("kidswear subcategories exist only where the architecture requires them", () => {
  const derived = subcategoriesByCategory.kidswear ?? [];
  assert.deepEqual([...derived].sort(), [...KIDS_SUBCATEGORIES].sort(), "unexpected kidswear subcategory set");
  const managed = taxonomyRepository.subcategories("kidswear").map((entry) => entry.name);
  KIDS_SUBCATEGORIES.forEach((name) => {
    assert.ok(managed.includes(name), `subcategory ${name} missing from managed taxonomy`);
  });
  const navScopes = navigationScopes;
  assert.ok(navScopes["/kids/girls-dresses"], "missing /kids/girls-dresses scope");
  assert.ok(navScopes["/kids/girls-casual-sets"], "missing /kids/girls-casual-sets scope");
  assert.ok(navScopes["/kids/boys-casual-sets"], "missing /kids/boys-casual-sets scope");
  assert.ok(navScopes["/kids/boys-tshirt-shorts"], "missing /kids/boys-tshirt-shorts scope");
  ["/kids/girls-ethnic-sets", "/kids/girls-lehenga-sets", "/kids/girls-festive-frocks", "/kids/boys-kurta-sets", "/kids/boys-sherwani", "/kids/boys-festive-shirts"].forEach((route) => {
    assert.ok(!navScopes[route], `stale route ${route} still declared`);
  });
});

test("kids prices are valid kidswear price points", () => {
  kidsProducts().forEach((product) => {
    assert.ok(Number.isFinite(product.price) && product.price > 0, `${product.id} price`);
    assert.ok(product.price >= 800 && product.price <= 4000, `${product.id} price ${product.price} outside kidswear range`);
    if (product.originalPrice != null) {
      assert.ok(product.originalPrice > product.price, `${product.id} compare-at must exceed price`);
      assert.ok(product.originalPrice <= 4500, `${product.id} compare-at ${product.originalPrice} outside kidswear range`);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 7. Routes and inventory                                             */
/* ------------------------------------------------------------------ */

test("kids product routes are unique and canonical", () => {
  const seen = new Map();
  kidsProducts().forEach((product) => {
    const href = productHref(product);
    assert.ok(href.startsWith("/product/"), `${product.id} route ${href}`);
    if (seen.has(href)) {
      assert.fail(`duplicate route ${href} for ${seen.get(href)} and ${product.id}`);
    }
    seen.set(href, product.id);
    const bySlug = getProductBySlug(product.slug);
    assert.equal(String(bySlug?.id), String(product.id), `${product.id} slug does not resolve to itself`);
  });
  assert.equal(seen.size, 21);
});

test("kids products carry inventory linkage", () => {
  kidsProducts().forEach((product) => {
    assert.ok(Number.isInteger(product.stock ?? -1) && product.stock >= 0, `${product.id} stock`);
    assert.ok(["in-stock", "low-stock", "made-to-order", "unavailable"].includes(product.availability), `${product.id} availability`);
  });
});

/* ------------------------------------------------------------------ */
/* 8. Admin and employee access                                        */
/* ------------------------------------------------------------------ */

test("every kids product is visible to Admin product management", () => {
  const register = catalogRepository.all();
  kidsProducts().forEach((product) => {
    const row = register.find((entry) => String(entry.id) === String(product.id));
    assert.ok(row, `${product.id} missing from the shared product register`);
    assert.equal(row.category, "kidswear", `${product.id} category in register`);
    assert.equal(row.subcategory, product.subcategory, `${product.id} subcategory in register`);
    assert.equal(row.price, product.price, `${product.id} price in register`);
  });
});

test("kidswear sync marker is exported and versioned", () => {
  assert.ok(Number.isInteger(CATALOGUE_SYNC_VERSION) && CATALOGUE_SYNC_VERSION >= 2);
});

test("stale stored kidswear rows are repaired by the remap sync", () => {
  /* A register persisted before the remap: 8 misclassified kidswear rows
     with legacy names and house/pexels plates, beside unrelated products. */
  const stale = [
    { id: "pf-078", name: "Wedding Kurta Set in Ivory & Gold", category: "menswear", price: 8900 },
    { id: "pf-079", name: "Girls' Festive Lehenga Set in Rose", category: "kidswear", price: 4200, image: "kids-festive-wear" },
    { id: "pf-081", name: "Girls' Ethnic Set in Marigold", category: "kidswear", price: 2400, image: "kids-festive-wear" },
    { id: "pf-082", name: "Girls' Festive Frock in Blush", category: "kidswear", price: 1850, image: "kids-festive-wear" },
    { id: "pf-084", name: "Boys' Silk Kurta Set in Navy", category: "kidswear", price: 2950, image: "kids-kurta-sets" },
    { id: "pf-legacy-201", name: "Custom Kids Pyjama", category: "kidswear", price: 999, image: "/library/kids-002.webp" },
  ];

  const repaired = replaceStaleKidswearRows(stale);
  const kidswear = repaired.filter((row) => row.category === "kidswear");

  /* The 8 legacy-named rows are gone; the 21 fresh records replace them. */
  assert.equal(repaired.some((row) => row.name === "Girls' Festive Frock in Blush"), false);
  assert.equal(repaired.some((row) => row.name === "Girls' Ethnic Set in Marigold"), false);
  assert.equal(repaired.some((row) => row.name === "Boys' Silk Kurta Set in Navy"), false);
  assert.equal(kidswear.length, 22, "21 fresh rows + 1 preserved custom row expected");

  /* Fresh rows carry the image-grounded names and library plates. */
  const freshYellow = kidswear.find((row) => String(row.id) === "pf-082");
  assert.equal(freshYellow.name, "Boys' Casual T-Shirt & Shorts Set in Yellow & Olive");
  assert.equal(freshYellow.image, "/library/kids-004.webp");
  assert.equal(freshYellow.category, "kidswear");
  assert.ok(freshYellow.price > 0 && freshYellow.price < 4000);

  /* An admin-created kids row outside the authored range is preserved. */
  assert.ok(repaired.some((row) => row.id === "pf-legacy-201" && row.name === "Custom Kids Pyjama"));

  /* Non-kids rows are untouched. */
  assert.ok(repaired.some((row) => row.id === "pf-078" && row.category === "menswear"));

  /* Re-running the repair is a no-op (idempotent). */
  const twice = replaceStaleKidswearRows(repaired);
  assert.equal(twice.filter((row) => row.category === "kidswear").length, kidswear.length);
});

test("kidswear facets only surface values the kidswear catalogue actually carries", () => {
  const occasions = new Set();
  kidsProducts().forEach((product) => (product.occasion ?? []).forEach((value) => occasions.add(value)));
  ["Bridal", "Wedding", "Reception", "Puja", "Festive"].forEach((value) => {
    assert.ok(!occasions.has(value), `kids occasion facet still carries ${value}`);
  });
  ["Everyday", "Party", "Play", "Gifting"].forEach((value) => {
    assert.ok(occasions.has(value), `kids occasion facet missing ${value}`);
  });
});

/* ------------------------------------------------------------------ */
/* 9. The remap correction set                                         */
/* ------------------------------------------------------------------ */

test("user-reported mismatches are corrected to the actual image content", () => {
  /* kids-004: boy in a yellow casual T-shirt and shorts (was Girls' frock). */
  const yellowTee = kidsProducts().find((product) => fileOf(getProductMediaSet(product).primary) === "kids-004.webp");
  assert.ok(yellowTee, "kids-004 product missing");
  assert.match(yellowTee.name, /^Boys' .*T-Shirt & Shorts Set/i);
  assert.match(yellowTee.name, /Yellow/i);
  assert.equal(yellowTee.subcategory, "Boys T-Shirt & Shorts Set");

  /* kids-003: printed shirt + shorts outfit (was Girls' ethnic set). */
  const printedSet = kidsProducts().find((product) => fileOf(getProductMediaSet(product).primary) === "kids-003.webp");
  assert.ok(printedSet, "kids-003 product missing");
  assert.match(printedSet.name, /^Boys' Printed Shirt & Shorts Set/i);
  assert.ok(!printedSet.name.includes("Girls'"), "kids-003 must not be labelled girls'");

  /* kids-006: boy in a blue/yellow casual outfit (was Boys' silk kurta). */
  const blueYellow = kidsProducts().find((product) => fileOf(getProductMediaSet(product).primary) === "kids-006.webp");
  assert.ok(blueYellow, "kids-006 product missing");
  assert.match(blueYellow.name, /Blue & Yellow/i);
  assert.doesNotMatch(blueYellow.name, /Kurta|Silk/i);
});
