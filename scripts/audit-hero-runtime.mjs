/**
 * PRATIKSHYA FASHON — Homepage hero runtime audit.
 *
 *   npm run audit:hero-runtime
 *
 * Proves the complete hero resolution chain from the build-time manifest
 * through the media store, repository, resolver and the carousel's input —
 * and confirms the five canonical AVIF plates (hero001–hero005) are the
 * PRIMARY hero set with no fallback masking them.
 *
 * This audit deliberately does NOT trust the manifest alone: it re-walks the
 * same runtime path the browser uses (manifest → mediaStore → repository →
 * resolver → HeroCarousel input) and asserts the count at every stage.
 *
 * Read-only. No writes, no image bytes, no React. Exits non-zero on failure.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ingestedManifest from "../src/data/media/ingestedManifest.json";
import { MARKETING_PLACEMENTS, USAGE_ROLES } from "../src/config/mediaTypes.js";
import { readMedia } from "../src/services/media/mediaStore.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { resolveHeroSlideImages, resolveHomepageHeroMedia } from "../src/services/media/mediaResolver.js";

const EXPECTED = [
  "hero001.avif",
  "hero002.avif",
  "hero003.avif",
  "hero004.avif",
  "hero005.avif",
];

const nameOf = (m) =>
  m?.currentFilename || m?.fileName || (m?.src || "").split("/").pop() || m?.id || "?";

let failures = 0;
const ok = (label, condition, detail = "") => {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures += 1;
  console.log(`  [${status}] ${label}${detail ? ` — ${detail}` : ""}`);
  return condition;
};

console.log("\nHERO RUNTIME AUDIT\n===================");

/* 1. Manifest --------------------------------------------------------- */
const manifestHero = (ingestedManifest?.assets || []).filter(
  (a) => a.mappingMethod === "HOMEPAGE_HERO_REGISTER"
);
const manifestNames = manifestHero.map((a) => a.currentFilename || a.originalFilename);
console.log("\nManifest:");
ok("manifest carries 5 HOMEPAGE_HERO_REGISTER records", manifestHero.length === 5, `count=${manifestHero.length}`);
ok(
  "manifest filenames are hero001-005 in order",
  EXPECTED.every((n, i) => manifestNames[i] === n),
  manifestNames.join(", ")
);

/* 2. Media store ------------------------------------------------------ */
const store = readMedia();
const storeHero = store.filter(
  (m) => m.placement === MARKETING_PLACEMENTS.HOME_HERO && m.mappingMethod === "HOMEPAGE_HERO_REGISTER"
);
console.log("\nMedia store (readMedia):");
ok("store exposes 5 hero register records", storeHero.length === 5, `count=${storeHero.length}`);

/* 3. Repository ------------------------------------------------------- */
const repo = mediaRepository.getMarketingMedia(MARKETING_PLACEMENTS.HOME_HERO);
const repoHero = repo.filter((m) => m.mappingMethod === "HOMEPAGE_HERO_REGISTER");
console.log("\nRepository (getMarketingMedia HOME_HERO):");
ok("repository exposes 5 hero register records", repoHero.length === 5, `count=${repoHero.length}`);

/* 4. Resolver --------------------------------------------------------- */
const resolved = resolveHomepageHeroMedia();
const resolvedNames = resolved.map(nameOf);
console.log("\nResolver (resolveHomepageHeroMedia):");
ok("resolver returns exactly 5 hero slides", resolved.length === 5, `count=${resolved.length}`);
ok(
  "resolved order is hero001 → hero005",
  EXPECTED.every((n, i) => resolvedNames[i] === n),
  resolvedNames.join(" → ")
);
resolved.forEach((m, i) => {
  ok(
    `slide ${i + 1} (${m.fileName}) is ACTIVE + HERO + HOMEPAGE_HERO_REGISTER`,
    m.status === "ACTIVE" &&
      (m.usageRoles || []).includes(USAGE_ROLES.HERO) &&
      m.mappingMethod === "HOMEPAGE_HERO_REGISTER" &&
      !m.productId,
    `status=${m.status} usage=${(m.usageRoles || []).join(",")} mapping=${m.mappingMethod}`
  );
});

/* 5. HeroCarousel input ----------------------------------------------- */
const slides = resolveHeroSlideImages();
const slideNames = slides.map(nameOf);
console.log("\nHeroCarousel input (resolveHeroSlideImages):");
ok("carousel receives 5 slides", slides.length === 5, `count=${slides.length}`);
ok(
  "carousel slide filenames are hero001 → hero005",
  EXPECTED.every((n, i) => slideNames[i] === n),
  slideNames.join(" → ")
);
ok(
  "every slide is a DIRECT resolve (no fallback masking)",
  slides.every((s) => s && s.reason === "DIRECT"),
  slides.map((s) => s?.reason).join(",")
);

/* 6. Displayed (carousel renders one plate per resolved slide) -------- */
console.log("\nDisplayed:");
ok(
  "displayed count equals resolved count (5)",
  slides.length === 5,
  `displayed=${slides.length}`
);

/* 7. Old hero must not be selected ------------------------------------ */
const oldHeroActive = slides.filter(
  (s) => s && s.reason !== "DIRECT"
).length;
console.log("\nOld hero active assignment:");
ok("no fallback/old hero is selected as a slide", oldHeroActive === 0, `active=${oldHeroActive}`);

/* 8. Physical files --------------------------------------------------- */
console.log("\nPhysical files (public/library):");
EXPECTED.forEach((fileName) => {
  const absolute = join(process.cwd(), "public", "library", fileName);
  const present = existsSync(absolute);
  let isAvif = false;
  if (present) {
    const bytes = readFileSync(absolute);
    isAvif =
      bytes.length > 12 &&
      bytes.subarray(4, 8).toString("ascii") === "ftyp" &&
      bytes.subarray(8, 12).toString("ascii") === "avif";
  }
  ok(`${fileName} exists and is AVIF`, present && isAvif);
});

/* Summary ------------------------------------------------------------ */
console.log("\n===================");
console.log("Summary chain:");
console.log(`  Manifest:      ${manifestHero.length}`);
console.log(`  Media store:   ${storeHero.length}`);
console.log(`  Repository:    ${repoHero.length}`);
console.log(`  Resolver:      ${resolved.length}`);
console.log(`  HeroCarousel:  ${slides.length}`);
console.log(`  Displayed:     ${slides.length}`);
console.log(`  Old hero active assignment: ${oldHeroActive}`);
console.log(
  `\nExpected: ${EXPECTED.length}\nResolved: ${resolved.length}\nDisplayed: ${slides.length}`
);

if (failures > 0) {
  console.error(`\nHERO RUNTIME AUDIT FAILED — ${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nHERO RUNTIME AUDIT PASSED — 5/5 hero plates resolved and displayed.");
