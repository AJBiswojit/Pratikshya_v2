/**
 * PRATIKSHYA FASHON — Native AVIF support in Marketing Media upload.
 *
 * AVIF is a first-class image format: accepted by the file picker,
 * validation, preview (original blob, no conversion), persistence, and
 * storefront resolution. PRODUCT placements stay catalogue-driven.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MEDIA_TYPES,
  MARKETING_PLACEMENT_OPTIONS,
  MARKETING_PLACEMENTS,
  MEDIA_STATUS,
  PLACEMENT_MODES,
  UPLOAD_ACCEPT,
  UPLOAD_RULES,
  isAllowedUploadFormat,
} from "../src/config/mediaTypes.js";
import { validateFile } from "../src/services/media/uploadValidation.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { placementImageSource } from "../src/services/media/marketingMediaSource.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const fakeFile = ({ name, type, size = 128 }) => ({ name, type, size });

test("canonical image rules include AVIF extension and MIME type", () => {
  assert.ok(UPLOAD_RULES[MEDIA_TYPES.IMAGE].extensions.includes(".avif"));
  assert.ok(UPLOAD_RULES[MEDIA_TYPES.IMAGE].mimeTypes.includes("image/avif"));
  assert.ok(UPLOAD_ACCEPT.includes(".avif"));
  assert.ok(UPLOAD_ACCEPT.includes("image/avif"));
  /* Existing formats stay first-class. */
  [".jpg", ".jpeg", ".png", ".webp"].forEach((ext) => {
    assert.ok(UPLOAD_RULES[MEDIA_TYPES.IMAGE].extensions.includes(ext));
  });
});

test("an AVIF file with type image/avif is accepted", () => {
  const file = fakeFile({ name: "campaign-plate", type: "image/avif" });
  const result = validateFile(file);
  assert.equal(result.ok, true);
  assert.equal(result.type, MEDIA_TYPES.IMAGE);
  assert.equal(isAllowedUploadFormat(file, MEDIA_TYPES.IMAGE), true);
});

test("a file named example.avif is accepted", () => {
  const file = fakeFile({ name: "example.avif", type: "" });
  const result = validateFile(file);
  assert.equal(result.ok, true);
  assert.equal(result.type, MEDIA_TYPES.IMAGE);
});

test("AVIF does not trigger unsupported-format validation", () => {
  const result = validateFile(fakeFile({ name: "festive.avif", type: "image/avif" }));
  assert.equal(result.ok, true);
  assert.equal(result.error, undefined);
});

test("preview uses the original AVIF file — no conversion path exists", () => {
  const dropzone = readFileSync(
    join(process.cwd(), "src", "components", "media", "MediaUploadDropzone.jsx"),
    "utf8"
  );
  const form = readFileSync(join(process.cwd(), "src", "components", "media", "MediaUploadForm.jsx"), "utf8");
  const panel = readFileSync(join(process.cwd(), "src", "components", "media", "MediaUploadPanel.jsx"), "utf8");
  const combined = `${dropzone}\n${form}\n${panel}`;
  assert.ok(combined.includes("URL.createObjectURL(file)"));
  assert.ok(!combined.includes("canvas.toDataURL"));
  assert.ok(!combined.includes("toBlob("));
  assert.ok(!/convert.*avif|avif.*webp|avif.*jpe?g|avif.*png/i.test(combined));
});

test("saved marketing record preserves the AVIF filename, MIME type and URL", () => {
  setupCanonicalState();
  const url = "/images/marketing/generic/editorial-plate.avif";
  const record = mediaRepository.create({
    type: MEDIA_TYPES.IMAGE,
    title: "Editorial AVIF plate",
    url,
    fileName: "example.avif",
    mimeType: "image/avif",
    status: MEDIA_STATUS.ACTIVE,
    scope: "MARKETING",
    placement: MARKETING_PLACEMENTS.EDITORIAL,
  });
  assert.ok(record);
  assert.equal(record.url, url);
  assert.equal(record.fileName, "example.avif");
  assert.equal(record.mimeType, "image/avif");
  assert.match(record.url, /\.avif$/);
  assert.equal(record.url.includes(".webp"), false);
});

test("existing JPG PNG WebP uploads continue to work", () => {
  [
    { name: "look.jpg", type: "image/jpeg" },
    { name: "look.jpeg", type: "image/jpeg" },
    { name: "look.png", type: "image/png" },
    { name: "look.webp", type: "image/webp" },
  ].forEach((spec) => {
    const result = validateFile(fakeFile(spec));
    assert.equal(result.ok, true, `${spec.name} must remain accepted`);
  });
});

test("unsupported formats are still rejected", () => {
  const gif = validateFile(fakeFile({ name: "loop.gif", type: "image/gif" }));
  assert.equal(gif.ok, false);
  const pdf = validateFile(fakeFile({ name: "notes.pdf", type: "application/pdf" }));
  assert.equal(pdf.ok, false);
  const exe = validateFile(fakeFile({ name: "payload.exe", type: "application/octet-stream" }));
  assert.equal(exe.ok, false);
});

test("PRODUCT placements stay catalogue-driven; GENERIC placements accept AVIF", () => {
  const admin = readFileSync(
    join(process.cwd(), "src", "pages", "admin", "media", "AdminMarketingMedia.jsx"),
    "utf8"
  );
  MARKETING_PLACEMENT_OPTIONS.filter((placement) => placement.mode === PLACEMENT_MODES.PRODUCT).forEach(
    (placement) => {
      assert.ok(admin.includes("ProductCatalogSelector"));
      assert.ok(admin.includes("PLACEMENT_MODES.PRODUCT"));
    }
  );
  assert.ok(admin.includes("MediaUploadPanel"));
  assert.ok(!admin.includes("type=\"file\""));

  const genericIds = MARKETING_PLACEMENT_OPTIONS.filter(
    (placement) => placement.mode === PLACEMENT_MODES.GENERIC
  ).map((placement) => placement.id);
  assert.ok(genericIds.includes(MARKETING_PLACEMENTS.HOME_HERO));
  assert.ok(genericIds.includes(MARKETING_PLACEMENTS.EDITORIAL));
  assert.ok(genericIds.includes(MARKETING_PLACEMENTS.PROMOTION));

  /* The Festive section is a PRODUCT placement — its image is the published
     product an admin curates, never an uploaded artwork record. */
  assert.ok(!genericIds.includes(MARKETING_PLACEMENTS.FESTIVE_SECTION));
  assert.equal(
    MARKETING_PLACEMENT_OPTIONS.find((placement) => placement.id === MARKETING_PLACEMENTS.FESTIVE_SECTION)
      .mode,
    PLACEMENT_MODES.PRODUCT
  );
});

test("storefront rendering resolves an AVIF marketing record without format branching", () => {
  setupCanonicalState();
  const url = "/images/marketing/generic/promotion-plate.avif";
  const record = mediaRepository.create({
    type: MEDIA_TYPES.IMAGE,
    title: "Promotion AVIF",
    url,
    status: MEDIA_STATUS.ACTIVE,
    scope: "MARKETING",
    placement: MARKETING_PLACEMENTS.PROMOTION,
  });
  const source = placementImageSource(record);
  assert.ok(source);
  assert.equal(source.src, url);
  const resolver = readFileSync(
    join(process.cwd(), "src", "services", "media", "marketingMediaSource.js"),
    "utf8"
  );
  assert.ok(!resolver.includes(".avif"));
  assert.ok(!resolver.includes("image/avif"));
});
