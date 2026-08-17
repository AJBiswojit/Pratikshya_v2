/**
 * PRATIKSHYA FASHON — AI assistants, shared intent resolution (Phase 21.1).
 *
 * Pure text-reading helpers shared by the shopping and business assistants.
 * Nothing here touches storage, React or the DOM, so every helper can be
 * exercised by plain Node tests with fixture inputs.
 *
 * The mock provider parses natural language deterministically — this is
 * intent matching, not machine learning, and the UI never claims otherwise.
 */

/** Lower-cases and collapses punctuation so keywords can never miss on casing. */
export const normaliseText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[₹]/g, " rs ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** True when the input is a greeting rather than a request. */
export const isGreeting = (text) => {
  const words = normaliseText(text).split(" ").filter(Boolean);
  if (!words.length) return false;
  const OPENERS = new Set([
    "hi", "hello", "hey", "namaste", "namaskar", "good", "hola", "yo",
  ]);
  const FOLLOWUPS = new Set(["morning", "afternoon", "evening", "there", "pratikshya", "ai"]);
  if (words.length > 3) return false;
  if (!OPENERS.has(words[0])) return false;
  return words.slice(1).every((word) => FOLLOWUPS.has(word));
};

const GRATITUDE = ["thank", "thanks", "thankyou", "dhanyabad", "shukriya"];

/** True when the customer is closing the conversation politely. */
export const isGratitude = (text) => {
  const words = normaliseText(text).split(" ").filter(Boolean);
  return words.length > 0 && words.length <= 5 && words.some((word) => GRATITUDE.includes(word));
};

const HELP_HINTS = ["what can you do", "help me", "how do you", "how can you", "what do you do", "your features", "capabilities"];

/** True when the visitor asks what the assistant can do. */
export const isHelpRequest = (text) => {
  const flat = normaliseText(text);
  return HELP_HINTS.some((hint) => flat.includes(hint));
};

/* ------------------------------------------------------------------ */
/* Price extraction                                                    */
/* ------------------------------------------------------------------ */

/**
 * Turns "1.5 lakh", "30k", "12,000" into rupees. Returns null when the
 * fragment is not recognisable as money.
 */
export const parseIndianAmount = (raw) => {
  const text = String(raw || "").toLowerCase().replace(/,/g, "");
  const lakh = text.match(/^(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l\b)/);
  if (lakh) return Math.round(parseFloat(lakh[1]) * 100000);
  const thousand = text.match(/^(\d+(?:\.\d+)?)\s*k\b/);
  if (thousand) return Math.round(parseFloat(thousand[1]) * 1000);
  const plain = text.match(/^(\d+(?:\.\d+)?)/);
  if (plain) return Math.round(parseFloat(plain[1]));
  return null;
};

const CEILING_WORDS = ["under", "below", "beneath", "within", "upto", "up to", "less than", "max", "maximum", "no more than", "budget of", "around"];
const FLOOR_WORDS = ["above", "over", "more than", "at least", "starting from", "beyond", "minimum"];

/**
 * Reads a price band out of natural language.
 *
 *   "under ₹30,000"         → { max: 30000 }
 *   "between 5k and 15k"    → { min: 5000, max: 15000 }
 *   "above 25,000"          → { min: 25000 }
 *   "around 10,000"         → { min: 7500, max: 12500, soft: true }
 *
 * Qualitative budgets ("not too expensive") map to a soft ceiling so the
 * ranking can lean towards accessible pieces without a hard cut-off.
 */
/**
 * Money-safe flattening: keeps digits, commas, dots and the rupee sign so
 * "₹30,000" survives intact (the generic normaliser strips commas).
 */
