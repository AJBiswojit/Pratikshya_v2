/** Verify canonical publication reaches every storefront projection and persists. */

import { readFileSync } from "node:fs";

import catalogRepository, { productsRegisterRaw } from "../src/services/catalogRepository.js";
import { getExploreProducts } from "../src/data/products/explore.js";
import { getLiveStorefrontProducts, getProductBySlug } from "../src/data/products/index.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { getProductWorkflowState, WORKFLOW_STAGES } from "../src/services/workflow/productWorkflowState.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import { getWorkflowCommands, workflowRegistryLoaded } from "../src/services/workflow/workflowCommandRegistry.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
setupCanonicalState();

const selected = catalogRepository.all().find((product) => product.department === "kids");
const checks = [];
const check = (label, pass, detail) => checks.push([label, Boolean(pass), detail]);
const visible = () => getLiveStorefrontProducts().some((product) => product.id === selected?.id);
const stage = () => getProductWorkflowState(catalogRepository.find(selected?.id)).stage;

check("Workflow command registry is loaded", workflowRegistryLoaded() && Boolean(getWorkflowCommands()), "registry");
check(
  "Application entry registers commands for every route",
  /import\s+["']\.\/services\/workflow\/productWorkflowCommands["']/.test(readFileSync("src/main.jsx", "utf8")),
  "src/main.jsx"
);
check("Canonical Product is discovered dynamically", selected, selected?.id || "none");

if (selected) {
  check("Universal validator authorizes the record", validateProductForPublish(selected).ok, "validator");
  check("DRAFT starts hidden", stage() === WORKFLOW_STAGES.DRAFT && !visible(), stage());

  const submit = commands.submitProduct(selected.id, ADMIN);
  check("DRAFT → SUBMITTED", submit.ok && stage() === WORKFLOW_STAGES.SUBMITTED, stage());
  check("SUBMITTED remains hidden", !visible(), visible());

  const approve = commands.approveProduct(selected.id, ADMIN);
  check("SUBMITTED → APPROVED", approve.ok && stage() === WORKFLOW_STAGES.APPROVED, stage());
  check("APPROVED remains hidden", !visible(), visible());

  const publish = commands.publishProduct(selected.id, ADMIN);
  check("APPROVED → PUBLISHED", publish.ok && stage() === WORKFLOW_STAGES.PUBLISHED, stage());
  check("Live storefront includes Product ID", visible(), selected.id);
  check("Explore includes Product ID", getExploreProducts().some((product) => product.id === selected.id), selected.id);
  check(
    "Generic department query includes Product ID",
    queryCatalogue({ filters: { department: selected.department } }).results.some((product) => product.id === selected.id),
    selected.department
  );
  check("PDP lookup resolves canonical slug", getProductBySlug(selected.slug)?.id === selected.id, selected.slug);

  const persisted = JSON.parse(productsRegisterRaw());
  check(
    "Persisted register retains PUBLISHED",
    persisted.find((product) => product.id === selected.id)?.status === "PUBLISHED",
    "refresh boundary"
  );

  const unpublish = commands.unpublishProduct(selected.id, ADMIN);
  check("Unpublish command succeeds", unpublish.ok, unpublish.error || "ok");
  check("Unpublished record leaves storefront", !visible(), visible());
}

console.log("# PUBLISH VISIBILITY AUDIT\n");
checks.forEach(([label, pass, detail]) => console.log(`${pass ? "PASS" : "FAIL"}  ${label} (${String(detail)})`));
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
