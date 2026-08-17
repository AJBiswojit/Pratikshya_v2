/**
 * PRATIKSHYA FASHON — Canonical product lifecycle audit (Phase 3C).
 *
 *   npm run audit:canonical-lifecycle
 *
 * ONE PRODUCT LIFECYCLE · ONE AUTHORIZED COMMAND PATH · ONE VALIDATION PATH
 * ONE PERSISTENCE PATH · ONE ACTIVITY EVENT PATH
 *
 * The audit proves there is no way to move a product through its lifecycle
 * except the canonical workflow command layer:
 *
 *   UI → canonical command → authorization → validation → transition
 *      → persistence → activity
 *
 * It combines STATIC checks (what the source can express) with RUNTIME
 * probes (what the system actually does), because either alone is provable
 * only in one direction: static analysis cannot see an authorization hole,
 * and a probe cannot see a bypass nobody happened to call.
 *
 * Scratch records are prefixed CLC-* and are always cleaned up.
 * Exits 1 on any dangerous lifecycle bypass.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

import catalogRepository, {
  PRODUCT_STATUS,
  REVIEW_STATE,
} from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import {
  getWorkflowCommands,
  getPublishValidator,
  workflowRegistryLoaded,
} from "../src/services/workflow/workflowCommandRegistry.js";
import {
  assignMediaToProduct,
  validateMediaOwnershipTransfer,
} from "../src/services/media/mediaOwnershipService.js";
import { changeProductId } from "../src/services/productWorkflow.js";
import { approveKidsProduct, publishKidsProduct } from "../src/services/kidsProductFinalization.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { getProductWorkflowState, WORKFLOW_STAGES } from "../src/services/workflow/productWorkflowState.js";
import { kidsFileNameOf, kidsMediaFileForProductId } from "../src/services/kidsProductIdentity.js";
import { setupBaseState, setupMigratedState } from "../tests/helpers/workflowTestState.js";

const ROOT = process.cwd();
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
const MANAGER = { employeeId: "PF-MGR-00008", label: "Vikram Iyer" };
const ANONYMOUS = { customerId: "CUST-0001", name: "A Customer" };

const line = (text = "") => console.log(text);
const bypasses = [];
let checked = 0;

const check = (label, ok, detail = "") => {
  checked += 1;
  if (ok) {
    line(`  PASS  ${label}`);
  } else {
    bypasses.push(label);
    line(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* ------------------------------------------------------------------ */
/* Source helpers                                                      */
/* ------------------------------------------------------------------ */

const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/**
 * Extracts the balanced `{ … }` body that follows a declaration marker.
 *
 * The scanner is comment-aware as well as string-aware: an apostrophe in a
 * prose comment ("the service's own lookup") must not be mistaken for the
 * start of a string literal, or brace matching silently runs off the end of
 * the function and the audit reports a false bypass.
 */
const extractBody = (source, declaration) => {
  const start = source.indexOf(declaration);
  if (start < 0) return null;
  const brace = source.indexOf("{", start + declaration.length);
  if (brace < 0) return null;
  let depth = 0;
  let quote = null;
  let escaped = false;
  let comment = null; // "line" | "block"
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (comment === "line") {
      if (char === "\n") comment = null;
      continue;
    }
    if (comment === "block") {
      if (char === "*" && next === "/") {
        comment = null;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "/" && next === "/") {
      comment = "line";
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      comment = "block";
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(brace + 1, index);
    }
  }
  return null;
};

const readSource = (relative) => readFileSync(join(ROOT, relative), "utf8");

const walk = (dir, out = []) => {
  readdirSync(dir).forEach((entry) => {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if ([".js", ".jsx"].includes(extname(abs))) out.push(abs);
  });
  return out;
};

const repositorySource = readSource("src/services/catalogRepository.js");
const workflowSource = readSource("src/services/productWorkflow.js");
const commandSource = readSource("src/services/workflow/productWorkflowCommands.js");
const kidsSource = readSource("src/services/kidsProductFinalization.js");
const registrySource = readSource("src/services/workflow/workflowCommandRegistry.js");

line("# CANONICAL PRODUCT LIFECYCLE AUDIT — Phase 3C");
line();

/* ------------------------------------------------------------------ */
/* 1. Canonical command registry                                       */
/* ------------------------------------------------------------------ */

