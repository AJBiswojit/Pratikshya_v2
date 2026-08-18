/** Canonical homepage hero runtime audit. */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import mediaRepository from "../src/services/media/mediaRepository.js";
import {
  resolveHeroSlideImages,
  resolveHomepageHeroMedia,
} from "../src/services/media/mediaResolver.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

const failures = [];
const check = (label, condition) => {
  const ok = Boolean(condition);
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
  if (!ok) failures.push(label);
};
const srcOf = (source) => source?.src || source?.url || source?.thumbnail || "";
const localExists = (source) => {
  const src = srcOf(source).split("?")[0];
  if (!src || !src.startsWith("/")) return Boolean(src);
  return existsSync(join(process.cwd(), "public", src.slice(1)));
};

setupCanonicalState();
const first = resolveHeroSlideImages();
const second = resolveHeroSlideImages();
const managed = resolveHomepageHeroMedia();

check("fresh managed-media register is empty", mediaRepository.getAll().length === 0);
check("hero resolution is deterministic", JSON.stringify(first) === JSON.stringify(second));
check("every resolved local hero source exists", first.filter(srcOf).every(localExists));
check(
  "empty managed storage does not invent hero photography",
  managed.length > 0 || first.every((source) => !srcOf(source))
);
check("managed hero placements contain no product ownership", managed.every((media) => !media.productId));

const component = readFileSync("src/components/storefront/HeroCarousel.jsx", "utf8");
check("HeroCarousel contains no hardcoded retired media address", !component.includes("/" + "library/"));
check("HeroCarousel does not randomize media", !/Math\.random|shuffle\s*\(/.test(component));

setupCanonicalState();
console.log(`\nRESULT: ${failures.length ? "FAIL" : "PASS"} — ${failures.length} violation(s).`);
if (failures.length) process.exitCode = 1;
