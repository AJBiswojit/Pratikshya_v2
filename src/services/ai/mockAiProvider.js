/**
 * PRATIKSHYA FASHON — mock AI provider (Phase 21.1).
 *
 * The deterministic stand-in for a real AI provider. It simulates only the
 * pacing of a premium assistant (short, fixed thinking stages) and then
 * delegates to the catalogue- and repository-grounded intelligence in
 * `shopping/` and `business/`. No external calls are made, no model is
 * invoked, and no business number is invented.
 *
 * A real provider replaces this file alone: implement the same contract
 * (see `aiProvider.js`) and switch the import in `aiService.js`.
 */

import { getAnalyticsSnapshot } from "../analytics/analyticsService.js";
import {
  extractPeriodPreset,
  normaliseText,
} from "./shared/aiIntentResolver.js";
import { answerShoppingQuestion } from "./shopping/aiShoppingService.js";
import {
  AI_SHOPPING_STAGES,
} from "./shopping/aiShoppingMockData.js";
import {
  AI_BUSINESS_STAGES,
} from "./business/aiBusinessMockData.js";
import { buildBusinessAnswer } from "./business/aiBusinessService.js";

const wait = (duration, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const error = new Error("The request was cancelled.");
      error.name = "AbortError";
      reject(error);
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, duration);
    const onAbort = () => {
      window.clearTimeout(timer);
      const error = new Error("The request was cancelled.");
      error.name = "AbortError";
      reject(error);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/** Short deterministic stage pacing — noticeable, never excessive. */
const STAGE_TIMING = {
  understanding: 320,
  catalogue: 460,
  reading: 460,
  comparing: 420,
  preparing: 380,
};

const playStages = async (stages, onStage, signal, skip = 0) => {
  const entries = Object.values(stages);
  for (let index = 0; index < entries.length; index += 1) {
    if (index < skip) continue;
    onStage?.(entries[index]);
    await wait(STAGE_TIMING[entries[index].step] ?? 380, signal);
  }
};

export const mockAiProvider = {
  id: "mock",
  label: "PRATIKSHYA demo intelligence (deterministic)",

  /**
   * Customer shopping answers, grounded in the live storefront products
   * the caller passes in.
   */
  async respondShopping({
    question,
    products = [],
    productContext = null,
    wishlistIds = [],
    recentIds = [],
    purchasedIds = [],
    preferences = null,
    customerName = null,
    onStage,
    signal,
  } = {}) {
    const text = normaliseText(question);
    const conversational =
      !text ||
      /^(hi|hello|hey|namaste|namaskar)\b/.test(text) ||
      /thank/.test(text) ||
      /what can you do|help me/.test(text);

    await playStages(AI_SHOPPING_STAGES, onStage, signal, conversational ? 2 : 0);

    return answerShoppingQuestion({
      question,
      products,
      productContext,
      wishlistIds,
      recentIds,
      purchasedIds,
      preferences,
      customerName,
    });
  },

  /**
   * Business answers, grounded in the existing analytics snapshot built
   * from the live order/inventory/returns/offers/customer/workforce
   * repositories.
   */
  async respondBusiness({
    question,
    orders = null,
    periodInput = {},
    access = {},
    onStage,
    signal,
  } = {}) {
    await playStages(AI_BUSINESS_STAGES, onStage, signal, 0);

    /* A question like "this month" re-scopes the existing Phase 19 period. */
    const spokenPreset = extractPeriodPreset(question);
    const period = spokenPreset ? { ...periodInput, preset: spokenPreset } : periodInput;

    const snapshot = getAnalyticsSnapshot({ orders: orders ?? undefined, period });
    return buildBusinessAnswer({ question, snapshot, access });
  },
};

export default mockAiProvider;
