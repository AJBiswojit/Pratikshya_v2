/**
 * PRATIKSHYA FASHON — AI Shopping Assistant, brand copy (Phase 21.1).
 *
 * Template language only. Every product, price and availability figure the
 * assistant speaks comes from the live catalogue repository — never from
 * this file.
 */

export const AI_SHOPPING_BRAND = {
  name: "PRATIKSHYA AI",
  tagline: "Your personal fashion companion",
  demoNote: "Demo assistant · grounded in the live catalogue",
};

export const AI_SHOPPING_GREETING = (firstName = null) =>
  `Namaste${firstName ? `, ${firstName}` : ""}. I am ${AI_SHOPPING_BRAND.name}, your personal fashion companion. ` +
  "Tell me the occasion, the colour you love, or the budget you have in mind — " +
  "and I will walk you through pieces from the current atelier edit.";

export const AI_SHOPPING_QUICK_PROMPTS = [
  { id: "wedding-look", label: "Find my wedding look", question: "I need something for my sister's wedding" },
  { id: "silk-sarees", label: "Show silk sarees", question: "Show me silk sarees" },
  { id: "under-20k", label: "Under ₹20,000", question: "Show me elegant pieces under ₹20,000" },
  { id: "trending", label: "What's trending?", question: "What is trending right now?" },
  { id: "help-choose", label: "Help me choose", question: "Help me choose between your best festive sarees" },
  { id: "similar", label: "Find something similar", question: "Show me something similar to this" },
  { id: "build-outfit", label: "Build an outfit", question: "Build me a festive look" },
  { id: "new-arrivals", label: "New arrivals", question: "Show me the new arrivals" },
];

/** Prompts offered while the customer stands on a product page. */
export const AI_SHOPPING_PRODUCT_PROMPTS = [
  { id: "similar-piece", label: "Similar pieces", question: "Show me something similar to this" },
  { id: "pair-with", label: "What pairs with this?", question: "What goes well with this?" },
  { id: "alt-budget", label: "Alternatives under ₹15,000", question: "Show me alternatives under ₹15,000" },
  { id: "more-festive", label: "Something more festive", question: "Looking for something more festive" },
];

/** Short, calm thinking stages — deterministic, never excessive. */
export const AI_SHOPPING_STAGES = {
  understanding: { step: "understanding", message: "Understanding your request" },
  catalogue: { step: "catalogue", message: "Checking catalogue data" },
  comparing: { step: "comparing", message: "Comparing the edit" },
  preparing: { step: "preparing", message: "Preparing recommendations" },
};

export const AI_SHOPPING_COPY = {
  vague: "I would love to help. Tell me a little more — the occasion, a colour you love, a fabric you prefer, or the budget you have in mind.",
  thanks: "It is a pleasure. I am here whenever you would like to explore the atelier again.",
  help: "I can find pieces by occasion, fabric, colour or budget; suggest similar looks; compare two pieces side by side; and build a complete outfit around one garment. Simply tell me what you are dressing for.",
  catalogueEmpty: "The atelier rail is being refreshed and the catalogue is briefly unavailable. Please try again in a moment.",
  failure: "I lost my train of thought for a moment. Please ask me again.",
  noResults: "I couldn't find an exact match, but I have gathered a few pieces with a similar spirit.",
  noResultsHard: "I couldn't find a piece that fits every part of that request. Try widening the budget or letting go of one filter — or explore the suggestions below.",
  cartAdded: (name) => `${name} has been placed in your bag.`,
  cartUnavailable: (name) => `${name} is not available for the bag right now — it may need a size choice on its page, or it is currently out of stock.`,
  wishlisted: (name) => `${name} has been saved to your wishlist.`,
  unwishlisted: (name) => `${name} has been removed from your wishlist.`,
  productUnavailable: "That piece has left the collection, but the atelier has plenty more to offer.",
};

/** Suggested follow-ups appended to common response kinds. */
export const AI_SHOPPING_SUGGESTIONS = {
  recommendations: [
    "Show me something similar",
    "What goes well with this?",
    "Find options under ₹10,000",
  ],
  outfit: [
    "Suggest a different colour story",
    "Find something more festive",
    "Show alternatives for the main piece",
  ],
  comparison: [
    "Which do customers love more?",
    "Show similar pieces",
    "Build a look around my pick",
  ],
  noResults: [
    "Show silk sarees",
    "Show new arrivals",
    "Find something under ₹15,000",
  ],
  greeting: [
    "Find my wedding look",
    "Show silk sarees",
    "What's trending?",
  ],
};

export default {
  AI_SHOPPING_BRAND,
  AI_SHOPPING_GREETING,
  AI_SHOPPING_QUICK_PROMPTS,
  AI_SHOPPING_PRODUCT_PROMPTS,
  AI_SHOPPING_STAGES,
  AI_SHOPPING_COPY,
  AI_SHOPPING_SUGGESTIONS,
};
