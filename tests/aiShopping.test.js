/**
 * PRATIKSHYA FASHON — AI Shopping Assistant pure-logic tests (Phase 21.1).
 *
 * Run with `npm test` (node --test). Every test drives the deterministic
 * intelligence with fixtures shaped like live storefront products, so the
 * rules are verified without a browser.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  extractPriceRange,
  extractPeriodPreset,
  isGreeting,
  parseIndianAmount,
} from "../src/services/ai/shared/aiIntentResolver.js";
import {
  auditShoppingResponseForBusinessData,
} from "../src/services/ai/shared/aiResponseBuilder.js";
import {
  answerShoppingQuestion,
  findSimilarProducts,
  rankShoppingCandidates,
  resolveShoppingIntent,
} from "../src/services/ai/shopping/aiShoppingService.js";

/* ------------------------------------------------------------------ */
/* Fixtures — shaped like `toStorefrontProduct` output                 */
/* ------------------------------------------------------------------ */

const product = (overrides) => ({
  id: "pf-test",
  slug: "test-piece",
  name: "Test Piece",
  category: "sarees",
  categoryLabel: "Sarees",
  subcategory: "Silk Saree",
  collection: "Heritage Weaves",
  collectionIds: ["heritage-weaves"],
  collections: ["Heritage Weaves"],
  price: 10000,
  originalPrice: null,
  discount: null,
  colors: ["Maroon"],
  sizes: ["Free Size"],
  fabric: "Mulberry Silk",
  material: "Zari Work",
  occasion: ["Wedding", "Festive"],
  rating: 4.5,
  reviewCount: 50,
  availability: "in-stock",
  stock: 10,
  inStock: true,
  isFeatured: false,
  isNew: false,
  isBestseller: false,
  label: null,
  score: 100,
  ...overrides,
});

const CATALOGUE = [
  product({
    id: "pf-001",
    slug: "red-bridal-lehenga",
    name: "Crimson Bridal Lehenga",
    category: "lehengas",
    categoryLabel: "Lehengas",
    subcategory: "Bridal Lehenga",
    price: 28000,
    originalPrice: 32000,
    discount: 13,
    colors: ["Maroon", "Gold"],
    fabric: "Raw Silk",
    occasion: ["Bridal", "Wedding"],
    rating: 4.8,
    reviewCount: 90,
    isFeatured: true,
  }),
  product({
    id: "pf-002",
    slug: "gold-party-lehenga",
    name: "Gold Celebration Lehenga",
    category: "lehengas",
    categoryLabel: "Lehengas",
    subcategory: "Designer Lehenga",
    price: 46000,
    colors: ["Gold"],
    fabric: "Georgette",
    occasion: ["Party", "Sangeet"],
    rating: 4.4,
    reviewCount: 30,
  }),
  product({
    id: "pf-003",
    slug: "banarasi-katan-saree",
    name: "Banarasi Katan Silk Saree in Gold",
    category: "sarees",
    subcategory: "Banarasi Saree",
    price: 42000,
    colors: ["Gold", "Ivory"],
    fabric: "Katan Silk",
    occasion: ["Bridal", "Wedding", "Reception"],
    rating: 4.9,
    reviewCount: 180,
    availability: "low-stock",
    stock: 4,
    isBestseller: true,
  }),
  product({
    id: "pf-004",
    slug: "cotton-everyday-saree",
    name: "Handloom Cotton Saree in Ivory",
    category: "sarees",
    subcategory: "Cotton Saree",
    price: 2850,
    colors: ["Ivory", "Rust"],
    fabric: "Cotton",
    occasion: ["Everyday", "Office"],
    rating: 4.4,
    reviewCount: 200,
    isNew: true,
  }),
  product({
    id: "pf-005",
    slug: "emerald-silk-saree",
    name: "Mulberry Silk Saree in Emerald",
    category: "sarees",
    price: 21900,
    colors: ["Emerald", "Gold"],
    fabric: "Mulberry Silk",
    occasion: ["Wedding", "Festive"],
    rating: 4.7,
    reviewCount: 118,
  }),
  product({
    id: "pf-006",
    slug: "bridal-bangle-set",
    name: "Bridal Gold Bangle Set",
    category: "bangles",
    categoryLabel: "Bangles",
    price: 6500,
    colors: ["Gold"],
    fabric: null,
    material: "Gold Plated",
    occasion: ["Bridal", "Wedding"],
    rating: 4.6,
    reviewCount: 40,
  }),
  product({
    id: "pf-007",
    slug: "wedding-kurta",
    name: "Festive Kurta Set",
    category: "kurtis-and-suits",
    categoryLabel: "Kurtis + Suits",
    price: 4200,
    colors: ["Sage"],
    fabric: "Cotton Silk",
    occasion: ["Wedding", "Festive"],
    rating: 4.3,
    reviewCount: 22,
    isNew: true,
  }),
];

