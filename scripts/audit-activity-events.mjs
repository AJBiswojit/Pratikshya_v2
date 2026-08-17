/**
 * PRATIKSHYA FASHON — Activity event audit (Phase 3E).
 *
 *   npm run audit:activity-events
 *
 *   ONE USER ACTION → ONE CANONICAL COMMAND → ONE APPROPRIATE ACTIVITY EVENT
 *
 * STATIC checks prove producer discipline:
 *   · lifecycle events have canonical producers (command layer / ownership
 *     service / repository primitives with explicit activity)
 *   · no page/component writes a product lifecycle event directly
 *   · the repository rename primitive no longer logs PRODUCT_RENAMED_ID
 *     (the workflow command is the single producer)
 *
 * RUNTIME probes prove event counts:
 *   · rename / approve / return / publish / archive / restore / unpublish /
 *     assign / submit / media transfer each record exactly one lifecycle
 *     event — no generic PRODUCT_EDITED beside a canonical event
 *   · historical events survive new actions unmodified
 *
 * Scratch records are prefixed AEA-* and are always cleaned up.
 * Exits 1 on any failure.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

import catalogRepository, { PRODUCT_STATUS } from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { changeProductId } from "../src/services/productWorkflow.js";
import {
  assignMediaToProduct,
  transferMediaOwnership,
} from "../src/services/media/mediaOwnershipService.js";
import { loadActivity, ACTIVITY_ACTIONS } from "../src/services/employees/activityService.js";
import { setupMigratedState, setupBaseState } from "../tests/helpers/workflowTestState.js";

const ROOT = process.cwd();
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
const EMPLOYEE_ID = "PF-MGR-00008";

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

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const walk = (dir, out = []) => {
  readdirSync(dir).forEach((entry) => {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if ([".js", ".jsx"].includes(extname(abs))) out.push(abs);
  });
  return out;
};

line("# ACTIVITY EVENT AUDIT — Phase 3E");
line();

/* ------------------------------------------------------------------ */
line("## 1. Producer inventory — who writes product lifecycle events");
/* ------------------------------------------------------------------ */

/** Product lifecycle actions and their canonical producer modules. */
const LIFECYCLE_PRODUCERS = {
  PRODUCT_SUBMITTED_FOR_REVIEW: ["src/services/workflow/productWorkflowCommands.js"],
  PRODUCT_APPROVED: ["src/services/workflow/productWorkflowCommands.js"],
  PRODUCT_REJECTED: ["src/services/workflow/productWorkflowCommands.js"],
  PRODUCT_PUBLISHED: ["src/services/workflow/productWorkflowCommands.js"],
  PRODUCT_UNPUBLISHED: ["src/services/workflow/productWorkflowCommands.js"],
  PRODUCT_ARCHIVED: ["src/services/workflow/productWorkflowCommands.js"],
  PRODUCT_RESTORED: ["src/services/workflow/productWorkflowCommands.js"],
  PRODUCT_RENAMED_ID: ["src/services/productWorkflow.js"],
  PRODUCT_MEDIA_TRANSFERRED: ["src/services/media/mediaOwnershipService.js"],
  PRODUCT_MEDIA_UNASSIGNED: ["src/services/media/mediaOwnershipService.js"],
  PRODUCT_ASSIGNED: ["src/services/catalogRepository.js"],
  PRODUCT_DRAFT_CREATED: ["src/services/catalogRepository.js"],
};

const sourceFiles = [
  ...walk(join(ROOT, "src", "services")),
  ...walk(join(ROOT, "src", "pages")),
  ...walk(join(ROOT, "src", "components")),
  ...walk(join(ROOT, "src", "hooks")),
  ...walk(join(ROOT, "src", "context")),
];