line("## 1. Canonical command registry");

const REQUIRED_COMMANDS = [
  "createProduct",
  "assignProduct",
  "saveProductDraft",
  "submitProduct",
  "returnProduct",
  "approveProduct",
  "publishProduct",
  "archiveProduct",
  "restoreProduct",
  "unpublishProduct",
  "bulkPublish",
];

check("canonical command registry module exists", registrySource.includes("registerWorkflowCommands"));
check("workflow command layer is registered", workflowRegistryLoaded());
check("repository can reach the canonical commands", Boolean(getWorkflowCommands()));
check("universal publish validator is registered", typeof getPublishValidator() === "function");
const missingCommands = REQUIRED_COMMANDS.filter((name) => typeof commands[name] !== "function");
check(
  "every required lifecycle command exists",
  missingCommands.length === 0,
  missingCommands.join(", ")
);
check(
  "there is exactly ONE bulk lifecycle command (bulkPublish)",
  (commandSource.match(/export const bulk[A-Z]\w*/g) ?? []).length === 1
);
line();

/* ------------------------------------------------------------------ */
/* 2. updateStatus must not bypass the canonical command               */
/* ------------------------------------------------------------------ */

line("## 2. updateStatus — compatibility adapter only");

const updateStatusBody = stripComments(extractBody(repositorySource, "updateStatus: (") ?? "");
check("updateStatus body could be inspected", updateStatusBody.length > 0);
check(
  "updateStatus performs no direct writeProduct()",
  !updateStatusBody.includes("writeProduct(")
);
check(
  "updateStatus delegates to the canonical command layer",
  updateStatusBody.includes("_workflowCommand")
);
check(
  "updateStatus implements no workflow rules of its own",
  !/review\s*:|workflow\s*:|REVIEW_STATE\./.test(updateStatusBody)
);
check(
  "updateStatus refuses a status it cannot map to a canonical command",
  /not a direct transition|Unknown product status/.test(updateStatusBody)
);
line();

/* ------------------------------------------------------------------ */
/* 3. bulkUpdate must not bypass the canonical command                 */
/* ------------------------------------------------------------------ */

line("## 3. bulkUpdate — lifecycle routes through canonical commands");