/* ------------------------------------------------------------------ */
/* Price extraction                                                    */
/* ------------------------------------------------------------------ */

test("price extraction reads ceilings, floors, ranges and lakh/k shorthand", () => {
  assert.deepEqual(extractPriceRange("I want a red bridal lehenga under ₹30,000"), { min: null, max: 30000, soft: false });
  assert.deepEqual(extractPriceRange("something under 10k"), { min: null, max: 10000, soft: false });
  assert.equal(parseIndianAmount("1.5 lakh"), 150000);
  assert.equal(parseIndianAmount("30,000"), 30000);

  const range = extractPriceRange("between 5,000 and 15,000");
  assert.equal(range.min, 5000);
  assert.equal(range.max, 15000);

  const floor = extractPriceRange("show me pieces above 25,000");
  assert.equal(floor.min, 25000);
  assert.equal(floor.max, null);

  const soft = extractPriceRange("elegant but not too expensive");
  assert.equal(soft.soft, true);
  assert.equal(soft.softMax, 8000);
});

/* ------------------------------------------------------------------ */
/* Intent detection                                                    */
/* ------------------------------------------------------------------ */

test("category, fabric, colour and occasion are detected from natural language", () => {
  const intent = resolveShoppingIntent("I want a red bridal lehenga under ₹30,000");
  assert.equal(intent.category.id, "lehengas");
  assert.equal(intent.colour.id, "Red");
  assert.ok(intent.occasions.some((group) => group.id === "Bridal" || group.id === "Wedding"));
  assert.equal(intent.price.max, 30000);

  const silk = resolveShoppingIntent("Show me silk sarees");
  assert.equal(silk.category.id, "sarees");
  assert.ok(silk.fabrics.some((group) => group.id === "Silk"));

  const festive = resolveShoppingIntent("What should I wear to a festive event?");
  assert.equal(festive.occasion.id, "Festive");

  const kurta = resolveShoppingIntent("I want a kurta for a wedding");
  assert.equal(kurta.category.id, "kurtis-and-suits");
  assert.equal(kurta.occasion.id, "Wedding");
});

test("greetings and help requests are recognised", () => {
  assert.ok(isGreeting("Hi"));
  assert.ok(isGreeting("Namaste"));
  assert.ok(resolveShoppingIntent("what can you do?").help);
});

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

test("ranking honours category, colour, occasion and a hard budget", () => {
  const intent = resolveShoppingIntent("I want a red bridal lehenga under ₹30,000");
  const ranked = rankShoppingCandidates(CATALOGUE, intent, {}, 4);
  assert.ok(ranked.length >= 1);
  assert.equal(ranked[0].product.id, "pf-001");
  /* The ₹46,000 gold lehenga must never breach the ceiling. */
  assert.ok(!ranked.some((entry) => entry.product.id === "pf-002"));
  assert.ok(ranked[0].reasons.some((reason) => reason.includes("30,000")));
});

test("ranking prefers bestsellers when the shopper asks what is trending", () => {
  const intent = resolveShoppingIntent("What is trending right now?");
  const ranked = rankShoppingCandidates(CATALOGUE, intent, {}, 3);
  assert.ok(ranked.some((entry) => entry.product.isBestseller));
});

test("deterministic ordering — the same request always yields the same edit", () => {
  const intent = resolveShoppingIntent("Show me silk sarees");
  const first = rankShoppingCandidates(CATALOGUE, intent, {}, 4).map((entry) => entry.product.id);
  const second = rankShoppingCandidates(CATALOGUE, intent, {}, 4).map((entry) => entry.product.id);
  assert.deepEqual(first, second);
});

/* ------------------------------------------------------------------ */
/* Full answers                                                        */
/* ------------------------------------------------------------------ */

const ask = (question, options = {}) =>
  answerShoppingQuestion({ question, products: CATALOGUE, ...options });

test("a natural shopping request returns catalogue-grounded recommendations", () => {
  const response = ask("I need something for my sister's wedding");
  assert.equal(response.type, "PRODUCT_RECOMMENDATIONS");
  assert.ok(response.products.length >= 2);
  response.products.forEach((entry) => {
    assert.ok(entry.product.id);
    assert.ok(typeof entry.reason === "string" && entry.reason.length > 0);
    /* Every recommended piece is genuinely dressed for a wedding. */
    assert.ok(
      entry.product.occasion.some((occasion) => ["Wedding", "Bridal", "Reception", "Sangeet"].includes(occasion))
    );
  });
});

