/**
 * PRATIKSHYA FASHON — AI provider interface (Phase 21.1).
 *
 * The seam between PRATIKSHYA's UI and any AI capability.
 *
 *   Customer/Admin UI  →  aiService  →  active provider  →  repositories
 *
 * Today the active provider is the deterministic mock provider. A future
 * phase swaps in a real provider (LLM, recommendation engine or business
 * AI service) by implementing this exact contract and changing ONE import
 * in `aiService.js`. No screen, hook or route needs rebuilding.
 *
 * A provider must implement:
 *
 *   id                    — stable provider identifier ("mock", …)
 *   label                 — human name shown in demo footnotes
 *   respondShopping(req)  — async, resolves a shopping envelope
 *   respondBusiness(req)  — async, resolves a business envelope
 *
 * `respondShopping(request)` receives:
 *   question        — the customer's raw text
 *   products        — live storefront products (catalogue repository truth)
 *   productContext  — the product the customer came from, or null
 *   wishlistIds     — saved product ids
 *   recentIds       — recently viewed product ids
 *   purchasedIds    — product ids from the customer's order history
 *   preferences     — Phase 19 style preferences, or null
 *   onStage(stage)  — optional progress callback ({ stage, message })
 *
 * `respondBusiness(request)` receives:
 *   question        — the operator's raw text
 *   orders          — the existing order register
 *   periodInput     — Phase 19 analytics period input ({ preset, … })
 *   actor           — the authenticated admin record
 *   onStage(stage)  — optional progress callback
 *
 * Providers must never fabricate business numbers: every figure in a
 * business envelope originates from the existing analytics read-model.
 */

export const AI_PROVIDERS = {
  MOCK: "mock",
};

/** Verifies a provider object honours the contract; used at wiring time. */
export const validateAiProvider = (provider) => {
  const problems = [];
  if (!provider || typeof provider !== "object") {
    return ["An AI provider must be an object."];
  }
  if (typeof provider.id !== "string" || !provider.id) problems.push("Missing provider id.");
  if (typeof provider.label !== "string" || !provider.label) problems.push("Missing provider label.");
  if (typeof provider.respondShopping !== "function") problems.push("Missing respondShopping().");
  if (typeof provider.respondBusiness !== "function") problems.push("Missing respondBusiness().");
  return problems;
};

export default { AI_PROVIDERS, validateAiProvider };
