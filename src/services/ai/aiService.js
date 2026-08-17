/**
 * PRATIKSHYA FASHON — central AI service (Phase 21.1).
 *
 * The single door every screen walks through for AI capability:
 *
 *   Customer/Admin UI  →  aiService  →  active provider  →  repositories
 *
 * The active provider is currently the deterministic mock. To move to a
 * real AI provider later, implement the contract in `aiProvider.js` and
 * change the `activeProvider` import below — no UI rebuild required.
 */

import { validateAiProvider } from "./aiProvider.js";
import { mockAiProvider } from "./mockAiProvider.js";

const activeProvider = mockAiProvider;

const problems = validateAiProvider(activeProvider);
if (problems.length && typeof console !== "undefined") {
  console.warn(`PRATIKSHYA AI provider misconfigured: ${problems.join(" ")}`);
}

export const AI_PROVIDER_ID = activeProvider.id;
export const AI_PROVIDER_LABEL = activeProvider.label;

/** True for the demo provider — the UI surfaces an honest demo footnote. */
export const isMockAiProvider = () => activeProvider.id === "mock";

/** Ask the shopping assistant. Resolves a shopping response envelope. */
export const askShoppingAssistant = (request) => activeProvider.respondShopping(request);

/** Ask the business assistant. Resolves a business response envelope. */
export const askBusinessAssistant = (request) => activeProvider.respondBusiness(request);

export const aiService = {
  provider: AI_PROVIDER_ID,
  providerLabel: AI_PROVIDER_LABEL,
  isMockAiProvider,
  askShoppingAssistant,
  askBusinessAssistant,
};

export default aiService;
