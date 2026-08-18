/** Runtime audit of the universal Product lifecycle and storefront boundary. */

import catalogRepository from "../src/services/catalogRepository.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { getProductWorkflowState, WORKFLOW_STAGES } from "../src/services/workflow/productWorkflowState.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
setupCanonicalState();

const selected = catalogRepository.all().find((product) => product.department === "kids");
const stage = () => getProductWorkflowState(catalogRepository.find(selected?.id)).stage;
const visible = () => getLiveStorefrontProducts().some((product) => product.id === selected?.id);
const observations = [];
const record = (label, pass, detail) => observations.push([label, Boolean(pass), detail]);

record("A canonical department product is discovered dynamically", selected, selected?.id || "none");
if (selected) {
  const validation = validateProductForPublish(selected);
  record("Universal publish validation passes", validation.ok, validation.issues?.map((issue) => issue.code).join(", ") || "valid");
  record("Initial stage is DRAFT", stage() === WORKFLOW_STAGES.DRAFT, stage());
  record("DRAFT is storefront-hidden", !visible(), visible());

  const skippedApproval = commands.approveProduct(selected.id, ADMIN);
  const skippedPublish = commands.publishProduct(selected.id, ADMIN);
  record("Approval cannot skip submission", !skippedApproval.ok && stage() === WORKFLOW_STAGES.DRAFT, skippedApproval.error || "blocked");
  record("Publication cannot skip submission", !skippedPublish.ok && stage() === WORKFLOW_STAGES.DRAFT, skippedPublish.error || "blocked");

  const submitted = commands.submitProduct(selected.id, ADMIN);
  record("DRAFT → SUBMITTED", submitted.ok && stage() === WORKFLOW_STAGES.SUBMITTED, stage());
  record("SUBMITTED is storefront-hidden", !visible(), visible());
  const earlyPublish = commands.publishProduct(selected.id, ADMIN);
  record("Publication cannot skip approval", !earlyPublish.ok && stage() === WORKFLOW_STAGES.SUBMITTED, earlyPublish.error || "blocked");

  const approved = commands.approveProduct(selected.id, ADMIN);
  record("SUBMITTED → APPROVED", approved.ok && stage() === WORKFLOW_STAGES.APPROVED, stage());
  record("APPROVED is storefront-hidden", !visible(), visible());

  const published = commands.publishProduct(selected.id, ADMIN);
  record("APPROVED → PUBLISHED", published.ok && stage() === WORKFLOW_STAGES.PUBLISHED, stage());
  record("PUBLISHED is storefront-visible", visible(), visible());
}

console.log("# CANONICAL PRODUCT LIFECYCLE AUDIT\n");
for (const [label, pass, detail] of observations) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label} (${String(detail)})`);
}
console.log("\nRequired chain: DRAFT → SUBMITTED → APPROVED → PUBLISHED");
if (observations.some(([, pass]) => !pass)) process.exitCode = 1;
