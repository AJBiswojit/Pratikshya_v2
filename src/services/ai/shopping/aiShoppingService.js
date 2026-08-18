/**
 * PRATIKSHYA FASHON — AI Shopping Assistant intelligence (Phase 21.1).
 *
 * Deterministic, catalogue-grounded shopping intelligence behind the mock
 * provider. Everything here is pure: products, wishlist ids, recently
 * viewed ids, purchase history and Phase 19 preferences arrive as
 * arguments, so no hidden state can influence an answer and every rule can
 * be tested with fixtures.
 *
 * This is intent matching and weighted ranking — not machine learning —
 * and the UI deliberately never presents it as a trained model.
 */

import {
  extractPriceRange,
  isGreeting,
  isGratitude,
  isHelpRequest,
  matchAllKeywordGroups,
  matchKeywordGroup,
  normaliseText,
} from "../shared/aiIntentResolver.js";
import {
  AI_SHOPPING_RESPONSE_TYPES as TYPES,
  AI_SOURCES,
  buildShoppingResponse,
} from "../shared/aiResponseBuilder.js";
import { isVirtualTryOnEligibleProduct } from "../../aiMirror/aiMirrorEligibility.js";
import {
  AI_SHOPPING_COPY as COPY,
  AI_SHOPPING_GREETING,
  AI_SHOPPING_SUGGESTIONS as SUGGESTIONS,
} from "./aiShoppingMockData.js";
import { products as canonicalProducts } from "../../../data/catalog/products.js";
import { departments as canonicalDepartments } from "../../../data/catalog/taxonomy.js";

/* ------------------------------------------------------------------ */
/* Vocabularies                                                        */
/* ------------------------------------------------------------------ */

/**
 * AI vocabulary is a projection of the canonical taxonomy/catalogue. It is
 * deliberately rebuilt from those records instead of maintaining a second
 * allowlist of product types (or a department-specific branch).
 */