const bulkUpdateBody = stripComments(extractBody(repositorySource, "bulkUpdate: (") ?? "");
check("bulkUpdate body could be inspected", bulkUpdateBody.length > 0);
check(
  "bulkUpdate strips the lifecycle status from the merchandising patch",
  /status:\s*_lifecycleStatus/.test(bulkUpdateBody)
);
check(
  "bulkUpdate never writes a lifecycle status directly",
  !/writeProduct\(\s*\{\s*\.\.\.patch/.test(bulkUpdateBody)
);
check(
  "bulk publish delegates to the canonical bulkPublish command",
  bulkUpdateBody.includes('"bulkPublish"')
);
check(
  "other bulk lifecycle statuses delegate to a canonical command",
  bulkUpdateBody.includes("lifecycleCommand") && bulkUpdateBody.includes("_workflowCommand")
);
line();

/* ------------------------------------------------------------------ */
/* 4. changeProductId must use the media ownership service             */
/* ------------------------------------------------------------------ */

line("## 4. changeProductId — canonical media ownership");

const changeIdBody = stripComments(extractBody(workflowSource, "export const changeProductId =") ?? "");
check("changeProductId body could be inspected", changeIdBody.length > 0);
check(
  "changeProductId performs no direct mediaRepository.assignToProduct",
  !changeIdBody.includes("mediaRepository.assignToProduct")
);
check(
  "changeProductId validates the new Product ID before writing",
  changeIdBody.includes("validateProductIdChange")
);
check(
  "changeProductId preflights ownership through the canonical service",
  changeIdBody.includes("validateOwnershipTransfer")
);
check(
  "changeProductId transfers ownership through the canonical service",
  changeIdBody.includes("safeTransferOwnership")
);
check(
  "changeProductId records the rename activity event",
  changeIdBody.includes("PRODUCT_RENAMED_ID")
);
line();

/* ------------------------------------------------------------------ */
/* 5. Media ownership call classification                              */
/* ------------------------------------------------------------------ */

line("## 5. mediaRepository ownership call sites");

const OWNERSHIP_CLASSIFICATION = {
  "src/services/media/mediaRepository.js": "canonical internal implementation",
  "src/services/media/mediaOwnershipService.js": "canonical ownership service",
  "src/services/catalogueReconciliation.js": "migration writer (legacy, unreachable from production)",
  "src/hooks/useMediaActions.js": "media-library mapping (not a workflow lifecycle path)",
};

const productionFiles = [
  ...walk(join(ROOT, "src", "services")),
  ...walk(join(ROOT, "src", "pages")),
  ...walk(join(ROOT, "src", "components")),
  ...walk(join(ROOT, "src", "hooks")),
];

const ownershipCallers = new Map();
productionFiles.forEach((abs) => {
  const relative = abs.replace(`${ROOT}/`, "");
  const source = stripComments(readFileSync(abs, "utf8"));
  if (/mediaRepository\s*\.\s*(assignToProduct|unassignFromProduct)\s*\(/.test(source)) {
    ownershipCallers.set(relative, OWNERSHIP_CLASSIFICATION[relative] ?? "UNCLASSIFIED");
  }
});
[...ownershipCallers.entries()].sort().forEach(([file, classification]) => {
  line(`        ${file} → ${classification}`);
});
check(
  "every mediaRepository ownership caller is a classified safe site",
  [...ownershipCallers.values()].every((value) => value !== "UNCLASSIFIED"),
  [...ownershipCallers.entries()].filter(([, v]) => v === "UNCLASSIFIED").map(([f]) => f).join(", ")
);
check(
  "no workflow/lifecycle service mutates media ownership directly",
  ![...ownershipCallers.keys()].includes("src/services/productWorkflow.js") &&
    ![...ownershipCallers.keys()].includes("src/services/workflow/productWorkflowCommands.js") &&
    ![...ownershipCallers.keys()].includes("src/services/kidsProductFinalization.js")
);
check(
  "the ownership service exposes a read-only transfer preflight",
  typeof validateMediaOwnershipTransfer === "function"
);
line();

/* ------------------------------------------------------------------ */
/* 6. No direct lifecycle write from the UI                            */
/* ------------------------------------------------------------------ */

line("## 6. UI direct lifecycle writes");

const LIFECYCLE_LITERALS = ["PUBLISHED", "APPROVED", "ARCHIVED", "RETURNED", "SUBMITTED", "PENDING_REVIEW"];
const uiFiles = [
  ...walk(join(ROOT, "src", "pages")),
  ...walk(join(ROOT, "src", "components")),
  ...walk(join(ROOT, "src", "hooks")),
];

const uiViolations = [];
uiFiles.forEach((abs) => {
  const relative = abs.replace(`${ROOT}/`, "");
  const source = stripComments(readFileSync(abs, "utf8"));

  /* The single writer and the persistence primitive are service-only. */
  if (/\bwriteProduct\s*\(/.test(source)) uiViolations.push(`${relative}: writeProduct()`);
  if (/persistCatalogueState\s*\(/.test(source)) uiViolations.push(`${relative}: persistCatalogueState()`);

  /* Direct field assignment of a lifecycle state. */
  LIFECYCLE_LITERALS.forEach((literal) => {
    const assign = new RegExp(`\\.(status|workflowState|lifecycle)\\s*=\\s*["']${literal}["']`);
    if (assign.test(source)) uiViolations.push(`${relative}: direct .status = "${literal}"`);
  });

  /* A lifecycle status pushed through a non-lifecycle repository writer. */
  for (const match of source.matchAll(/catalogRepository\s*\.\s*(updateProduct|updateDraft|upsert|createProduct)\s*\(/g)) {
    const window = source.slice(match.index, match.index + 400);
    LIFECYCLE_LITERALS.filter((literal) => literal !== "PENDING_REVIEW").forEach((literal) => {
      if (new RegExp(`status\\s*:\\s*["']${literal}["']`).test(window)) {
        uiViolations.push(`${relative}: ${match[1]}() writes status ${literal}`);
      }
    });
  }
});
uiViolations.forEach((violation) => line(`        ${violation}`));
check("no UI file performs a direct workflow write", uiViolations.length === 0);

/* Every UI lifecycle action must name a canonical command or an adapter
   that provably delegates to one. */
const ROUTED_ACTIONS = [
  "publishProduct",
  "approveProduct",
  "archiveProduct",
  "restoreProduct",
  "unpublishProduct",
  "rejectProduct",
  "submitForReview",
  "bulkUpdate",
  "updateStatus",
  "publishKidsProduct",
  "approveKidsProduct",
];
const uiActionSites = new Set();
uiFiles.forEach((abs) => {
  const source = stripComments(readFileSync(abs, "utf8"));
  ROUTED_ACTIONS.forEach((action) => {
    if (new RegExp(`\\b${action}\\s*\\(`).test(source)) {
      uiActionSites.add(abs.replace(`${ROOT}/`, ""));
    }
  });
});
line(`        routed lifecycle call sites: ${uiActionSites.size}`);
line();

/* ------------------------------------------------------------------ */
/* 7. Kids does not bypass the universal lifecycle                     */
/* ------------------------------------------------------------------ */

line("## 7. Kids lifecycle integration");

const approveKidsBody = stripComments(extractBody(kidsSource, "export const approveKidsProduct =") ?? "");
const publishKidsBody = stripComments(extractBody(kidsSource, "export const publishKidsProduct =") ?? "");
const returnKidsBody = stripComments(extractBody(kidsSource, "export const returnKidsProductToDraft =") ?? "");

check("approveKidsProduct delegates to the universal command", approveKidsBody.includes("workflowCommands.approveProduct"));
check("publishKidsProduct delegates to the universal command", publishKidsBody.includes("workflowCommands.publishProduct"));
check("returnKidsProductToDraft delegates to the universal command", returnKidsBody.includes("workflowCommands.returnProduct"));
check(
  "no Kids lifecycle function writes the product register directly",
  !approveKidsBody.includes("writeProduct(") &&
    !publishKidsBody.includes("writeProduct(") &&
    !/catalogRepository\.update(Product|Draft)/.test(publishKidsBody + approveKidsBody)
);
check(
  "the Kids category validator is plugged into the universal validator",
  readSource("src/services/workflow/productPublishValidator.js").includes("CATEGORY_VALIDATORS")
);
line();

/* ------------------------------------------------------------------ */
/* 8. Runtime probes — authorization, validation, transitions          */
/* ------------------------------------------------------------------ */

line("## 8. Runtime lifecycle probes");

setupMigratedState();

const createScratch = (id) => {
  const media = mediaRepository.create({
    url: `/library/audit-canonical-${id}.webp`,
    title: "Canonical lifecycle audit scratch",
    status: "ACTIVE",
  });
  const created = catalogRepository.createDraftProduct(
    {
      id,
      name: "Canonical Lifecycle Audit Piece",
      category: "dupattas",
      subcategory: "Printed Dupatta",
      description: "Audit scratch product.",
      sku: `${id}-SKU`,
      price: 1400,
      pricing: { sellingPrice: 1400, mrp: 1800 },
      stock: 4,
      mediaIds: [media.id],
      primaryMediaId: media.id,
      galleryMediaIds: [media.id],
      reviewFlags: [],
    },
    ADMIN
  );
  const ownership = assignMediaToProduct({
    mediaId: media.id,
    productId: created.product.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  if (!ownership.ok) check(`scratch ownership for ${id}`, false, ownership.error);
  return { media, product: catalogRepository.find(created.product.id) };
};

const cleanup = (scratch) => {
  const current = catalogRepository.find(scratch.product.id);
  if (current && current.status !== PRODUCT_STATUS.ARCHIVED) {
    commands.archiveProduct(current.id, ADMIN);
  }
  mediaRepository.remove(scratch.media.id);
};

const submitApprove = (id) => {
  commands.submitProduct(id, ADMIN);
  return commands.approveProduct(id, ADMIN);
};

/* --- approve ≠ publish -------------------------------------------- */
const a = createScratch("CLC-AUDIT-001");
submitApprove(a.product.id);
const afterApprove = catalogRepository.find(a.product.id);
check("approve does NOT publish", afterApprove.status !== PRODUCT_STATUS.PUBLISHED);
check("approve records the APPROVED review state", afterApprove.review?.state === REVIEW_STATE.APPROVED);
check(
  "an approved product is NOT storefront-visible",
  !getLiveStorefrontProducts().some((product) => product.id === a.product.id)
);
const publishedA = commands.publishProduct(a.product.id, ADMIN);
check("an approved + valid product publishes", publishedA.ok, publishedA.error);
check(
  "storefront visibility only follows a successful publish",
  getLiveStorefrontProducts().some((product) => product.id === a.product.id)
);
check(
  "the canonical command records the PUBLISHED workflow state",
  getProductWorkflowState(catalogRepository.find(a.product.id)).stage === WORKFLOW_STAGES.PUBLISHED
);
cleanup(a);

/* --- publish requires approval ------------------------------------ */
const b = createScratch("CLC-AUDIT-002");
const earlyPublish = commands.publishProduct(b.product.id, ADMIN);
check("publish requires approval (canonical command)", !earlyPublish.ok);
check("an unapproved product stays DRAFT", catalogRepository.find(b.product.id).status === PRODUCT_STATUS.DRAFT);

/* --- updateStatus cannot bypass ----------------------------------- */
const bypassPublish = catalogRepository.updateStatus(b.product.id, "PUBLISHED", ADMIN);
check("updateStatus cannot publish an unapproved product", !bypassPublish.ok);
check(
  "updateStatus left the product unchanged",
  catalogRepository.find(b.product.id).status === PRODUCT_STATUS.DRAFT
);
const bypassReturn = catalogRepository.updateStatus(b.product.id, "RETURNED", ADMIN);
check("updateStatus cannot produce RETURNED outside the return command", !bypassReturn.ok);
const bypassApprove = catalogRepository.updateStatus(b.product.id, "APPROVED", ADMIN);
check("updateStatus cannot approve a product", !bypassApprove.ok);
const bypassAnon = catalogRepository.updateStatus(b.product.id, "ARCHIVED", ANONYMOUS);
check("updateStatus enforces authorization", !bypassAnon.ok);

/* --- bulkUpdate cannot bypass ------------------------------------- */
const bulkBypass = catalogRepository.bulkUpdate([b.product.id], { status: "PUBLISHED" }, ADMIN, "Publish");
check("bulkUpdate cannot publish an unapproved product", bulkBypass.applied === 0 && bulkBypass.skipped === 1);
check(
  "bulkUpdate left the invalid product untouched",
  catalogRepository.find(b.product.id).status === PRODUCT_STATUS.DRAFT
);

/* --- bulk safety: one invalid product never publishes another ------ */
const c = createScratch("CLC-AUDIT-003");
submitApprove(c.product.id);
const mixedBulk = catalogRepository.bulkUpdate(
  [c.product.id, b.product.id],
  { status: "PUBLISHED" },
  ADMIN,
  "Publish"
);
check("bulk publish applies only to valid products", mixedBulk.applied === 1 && mixedBulk.skipped === 1);
check("bulk publish published the approved product", catalogRepository.find(c.product.id).status === PRODUCT_STATUS.PUBLISHED);
check("bulk publish did not touch the unapproved product", catalogRepository.find(b.product.id).status === PRODUCT_STATUS.DRAFT);
cleanup(c);

/* --- authorization boundaries ------------------------------------- */
const d = createScratch("CLC-AUDIT-004");
submitApprove(d.product.id);
check("anonymous/customer cannot publish", !commands.publishProduct(d.product.id, ANONYMOUS).ok);
check("employee cannot publish", !commands.publishProduct(d.product.id, MANAGER).ok);
check("employee cannot approve", !commands.approveProduct(d.product.id, MANAGER).ok);
check("employee cannot archive", !commands.archiveProduct(d.product.id, MANAGER).ok);
check("employee cannot assign products", !commands.assignProduct(d.product.id, "PF-MGR-00008", MANAGER).ok);
check("authorized admin CAN publish", commands.publishProduct(d.product.id, ADMIN).ok);
check("admin CAN archive", commands.archiveProduct(d.product.id, ADMIN).ok);
cleanup(d);
cleanup(b);

/* --- return requires the canonical command ------------------------ */
const e = createScratch("CLC-AUDIT-005");
commands.submitProduct(e.product.id, ADMIN);
check("return without a reason is refused", !commands.returnProduct(e.product.id, "", ADMIN).ok);
const returned = commands.returnProduct(e.product.id, "Needs better plates.", ADMIN);
check("return through the canonical command succeeds", returned.ok, returned.error);
const returnedRecord = catalogRepository.find(e.product.id);
check("returned records the rejection reason", returnedRecord.review?.rejectionReason === "Needs better plates.");
check("returned is projected as the RETURNED presentation", getProductWorkflowState(returnedRecord).returned === true);
cleanup(e);

/* --- publish validation is enforced ------------------------------- */
const f = createScratch("CLC-AUDIT-006");
submitApprove(f.product.id);
catalogRepository.updateDraft(f.product.id, { price: 0, pricing: { sellingPrice: 0, mrp: 0 } }, ADMIN);
const revalidated = commands.publishProduct(f.product.id, ADMIN);
check("publish revalidates and refuses a broken approved product", !revalidated.ok);
check("publish validation is enforced by the universal validator", (revalidated.issues ?? []).length > 0);
cleanup(f);

/* --- changeProductId preserves media ownership -------------------- */
const g = createScratch("CLC-AUDIT-007");
const renamed = changeProductId(g.product.id, "CLC-AUDIT-107", ADMIN);
check("changeProductId succeeds for an authorized admin", renamed.ok, renamed.error);
if (renamed.ok) {
  check("changeProductId moved media ownership to the new Product ID", String(mediaRepository.getById(g.media.id).productId) === "CLC-AUDIT-107");
  check("old Product ID no longer exists", catalogRepository.find("CLC-AUDIT-007") === null);
  check("no media is stranded on the old Product ID", !mediaRepository.getAll().some((item) => String(item.productId) === "CLC-AUDIT-007"));
  cleanup({ media: g.media, product: { id: "CLC-AUDIT-107" } });
} else {
  cleanup(g);
}

/* --- Kids uses the universal lifecycle ---------------------------- */
const kidsId = "KID-001";
const kidsRecord = catalogRepository.find(kidsId);
if (!kidsRecord) {
  check("Kids probe product exists", false, `${kidsId} missing`);
} else {
  const kidsPublish = publishKidsProduct(kidsId, ADMIN);
  check("Kids publish is refused without the universal approval", !kidsPublish.ok);
  const kidsApprove = approveKidsProduct(kidsId, ADMIN);
  check("Kids approve is refused before submission (universal rule)", !kidsApprove.ok);
  check("Kids product was not mutated by the refused commands", catalogRepository.find(kidsId).status === kidsRecord.status);

  /* A confirmed Kids plate can never be transferred away. The lock keys on
     the plate's confirmed FILENAME (kids-001.webp → KID-001), not on whoever
     currently holds the register row, so the probe resolves it that way. */
  const plate = mediaRepository
    .getAll()
    .find((item) => kidsFileNameOf(item) === kidsMediaFileForProductId(kidsId));
  check(`the confirmed plate for ${kidsId} exists in the register`, Boolean(plate));
  if (plate) {
    const stolen = validateMediaOwnershipTransfer({
      mediaId: plate.id,
      targetProductId: "KID-002",
      principal: ADMIN,
      confirm: true,
    });
    check("a confirmed Kids plate cannot be transferred to another KID", !stolen.ok);
    const foreign = validateMediaOwnershipTransfer({
      mediaId: plate.id,
      targetProductId: "pf-001",
      principal: ADMIN,
      confirm: true,
    });
    check("a confirmed Kids plate cannot be transferred to a non-Kids product", !foreign.ok);
    const unauthorized = validateMediaOwnershipTransfer({
      mediaId: plate.id,
      targetProductId: kidsId,
      principal: MANAGER,
      confirm: true,
    });
    check("an employee cannot transfer media ownership", !unauthorized.ok);
  }
}

setupBaseState();
line();

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

line("# SUMMARY");
line(`Checks: ${checked} | Dangerous lifecycle bypasses: ${bypasses.length}`);
if (bypasses.length) {
  bypasses.forEach((bypass) => line(`  ✗ ${bypass}`));
  line("RESULT: FAIL — a product lifecycle bypass exists.");
  process.exitCode = 1;
} else {
  line("RESULT: PASS — ONE lifecycle, ONE command path, ONE validation path.");
}