const producersOf = (action) => {
  const producers = [];
  sourceFiles.forEach((abs) => {
    const relative = abs.replace(`${ROOT}/`, "");
    const source = stripComments(readFileSync(abs, "utf8"));
    /* A producer both names the action and records activity in the file.
       The activityService itself only defines the vocabulary. */
    if (relative === "src/services/employees/activityService.js") return;
    if (!source.includes(action)) return;
    if (!/recordActivity|noteProduct|note\(/.test(source)) return;
    /* Naming an action for filtering/labels is not producing it. */
    if (
      new RegExp(`(ACTIVITY_ACTIONS\\.${action}|["']${action}["'])`).test(source) &&
      /recordActivity\s*\(|noteProduct\s*\(|note\s*\(/.test(source)
    ) {
      producers.push(relative);
    }
  });
  return producers;
};

Object.entries(LIFECYCLE_PRODUCERS).forEach(([action, canonical]) => {
  const found = producersOf(action);
  const extras = found.filter(
    (file) =>
      !canonical.includes(file) &&
      /* Kids finalization maps its vocabulary onto these actions and is a
         retained compatibility surface that delegates to the canonical
         commands; its own note() calls target Kids reconciliation facts. */
      file !== "src/services/kidsProductFinalization.js" &&
      file !== "src/services/productWorkflow.js"
  );
  check(
    `${action} has canonical producers only`,
    extras.length === 0,
    extras.length ? `unexpected: ${extras.join(", ")}` : found.join(", ")
  );
});
line();

/* ------------------------------------------------------------------ */
line("## 2. UI does not write product lifecycle events directly");
/* ------------------------------------------------------------------ */

const uiFiles = [...walk(join(ROOT, "src", "pages")), ...walk(join(ROOT, "src", "components"))];
const uiLifecycleWriters = [];
uiFiles.forEach((abs) => {
  const relative = abs.replace(`${ROOT}/`, "");
  const source = stripComments(readFileSync(abs, "utf8"));
  if (!/recordActivity\s*\(/.test(source)) return;
  const writesProductLifecycle = Object.keys(LIFECYCLE_PRODUCERS).some((action) =>
    new RegExp(`ACTIVITY_ACTIONS\\.${action}|["']${action}["']`).test(source)
  );
  if (writesProductLifecycle) uiLifecycleWriters.push(relative);
});
check(
  "no page/component records a product lifecycle event itself",
  uiLifecycleWriters.length === 0,
  uiLifecycleWriters.join(", ")
);
line();

/* ------------------------------------------------------------------ */
line("## 3. The rename primitive no longer double-logs");
/* ------------------------------------------------------------------ */

const repositorySource = stripComments(
  readFileSync(join(ROOT, "src", "services", "catalogRepository.js"), "utf8")
);
const changeIdIndex = repositorySource.indexOf("changeProductId: (");
const changeIdBody = repositorySource.slice(changeIdIndex, changeIdIndex + 1600);
check(
  "catalogRepository.changeProductId does not record PRODUCT_RENAMED_ID",
  !changeIdBody.includes("PRODUCT_RENAMED_ID"),
  "the workflow command owns the rename event"
);
const workflowSource = stripComments(
  readFileSync(join(ROOT, "src", "services", "productWorkflow.js"), "utf8")
);
check(
  "productWorkflow.changeProductId records PRODUCT_RENAMED_ID once",
  (workflowSource.match(/PRODUCT_RENAMED_ID/g) ?? []).length === 1
);
line();

/* ------------------------------------------------------------------ */
line("## 4. Runtime probes — one action, one lifecycle event");
/* ------------------------------------------------------------------ */

setupMigratedState();

const marker = () => new Set(loadActivity().map((entry) => entry.id));
const eventsSince = (mark) => loadActivity().filter((entry) => !mark.has(entry.id));

const LIFECYCLE_SET = new Set([
  ...Object.keys(LIFECYCLE_PRODUCERS),
  "PRODUCT_CREATED",
  "PRODUCT_EDITED",
  "PRODUCT_UPDATED",
  "PRODUCT_SUBMITTED",
]);
const lifecycleOnly = (events) => events.filter((entry) => LIFECYCLE_SET.has(entry.action));

const media = mediaRepository.create({
  url: "/library/scratch-activity-audit.webp",
  title: "Activity audit scratch",
  status: "ACTIVE",
});
catalogRepository.createDraftProduct(
  {
    id: "AEA-001",
    name: "Activity Audit Scratch Piece",
    category: "dupattas",
    subcategory: "Printed Dupatta",
    description: "Scratch product for the activity event audit.",
    sku: "AEA-001-SKU",
    price: 1500,
    pricing: { sellingPrice: 1500, mrp: 1900 },
    mediaIds: [media.id],
    primaryMediaId: media.id,
    galleryMediaIds: [media.id],
    reviewFlags: [],
  },
  ADMIN
);
assignMediaToProduct({ mediaId: media.id, productId: "AEA-001", principal: ADMIN, actor: ADMIN });

const probe = (label, expectedAction, run) => {
  const mark = marker();
  const result = run();
  const ok = Boolean(result?.ok);
  const relevant = lifecycleOnly(eventsSince(mark));
  check(
    `${label} → exactly one ${expectedAction}`,
    ok && relevant.length === 1 && relevant[0].action === expectedAction,
    ok
      ? relevant.map((entry) => entry.action).join(", ") || "no event"
      : `command failed: ${result?.error ?? ""}`
  );
};

probe("assign", "PRODUCT_ASSIGNED", () => commands.assignProduct("AEA-001", EMPLOYEE_ID, ADMIN));
probe("unassign", "PRODUCT_ASSIGNED", () => commands.assignProduct("AEA-001", null, ADMIN));
probe("submit", "PRODUCT_SUBMITTED_FOR_REVIEW", () => commands.submitProduct("AEA-001", ADMIN));
probe("return", "PRODUCT_REJECTED", () => commands.returnProduct("AEA-001", "Audit return.", ADMIN));
probe("re-submit", "PRODUCT_SUBMITTED_FOR_REVIEW", () => commands.submitProduct("AEA-001", ADMIN));
probe("approve", "PRODUCT_APPROVED", () => commands.approveProduct("AEA-001", ADMIN));
probe("publish", "PRODUCT_PUBLISHED", () => commands.publishProduct("AEA-001", ADMIN));
probe("unpublish", "PRODUCT_UNPUBLISHED", () => commands.unpublishProduct("AEA-001", ADMIN));
probe("archive", "PRODUCT_ARCHIVED", () => commands.archiveProduct("AEA-001", ADMIN));
probe("restore", "PRODUCT_RESTORED", () => commands.restoreProduct("AEA-001", ADMIN));

/* Rename — the known double-log from the previous phase. */
{
  const mark = marker();
  const renamed = changeProductId("AEA-001", "AEA-002", ADMIN);
  const renames = eventsSince(mark).filter(
    (entry) => entry.action === "PRODUCT_RENAMED_ID"
  );
  check(
    "rename → exactly one PRODUCT_RENAMED_ID",
    renamed.ok && renames.length === 1,
    renamed.ok ? `${renames.length} rename events` : renamed.error
  );
  const edits = eventsSince(mark).filter((entry) => entry.action === "PRODUCT_EDITED");
  check("rename adds no generic PRODUCT_EDITED", edits.length === 0);
}

/* Media transfer — including the previous-owner strip path. */
{
  const targetMedia = mediaRepository.create({
    url: "/library/scratch-activity-audit-target.webp",
    title: "Activity audit transfer target",
    status: "ACTIVE",
  });
  catalogRepository.createDraftProduct(
    {
      id: "AEA-003",
      name: "Activity Audit Transfer Target",
      category: "dupattas",
      subcategory: "Printed Dupatta",
      description: "Transfer target scratch.",
      sku: "AEA-003-SKU",
      price: 1200,
      pricing: { sellingPrice: 1200, mrp: 1500 },
      reviewFlags: [],
    },
    ADMIN
  );
  /* Give the source a catalogue plate pointing at the media so the strip
     path (the historical PRODUCT_EDITED source) runs. */
  catalogRepository.updateDraft("AEA-002", { image: media.url }, ADMIN);

  const mark = marker();
  const moved = transferMediaOwnership({
    mediaId: media.id,
    targetProductId: "AEA-003",
    principal: ADMIN,
    confirm: true,
    actor: ADMIN,
  });
  const events = lifecycleOnly(eventsSince(mark));
  check(
    "media transfer → exactly one PRODUCT_MEDIA_TRANSFERRED",
    moved.ok && events.length === 1 && events[0].action === "PRODUCT_MEDIA_TRANSFERRED",
    moved.ok ? events.map((entry) => entry.action).join(", ") : moved.error
  );

  commands.archiveProduct("AEA-003", ADMIN);
  mediaRepository.remove(targetMedia.id);
}
line();

/* ------------------------------------------------------------------ */
line("## 5. History preservation");
/* ------------------------------------------------------------------ */

{
  const before = loadActivity();
  const beforeIds = before.map((entry) => entry.id);
  commands.archiveProduct("AEA-002", ADMIN);
  const after = loadActivity();
  const afterById = new Map(after.map((entry) => [entry.id, entry]));
  const surviving = beforeIds.filter((id) => afterById.has(id));
  const unchanged = before
    .filter((entry) => afterById.has(entry.id))
    .every((entry) => JSON.stringify(afterById.get(entry.id)) === JSON.stringify(entry));
  check(
    "existing history entries are never rewritten by new actions",
    unchanged,
    `${surviving.length} prior entries retained (200-entry window applies)`
  );
}

mediaRepository.remove(media.id);
setupBaseState();

/* ------------------------------------------------------------------ */
line();
if (failures.length) {
  line(`ACTIVITY EVENT AUDIT FAIL — ${failures.length}/${checked} checks failed`);
  failures.forEach((entry) => line(`  · ${entry.label}${entry.detail ? ` — ${entry.detail}` : ""}`));
  process.exit(1);
}
line(`ACTIVITY EVENT AUDIT PASS — ${checked}/${checked} checks`);
