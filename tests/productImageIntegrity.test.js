/** Canonical Product-ID/media ownership and lifecycle integrity. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { assignMediaToProduct, transferMediaOwnership } from "../src/services/media/mediaOwnershipService.js";
import { getProductCardMedia, getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { deleteProductPermanently, getProductLifecycleOptions } from "../src/services/productDeletionService.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { getExploreProducts, compareExploreCoverage } from "../src/data/products/explore.js";
import { getProductSlides } from "../src/services/media/productMediaSource.js";
import { MEDIA_SCOPES } from "../src/config/mediaTypes.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
let scratchCounter = 0;

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

const createScratch = ({ withMedia = true } = {}) => {
  scratchCounter += 1;
  const template = catalogRepository.all().find((product) => product.department === "women");
  const created = catalogRepository.createDraftProduct(
    {
      department: template.department,
      category: template.category,
      subcategory: template.subcategory,
      name: `Product integrity test ${scratchCounter}`,
      description: "Temporary generic product used to verify Product-ID media ownership.",
      sku: `PII-${String(scratchCounter).padStart(4, "0")}-SKU`,
      colors: ["Test"],
      sizes: ["Free Size"],
      fabric: "Test fabric",
      material: "Test material",
      occasion: ["Test"],
      stock: 1,
      availability: "in-stock",
      pricing: { sellingPrice: 1000, mrp: 1200 },
      reviewFlags: [],
    },
    ADMIN
  );
  assert.ok(created.ok, created.error);
  const id = created.product.id;
  const media = withMedia
    ? mediaRepository.create({
        url: `/images/products/.test/${id.toLowerCase()}/primary.avif`,
        title: "Generic product integrity test media",
        status: "ACTIVE",
      })
    : null;
  if (media) {
    const assigned = assignMediaToProduct({
      mediaId: media.id,
      productId: id,
      principal: ADMIN,
      actor: ADMIN,
    });
    assert.ok(assigned.ok, assigned.error);
  }
  return { id, media, product: catalogRepository.find(id) };
};

const publish = (id) => {
  assert.ok(commands.submitProduct(id, ADMIN).ok, `${id} submits`);
  assert.ok(commands.approveProduct(id, ADMIN).ok, `${id} approves`);
  assert.ok(commands.publishProduct(id, ADMIN).ok, `${id} publishes`);
};

test("every canonical product resolves exactly one owned primary", () => {
  const owners = new Map();
  catalogRepository.all().forEach((product) => {
    const card = getProductCardMedia(product);
    assert.ok(card.image?.src, `${product.id} needs a primary`);
    assert.equal(String(card.image.productId), String(product.id));
    assert.equal(owners.has(card.image.src), false, `${card.image.src} has duplicate ownership`);
    owners.set(card.image.src, product.id);
  });
  assert.equal(owners.size, catalogRepository.all().length);
});

test("one media record cannot be assigned to two Product IDs without transfer", () => {
  const first = createScratch();
  const second = createScratch();
  const stolen = assignMediaToProduct({
    mediaId: first.media.id,
    productId: second.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.equal(stolen.ok, false);
  assert.equal(mediaRepository.getById(first.media.id).productId, first.id);

  const moved = transferMediaOwnership({
    mediaId: first.media.id,
    targetProductId: second.id,
    principal: ADMIN,
    actor: ADMIN,
    confirm: true,
  });
  assert.ok(moved.ok, moved.error);
  assert.equal(mediaRepository.getById(first.media.id).productId, second.id);
});

test("multiple canonical views remain attached to one Product ID", () => {
  const product = catalogRepository.all().find((entry) => (entry.media?.gallery || []).length >= 2);
  assert.ok(product);
  const set = getProductMediaSet(product);
  assert.ok(set.gallery.length >= 2);
  set.gallery.forEach((item) => assert.equal(String(item.productId), String(product.id)));
  assert.equal(catalogRepository.all().filter((entry) => entry.id === product.id).length, 1);
});

test("marketing-scoped media cannot become product media", () => {
  const scratch = createScratch({ withMedia: false });
  const marketing = mediaRepository.create({
    url: "/images/marketing/.test/hero.avif",
    title: "Marketing test media",
    status: "ACTIVE",
  });
  mediaRepository.assignToPlacement(marketing.id, "HERO");

  const assigned = assignMediaToProduct({
    mediaId: marketing.id,
    productId: scratch.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.equal(assigned.ok, false);
  assert.match(String(assigned.error), /marketing/i);
});

test("canonical media reads never borrow another product's image", () => {
  const ownerBySource = new Map(
    catalogRepository.all().map((product) => [product.media.primary, product.id])
  );
  catalogRepository.all().forEach((product) => {
    const set = getProductMediaSet(product);
    [set.primary, set.hover, ...set.gallery].filter(Boolean).forEach((source) => {
      const owner = ownerBySource.get(source.src);
      if (owner) assert.equal(owner, product.id, `${product.id} borrowed ${source.src}`);
      if (source.productId) assert.equal(String(source.productId), String(product.id));
    });
  });
});

test("storefront rails, Explore, cards and PDP all use canonical records", () => {
  const coverage = compareExploreCoverage();
  assert.equal(coverage.missing.length, 0);
  assert.equal(coverage.extra.length, 0);

  const product = catalogRepository.all()[0];
  publish(product.id);
  const live = getLiveStorefrontProducts();
  assert.equal(live.length, 1);
  assert.equal(getExploreProducts().length, 1);

  const card = getProductCardMedia(live[0]);
  assert.equal(String(card.image.productId), String(product.id));
  getProductSlides(live[0]).forEach((slide) => {
    const owner = slide.image?.productId ?? slide.productId;
    if (owner) assert.equal(String(owner), String(product.id));
  });
});

test("Product Card and homepage product rails contain no hardcoded Kids media path", () => {
  [
    "src/design-system/components/ProductCard.jsx",
    "src/components/storefront/NewArrivals.jsx",
    "src/components/storefront/SareeEditCarousel.jsx",
  ].forEach((relative) => {
    const source = readFileSync(join(process.cwd(), relative), "utf8");
    assert.doesNotMatch(
      source,
      new RegExp(`${"KID" + "-"}|kids-\\d+\\.(?:webp|avif|png|jpe?g)`, "i")
    );
    assert.doesNotMatch(source, /department\s*===\s*["']kids["']\s*\?/i);
  });
});

test("media ownership remains stable across repeated reads", () => {
  const scratch = createScratch();
  const before = mediaRepository.getById(scratch.media.id);
  getProductMediaSet(catalogRepository.find(scratch.id));
  getProductCardMedia(catalogRepository.find(scratch.id));
  const after = mediaRepository.getById(scratch.media.id);
  assert.equal(after.productId, before.productId);
  assert.equal(after.scope, before.scope);
});

test("archiving removes a published product while preserving its owned media", () => {
  const product = catalogRepository.all()[0];
  const media = mediaRepository.create({
    url: `/images/products/.test/${product.id}/managed.avif`,
    title: "Managed lifecycle media",
    status: "ACTIVE",
  });
  assert.ok(assignMediaToProduct({ mediaId: media.id, productId: product.id, principal: ADMIN, actor: ADMIN }).ok);
  publish(product.id);
  assert.ok(getLiveStorefrontProducts().some((entry) => entry.id === product.id));

  assert.ok(commands.archiveProduct(product.id, ADMIN).ok);
  assert.equal(getLiveStorefrontProducts().some((entry) => entry.id === product.id), false);
  assert.equal(mediaRepository.getById(media.id).productId, product.id);
});

test("permanent deletion enforces status, authorization and confirmation", () => {
  const published = catalogRepository.all()[0];
  publish(published.id);
  assert.equal(getProductLifecycleOptions(published.id).canDelete, false);
  assert.equal(
    deleteProductPermanently({
      productId: published.id,
      confirmProductId: published.id,
      principal: ADMIN,
      actor: ADMIN,
    }).ok,
    false
  );

  const scratch = createScratch();
  assert.equal(getProductLifecycleOptions(scratch.id).canDelete, true);
  assert.equal(
    deleteProductPermanently({
      productId: scratch.id,
      confirmProductId: "WRONG",
      principal: ADMIN,
      actor: ADMIN,
    }).code,
    "CONFIRMATION_REQUIRED"
  );
  assert.equal(
    deleteProductPermanently({
      productId: scratch.id,
      confirmProductId: scratch.id,
      principal: { employeeId: "PF-EMP-00002" },
      actor: null,
    }).ok,
    false
  );
});

test("deleting an unused draft releases media without deleting the media record", () => {
  const scratch = createScratch();
  const deleted = deleteProductPermanently({
    productId: scratch.id,
    confirmProductId: scratch.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.ok(deleted.ok, deleted.error);
  assert.deepEqual(deleted.releasedMediaIds, [scratch.media.id]);
  assert.equal(catalogRepository.find(scratch.id), null);

  const media = mediaRepository.getById(scratch.media.id);
  assert.ok(media);
  assert.equal(media.productId, null);
  assert.equal(media.scope, MEDIA_SCOPES.UNASSIGNED);
});

test("workflow history blocks permanent deletion of returned drafts", () => {
  const product = catalogRepository.all()[0];
  assert.ok(commands.submitProduct(product.id, ADMIN).ok);
  assert.ok(commands.returnProduct(product.id, "Needs revision.", ADMIN).ok);
  assert.equal(getProductLifecycleOptions(product.id).canDelete, false);
});
