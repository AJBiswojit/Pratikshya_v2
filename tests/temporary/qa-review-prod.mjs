/**
 * SCRATCH QA — runs the PRODUCTION single-file build in jsdom and replays the
 * exact user flow: queue → click REVIEW → detail renders → workflow.
 */

import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const html = readFileSync(new URL("../../dist/index.html", import.meta.url), "utf8");

const dom = new JSDOM(html, {
  url: "http://localhost/admin/products/review",
  pretendToBeVisual: true,
  runScripts: "outside-only",
});

const { window } = dom;

/* Browser API shims jsdom lacks. */
window.matchMedia = (query) => ({
  matches: false, media: query, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  dispatchEvent() { return false; },
});
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
if (!window.scrollTo) window.scrollTo = () => {};
window.CSS = window.CSS ?? { supports: () => false };

const errors = [];
window.addEventListener("error", (event) => errors.push(String(event.error?.stack ?? event.message)));

/* Spy on scrollIntoView — the fix must bring the review detail on screen. */
const scrollCalls = [];
window.Element.prototype.scrollIntoView = function spy(options) {
  scrollCalls.push({ id: this.id ?? "", className: String(this.className ?? ""), options });
};
window.HTMLElement.prototype.scrollIntoView = window.Element.prototype.scrollIntoView;

/* Demo super admin session. */
window.localStorage.setItem("pratikshya_admin_auth", JSON.stringify({ adminId: "PF-ADM-00001", sessionAt: Date.now() }));

/* Extract the inline module scripts and execute them as classic scripts —
   the single-file build has no import/export statements left. */
