/** Catalogue-grounded AI Shopping pure-logic tests. */

import test from "node:test";
import assert from "node:assert/strict";

import {
  extractPriceRange,
  extractPeriodPreset,
  isGreeting,
  parseIndianAmount,
} from "../src/services/ai/shared/aiIntentResolver.js";
import { auditShoppingResponseForBusinessData } from "../src/services/ai/shared/aiResponseBuilder.js";
import {
  CATEGORY_KEYWORDS,
  COLLECTION_KEYWORDS,
  COLOUR_KEYWORDS,
  FABRIC_KEYWORDS,
  OCCASION_KEYWORDS,
  answerShoppingQuestion,
  findSimilarProducts,
  rankShoppingCandidates,
  resolveShoppingIntent,
} from "../src/services/ai/shopping/aiShoppingService.js";
import { products as canonicalProducts } from "../src/data/catalog/products.js";
import { toStorefrontProduct } from "../src/data/products/index.js";

const CATALOGUE = canonicalProducts.map((product, index) => toStorefrontProduct(product, index));
const findProduct = (predicate) => {
  const product = CATALOGUE.find(predicate);
  assert.ok(product);
  return product;
};
const colourInName = (product) => product.name.split(/\s+/)[1];
const ask = (question, options = {}) =>
  answerShoppingQuestion({ question, products: CATALOGUE, ...options });

test("price extraction reads ceilings, floors, ranges and lakh/k shorthand", () => {
  assert.deepEqual(extractPriceRange("show pieces under ₹30,000"), { min: null, max: 30000, soft: false });
  assert.deepEqual(extractPriceRange("something under 10k"), { min: null, max: 10000, soft: false });
  assert.equal(parseIndianAmount("1.5 lakh"), 150000);
  assert.deepEqual(extractPriceRange("between 5,000 and 15,000"), { min: 5000, max: 15000, soft: false });
  assert.deepEqual(extractPriceRange("above 25,000"), { min: 25000, max: null, soft: false });
  assert.equal(extractPriceRange("elegant but not too expensive").softMax, 8000);
});

test("shopping vocabularies are nonempty canonical data projections", () => {
  [CATEGORY_KEYWORDS, FABRIC_KEYWORDS, COLOUR_KEYWORDS, OCCASION_KEYWORDS, COLLECTION_KEYWORDS]
    .forEach((groups) => assert.ok(groups.length > 0));
  const categoryIds = new Set(canonicalProducts.map((product) => product.category));
  assert.ok(CATEGORY_KEYWORDS.every((group) => categoryIds.has(group.id)));
});

test("canonical category, fabric, colour and occasion language is detected", () => {
  const silk = resolveShoppingIntent("Show me silk sarees");
  assert.equal(silk.category.id, "sarees");
  assert.ok(silk.fabrics.some((group) => group.id === "Silk"));

  const dress = findProduct((product) => product.department === "kids" && product.subcategory === "dresses");
  const dressIntent = resolveShoppingIntent(`${colourInName(dress)} dresses`);
  assert.equal(dressIntent.category.id, dress.category);
  assert.equal(dressIntent.colour.id.toLowerCase(), colourInName(dress).toLowerCase());

  const kurta = resolveShoppingIntent("I want a kurta for a wedding");
  assert.equal(kurta.category.id, "ethnic-wear");
  assert.equal(kurta.occasion.id, "Wedding");
});

test("greetings and help requests are recognised", () => {
  assert.ok(isGreeting("Hi"));
  assert.ok(isGreeting("Namaste"));
  assert.ok(resolveShoppingIntent("what can you do?").help);
});

test("ranking honours canonical taxonomy, colour and a hard budget", () => {
  const target = findProduct((product) =>
    product.department === "kids" && product.subcategory === "dresses" && colourInName(product) === "Scarlet"
  );
  const intent = resolveShoppingIntent(`${colourInName(target)} dresses under ₹${target.price}`);
  const ranked = rankShoppingCandidates(CATALOGUE, intent, {}, 4);
  assert.equal(ranked[0].product.id, target.id);
  assert.ok(ranked.every((entry) => entry.product.price <= target.price));
});

test("ranking prefers a bestseller when the shopper asks what is trending", () => {
  const featuredId = CATALOGUE[CATALOGUE.length - 1].id;
  const candidates = CATALOGUE.map((product) => ({ ...product, isBestseller: product.id === featuredId }));
  const ranked = rankShoppingCandidates(candidates, resolveShoppingIntent("What is trending right now?"), {}, 4);
  assert.ok(ranked.some((entry) => entry.product.id === featuredId));
});

