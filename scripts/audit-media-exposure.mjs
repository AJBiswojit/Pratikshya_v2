/**
 * PRATIKSHYA FASHON — Media exposure audit (Phase 21.5).
 *
 * Runs the same `auditMediaExposure` measurement the application uses and
 * prints the MEDIA EXPOSURE REPORT. Pure read-only: it never writes the
 * register and never touches the image bytes.
 *
 * Usage:
 *   node --import ./scripts/node-loader/register.mjs scripts/audit-media-exposure.mjs
 */

import { auditMediaExposure } from "../src/services/media/mediaExposure.js";

const report = auditMediaExposure();

const line = (text = "") => console.log(text);
const count = (label, value) => line(`${label.padEnd(28)} ${value}`);

line("# MEDIA EXPOSURE REPORT");
line();
line("## INVENTORY");
count("Total media", report.inventory.total);
count("Ingested", report.inventory.ingested);
count("Mapped", report.inventory.mapped);
count("Unmapped", report.inventory.unmapped);
count("Needs review", report.inventory.needsReview);
count("Broken", report.inventory.broken);
count("Active", report.inventory.active);
line();

line("## ACTUAL CUSTOMER EXPOSURE");
line("Surface".padEnd(22) + "Shown".padEnd(10) + "Fallback");
Object.entries(report.surfaces).forEach(([name, surface]) => {
  line(name.padEnd(22) + String(surface.shown).padEnd(10) + (surface.fallback ? "yes" : "no"));
});
line();
count("Exposed (mapped & consumed)", report.inventory.exposed);
count("Mapped but unused", report.inventory.mappedButUnused);
line();

line("## UNUSED MEDIA (mapped but not consumed)");
if (!report.unused.length) line("(none)");
report.unused.forEach((media) => {
  line(`- ${media.filename}  [${media.mediaId}]`);
  line(`    category: ${media.category || "—"}  product: ${media.product || "—"}  collection: ${media.collection || "—"}`);
  line(`    usage: ${media.usageRoles.join(", ") || "—"}  status: ${media.status}`);
});
line();

line("## UNMAPPED MEDIA");
if (!report.unmappedAssets.length) line("(none)");
report.unmappedAssets.forEach((media) => {
  line(`- ${media.filename}  [${media.mediaId}]`);
});
line();

line("## CATEGORY COVERAGE");
line("Category".padEnd(20) + "Available".padEnd(11) + "Displayed".padEnd(24) + "Fallback");
report.categoryCoverage.forEach((entry) => {
  line(
    entry.name.padEnd(20) +
      String(entry.mediaAvailable).padEnd(11) +
      (entry.mediaDisplayed || "—").padEnd(24) +
      (entry.fallbackUsed ? "yes" : "no")
  );
});
line();

line("## PRODUCT COVERAGE");
count("Products with dedicated media", report.productCoverage.withDedicatedMedia.length);
count("Products using legacy media", report.productCoverage.usingLegacyMedia.length);
count("Products without media", report.productCoverage.withoutMedia.length);
line();

line("## DUPLICATION (media reused across surfaces)");
const excessive = report.reuse.filter((entry) => entry.count >= 3);
line(`Reused assets: ${report.reuse.length}`);
line(`Potential excessive reuse (3+ surfaces): ${excessive.length}`);
excessive.slice(0, 20).forEach((entry) => {
  line(`- ${entry.id} → ${entry.surfaces.join(", ")}`);
});
line();