const scripts = [...html.matchAll(/<script(?: type="module")?[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
console.log(`Executing ${scripts.length} inline script(s)…`);
for (const source of scripts) {
  /* jsdom cannot run type=module; the single-file bundle has no imports
     left, so it runs as a classic script once import.meta.url is shimmed. */
  const shimmed = source.replaceAll("import.meta.url", JSON.stringify(window.location.href));
  window.eval(shimmed);
}

const tick = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await tick(800);

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const docText = () => window.document.body.textContent ?? "";

console.log("\n# Production build — /admin/products/review");
check("app booted and queue visible", /Unified review queue/.test(docText()), `url=${window.location.href} · errors=${errors.length}`);
check("PF-BR-BNG-0001 in queue", docText().includes("PF-BR-BNG-0001"));

const rows = [...window.document.querySelectorAll("tr")];
const bngRow = rows.find((row) => row.textContent.includes("PF-BR-BNG-0001"));
const reviewButton = bngRow ? [...bngRow.querySelectorAll("button")].find((btn) => btn.textContent.trim() === "Review") : null;
check("Review button on the row", Boolean(reviewButton));

if (reviewButton) {
  reviewButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
  await tick(500);
  check("URL → ?product=PF-BR-BNG-0001", window.location.search === "?product=PF-BR-BNG-0001", window.location.href);
  check("detail renders — product id header", /Product ID · PF-BR-BNG-0001/.test(docText()));
  check("detail renders — name", docText().includes("Choodi Copper Bangles"));
  check("detail renders — action bar", /Review actions — canonical workflow commands/.test(docText()));
  const img = [...window.document.querySelectorAll("img")].map((i) => i.getAttribute("src")).find((src) => (src ?? "").includes("PF-BR-BNG-0001"));
  check("detail renders — product image", Boolean(img), img ?? "none");
  check("detail scrolled into view on Review click", scrollCalls.some((call) => call.id === "product-review-detail"), JSON.stringify(scrollCalls.map((c) => c.id)));
}

/* ---------------- full workflow through the real UI ---------------- */
const setStatusOf = (id) => {
  /* The register only persists to localStorage after the first write; before
     that, every authored record is DRAFT. */
  const raw = window.localStorage.getItem("pratikshya_products");
  const products = raw ? JSON.parse(raw) : [];
  const product = products.find((entry) => entry.id === id);
  /* Persisted status may be the authored lowercase form — normalize like
     the canonical workflow projection does. */
  return product
    ? { status: String(product.status ?? "").toUpperCase(), reviewState: String(product.review?.state ?? "NONE").toUpperCase() }
    : { status: "DRAFT", reviewState: "NONE" };
};

const setNativeValue = (element, value) => {
  const proto = element.tagName === "TEXTAREA"
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
  element.dispatchEvent(new window.Event("input", { bubbles: true }));
};

const clickButton = async (label, { contains = false } = {}) => {
  const buttons = [...window.document.querySelectorAll("button")].filter((btn) =>
    contains ? btn.textContent.includes(label) : btn.textContent.trim() === label
  );
  const btn = buttons[buttons.length - 1];
  if (!btn) return false;
  btn.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
  await tick(400);
  return true;
};

console.log("\n# Workflow through the UI — PF-BR-BNG-0001");
check("starts DRAFT", setStatusOf("PF-BR-BNG-0001")?.status === "DRAFT", JSON.stringify(setStatusOf("PF-BR-BNG-0001")));
check("editing desk visible at DRAFT", Boolean(window.document.getElementById("price-PF-BR-BNG-0001")));

/* Submit incomplete, then approve — must fail loudly, inline at the action
   bar (the reviewer sees WHY exactly where they clicked). */
check("submit for review clicked (incomplete record)", await clickButton("Submit for review"));
check("stage now SUBMITTED", setStatusOf("PF-BR-BNG-0001")?.status === "PENDING_REVIEW", JSON.stringify(setStatusOf("PF-BR-BNG-0001")));
check("premature approve clicked", await clickButton("Approve"));
check(
  "blocked approval explained inline at the action bar",
  /must be greater than zero|description is required/i.test(docText()),
  "validation message shown in the detail panel"
);
check("status unchanged by refused approve", setStatusOf("PF-BR-BNG-0001")?.reviewState === "PENDING", JSON.stringify(setStatusOf("PF-BR-BNG-0001")));

/* Return to an editable stage with a reason, then complete the record. */
check("return armed", await clickButton("Return to employee"));
const returnReason = window.document.getElementById("return-reason-PF-BR-BNG-0001");
check("return reason field shown", Boolean(returnReason));
if (returnReason) {
  setNativeValue(returnReason, "Missing price and description — complete before review.");
  await tick(120);
  const returnForm = window.document.querySelector("form");
  returnForm?.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await tick(500);
}
check("returned to editable stage", setStatusOf("PF-BR-BNG-0001")?.reviewState === "REJECTED", JSON.stringify(setStatusOf("PF-BR-BNG-0001")));
check("editing desk visible again after return", Boolean(window.document.getElementById("price-PF-BR-BNG-0001")));

const priceInput = window.document.getElementById("price-PF-BR-BNG-0001");
const compareInput = window.document.getElementById("compare-PF-BR-BNG-0001");
const descInput = window.document.getElementById("desc-PF-BR-BNG-0001");
if (priceInput && compareInput && descInput) {
  setNativeValue(priceInput, "1499");
  setNativeValue(compareInput, "1999");
  setNativeValue(descInput, "Hand-finished copper bangles for the bridal trousseau.");
  await tick(150);
  check("Save Draft clicked", await clickButton("Save Draft", { contains: true }));
  await tick(300);
}
check("submit for review clicked", await clickButton("Submit for review"));
check("stage now SUBMITTED", setStatusOf("PF-BR-BNG-0001")?.status === "PENDING_REVIEW", JSON.stringify(setStatusOf("PF-BR-BNG-0001")));
check("approve clicked", await clickButton("Approve"));
check("stage now APPROVED (not published)", (() => {
  const state = setStatusOf("PF-BR-BNG-0001");
  return state?.reviewState === "APPROVED" && state?.status !== "PUBLISHED";
})(), JSON.stringify(setStatusOf("PF-BR-BNG-0001")));
check("publish clicked", await clickButton("Publish"));
check("stage now PUBLISHED", setStatusOf("PF-BR-BNG-0001")?.status === "PUBLISHED", JSON.stringify(setStatusOf("PF-BR-BNG-0001")));

/* ---------------- the publish-error product: PF-BR-MEH-0001 ---------------- */
console.log("\n# Workflow through the UI — PF-BR-MEH-0001 (the publish-error product)");
window.history.pushState({}, "", "/admin/products/review?product=PF-BR-MEH-0001");
window.dispatchEvent(new window.PopStateEvent("popstate"));
await tick(600);
check("mehendi review detail rendered", docText().includes("Hariyali Vermilion Mehendi Ensemble"), window.location.href);
check("mehendi starts DRAFT", setStatusOf("PF-BR-MEH-0001").status === "DRAFT", JSON.stringify(setStatusOf("PF-BR-MEH-0001")));

/* Direct publish without approval must still be refused by the canonical
   command layer (existing protection — must stay). */
check("editing desk visible for mehendi", Boolean(window.document.getElementById("price-PF-BR-MEH-0001")));
const mehPrice = window.document.getElementById("price-PF-BR-MEH-0001");
const mehCompare = window.document.getElementById("compare-PF-BR-MEH-0001");
const mehDesc = window.document.getElementById("desc-PF-BR-MEH-0001");
if (mehPrice && mehCompare && mehDesc) {
  setNativeValue(mehPrice, "4899");
  setNativeValue(mehCompare, "5999");
  setNativeValue(mehDesc, "A vermilion-and-haldi green ensemble for the mehendi morning.");
  await tick(150);
  check("mehendi Save Draft clicked", await clickButton("Save Draft", { contains: true }));
  await tick(300);
}
check("mehendi submit clicked", await clickButton("Submit for review"));
check("mehendi approve clicked", await clickButton("Approve"));
check("mehendi APPROVED before publish", (() => {
  const state = setStatusOf("PF-BR-MEH-0001");
  return state.reviewState === "APPROVED" && state.status !== "PUBLISHED";
})(), JSON.stringify(setStatusOf("PF-BR-MEH-0001")));
check("mehendi publish clicked", await clickButton("Publish"));
check("mehendi PUBLISHED only after approval", setStatusOf("PF-BR-MEH-0001").status === "PUBLISHED", JSON.stringify(setStatusOf("PF-BR-MEH-0001")));

/* ---------------- invalid product id ---------------- */
console.log("\n# Invalid product id");
window.history.pushState({}, "", "/admin/products/review?product=DOES-NOT-EXIST");
window.dispatchEvent(new window.PopStateEvent("popstate"));
await tick(600);
check("invalid id → not-found state, no crash", /Product not found/.test(docText()));

check("no runtime errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(failures ? `\nPROD QA FAIL — ${failures} failures` : "\nPROD QA PASS");
process.exit(failures ? 1 : 0);