test("deterministic ordering returns the same Product IDs", () => {
  const intent = resolveShoppingIntent("Show me silk sarees");
  const first = rankShoppingCandidates(CATALOGUE, intent, {}, 4).map((entry) => entry.product.id);
  const second = rankShoppingCandidates(CATALOGUE, intent, {}, 4).map((entry) => entry.product.id);
  assert.deepEqual(first, second);
  assert.ok(first.every((id) => canonicalProducts.some((product) => product.id === id)));
});

test("natural requests return only canonical catalogue recommendations", () => {
  const response = ask("I need a kurta for a wedding");
  assert.equal(response.type, "PRODUCT_RECOMMENDATIONS");
  assert.ok(response.products.length > 0);
  response.products.forEach(({ product, reason }) => {
    assert.ok(canonicalProducts.some((entry) => entry.id === product.id));
    assert.equal(product.department, "men");
    assert.ok(reason.length > 0);
  });
});

test("budget-only queries are typed PRICE_FILTER and respect the ceiling", () => {
  const response = ask("I need something under ₹3,000");
  assert.equal(response.type, "PRICE_FILTER");
  response.products.forEach(({ product }) => assert.ok(product.price <= 3000));
});

test("impossible canonical constraints return NO_RESULTS without invented products", () => {
  const response = ask("Show me dresses under ₹1");
  assert.equal(response.type, "NO_RESULTS");
  assert.equal(response.products.length, 0);
});

test("an empty catalogue is reported as unavailable", () => {
  const response = answerShoppingQuestion({ question: "Show me silk sarees", products: [] });
  assert.equal(response.type, "NO_RESULTS");
  assert.equal(response.products.length, 0);
});

test("vague input earns a follow-up question, not a guess", () => {
  const response = ask("something nice please");
  assert.equal(response.type, "FOLLOW_UP");
  assert.ok(response.suggestions.length > 0);
});

test("product context powers similarity without repeating the canonical anchor", () => {
  const anchor = findProduct((product) => product.subcategory === "silk");
  const similar = findSimilarProducts(CATALOGUE, anchor, 4);
  assert.ok(similar.length > 0);
  assert.ok(similar.every((entry) => entry.product.id !== anchor.id));
  assert.ok(similar.every((entry) => entry.product.category === anchor.category));
  const response = ask("Show me something similar to this", { productContext: anchor });
  assert.equal(response.type, "PRODUCT_RECOMMENDATIONS");
  assert.ok(response.products.every((entry) => entry.product.id !== anchor.id));
});

test("pairing stays in the anchor's canonical department", () => {
  const anchor = findProduct((product) => product.department === "bridal" && product.subcategory === "sarees");
  const response = ask("What goes well with this?", { productContext: anchor });
  assert.equal(response.type, "OUTFIT_SUGGESTION");
  assert.equal(response.outfit.main.id, anchor.id);
  assert.ok(response.outfit.pieces.every((piece) => piece.department === anchor.department));
});

test("outfit building uses a canonical AI Mirror-eligible main piece", () => {
  const response = ask("Build me a wedding outfit");
  assert.equal(response.type, "OUTFIT_SUGGESTION");
  assert.ok(canonicalProducts.some((product) => product.id === response.outfit.main.id));
});

test("cart and wishlist intents resolve against canonical Product IDs", () => {
  const anchor = CATALOGUE[0];
  const cart = ask("Add this to my bag", { productContext: anchor });
  const wishlist = ask("Save this to my wishlist", { productContext: anchor });
  assert.equal(cart.type, "CART_ACTION");
  assert.equal(wishlist.type, "WISHLIST_ACTION");
  assert.equal(cart.product.id, anchor.id);
  assert.equal(wishlist.product.id, anchor.id);
});

test("made-to-order pieces are never added to the bag silently", () => {
  const product = { ...CATALOGUE[0], availability: "made-to-order", stock: 0 };
  const response = answerShoppingQuestion({
    question: "Add this to my bag",
    products: [product],
    productContext: product,
  });
  assert.notEqual(response.type, "CART_ACTION");
});

test("customer shopping envelopes never carry internal business data", () => {
  const anchor = findProduct((product) => product.subcategory === "silk");
  [
    "Give me today's business summary",
    "Show me silk sarees under ₹30,000",
    "Build me a wedding outfit",
    "What goes well with this?",
    "Show me the new arrivals",
  ].forEach((question) => {
    const response = ask(question, { productContext: anchor });
    assert.deepEqual(auditShoppingResponseForBusinessData(response), [], `${question} leaked business data`);
  });
});

test("period language maps onto existing analytics presets", () => {
  assert.equal(extractPeriodPreset("How are sales doing this month?"), "THIS_MONTH");
  assert.equal(extractPeriodPreset("Give me today's summary"), "TODAY");
  assert.equal(extractPeriodPreset("returns last 30 days"), "LAST_30");
  assert.equal(extractPeriodPreset("Show me silk sarees"), null);
});
