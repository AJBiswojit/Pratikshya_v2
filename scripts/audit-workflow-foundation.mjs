/** Canonical workflow foundation audit. Run with npm run audit:workflow-foundation. */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import {
  getPublishValidator,
  getWorkflowCommands,
  workflowRegistryLoaded,
} from "../src/services/workflow/workflowCommandRegistry.js";
import { assignMediaToProduct } from "../src/services/media/mediaOwnershipService.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

const ROOT = process.cwd();
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
const failures = [];
const check = (label, condition) => {
  const ok = Boolean(condition);
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
  if (!ok) failures.push(label);
};

const walk = (path, result = []) => {
  if (!existsSync(path)) return result;
  const stat = statSync(path);
  if (stat.isFile()) {
    if ([".js", ".jsx"].includes(extname(path))) result.push(path);
    return result;
  }
  readdirSync(path).forEach((entry) => walk(join(path, entry), result));
  return result;
};

console.log("# CANONICAL WORKFLOW FOUNDATION AUDIT\n");
setupCanonicalState();

const requiredCommands = [
  "createProduct",
  "assignProduct",
  "saveProductDraft",
  "submitProduct",
  "returnProduct",
  "approveProduct",
  "publishProduct",
  "archiveProduct",
  "restoreProduct",
];
check("workflow registry is loaded", workflowRegistryLoaded());
check("universal publish validator is registered", Boolean(getPublishValidator()));
check("repository can reach canonical workflow commands", Boolean(getWorkflowCommands()));
check(
  "all required lifecycle commands exist",
  requiredCommands.every((name) => typeof commands[name] === "function")
);

const products = catalogRepository.all();
const ids = products.map((product) => product.id);
const kids = products.filter((product) => product.department === "kids");
check("canonical catalogue is non-empty and Product IDs are unique", products.length > 0 && new Set(ids).size === ids.length);
check("Kids is discovered through the canonical department field", kids.length > 0);
check("canonical Kids IDs use the taxonomy-derived PF-K namespace", kids.every((product) => product.id.startsWith("PF-K-")));
const retiredIdentityPattern = new RegExp(`^${"KID" + "-"}`, "i");
check("no retired department-specific identity exists", products.every((product) => !retiredIdentityPattern.test(product.id)));

const lifecycleProduct = kids[0] || products[0];
check("DRAFT cannot publish directly", commands.publishProduct(lifecycleProduct.id, ADMIN).ok === false);
check("DRAFT cannot approve directly", commands.approveProduct(lifecycleProduct.id, ADMIN).ok === false);
check("DRAFT submits through the canonical command", commands.submitProduct(lifecycleProduct.id, ADMIN).ok);
check("SUBMITTED remains storefront-invisible", !getLiveStorefrontProducts().some((product) => product.id === lifecycleProduct.id));
check("SUBMITTED approves through the canonical command", commands.approveProduct(lifecycleProduct.id, ADMIN).ok);
check("APPROVED remains storefront-invisible", !getLiveStorefrontProducts().some((product) => product.id === lifecycleProduct.id));
check("APPROVED publishes through the canonical command", commands.publishProduct(lifecycleProduct.id, ADMIN).ok);
check("PUBLISHED reaches the storefront", getLiveStorefrontProducts().some((product) => product.id === lifecycleProduct.id));

const unauthorized = products.find((product) => product.id !== lifecycleProduct.id);
check(
  "anonymous and customer principals cannot mutate lifecycle",
  commands.submitProduct(unauthorized.id, null).ok === false &&
    commands.publishProduct(unauthorized.id, { customerId: "CUSTOMER" }).ok === false
);

const marketing = mediaRepository.create({
  url: "/images/marketing/.audit/workflow-foundation.avif",
  title: "Workflow foundation marketing probe",
  status: "ACTIVE",
});
mediaRepository.assignToPlacement(marketing.id, "HERO");
check(
  "marketing media cannot become product media",
  assignMediaToProduct({
    mediaId: marketing.id,
    productId: unauthorized.id,
    principal: ADMIN,
    actor: ADMIN,
  }).ok === false
);

const appFiles = ["src/components", "src/pages", "src/layouts", "src/hooks"]
  .flatMap((path) => walk(join(ROOT, path)));
const directWrites = appFiles.filter((path) => {
  const source = readFileSync(path, "utf8");
  return /\.status\s*=\s*["'](?:DRAFT|SUBMITTED|APPROVED|PUBLISHED)["']|\bwriteProduct\s*\(/.test(source);
});
check("application UI contains no direct lifecycle state write", directWrites.length === 0);

const architectureFiles = walk(join(ROOT, "src"));
const retiredProductStem = "kids" + "Product";
const retiredDependencyPattern = new RegExp(
  `${retiredProductStem}Identity|${retiredProductStem}Finalization|${"kids" + "Validator"}`
);
const retiredImports = architectureFiles.filter((path) =>
  retiredDependencyPattern.test(readFileSync(path, "utf8"))
);
check("source has no retired Kids workflow service dependency", retiredImports.length === 0);

setupCanonicalState();
console.log(`\nRESULT: ${failures.length ? "FAIL" : "PASS"} — ${failures.length} violation(s).`);
if (failures.length) process.exitCode = 1;
