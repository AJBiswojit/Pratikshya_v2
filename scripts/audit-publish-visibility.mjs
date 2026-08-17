/**
 * PRATIKSHYA FASHON — Publish visibility audit (Phase 3E).
 *
 *   npm run audit:publish-visibility
 *
 * THE PUBLISH BUTTON MUST HAVE A VERIFIED END-TO-END PATH:
 *
 *   ADMIN ACTION → CANONICAL COMMAND → PERSISTED PRODUCT
 *     → CACHE/QUERY INVALIDATION → STOREFRONT VISIBILITY
 *     → BROWSER REFRESH STILL SHOWS THE PRODUCT
 *
 * Combines RUNTIME probes (a scratch product travels the entire lifecycle
 * and every surface is checked at every stage) with STATIC checks for the
 * root cause found in the Phase 3E browser verification: the canonical
 * workflow command layer must be registered from the application entry so
 * lifecycle actions work on EVERY route, not only the ones whose lazy chunk
 * happens to import the review workspace.
 *
 * Scratch records are prefixed PVA-* and are always cleaned up.
 * Exits 1 on any failure.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import catalogRepository, {
  PRODUCT_STATUS,
  productsRegisterRaw,
  getCatalogVersion,
  getCatalogFingerprint,
} from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import {
  workflowRegistryLoaded,
  getWorkflowCommands,
} from "../src/services/workflow/workflowCommandRegistry.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import {
  WORKFLOW_STAGES,
  getProductWorkflowState,
} from "../src/services/workflow/productWorkflowState.js";
import { assignMediaToProduct } from "../src/services/media/mediaOwnershipService.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import {
  getLiveStorefrontProducts,
  getProductBySlug,
} from "../src/data/products/index.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { getExploreProducts } from "../src/data/products/explore.js";
import { REVIEW_FLAGS } from "../src/services/productReviewFlags.js";
import { setupMigratedState, setupBaseState } from "../tests/helpers/workflowTestState.js";

const ROOT = process.cwd();
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

const line = (text = "") => console.log(text);
const failures = [];
let checked = 0;

const check = (label, ok, detail = "") => {
  checked += 1;
  if (ok) {
    line(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failures.push({ label, detail });
    line(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

line("# PUBLISH VISIBILITY AUDIT — Phase 3E");
line();

setupMigratedState();

/* ------------------------------------------------------------------ */
line("## 1. Canonical command layer availability (the browser root cause)");
/* ------------------------------------------------------------------ */

check("workflow command registry is loaded", workflowRegistryLoaded());
check("repository adapters can reach the canonical commands", Boolean(getWorkflowCommands()));

