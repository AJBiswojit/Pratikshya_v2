/**
 * PRATIKSHYA FASHON — Phase 3F product image integrity tests.
 *
 * ONE canonical primary ↔ ONE product; category ↔ media-family safety;
 * marketing/product isolation; safe fallbacks; canonical resolution on
 * every storefront surface; safe archive/permanent-delete lifecycle.
 *
 * Run via `npm test`.
 */

import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import catalogRepository, { PRODUCT_STATUS } from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import {
  assignMediaToProduct,
  transferMediaOwnership,
} from "../src/services/media/mediaOwnershipService.js";
import {
  checkCategoryMediaSafety,
  mediaFamilyOf,
  isMarketingFileName,
} from "../src/services/media/mediaCategorySafety.js";
import {
  getProductCardMedia,
  getProductMediaSet,
} from "../src/services/media/productMediaSet.js";
import {
  deleteProductPermanently,
  getProductLifecycleOptions,
} from "../src/services/productDeletionService.js";
import { getLiveStorefrontProducts, getProductById } from "../src/data/products/index.js";
import { getExploreProducts, compareExploreCoverage } from "../src/data/products/explore.js";
import { getProductSlides } from "../src/services/media/productMediaSource.js";
import { parseMediaFilename } from "../src/services/media/mediaNaming.js";
import { MEDIA_SCOPES } from "../src/config/mediaTypes.js";
import { setupMigratedState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

beforeEach(() => {
  setupMigratedState();
});

const fileOf = (source) =>
  String(
    source?.fileName ||
      source?.currentFilename ||
      (source?.src || source?.url || "").split("?")[0].split("/").pop() ||
      source?.id ||
      ""
  );

const isCanonicalLibrary = (source) => {
  const src = String(source?.src || source?.url || "");
  return src.includes("/library/") && !/\/library\/(house-|hero\d)/i.test(src);
};

let scratchCounter = 0;
const createScratch = ({ category = "dupattas", subcategory = "Printed Dupatta", withMedia = true } = {}) => {
  scratchCounter += 1;
  const id = `PII-${String(scratchCounter).padStart(3, "0")}`;
  const media = withMedia
    ? mediaRepository.create({
        url: `/library/scratch-image-integrity-${id.toLowerCase()}.webp`,
        title: "Image integrity scratch",
        status: "ACTIVE",
      })
    : null;
  const created = catalogRepository.createDraftProduct(
    {
      id,
      name: `Image Integrity Scratch ${scratchCounter}`,
      category,
      subcategory,
      description: "Scratch product for Phase 3F image integrity tests.",
      sku: `${id}-SKU`,
      price: 1400,
      pricing: { sellingPrice: 1400, mrp: 1800 },
      stock: 4,
      availability: "in-stock",
      ...(media
        ? { mediaIds: [media.id], primaryMediaId: media.id, galleryMediaIds: [media.id] }
        : {}),
      reviewFlags: [],
    },
    ADMIN
  );
  assert.ok(created.ok, `scratch product must be created: ${created.error ?? ""}`);
  if (media) {
    const ownership = assignMediaToProduct({
      mediaId: media.id,
      productId: id,
      principal: ADMIN,
      actor: ADMIN,
    });
    assert.ok(ownership.ok, `scratch ownership must be assigned: ${ownership.error ?? ""}`);
  }
  return { id, media, product: catalogRepository.find(id) };
};

/* ================================================================== */
/* 1–2. One Product ID → one canonical primary                        */
/* ================================================================== */

test("1. every published product has exactly one primary, and one canonical primary maps to one product", () => {
  const owners = new Map();
  getLiveStorefrontProducts().forEach((product) => {
    const card = getProductCardMedia(product);
    assert.ok(card.image, `${product.id} must resolve a primary image`);
    if (!isCanonicalLibrary(card.image)) return;
    const file = fileOf(card.image).toLowerCase();
    const existing = owners.get(file);
    assert.ok(
      !existing || existing === String(product.id),
      `${file} is the canonical primary of both ${existing} and ${product.id}`
    );
    owners.set(file, String(product.id));
  });
  assert.ok(owners.size >= 50, "the storefront should render a canonical-led catalogue");
});

test("2. two Product IDs cannot share one canonical primary through ownership assignment", () => {
  const a = createScratch();
  const b = createScratch();

  /* B claims A's owned plate without a transfer: refused. */
  const stolen = assignMediaToProduct({
    mediaId: a.media.id,
    productId: b.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.equal(stolen.ok, false, "owned media cannot be assigned to a second product");
  assert.equal(mediaRepository.getById(a.media.id).productId, a.id, "ownership unchanged");

  /* Even the record-level claims cannot render another product's plate. */
  catalogRepository.updateDraft(b.id, { mediaIds: [a.media.id], primaryMediaId: a.media.id }, ADMIN);
  const set = getProductMediaSet(catalogRepository.find(b.id));
  assert.ok(
    set.ownershipConflicts.some((conflict) => conflict.mediaId === a.media.id),
    "the cross-product claim is reported as a conflict"
  );
  assert.ok(
    !set.gallery.some((item) => fileOf(item) === fileOf(mediaRepository.getById(a.media.id))),
    "the cross-product plate is never rendered"
  );
});

/* ================================================================== */
/* 3. Views stay one product                                          */
/* ================================================================== */

test("3. front/back/side views of one media group remain ONE product", () => {
  const groups = new Map();
  mediaRepository
    .getAll()
    .filter((media) => media.scope === MEDIA_SCOPES.PRODUCT && media.productId)
    .forEach((media) => {
      const parsed = parseMediaFilename(fileOf(media));
      if (!parsed?.groupKey || parsed.isStandalone) return;
      if (!groups.has(parsed.groupKey)) groups.set(parsed.groupKey, new Set());
      groups.get(parsed.groupKey).add(String(media.productId));
    });
  assert.ok(groups.size > 0, "grouped view families exist");
  groups.forEach((owners, groupKey) => {
    assert.equal(owners.size, 1, `${groupKey} is split across products: ${[...owners].join(", ")}`);
  });

  /* And the storefront: one product card, multiple views, same product. */
  const multiView = getLiveStorefrontProducts().find(
    (product) => getProductMediaSet(product).gallery.length >= 3
  );
  assert.ok(multiView, "a multi-view product exists");
  const set = getProductMediaSet(multiView);
  set.gallery.forEach((item) => {
    if (item.productId) assert.equal(String(item.productId), String(multiView.id));
  });
});

/* ================================================================== */
/* 4. Marketing media cannot become product media                     */
/* ================================================================== */

test("4. marketing-scoped media is refused by the ownership door", () => {
  const scratch = createScratch();
  const marketing = mediaRepository.create({
    url: "/library/scratch-marketing-integrity.webp",
    title: "Marketing integrity scratch",
    status: "ACTIVE",
  });
  mediaRepository.assignToPlacement(marketing.id, "HERO");

  const assigned = assignMediaToProduct({
    mediaId: marketing.id,
    productId: scratch.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.equal(assigned.ok, false, "marketing media must not become product media");
  assert.match(String(assigned.error), /marketing/i);

  const transferred = transferMediaOwnership({
    mediaId: marketing.id,
    targetProductId: scratch.id,
    principal: ADMIN,
    confirm: true,
    actor: ADMIN,
  });
  assert.equal(transferred.ok, false, "nor through the transfer command");

  /* House artwork by name is likewise refused as NEW product media. */
  const housePlate = mediaRepository.create({
    url: "/library/house-heritage-textile.jpg",
    title: "House plate scratch",
    status: "ACTIVE",
  });
  const houseAssigned = assignMediaToProduct({
    mediaId: housePlate.id,
    productId: scratch.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.equal(houseAssigned.ok, false, "house artwork cannot become new product media");
});

/* ================================================================== */
/* 5–8. Category safety                                               */
/* ================================================================== */

test("5. a category ↔ media-family mismatch is rejected at the ownership door", () => {
  const men = createScratch({ category: "menswear", subcategory: "Kurta", withMedia: false });
  const bangle = mediaRepository.create({
    url: "/library/jewellery-bangle-009.webp",
    title: "Bangle plate scratch",
    status: "ACTIVE",
  });
  const result = assignMediaToProduct({
    mediaId: bangle.id,
    productId: men.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.equal(result.ok, false, "menswear cannot own bangle photography");
  assert.equal(result.code, "CATEGORY_MEDIA_MISMATCH");
});

test("6. a men's product can never resolve women's bangle media", () => {
  assert.equal(checkCategoryMediaSafety("jewellery-bangle-003.webp", "menswear").ok, false);
  assert.equal(checkCategoryMediaSafety("jewellery-earring-002.webp", "menswear").ok, false);
  assert.equal(checkCategoryMediaSafety("women-innerwear-004.webp", "menswear").ok, false);
  assert.equal(checkCategoryMediaSafety("men-sherwani-001-front.webp", "menswear").ok, true);

  /* Runtime: every published menswear product renders men-* or marketing. */
  getLiveStorefrontProducts()
    .filter((product) => product.category === "menswear")
    .forEach((product) => {
      const card = getProductCardMedia(product);
      if (!isCanonicalLibrary(card.image)) return;
      assert.equal(
        checkCategoryMediaSafety(fileOf(card.image), "menswear").ok,
        true,
        `${product.id} renders ${fileOf(card.image)}`
      );
    });
});

test("7. innerwear can never resolve saree media", () => {
  assert.equal(checkCategoryMediaSafety("women-saree-silk-001-front.webp", "innerwear").ok, false);
  assert.equal(checkCategoryMediaSafety("jewellery-bangle-001.webp", "innerwear").ok, false);
  assert.equal(checkCategoryMediaSafety("women-innerwear-001.webp", "innerwear").ok, true);

  const inn = createScratch({ category: "innerwear", subcategory: "Petticoat", withMedia: false });
  const saree = mediaRepository.create({
    url: "/library/women-saree-cotton-006-front.webp",
    title: "Saree plate scratch",
    status: "ACTIVE",
  });
  const result = assignMediaToProduct({
    mediaId: saree.id,
    productId: inn.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.equal(result.ok, false, "innerwear cannot own saree photography");

  getLiveStorefrontProducts()
    .filter((product) => product.category === "innerwear")
    .forEach((product) => {
      const card = getProductCardMedia(product);
      if (!isCanonicalLibrary(card.image)) return;
      assert.match(fileOf(card.image), /^women-innerwear-/);
    });
});

test("8. jewellery/bangles never resolve unrelated textile media", () => {
  assert.equal(checkCategoryMediaSafety("women-saree-silk-002-front.webp", "jewellery").ok, false);
  assert.equal(checkCategoryMediaSafety("men-sherwani-001-front.webp", "bangles").ok, false);
  assert.equal(checkCategoryMediaSafety("women-innerwear-002.webp", "bangles").ok, false);
  assert.equal(checkCategoryMediaSafety("jewellery-bangle-001.webp", "bangles").ok, true);

  getLiveStorefrontProducts()
    .filter((product) => ["bangles", "jewellery"].includes(product.category))
    .forEach((product) => {
      const card = getProductCardMedia(product);
      if (!isCanonicalLibrary(card.image)) return;
      assert.match(
        fileOf(card.image),
        /^jewellery-/,
        `${product.id} (${product.category}) renders ${fileOf(card.image)}`
      );
    });
});

/* ================================================================== */
/* 9–10. Fallbacks                                                    */
/* ================================================================== */

test("9. a product without canonical media uses its own authored fallback, never library photography", () => {
  const product = getProductById("pf-002");
  assert.ok(product, "pf-002 exists");
  const card = getProductCardMedia(product);
  assert.ok(card.image, "a fallback is resolved");
  assert.equal(
    isCanonicalLibrary(card.image) && mediaFamilyOf(fileOf(card.image)) !== null,
    false,
    "the fallback is not another product's canonical photograph"
  );
});

test("10. no product's fallback belongs to another product", () => {
  const registerOwners = new Map();
  mediaRepository.getAll().forEach((media) => {
    if (media.productId) registerOwners.set(fileOf(media).toLowerCase(), String(media.productId));
  });
  getLiveStorefrontProducts().forEach((product) => {
    const set = getProductMediaSet(product);
    [set.primary, set.hover, ...set.gallery].filter(Boolean).forEach((source) => {
      const owner = registerOwners.get(fileOf(source).toLowerCase());
      /* Shared house/demo plates are the explicit marketing fallback tier. */
      if (isMarketingFileName(fileOf(source))) return;
      if (/pexels|unsplash/i.test(String(source.src || ""))) return;
      if (owner) {
        assert.equal(
          owner,
          String(product.id),
          `${product.id} renders ${fileOf(source)} owned by ${owner}`
        );
      }
    });
  });
});

/* ================================================================== */
/* 11–14. Storefront surfaces use the canonical catalogue             */
/* ================================================================== */

test("11. homepage product rails resolve through the canonical catalogue and media set", () => {
  const root = process.cwd();
  ["src/components/storefront/NewArrivals.jsx", "src/components/storefront/SareeEditCarousel.jsx"].forEach(
    (relative) => {
      const source = readFileSync(join(root, relative), "utf8");
      assert.ok(
        /getLiveStorefrontProducts|useSareeEditProducts|selectNewArrivalProducts|selectSareeEdit/.test(source),
        `${relative} reads the canonical catalogue`
      );
      assert.ok(
        !/const\s+\w*[Pp]roducts\s*=\s*\[\s*\{/.test(source),
        `${relative} declares no hardcoded product array`
      );
      assert.ok(
        !/["'`]\/library\/(women|men|kids|jewellery)-/.test(source),
        `${relative} hardcodes no canonical product file`
      );
    }
  );
});

test("12. Explore uses the canonical catalogue and canonical media", () => {
  const coverage = compareExploreCoverage();
  assert.equal(coverage.missing.length, 0, "no live product missing from Explore");
  assert.equal(coverage.extra.length, 0, "no phantom product in Explore");

  getExploreProducts().forEach((product) => {
    const card = getProductCardMedia(product);
    assert.ok(card.image, `${product.id} resolves an Explore image`);
  });
});

test("13. category pages show only their own category, resolved canonically", () => {
  const products = getLiveStorefrontProducts();
  ["sarees", "menswear", "innerwear", "bangles", "jewellery", "kidswear"].forEach((category) => {
    products
      .filter((product) => product.category === category)
      .forEach((product) => {
        const card = getProductCardMedia(product);
        assert.ok(card.image, `${product.id} resolves`);
        if (isCanonicalLibrary(card.image)) {
          assert.equal(
            checkCategoryMediaSafety(fileOf(card.image), category).ok,
            true,
            `${product.id} on the ${category} page renders ${fileOf(card.image)}`
          );
        }
      });
  });
});

test("14. PDP slides come from the canonical media set only", () => {
  getLiveStorefrontProducts()
    .slice(0, 25)
    .forEach((product) => {
      const slides = getProductSlides(product);
      assert.ok(slides.length >= 1, `${product.id} has PDP slides`);
      slides.forEach((slide) => {
        const owner = slide.image?.productId ?? slide.productId ?? null;
        if (owner) assert.equal(String(owner), String(product.id));
      });
    });
});

/* ================================================================== */
/* 15. Ownership stability                                            */
/* ================================================================== */

test("15. media ownership remains stable across repeated reads", () => {
  const snapshot = new Map(
    mediaRepository
      .getAll()
      .filter((media) => media.productId)
      .map((media) => [media.id, String(media.productId)])
  );
  /* Exercising the read paths must not mutate ownership. */
  getLiveStorefrontProducts().forEach((product) => getProductCardMedia(product));
  getExploreProducts().forEach((product) => getProductMediaSet(product));
  mediaRepository
    .getAll()
    .filter((media) => media.productId)
    .forEach((media) => {
      assert.equal(snapshot.get(media.id), String(media.productId), `${media.id} ownership drifted`);
    });
});

/* ================================================================== */
/* 16. Archived products leave the storefront                         */
/* ================================================================== */

test("16. an archived product no longer appears on the storefront; its media survives", () => {
  const scratch = createScratch();
  assert.ok(commands.submitProduct(scratch.id, ADMIN).ok);
  assert.ok(commands.approveProduct(scratch.id, ADMIN).ok);
  assert.ok(commands.publishProduct(scratch.id, ADMIN).ok);
  assert.ok(
    getLiveStorefrontProducts().some((product) => String(product.id) === scratch.id),
    "published scratch is storefront-visible"
  );

  assert.ok(commands.archiveProduct(scratch.id, ADMIN).ok);
  assert.ok(
    !getLiveStorefrontProducts().some((product) => String(product.id) === scratch.id),
    "archived scratch is storefront-invisible"
  );

  const media = mediaRepository.getById(scratch.media.id);
  assert.ok(media, "media record survives archiving");
  assert.equal(String(media.productId), scratch.id, "ownership survives archiving");
});

/* ================================================================== */
/* 17. Permanent delete dependency rules                              */
/* ================================================================== */

test("17. permanent deletion enforces dependency and confirmation rules", () => {
  /* A published product can never be deleted. */
  const published = getLiveStorefrontProducts()[0];
  const optionsPublished = getProductLifecycleOptions(published.id);
  assert.equal(optionsPublished.canDelete, false, "published products cannot be deleted");
  const refusedPublished = deleteProductPermanently({
    productId: published.id,
    confirmProductId: published.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.equal(refusedPublished.ok, false);

  /* A confirmed Kids identity can never be deleted. */
  const kidOptions = getProductLifecycleOptions("KID-001");
  assert.ok(kidOptions, "KID-001 exists");
  assert.equal(kidOptions.canDelete, false, "confirmed Kids identities are protected");

  /* An unused draft CAN be deleted — with the re-typed Product ID only. */
  const scratch = createScratch();
  const options = getProductLifecycleOptions(scratch.id);
  assert.equal(options.canDelete, true, options.deleteBlockers.join("; "));

  const wrongConfirmation = deleteProductPermanently({
    productId: scratch.id,
    confirmProductId: "WRONG-ID",
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.equal(wrongConfirmation.ok, false);
  assert.equal(wrongConfirmation.code, "CONFIRMATION_REQUIRED");

  const noPrincipal = deleteProductPermanently({
    productId: scratch.id,
    confirmProductId: scratch.id,
    principal: { employeeId: "PF-EMP-00002" },
    actor: null,
  });
  assert.equal(noPrincipal.ok, false, "employees cannot delete products");

  const deleted = deleteProductPermanently({
    productId: scratch.id,
    confirmProductId: scratch.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.ok(deleted.ok, deleted.error);
  assert.ok(!catalogRepository.find(scratch.id), "the draft is gone");

  /* A product that travelled the workflow keeps its history — archive only. */
  const lifecycled = createScratch();
  assert.ok(commands.submitProduct(lifecycled.id, ADMIN).ok);
  assert.ok(commands.returnProduct(lifecycled.id, "Not ready.", ADMIN).ok);
  const lifecycledOptions = getProductLifecycleOptions(lifecycled.id);
  assert.equal(lifecycledOptions.canDelete, false, "workflow history blocks permanent deletion");
});

/* ================================================================== */
/* 18. Media survives deletion                                        */
/* ================================================================== */

test("18. deleting a draft releases its media to the library — nothing is physically deleted", () => {
  const scratch = createScratch();
  const mediaId = scratch.media.id;
  assert.equal(String(mediaRepository.getById(mediaId).productId), scratch.id);

  const deleted = deleteProductPermanently({
    productId: scratch.id,
    confirmProductId: scratch.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.ok(deleted.ok, deleted.error);
  assert.deepEqual(deleted.releasedMediaIds, [mediaId]);

  const media = mediaRepository.getById(mediaId);
  assert.ok(media, "the media record still exists");
  assert.equal(media.productId, null, "ownership is released");
  assert.equal(media.scope, MEDIA_SCOPES.UNASSIGNED, "it returns to the unassigned library");

  /* Repository-level guard: a published record can never be removed. */
  const published = getLiveStorefrontProducts()[0];
  const refused = catalogRepository.removeProductRecord(published.id);
  assert.equal(refused.ok, false, "the register refuses to remove a published product");
});