const moneyFlat = (rawText) =>
  String(rawText || "")
    .toLowerCase()
    .replace(/[₹]/g, " rs ")
    .replace(/[^a-z0-9.,\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const extractPriceRange = (rawText) => {
  const flat = moneyFlat(rawText);
  if (!flat) return null;

  const amountPattern = "(?:rs\\s*)?(\\d[\\d,]*(?:\\.\\d+)?\\s*(?:lakh|lakhs|l|k)?)";

  /* "between X and Y" / "X to Y" */
  const between = flat.match(
    new RegExp(`(?:between|from)\\s+${amountPattern}\\s+(?:and|to)\\s+${amountPattern}`)
  );
  if (between) {
    const min = parseIndianAmount(between[1]);
    const max = parseIndianAmount(between[2]);
    if (min != null && max != null) return { min, max, soft: false };
  }

  const pair = flat.match(new RegExp(`${amountPattern}\\s+(?:to|-)\\s+${amountPattern}`));
  if (pair) {
    const min = parseIndianAmount(pair[1]);
    const max = parseIndianAmount(pair[2]);
    if (min != null && max != null && min < max) return { min, max, soft: false };
  }

  /* Floor phrases first — "above 25,000" must not be read as a ceiling. */
  for (const word of FLOOR_WORDS) {
    const pattern = new RegExp(`${word.replace(/ /g, "\\s+")}\\s+${amountPattern}`);
    const match = flat.match(pattern);
    if (match) {
      const min = parseIndianAmount(match[1]);
      if (min != null) return { min, max: null, soft: false };
    }
  }

  for (const word of CEILING_WORDS) {
    const pattern = new RegExp(`${word.replace(/ /g, "\\s+")}\\s+${amountPattern}`);
    const match = flat.match(pattern);
    if (match) {
      const max = parseIndianAmount(match[1]);
      if (max != null) {
        if (word === "around") {
          return { min: Math.round(max * 0.75), max: Math.round(max * 1.25), soft: true };
        }
        return { min: null, max, soft: word === "budget of" || word === "within" };
      }
    }
  }

  /* A bare amount with a price verb — "something for 8,000". */
  const bare = flat.match(new RegExp(`(?:for|of|price\\s+(?:is|of)?)\\s+${amountPattern}`));
  if (bare) {
    const amount = parseIndianAmount(bare[1]);
    if (amount != null) return { min: null, max: amount, soft: true };
  }

  /* Qualitative budgets. */
  if (/(not\s+too\s+expensive|affordable|budget\s+friendly|economical|value\s+for\s+money)/.test(flat)) {
    return { min: null, max: null, soft: true, softMax: 8000 };
  }
  if (/(luxury|premium|couture|heirloom|grand)/.test(flat) && /(look|piece|saree|lehenga|wear|something|want|need)/.test(flat)) {
    return { min: 25000, max: null, soft: false, premium: true };
  }

  return null;
};

/* ------------------------------------------------------------------ */
/* Keyword matching helper                                             */
/* ------------------------------------------------------------------ */

/**
 * Finds the first keyword set whose word appears in the text. Returns the
 * matched entry or null. Whole-word matching keeps "satin" from hitting
 * "sat in" and "art" from hitting "kart".
 */
export const matchKeywordGroup = (text, groups) => {
  const words = new Set(normaliseText(text).split(" ").filter(Boolean));
  const flat = normaliseText(text);
  for (const group of groups) {
    for (const keyword of group.keywords) {
      if (keyword.includes(" ")) {
        if (flat.includes(keyword)) return group;
      } else if (words.has(keyword)) {
        return group;
      }
    }
  }
  return null;
};

/** Collects every keyword group that matches (used for multi-fabric queries). */
export const matchAllKeywordGroups = (text, groups) => {
  const words = new Set(normaliseText(text).split(" ").filter(Boolean));
  const flat = normaliseText(text);
  const matches = [];
  for (const group of groups) {
    const hit = group.keywords.some((keyword) =>
      keyword.includes(" ") ? flat.includes(keyword) : words.has(keyword)
    );
    if (hit) matches.push(group);
  }
  return matches;
};

/* ------------------------------------------------------------------ */
/* Period words (business assistant)                                   */
/* ------------------------------------------------------------------ */

/**
 * Maps analytics period language onto the existing Phase 19 preset ids.
 * The business assistant never invents its own date arithmetic.
 */
export const extractPeriodPreset = (rawText) => {
  const flat = normaliseText(rawText);
  if (!flat) return null;
  const rules = [
    { preset: "YESTERDAY", patterns: ["yesterday"] },
    { preset: "TODAY", patterns: ["today", "right now", "at the moment"] },
    { preset: "LAST_7", patterns: ["last 7 days", "past 7 days", "this week", "past week", "last week", "last seven days"] },
    { preset: "LAST_30", patterns: ["last 30 days", "past 30 days", "past month", "last thirty days"] },
    { preset: "THIS_MONTH", patterns: ["this month", "current month", "month to date"] },
    { preset: "LAST_MONTH", patterns: ["last month", "previous month"] },
    { preset: "THIS_QUARTER", patterns: ["this quarter", "current quarter", "quarter to date"] },
    { preset: "THIS_YEAR", patterns: ["this year", "current year", "year to date", "annually"] },
  ];
  for (const rule of rules) {
    if (rule.patterns.some((pattern) => flat.includes(pattern))) return rule.preset;
  }
  return null;
};

export default {
  normaliseText,
  isGreeting,
  isGratitude,
  isHelpRequest,
  parseIndianAmount,
  extractPriceRange,
  matchKeywordGroup,
  matchAllKeywordGroups,
  extractPeriodPreset,
};
