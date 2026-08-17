/**
 * PRATIKSHYA AI MIRROR — mock provider.
 *
 * The provider deliberately simulates only the pacing of a premium demo. It
 * performs no image analysis, uploads nothing and persists no camera frames.
 * A real provider can later implement this same contract behind
 * `virtualTryOnService`.
 */

import { isVirtualTryOnEligibleProduct } from "./aiMirrorEligibility";
import { getMockTryOnResult } from "./aiMirrorMockData";
import { hasVirtualTryOnUsableMedia } from "./aiMirrorService";

const makeAbortError = () => {
  const error = new Error("The preview request was cancelled.");
  error.name = "AbortError";
  return error;
};

const wait = (duration, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(makeAbortError());
      return;
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, duration);

    const onAbort = () => {
      window.clearTimeout(timer);
      reject(makeAbortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });

const problem = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

/**
 * Mock-only provider contract. `onProgress` is optional so a future backend
 * integration can stream its own non-technical customer-safe status copy.
 */
export const generateMockVirtualTryOnPreview = async ({ product, onProgress, signal } = {}) => {
  if (!isVirtualTryOnEligibleProduct(product)) {
    throw problem("INELIGIBLE_PRODUCT", "This piece is not available for the AI Mirror preview.");
  }

  if (!hasVirtualTryOnUsableMedia(product)) {
    throw problem("PRODUCT_MEDIA_UNAVAILABLE", "This piece does not have a usable preview image yet.");
  }

  onProgress?.({
    step: "preparing",
    message: "Preparing your look",
    detail: "Setting up the curated demo preview…",
  });
  await wait(500, signal);

  onProgress?.({
    step: "silhouette",
    message: "Composing the garment silhouette",
    detail: "Matching the selected look to the preview scene…",
  });
  await wait(950, signal);

  onProgress?.({
    step: "refining",
    message: "Refining the preview",
    detail: "Adding the finishing styling touch…",
  });
  await wait(700, signal);

  if (signal?.aborted) throw makeAbortError();

  const result = getMockTryOnResult(product);
  if (!result) {
    throw problem("MOCK_PREVIEW_UNAVAILABLE", "A demo preview is not available for this piece right now.");
  }

  return result;
};

export default generateMockVirtualTryOnPreview;