test("budget-only queries are typed PRICE_FILTER and respect the ceiling", () => {
  const response = ask("I need something under ₹10,000");
  assert.equal(response.type, "PRICE_FILTER");
  response.products.forEach((entry) => assert.ok(entry.product.price <= 10000));
});

test("no-result queries relax gracefully instead of failing", () => {
  const response = ask("Show me a purple velvet gown");
  assert.equal(response.type, "NO_RESULTS");
  assert.match(response.text, /couldn't find/i);
});

test("an empty catalogue is reported as unavailable, never answered with invented pieces", () => {
  const response = answerShoppingQuestion({ question: "Show me silk sarees", products: [] });
  assert.equal(response.type, "NO_RESULTS");
  assert.equal(response.products.length, 0);
});

test("vague input earns a follow-up question, not a guess", () => {
  const response = ask("something nice please");
  assert.equal(response.type, "FOLLOW_UP");
  assert.ok(response.suggestions.length > 0);
});

test("product context powers similarity without repeating the anchor", () => {
  const anchor = CATALOGUE.find((entry) => entry.id === "pf-003");
  const similar = findSimilarProducts(CATALOGUE, anchor, 4);
  assert.ok(similar.length >= 1);
  assert.ok(!similar.some((entry) => entry.product.id === anchor.id));
  assert.equal(similar[0].product.category, anchor.category);

  const response = ask("Show me something similar to this", { productContext: anchor });
  assert.equal(response.type, "PRODUCT_RECOMMENDATIONS");
  assert.ok(!response.products.some((entry) => entry.product.id === anchor.id));
});

test("pairing questions answer with the anchor plus compatible finishing pieces", () => {
  const anchor = CATALOGUE.find((entry) => entry.id === "pf-003");
  const response = ask("What goes well with this saree?", { productContext: anchor });
  assert.equal(response.type, "OUTFIT_SUGGESTION");
  assert.equal(response.outfit.main.id, anchor.id);
  response.outfit.pieces.forEach((piece) => {
    assert.ok(["bangles", "jewellery", "dupattas"].includes(piece.category));
  });
});

test("outfit building keeps AI Mirror apparel rules for the main piece", () => {
  const response = ask("Build me a festive look");
  assert.equal(response.type, "OUTFIT_SUGGESTION");
  const apparel = ["sarees", "lehengas", "bridal-couture", "kurtis-and-suits", "menswear", "kidswear"];
  assert.ok(apparel.includes(response.outfit.main.category));
});

test("cart intent resolves to a CART_ACTION envelope", () => {
  const anchor = CATALOGUE.find((entry) => entry.id === "pf-004");
  const response = ask("Add this to my bag", { productContext: anchor });
  assert.equal(response.type, "CART_ACTION");
  assert.equal(response.product.id, anchor.id);
});

test("wishlist intent resolves to a WISHLIST_ACTION envelope", () => {
  const anchor = CATALOGUE.find((entry) => entry.id === "pf-005");
  const response = ask("Save this to my wishlist", { productContext: anchor });
  assert.equal(response.type, "WISHLIST_ACTION");
  assert.equal(response.product.id, anchor.id);
});

test("made-to-order pieces are never added to the bag silently", () => {
  const madeToOrder = product({ id: "pf-099", availability: "made-to-order", stock: 0 });
  const response = answerShoppingQuestion({
    question: "Add this to my bag",
    products: [madeToOrder],
    productContext: madeToOrder,
  });
  assert.notEqual(response.type, "CART_ACTION");
});

/* ------------------------------------------------------------------ */
/* Privacy boundary                                                    */
/* ------------------------------------------------------------------ */

test("customer shopping envelopes never carry internal business data", () => {
  const questions = [
    "Give me today's business summary",
    "I want a red bridal lehenga under ₹30,000",
    "Build me a festive look",
    "What goes well with this saree?",
    "Show me the new arrivals",
  ];
  questions.forEach((question) => {
    const response = ask(question, { productContext: CATALOGUE[2] });
    assert.deepEqual(auditShoppingResponseForBusinessData(response), [], `${question} leaked business data`);
  });
});

/* ------------------------------------------------------------------ */
/* Business period words stay on the Phase 19 presets                  */
/* ------------------------------------------------------------------ */

test("period language maps onto existing analytics presets", () => {
  assert.equal(extractPeriodPreset("How are sales doing this month?"), "THIS_MONTH");
  assert.equal(extractPeriodPreset("Give me today's summary"), "TODAY");
  assert.equal(extractPeriodPreset("returns last 30 days"), "LAST_30");
  assert.equal(extractPeriodPreset("Show me silk sarees"), null);
});