const asValues = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const readable = (value) => String(value || "")
  .replace(/[-_]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const titleCase = (value) => readable(value)
  .split(" ")
  .map((word) => word ? `${word[0].toUpperCase()}${word.slice(1)}` : "")
  .join(" ");

const singular = (word) => {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
};

const keywordForms = (...values) => {
  const result = new Set();
  values.flatMap(asValues).forEach((value) => {
    const phrase = normaliseText(readable(value));
    if (!phrase) return;
    result.add(phrase);
    const words = phrase.split(" ").filter(Boolean);
    words.filter((word) => word.length > 2).forEach((word) => {
      result.add(word);
      result.add(singular(word));
    });
    result.add(words.map(singular).join(" "));
  });
  return [...result].filter(Boolean);
};

const taxonomyPaths = canonicalDepartments.flatMap((department) =>
  department.categories.flatMap((category) =>
    category.subcategories.map((subcategory) => ({ department, category, subcategory }))
  )
);

const productsForCategory = (departmentId, categoryId) =>
  canonicalProducts.filter((product) =>
    product.department === departmentId && product.category === categoryId
  );

/** Category ids stay canonical; descendant labels/styles are only aliases. */
export const CATEGORY_KEYWORDS = canonicalDepartments.flatMap((department) =>
  department.categories.map((category) => {
    const directKeywords = keywordForms(category.id, category.name, category.slug);
    const descendants = category.subcategories.flatMap((subcategory) =>
      keywordForms(subcategory.id, subcategory.name, subcategory.slug)
    );
    const styles = productsForCategory(department.id, category.id).flatMap((product) =>
      keywordForms(product.style)
    );
    return {
      id: category.id,
      label: category.name,
      departmentId: department.id,
      directKeywords,
      keywords: [...new Set([...directKeywords, ...descendants, ...styles])],
    };
  })
);

const groupsFromValues = (values, extra = {}) => {
  const byNormalisedValue = new Map();
  values.flatMap(asValues).filter(Boolean).forEach((value) => {
    const key = normaliseText(readable(value));
    if (!key || byNormalisedValue.has(key)) return;
    const label = titleCase(value);
    const keywords = keywordForms(value, label);
    byNormalisedValue.set(key, { id: label, label, keywords, ...extra });
  });
  return [...byNormalisedValue.values()];
};

/**
 * Structured fabric/material values win. Taxonomy leaves and authored styles
 * keep the projection useful while those optional catalogue fields are blank.
 */
export const FABRIC_KEYWORDS = groupsFromValues([
  ...canonicalProducts.flatMap((product) => [product.fabric, product.material]),
  ...taxonomyPaths.map(({ subcategory }) => subcategory.id),
]);

/**
 * The generated catalogue's documented naming contract places its
 * image-derived dominant colour after the house name. Explicit colour fields
 * take precedence whenever an administrator has authored them.
 */
const colourValuesFor = (product) => {
  const explicit = [
    ...asValues(product.colors),
    product.primaryColor,
    product.secondaryColor,
  ].filter(Boolean);
  if (explicit.length) return explicit;
  const words = readable(product.name).split(" ").filter(Boolean);
  return words.length > 2 ? [words[1]] : [];
};

const colourGroups = groupsFromValues(canonicalProducts.flatMap(colourValuesFor));
export const COLOUR_KEYWORDS = colourGroups.map((group) => ({
  ...group,
  aliases: [...group.keywords],
}));

const taxonomyNodeNames = new Set(canonicalDepartments.flatMap((department) => [
  department.name,
  ...department.categories.flatMap((category) => [
    category.name,
    ...category.subcategories.map((subcategory) => subcategory.name),
  ]),
]).map((value) => normaliseText(value)));

const taxonomyOccasionValues = canonicalDepartments.flatMap((department) => [
  ...readable(department.eyebrow).split(/\s*(?:\+|&|·)\s*/),
  ...department.categories.flatMap((category) =>
    readable(category.eyebrow).split(/\s*(?:\+|&|·)\s*/)
  ),
]).filter((value) => {
  const key = normaliseText(value);
  return key && !taxonomyNodeNames.has(key) && !/\b(?:collection|edit)\b/i.test(String(value));
});

export const OCCASION_KEYWORDS = groupsFromValues([
  ...canonicalProducts.flatMap((product) => product.occasion),
  ...taxonomyOccasionValues,
]);

const taxonomyCollectionValues = taxonomyPaths
  .flatMap(({ department, category, subcategory }) => [department.name, category.name, subcategory.name])
  .filter((value) => /\b(?:collection|edit)\b/i.test(String(value)));

const collectionGroups = groupsFromValues([
  ...canonicalProducts.flatMap((product) => [product.collection, ...(product.collections ?? [])]),
  ...taxonomyCollectionValues,
]);
const collectionKeywordFrequency = collectionGroups.reduce((counts, group) => {
  group.keywords.forEach((keyword) => counts.set(keyword, (counts.get(keyword) ?? 0) + 1));
  return counts;
}, new Map());
export const COLLECTION_KEYWORDS = collectionGroups.map((group) => ({
  ...group,
  keywords: group.keywords.filter((keyword) => collectionKeywordFrequency.get(keyword) === 1),
}));

const canonicalProductById = new Map(canonicalProducts.map((product) => [String(product.id), product]));
const canonicalPathForProduct = (product) => taxonomyPaths.find(({ department, category, subcategory }) =>
  department.id === product?.department &&
  category.id === product?.category &&
  subcategory.id === product?.subcategory
);

/* ------------------------------------------------------------------ */
/* Intent resolution                                                   */
/* ------------------------------------------------------------------ */

const hasAny = (flat, words) => words.some((word) => flat.includes(word));

/**
 * Reads a shopper's sentence into a structured intent. Every field is
 * optional; the ranker scores against whatever was understood.
 */
export const resolveShoppingIntent = (rawText) => {
  const text = String(rawText || "");
  const flat = normaliseText(text);

  const categoryMatches = matchAllKeywordGroups(text, CATEGORY_KEYWORDS);
  /* When a word is both a canonical category and a leaf elsewhere (for
     example “lehengas”), prefer the direct category while retaining every
     matching canonical scope for ranking. */
  const categories = [...categoryMatches].sort((a, b) => {
    const aDirect = matchKeywordGroup(text, [{ keywords: a.directKeywords }]) ? 1 : 0;
    const bDirect = matchKeywordGroup(text, [{ keywords: b.directKeywords }]) ? 1 : 0;
    return bDirect - aDirect;
  });
  const fabricMatches = matchAllKeywordGroups(text, FABRIC_KEYWORDS);
  const categoryIds = new Set(categories.map((group) => normaliseText(group.id)));
  const fabrics = fabricMatches.filter((group) => !categoryIds.has(normaliseText(group.id)));
  const colours = matchAllKeywordGroups(text, COLOUR_KEYWORDS);
  const occasions = matchAllKeywordGroups(text, OCCASION_KEYWORDS);
  const collection = matchKeywordGroup(text, COLLECTION_KEYWORDS);

  const price = extractPriceRange(text);

  const flags = {
    newArrival: hasAny(flat, ["new arrival", "new arrivals", "latest", "just in", "new pieces", "new in"]),
    bestseller: hasAny(flat, ["bestseller", "best seller", "best selling", "most loved", "popular"]),
    trending: hasAny(flat, ["trending", "trend", "what s hot", "whats hot", "viral"]),
    discount: hasAny(flat, ["discount", "discounted", "offer", "sale", "deal", "value"]),
    similar: hasAny(flat, ["similar", "like this", "something like it", "alternatives", "alternative"]),
    pairing: hasAny(flat, ["goes well", "go well", "pairs with", "pair with", "style with", "match with", "complement", "with this saree", "with this lehenga", "with this"]),
    outfit: hasAny(flat, ["build", "outfit", "complete look", "full look", "ensemble", "look for", "look around"]),
    compare: hasAny(flat, ["compare", "versus", " vs ", "difference between", "which is better", "or the ", "help me choose", "which one"]),
    viewDetails: hasAny(flat, ["tell me about", "know more", "details of", "describe"]),
    elegant: hasAny(flat, ["elegant", "graceful", "classic", "timeless"]),
  };

  const actions = {
    addToCart: hasAny(flat, [
      "add to bag", "add to cart", "add it to", "add this", "to my bag", "in my bag",
      "buy", "purchase", "order it", "put it in", "add the first", "take it",
    ]),
    wishlist: hasAny(flat, ["wishlist", "wish list", "save it", "save this", "save for later", "favourite it", "favorite it", "save to"]),
  };

  const weddingContext = hasAny(flat, ["wedding", "shaadi", "bridal", "reception", "sangeet", "mehendi"]);

  const wordCount = flat.split(" ").filter(Boolean).length;
  const hasSignals = Boolean(
    categories.length || fabrics.length || colours.length || occasions.length ||
    collection || price ||
    flags.newArrival || flags.bestseller || flags.trending || flags.discount ||
    flags.similar || flags.pairing || flags.outfit || flags.compare || flags.viewDetails ||
    flags.elegant || weddingContext
  );

  return {
    raw: text,
    text: flat,
    greeting: isGreeting(text),
    gratitude: isGratitude(text),
    help: isHelpRequest(text),
    category: categories[0] ?? null,
    categories,
    fabric: fabrics[0] ?? null,
    fabrics,
    colour: colours[0] ?? null,
    colours,
    occasion: occasions[0] ?? null,
    occasions,
    collection,
    price,
    flags,
    actions,
    weddingContext,
    vague: wordCount < 2 ? false : !hasSignals,
    wordCount,
  };
};

/* ------------------------------------------------------------------ */
/* Candidate ranking                                                   */
/* ------------------------------------------------------------------ */

const priceOf = (product) => Number(product?.price ?? 0);

const canonicalSourceFor = (product) => canonicalProductById.get(String(product?.id)) ?? product;

const productColours = (product) =>
  colourValuesFor({ ...canonicalSourceFor(product), ...product })
    .map((entry) => normaliseText(entry));

/**
 * The cloth haystack: explicit fabric/craft plus canonical leaf/style/name so
 * a shopper asking for an authored taxonomy term still finds that family.
 */
const productFabricHaystack = (product) => {
  const canonical = canonicalSourceFor(product);
  return normaliseText([
    product.fabric,
    product.material,
    product.subcategory,
    product.style,
    product.name,
    canonical?.fabric,
    canonical?.material,
    canonical?.subcategory,
    canonical?.style,
  ].filter(Boolean).join(" "));
};

const productOccasionHaystack = (product) => {
  const canonical = canonicalSourceFor(product);
  const path = canonicalPathForProduct(product) ?? canonicalPathForProduct(canonical);
  return normaliseText([
    ...asValues(product.occasion),
    ...asValues(canonical?.occasion),
    product.style,
    canonical?.style,
    product.subcategory,
    canonical?.subcategory,
    path?.department.name,
    path?.department.eyebrow,
    path?.category.name,
    path?.category.eyebrow,
    path?.subcategory.name,
  ].filter(Boolean).join(" "));
};

const withinPrice = (product, price) => {
  if (!price) return true;
  const value = priceOf(product);
  if (price.min != null && value < price.min) return false;
  if (price.max != null && value > price.max) return false;
  return true;
};

/**
 * Scores one product against one intent. Returns `{ score, reasons }`;
 * a negative score means "exclude". Reasons are the exact signals that
 * earned points, so the UI can say why a piece was chosen.
 */
export const scoreProductForIntent = (product, intent, boosts = {}) => {
  if (!product || product.inStock === false) return { score: -1, reasons: [] };

  const reasons = [];
  let score = 0;

  /* Explicit request — category, fabric, colour, occasion, collection. */
  if (intent.categories?.length) {
    const categoryMatch = intent.categories.find((group) => product.category === group.id);
    if (!categoryMatch) return { score: -1, reasons: [] };
    score += 40;
    reasons.push(`matches your ${categoryMatch.label} request`);
  }

  if (intent.fabrics?.length) {
    const haystack = productFabricHaystack(product);
    const match = intent.fabrics.find((group) =>
      group.keywords.some((keyword) => haystack.includes(keyword)) ||
      haystack.includes(group.id.toLowerCase())
    );
    if (match) {
      score += 22;
      reasons.push(`is crafted in ${match.id.toLowerCase()}`);
    } else {
      score -= 30;
    }
  }

  if (intent.colours?.length) {
    const shades = productColours(product);
    const match = intent.colours.find((group) =>
      group.aliases.some((alias) => shades.includes(alias.toLowerCase()))
    );
    if (match) {
      score += 18;
      reasons.push(`comes in the ${match.id.toLowerCase()} palette`);
    } else {
      score -= 24;
    }
  }

  if (intent.occasions?.length) {
    const haystack = productOccasionHaystack(product);
    const match = intent.occasions.find((group) =>
      group.keywords.some((keyword) =>
        keyword.includes(" ") ? haystack.includes(keyword) : haystack.split(" ").includes(keyword)
      )
    );
    if (match) {
      score += 20;
      reasons.push(`is made for ${match.id.toLowerCase()} moments`);
    } else if (intent.occasion) {
      score -= 18;
    }
  }

  if (intent.collection && !flagsCollectionMatch(intent, product)) {
    score -= 15;
  }

  /* Budget. */
  if (intent.price) {
    if (!withinPrice(product, intent.price)) return { score: -1, reasons: [] };
    score += 12;
    if (intent.price.max != null) {
      reasons.push(`fits within your ₹${intent.price.max.toLocaleString("en-IN")} budget`);
    } else if (intent.price.min != null) {
      reasons.push(`sits in the heirloom bracket you asked for`);
    }
    if (intent.price.softMax && priceOf(product) <= intent.price.softMax) {
      score += 8;
    } else if (intent.price.softMax) {
      score -= 10;
    }
  }

  /* Merchandising flags asked for explicitly. */
  if (intent.flags?.newArrival) {
    if (product.isNew) { score += 18; reasons.push("is a new arrival at the atelier"); }
    else score -= 12;
  }
  if (intent.flags?.bestseller || intent.flags?.trending) {
    if (product.isBestseller) { score += 18; reasons.push("is one of the most loved pieces"); }
    else if (product.isFeatured) score += 6;
    else score -= 8;
  }
  if (intent.flags?.discount) {
    if (product.discount) { score += 15; reasons.push(`is carrying ${product.discount}% off`); }
    else score -= 10;
  }
  if (intent.flags?.elegant) {
    score += Math.min(product.rating ?? 0, 5) * 1.5;
  }

  /* Availability nudges — never a hard cut except for unavailable. */
  if (product.availability === "in-stock") score += 8;
  else if (product.availability === "low-stock") score += 4;
  else if (product.availability === "made-to-order") score += 1;

  /* Personal signals. */
  const id = String(product.id);
  if (boosts.wishlistIds?.includes(id)) { score += 6; reasons.push("is already on your wishlist"); }
  if (boosts.recentIds?.includes(id)) score += 4;
  if (boosts.purchasedIds?.includes(id)) score += 3;

  const preferences = boosts.preferences;
  if (preferences) {
    if (preferences.categories?.includes(product.category)) { score += 8; reasons.push("sits close to your style profile"); }
    if (product.fabric && preferences.fabrics?.some((fabric) => String(fabric).toLowerCase() === String(product.fabric).toLowerCase())) score += 6;
    if (preferences.occasions?.some((occasion) => (product.occasion ?? []).includes(occasion))) score += 4;
    if (preferences.colours?.some((colour) => productColours(product).includes(String(colour).toLowerCase()))) score += 3;
  }

  /* Quiet merchandising base. */
  if (product.isFeatured) score += 4;
  if (product.isBestseller) score += 3;
  if (product.isNew) score += 2;
  score += (product.rating ?? 0) * 1.2;

  return { score: Math.round(score * 10) / 10, reasons };
};

const flagsCollectionMatch = (intent, product) => {
  const wanted = intent.collection?.id;
  if (!wanted) return true;
  const ids = (product.collectionIds ?? []).map((entry) => normaliseText(entry));
  const labels = (product.collections ?? []).map((entry) => normaliseText(entry));
  if (ids.includes(normaliseText(wanted)) || labels.includes(normaliseText(wanted))) return true;
  const canonical = canonicalSourceFor(product);
  const canonicalText = normaliseText([
    canonical?.collection,
    ...(canonical?.collections ?? []),
    canonical?.subcategory,
    canonical?.style,
  ].filter(Boolean).join(" "));
  return intent.collection.keywords.some((keyword) => canonicalText.includes(keyword));
};

/**
 * Deterministic ranking. Ties resolve on rating, then price, then id, so
 * the same request always produces the same edit.
 */
export const rankShoppingCandidates = (products, intent, boosts = {}, limit = 4) => {
  const scored = (products ?? [])
    .map((product) => ({ product, ...scoreProductForIntent(product, intent, boosts) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) =>
      b.score - a.score ||
      (b.product.rating ?? 0) - (a.product.rating ?? 0) ||
      priceOf(a.product) - priceOf(b.product) ||
      String(a.product.id).localeCompare(String(b.product.id))
    );
  return scored.slice(0, limit);
};

/* ------------------------------------------------------------------ */
/* Similarity and pairing                                              */
/* ------------------------------------------------------------------ */

/** Scores how closely another piece stands beside the context product. */
export const scoreSimilarity = (candidate, anchor) => {
  if (!candidate || !anchor || candidate.id === anchor.id) return -1;
  if (candidate.inStock === false) return -1;

  let score = 0;
  const reasons = [];

  if (candidate.category === anchor.category) { score += 24; reasons.push("the same silhouette family"); }
  if (candidate.subcategory && candidate.subcategory === anchor.subcategory) { score += 10; reasons.push("the same weave story"); }
  if (candidate.fabric && candidate.fabric === anchor.fabric) { score += 12; reasons.push(`shared ${candidate.fabric.toLowerCase()} cloth`); }

  const sharedOccasions = (candidate.occasion ?? []).filter((entry) => (anchor.occasion ?? []).includes(entry));
  if (sharedOccasions.length) { score += 4 * sharedOccasions.length; reasons.push(`dressed for ${sharedOccasions[0].toLowerCase()} too`); }

  const anchorColours = productColours(anchor);
  const sharedColour = productColours(candidate).some((colour) => anchorColours.includes(colour));
  if (sharedColour) score += 6;

  const priceDelta = Math.abs(priceOf(candidate) - priceOf(anchor)) / Math.max(priceOf(anchor), 1);
  if (priceDelta <= 0.4) score += 6;

  score += (candidate.rating ?? 0);
  return { score: Math.round(score * 10) / 10, reasons };
};

/**
 * Similar pieces for a product the customer is standing on. The anchor
 * itself never appears in its own recommendation rail.
 */
export const findSimilarProducts = (products, anchor, limit = 4, priceCap = null) => {
  if (!anchor) return [];
  return (products ?? [])
    .map((candidate) => ({ candidate, similarity: scoreSimilarity(candidate, anchor) }))
    .filter((entry) => typeof entry.similarity === "object" && entry.similarity.score > 0)
    .filter((entry) => (priceCap == null ? true : priceOf(entry.candidate) <= priceCap))
    .sort((a, b) => b.similarity.score - a.similarity.score || String(a.candidate.id).localeCompare(String(b.candidate.id)))
    .slice(0, limit)
    .map((entry) => ({ product: entry.candidate, reasons: entry.similarity.reasons }));
};

/**
 * Companion pieces for an outfit — dupattas, bangles and jewellery that
 * share the main piece's occasion or palette. These are styling
 * suggestions for AI Shopping only; AI Mirror eligibility keeps its own
 * apparel-only rules untouched.
 */
export const findCompanionPieces = (products, main, limit = 3, maxRatio = 0.6) => {
  if (!main) return [];
  const cap = Math.max(priceOf(main) * maxRatio, 2500);
  return (products ?? [])
    .filter((product) => product.id !== main.id)
    .filter((product) => product.department && product.department === main.department)
    .filter((product) => product.inStock !== false && product.availability !== "made-to-order")
    .filter((product) => priceOf(product) <= cap)
    .map((product) => {
      let score = 0;
      const sharedOccasion = (product.occasion ?? []).some((entry) => (main.occasion ?? []).includes(entry));
      if (sharedOccasion) score += 20;
      const sharedColour = productColours(product).some((colour) => productColours(main).includes(colour));
      if (sharedColour) score += 12;
      score += (product.rating ?? 0) * 2;
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || String(a.product.id).localeCompare(String(b.product.id)))
    .slice(0, limit)
    .map((entry) => entry.product);
};

/* ------------------------------------------------------------------ */
/* Reason phrasing                                                     */
/* ------------------------------------------------------------------ */

const phraseReason = (entry) => {
  const parts = (entry.reasons ?? []).slice(0, 3);
  if (!parts.length) return "A house favourite from the current edit.";
  const first = parts[0];
  if (parts.length === 1) return `Recommended because it ${first}.`;
  return `Recommended because it ${parts[0]} and ${parts[1]}.`;
};

/* ------------------------------------------------------------------ */
/* Response orchestration                                              */
/* ------------------------------------------------------------------ */

const productEntry = (product, reasons) => ({
  product,
  reason: phraseReason({ reasons }),
});

const recommendIntentResponse = (products, intent, boosts) => {
  const ranked = rankShoppingCandidates(products, intent, boosts, 4);

  if (!ranked.length) {
    /* Relax gracefully: drop colour, then fabric, then widen the budget. */
    const relaxed = rankShoppingCandidates(
      products,
      { ...intent, colours: [], fabrics: [] },
      boosts,
      4
    );
    if (relaxed.length) {
      return buildShoppingResponse({
        type: TYPES.NO_RESULTS,
        text: COPY.noResults,
        products: relaxed.map((entry) => productEntry(entry.product, entry.reasons)),
        suggestions: SUGGESTIONS.noResults,
      });
    }
    const widened = intent.price?.max
      ? rankShoppingCandidates(products, { ...intent, colours: [], fabrics: [], price: { ...intent.price, max: Math.round(intent.price.max * 1.5), min: null } }, boosts, 4)
      : [];
    if (widened.length) {
      return buildShoppingResponse({
        type: TYPES.NO_RESULTS,
        text: COPY.noResults,
        products: widened.map((entry) => productEntry(entry.product, entry.reasons)),
        suggestions: SUGGESTIONS.noResults,
      });
    }
    return buildShoppingResponse({
      type: TYPES.NO_RESULTS,
      text: COPY.noResultsHard,
      suggestions: SUGGESTIONS.noResults,
    });
  }

  const priceDriven =
    intent.price && !intent.category && !intent.fabric && !intent.colour && !intent.occasion;

  const intro = intent.occasion
    ? `For ${intent.occasion.id.toLowerCase()} moments, this is the edit I would set before you.`
    : intent.fabric
      ? `Here is what the atelier holds in ${intent.fabric.id.toLowerCase()} right now.`
      : intent.category
        ? `Here are the ${intent.category.label}s I would point you to first.`
        : priceDriven
          ? `Within that budget, these are the pieces worth your attention.`
          : `Here is what I have chosen from the current edit.`;

  return buildShoppingResponse({
    type: priceDriven ? TYPES.PRICE_FILTER : TYPES.PRODUCT_RECOMMENDATIONS,
    text: intro,
    products: ranked.map((entry) => productEntry(entry.product, entry.reasons)),
    suggestions: SUGGESTIONS.recommendations,
  });
};

/** Compares two or three pieces on the fields a shopper actually weighs. */
const comparisonResponse = (candidates) => {
  const rows = [
    { label: "Price", value: (product) => `₹${Number(product.price ?? 0).toLocaleString("en-IN")}` },
    { label: "Fabric", value: (product) => product.fabric || "—" },
    { label: "Colours", value: (product) => (product.colors ?? []).join(", ") || "—" },
    { label: "Occasion", value: (product) => (product.occasion ?? []).slice(0, 2).join(", ") || "—" },
    { label: "Availability", value: (product) => product.availabilityLabel || product.availability || "—" },
    { label: "Rating", value: (product) => `${Number(product.rating ?? 0).toFixed(1)} ★ (${product.reviewCount ?? 0})` },
  ];
  const winner = [...candidates].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
  )[0];
  return buildShoppingResponse({
    type: TYPES.PRODUCT_COMPARISON,
    text: "Here is how they stand beside each other.",
    comparison: {
      products: candidates,
      rows: rows.map((row) => ({ label: row.label, values: candidates.map((product) => row.value(product)) })),
      verdict: winner
        ? `If I must choose, ${winner.name} carries the strongest love from our customers.`
        : "",
    },
    suggestions: SUGGESTIONS.comparison,
  });
};

/**
 * The shopping assistant's answer for one customer message. Pure: every
 * input arrives as an argument and no storage is touched.
 */
export const answerShoppingQuestion = ({
  question,
  products = [],
  productContext = null,
  wishlistIds = [],
  recentIds = [],
  purchasedIds = [],
  preferences = null,
  customerName = null,
}) => {
  const intent = resolveShoppingIntent(question);
  const boosts = { wishlistIds, recentIds, purchasedIds, preferences };

  /* Conversation first. */
  if (intent.greeting) {
    return buildShoppingResponse({
      type: TYPES.TEXT,
      text: AI_SHOPPING_GREETING(customerName),
      suggestions: SUGGESTIONS.greeting,
    });
  }
  if (intent.gratitude) {
    return buildShoppingResponse({ type: TYPES.TEXT, text: COPY.thanks, suggestions: SUGGESTIONS.greeting });
  }
  if (intent.help) {
    return buildShoppingResponse({ type: TYPES.TEXT, text: COPY.help, suggestions: SUGGESTIONS.greeting });
  }

  /* The catalogue is the ground truth; without it nothing can be answered. */
  if (!Array.isArray(products) || products.length === 0) {
    return buildShoppingResponse({ type: TYPES.NO_RESULTS, text: COPY.catalogueEmpty });
  }

  /* A product the customer is standing on. */
  const anchor = productContext ?? null;

  if (intent.flags.viewDetails && anchor) {
    return buildShoppingResponse({
      type: TYPES.PRODUCT_CONTEXT,
      text: `${anchor.name} — ${anchor.fabric || "a considered"} ${anchor.categoryLabel || ""} from the ${anchor.collection || "current"} edit. ${(anchor.description || "").slice(0, 220)}`,
      product: anchor,
      suggestions: ["Show me something similar", "What goes well with this?", "Show alternatives under ₹15,000"],
    });
  }

  /* Similarity anchored on the current product. */
  if (intent.flags.similar && anchor) {
    const cap = intent.price?.max ?? null;
    const similar = findSimilarProducts(products, anchor, 4, cap);
    if (!similar.length) {
      return buildShoppingResponse({
        type: TYPES.NO_RESULTS,
        text: COPY.noResultsHard,
        suggestions: SUGGESTIONS.noResults,
      });
    }
    return buildShoppingResponse({
      type: TYPES.PRODUCT_RECOMMENDATIONS,
      text: `Pieces that share the spirit of ${anchor.name}.`,
      products: similar.map((entry) => ({
        product: entry.product,
        reason: `Recommended through ${entry.reasons[0] ?? "a shared story"} with ${anchor.name}.`,
      })),
      suggestions: SUGGESTIONS.recommendations,
    });
  }

  /* Pairing around the current product. */
  if (intent.flags.pairing && anchor) {
    const companions = findCompanionPieces(products, anchor, 3);
    return buildShoppingResponse({
      type: TYPES.OUTFIT_SUGGESTION,
      text: `Here is what I would set beside ${anchor.name}.`,
      outfit: { main: anchor, pieces: companions, note: "Styling suggestions — the AI Mirror keeps its apparel-only edit." },
      suggestions: SUGGESTIONS.outfit,
    });
  }

  /* Full outfit building. */
  if (intent.flags.outfit) {
    const ranked = rankShoppingCandidates(
      products.filter(isVirtualTryOnEligibleProduct),
      intent,
      boosts,
      1
    );
    const main = ranked[0]?.product ?? anchor;
    if (main) {
      const pieces = findCompanionPieces(products, main, 3);
      return buildShoppingResponse({
        type: TYPES.OUTFIT_SUGGESTION,
        text: `Here is a look I would compose for you — ${main.name} at its heart.`,
        outfit: { main, pieces, note: "The main piece is AI Mirror eligible apparel; finishing pieces are styling suggestions only." },
        suggestions: SUGGESTIONS.outfit,
      });
    }
  }

  /* Comparison. */
  if (intent.flags.compare) {
    const pool = intent.categories?.length
      ? products.filter((product) => intent.categories.some((group) => group.id === product.category))
      : products.filter((product) =>
          intent.occasions?.length
            ? intent.occasions.some((group) =>
                group.keywords.some((keyword) => productOccasionHaystack(product).includes(keyword))
              )
            : true
        );
    const ranked = rankShoppingCandidates(pool.length ? pool : products, intent, boosts, 2);
    if (ranked.length >= 2) {
      return comparisonResponse(ranked.map((entry) => entry.product));
    }
  }

  /* Wishlist intent aimed at a specific piece. */
  if (intent.actions.wishlist) {
    const target = anchor ?? rankShoppingCandidates(products, intent, boosts, 1)[0]?.product ?? null;
    if (target) {
      return buildShoppingResponse({
        type: TYPES.WISHLIST_ACTION,
        text: COPY.wishlisted(target.name),
        product: target,
        suggestions: ["Show me something similar", "Build an outfit"],
      });
    }
  }

  /* Add-to-bag intent. */
  if (intent.actions.addToCart) {
    const target = anchor ?? rankShoppingCandidates(products, intent, boosts, 1)[0]?.product ?? null;
    if (target && target.inStock !== false && target.availability !== "made-to-order") {
      return buildShoppingResponse({
        type: TYPES.CART_ACTION,
        text: COPY.cartAdded(target.name),
        product: target,
        suggestions: ["Show me something similar", "What goes well with this?"],
        source: AI_SOURCES.CATALOGUE,
      });
    }
    if (target) {
      return buildShoppingResponse({
        type: TYPES.TEXT,
        text: COPY.cartUnavailable(target.name),
        product: target,
        suggestions: SUGGESTIONS.recommendations,
      });
    }
  }

  /* Merchandising asks ("new arrivals", "what's trending", "discounts")
     are signals in their own right — they must never fall through to a
     follow-up question. */
  const merchandisingAsk =
    intent.flags.newArrival || intent.flags.bestseller || intent.flags.trending || intent.flags.discount;

  /* Nothing understood — ask a calm follow-up. */
  if (!merchandisingAsk && (intent.vague || (!intent.category && !intent.fabric && !intent.colour && !intent.occasion && !intent.price && !intent.collection))) {
    return buildShoppingResponse({
      type: TYPES.FOLLOW_UP,
      text: COPY.vague,
      suggestions: ["I need something for a wedding", "Show silk sarees", "Under ₹10,000"],
    });
  }

  return recommendIntentResponse(products, intent, boosts);
};

export default {
  resolveShoppingIntent,
  scoreProductForIntent,
  rankShoppingCandidates,
  scoreSimilarity,
  findSimilarProducts,
  findCompanionPieces,
  answerShoppingQuestion,
};