const mainSource = readFileSync(join(ROOT, "src", "main.jsx"), "utf8");
check(
  "src/main.jsx registers the command layer for EVERY route",
  /import\s+["']\.\/services\/workflow\/productWorkflowCommands["']/.test(mainSource),
  "a direct full-page load of any admin route must be able to publish"
);
line();

/* ------------------------------------------------------------------ */
line("## 2. Runtime lifecycle probe — DRAFT → APPROVED → PUBLISHED");
/* ------------------------------------------------------------------ */

const media = mediaRepository.create({
  url: "/library/scratch-publish-visibility-audit.webp",
  title: "Publish visibility audit scratch",
  status: "ACTIVE",
});
const created = catalogRepository.createDraftProduct(
  {
    id: "PVA-001",
    name: "Publish Visibility Audit Piece",
    category: "dupattas",
    subcategory: "Printed Dupatta",
    description: "Scratch product for the publish visibility audit.",
    sku: "PVA-001-SKU",
    price: 1450,
    compareAtPrice: 1750,
    pricing: { sellingPrice: 1450, mrp: 1750 },
    stock: 2,
    availability: "in-stock",
    mediaIds: [media.id],
    primaryMediaId: media.id,
    galleryMediaIds: [media.id],
    reviewFlags: [],
  },
  ADMIN
);
check("scratch product created as DRAFT", created.ok && created.product.status === PRODUCT_STATUS.DRAFT);
check(
  "scratch media ownership assigned",
  assignMediaToProduct({ mediaId: media.id, productId: "PVA-001", principal: ADMIN, actor: ADMIN }).ok
);

const onStorefront = () =>
  getLiveStorefrontProducts().some((product) => String(product.id) === "PVA-001");
const inCategory = () =>
  queryCatalogue({ scopeFilters: { category: "dupattas" } }).results.some(
    (product) => String(product.id) === "PVA-001"
  );

check("DRAFT is not on the storefront", !onStorefront());

check("submit succeeds", commands.submitProduct("PVA-001", ADMIN).ok);
check("SUBMITTED is not on the storefront", !onStorefront());

const approved = commands.approveProduct("PVA-001", ADMIN);
check("approve succeeds", approved.ok, (approved.errors ?? []).join("; "));
check(
  "approval does NOT publish",
  catalogRepository.find("PVA-001").status !== PRODUCT_STATUS.PUBLISHED &&
    getProductWorkflowState(catalogRepository.find("PVA-001")).stage === WORKFLOW_STAGES.APPROVED
);
check("APPROVED is not on the storefront", !onStorefront());

const versionBefore = getCatalogVersion();
const fingerprintBefore = getCatalogFingerprint();
const mediaBefore = getProductMediaSet(catalogRepository.find("PVA-001"));

const published = commands.publishProduct("PVA-001", ADMIN);
check("publish command succeeds", published.ok, (published.errors ?? []).join("; "));
line();

/* ------------------------------------------------------------------ */
line("## 3. Persistence");
/* ------------------------------------------------------------------ */

const record = catalogRepository.find("PVA-001");
check("repository reflects PUBLISHED", record.status === PRODUCT_STATUS.PUBLISHED);
check("publishedAt / publishedBy recorded", Boolean(record.publishedAt && record.publishedBy));

const raw = productsRegisterRaw();
const persisted = raw ? JSON.parse(raw).find((row) => String(row.id) === "PVA-001") : null;
check("the persisted register string carries PUBLISHED", persisted?.status === PRODUCT_STATUS.PUBLISHED);
line();

/* ------------------------------------------------------------------ */
line("## 4. Cache invalidation");
/* ------------------------------------------------------------------ */

check("catalog version advanced on publish", getCatalogVersion() > versionBefore);
check("catalog fingerprint changed on publish", getCatalogFingerprint() !== fingerprintBefore);
line();

/* ------------------------------------------------------------------ */
line("## 5. Storefront queries");
/* ------------------------------------------------------------------ */

check("getLiveStorefrontProducts() includes the product", onStorefront());
check("the category query includes the product", inCategory());
check(
  "Explore includes the product",
  getExploreProducts().some((product) => String(product.id) === "PVA-001")
);
check(
  "search finds the product",
  queryCatalogue({ search: "publish visibility audit" }).results.some(
    (product) => String(product.id) === "PVA-001"
  )
);
const slug = catalogRepository.find("PVA-001").slug;
check("the PDP lookup resolves the published product", Boolean(getProductBySlug(slug)), slug);
line();

/* ------------------------------------------------------------------ */
line("## 6. Refresh retention — the raw string alone proves publication");
/* ------------------------------------------------------------------ */

/* A browser refresh rebuilds every module from the persisted string; the
   string parsed cold must already carry the publication. */
const cold = JSON.parse(productsRegisterRaw()).find((row) => String(row.id) === "PVA-001");
check("a cold re-parse of the register keeps PUBLISHED", cold?.status === PRODUCT_STATUS.PUBLISHED);
line();

/* ------------------------------------------------------------------ */
line("## 7. Media integrity after publish");
/* ------------------------------------------------------------------ */

const mediaAfter = getProductMediaSet(catalogRepository.find("PVA-001"));
check(
  "primary media unchanged by publish",
  String(mediaAfter.primary?.id) === String(mediaBefore.primary?.id)
);
check(
  "gallery unchanged by publish",
  JSON.stringify((mediaAfter.gallery ?? []).map((item) => String(item.id))) ===
    JSON.stringify((mediaBefore.gallery ?? []).map((item) => String(item.id)))
);
check(
  "register ownership unchanged by publish",
  String(mediaRepository.getById(media.id).productId) === "PVA-001"
);
line();

/* ------------------------------------------------------------------ */
line("## 8. Invalid products remain blocked");
/* ------------------------------------------------------------------ */

const blockedMedia = mediaRepository.create({
  url: "/library/scratch-publish-visibility-audit-blocked.webp",
  title: "Blocked audit scratch",
  status: "ACTIVE",
});
const blocked = catalogRepository.createDraftProduct(
  {
    id: "PVA-002",
    name: "Publish Visibility Audit Blocked Piece",
    category: "dupattas",
    subcategory: "Printed Dupatta",
    description: "Blocked scratch product for the publish visibility audit.",
    sku: "PVA-002-SKU",
    price: 1450,
    pricing: { sellingPrice: 1450, mrp: 1750 },
    mediaIds: [blockedMedia.id],
    primaryMediaId: blockedMedia.id,
    galleryMediaIds: [blockedMedia.id],
    reviewFlags: [REVIEW_FLAGS.NAME_REVIEW_REQUIRED],
  },
  ADMIN
);
check("blocked scratch created", blocked.ok);
check(
  "blocked scratch ownership assigned",
  assignMediaToProduct({ mediaId: blockedMedia.id, productId: "PVA-002", principal: ADMIN, actor: ADMIN }).ok
);
check("a DRAFT cannot publish directly", !commands.publishProduct("PVA-002", ADMIN).ok);
check("submit succeeds for the flagged product", commands.submitProduct("PVA-002", ADMIN).ok);
check(
  "a blocking review flag stops approval",
  !commands.approveProduct("PVA-002", ADMIN).ok
);
check(
  "a blocking review flag stops publication",
  !commands.publishProduct("PVA-002", ADMIN).ok
);
check(
  "the validator names the blocking flag",
  validateProductForPublish(catalogRepository.find("PVA-002")).issues.some(
    (issue) => issue.code === "REVIEW_FLAG_BLOCKING" && issue.blocksPublish
  )
);
check(
  "the blocked product never reached the storefront",
  !getLiveStorefrontProducts().some((product) => String(product.id) === "PVA-002")
);
line();

/* ------------------------------------------------------------------ */
line("## 9. Cleanup");
/* ------------------------------------------------------------------ */

check("published scratch unpublishes", commands.unpublishProduct("PVA-001", ADMIN).ok);
check("scratch PVA-001 archived", commands.archiveProduct("PVA-001", ADMIN).ok);
check("scratch PVA-002 archived", commands.archiveProduct("PVA-002", ADMIN).ok);
mediaRepository.remove(media.id);
mediaRepository.remove(blockedMedia.id);
check(
  "scratch products invisible after retirement",
  !getLiveStorefrontProducts().some((product) => ["PVA-001", "PVA-002"].includes(String(product.id)))
);

setupBaseState();

/* ------------------------------------------------------------------ */
line();
if (failures.length) {
  line(`PUBLISH VISIBILITY AUDIT FAIL — ${failures.length}/${checked} checks failed`);
  failures.forEach((entry) => line(`  · ${entry.label}${entry.detail ? ` — ${entry.detail}` : ""}`));
  process.exit(1);
}
line(`PUBLISH VISIBILITY AUDIT PASS — ${checked}/${checked} checks`);
