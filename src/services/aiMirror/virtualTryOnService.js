/**
 * PRATIKSHYA AI MIRROR — provider seam.
 *
 * Phase 21 always uses the local mock provider. A future phase can switch
 * this one import to a secure backend provider while the page keeps calling
 * `generateTryOnPreview()` with the same request contract.
 */

import { generateMockVirtualTryOnPreview } from "./mockVirtualTryOnProvider";

export const VIRTUAL_TRY_ON_PROVIDER = "mock";

export const generateTryOnPreview = (request) => generateMockVirtualTryOnPreview(request);

export const virtualTryOnService = {
  provider: VIRTUAL_TRY_ON_PROVIDER,
  generateTryOnPreview,
};

export default virtualTryOnService;
