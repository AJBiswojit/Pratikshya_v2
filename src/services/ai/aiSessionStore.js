/**
 * PRATIKSHYA FASHON — AI assistant session persistence (Phase 21.1).
 *
 * Lightweight demo persistence for assistant conversations, scoped per
 * customer or admin id. Follows the house pattern (namespaced localStorage
 * keys, storage-event refresh) and keeps only what the conversation needs:
 * message roles, text, envelope types and product ids — never full product
 * records, never media, never camera frames, never business internals on
 * the customer side.
 */

import { readStorage, writeStorage } from "../../utils/shopping";

const SHOPPING_PREFIX = "pratikshya_ai_shopping_session_";
const BUSINESS_PREFIX = "pratikshya_ai_business_session_";
const MAX_MESSAGES = 80;

const scopeKey = (prefix, scopeId) => `${prefix}${String(scopeId || "guest")}`;

/** Reduces a message to its persistable essence. */
const sanitizeMessage = (message) => {
  if (!message || typeof message !== "object") return null;
  return {
    id: String(message.id || ""),
    role: message.role === "user" ? "user" : "assistant",
    assistant: message.assistant || null,
    type: message.type || "TEXT",
    text: String(message.text || ""),
    createdAt: message.createdAt || new Date().toISOString(),
    /* Products are referenced by id only and re-resolved from the live
       catalogue on restore, so a persisted session can never carry stale
       prices or availability. */
    productIds: Array.isArray(message.products)
      ? message.products.map((entry) => String(entry?.product?.id ?? entry?.id ?? "")).filter(Boolean)
      : [],
    outfitMainId: message.outfit?.main?.id ? String(message.outfit.main.id) : null,
    outfitPieceIds: Array.isArray(message.outfit?.pieces)
      ? message.outfit.pieces.map((product) => String(product.id))
      : [],
    singleProductId: message.product?.id ? String(message.product.id) : null,
    comparisonIds: Array.isArray(message.comparison?.products)
      ? message.comparison.products.map((product) => String(product.id))
      : [],
    suggestions: Array.isArray(message.suggestions) ? message.suggestions.slice(0, 4) : [],
    source: message.source || "",
    periodLabel: message.periodLabel || "",
    headline: message.headline || "",
    metrics: Array.isArray(message.metrics) ? message.metrics : [],
    rows: Array.isArray(message.rows) ? message.rows : [],
    actions: Array.isArray(message.actions) ? message.actions : [],
  };
};

export const saveAiSession = (prefix, scopeId, messages) => {
  const clean = (Array.isArray(messages) ? messages : [])
    .map(sanitizeMessage)
    .filter(Boolean)
    .slice(-MAX_MESSAGES);
  writeStorage(scopeKey(prefix, scopeId), { version: 1, messages: clean, savedAt: new Date().toISOString() });
  return clean;
};

export const loadAiSession = (prefix, scopeId) => {
  const stored = readStorage(scopeKey(prefix, scopeId), null);
  if (!stored || typeof stored !== "object" || !Array.isArray(stored.messages)) return [];
  return stored.messages.map(sanitizeMessage).filter(Boolean);
};

export const clearAiSession = (prefix, scopeId) => {
  writeStorage(scopeKey(prefix, scopeId), { version: 1, messages: [], savedAt: new Date().toISOString() });
};

export const AI_SESSION_SCOPES = {
  SHOPPING: SHOPPING_PREFIX,
  BUSINESS: BUSINESS_PREFIX,
};

export default { saveAiSession, loadAiSession, clearAiSession, AI_SESSION_SCOPES };
