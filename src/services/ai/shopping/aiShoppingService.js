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
import {
  AI_SHOPPING_COPY as COPY,
  AI_SHOPPING_GREETING,
  AI_SHOPPING_SUGGESTIONS as SUGGESTIONS,
} from "./aiShoppingMockData.js";

/* ------------------------------------------------------------------ */
/* Vocabularies                                                        */
/* ------------------------------------------------------------------ */

/**
 * Category keywords resolve onto the real taxonomy ids used by
 * `taxonomyRepository` seeds (sarees, lehengas, bridal-couture, …).
 */
export const CATEGORY_KEYWORDS = [
  { id: "sarees", label: "saree", keywords: ["saree", "sarees", "sari", "saris"] },
  { id: "lehengas", label: "lehenga", keywords: ["lehenga", "lehengas", "lehanga", "ghagra", "chaniya", "ghaghra"] },
  { id: "bridal-couture", label: "bridal couture", keywords: ["gown", "gowns", "reception gown", "couture"] },
  { id: "kurtis-and-suits", label: "kurta", keywords: ["kurta", "kurtas", "kurti", "kurtis", "suit", "suits", "anarkali", "sharara", "salwar"] },
  { id: "menswear", label: "menswear", keywords: ["sherwani", "kurta for men", "menswear", "men s wear", "groom", "nehru jacket", "bandhgala"] },
  { id: "kidswear", label: "kids wear", keywords: ["kids", "kid", "children", "child", "little one", "little girl", "little boy"] },
  { id: "dupattas", label: "dupatta", keywords: ["dupatta", "dupattas", "stole", "stoles", "chunni"] },
  { id: "bangles", label: "bangles", keywords: ["bangle", "bangles", "kada", "chudi"] },
  { id: "jewellery", label: "jewellery", keywords: ["jewellery", "jewelry", "necklace", "earring", "earrings", "jhumka", "kundan", "polki", "temple jewellery"] },
  { id: "innerwear", label: "innerwear", keywords: ["blouse", "petticoat", "shapewear", "innerwear"] },
];

export const FABRIC_KEYWORDS = [
  { id: "Pato Silk", keywords: ["pato", "pato silk", "sambalpuri", "bomkai", "ikat"] },
  { id: "Katan Silk", keywords: ["katan", "katan silk"] },
  { id: "Banarasi Silk", keywords: ["banarasi", "banarsi", "brocade saree"] },
  { id: "Mulberry Silk", keywords: ["mulberry", "kanjivaram", "kanjeevaram"] },
  { id: "Tussar Silk", keywords: ["tussar", "tassar"] },
  { id: "Raw Silk", keywords: ["raw silk"] },
  { id: "Cotton Silk", keywords: ["cotton silk"] },
  { id: "Cotton", keywords: ["cotton", "handloom cotton", "kotpad"] },
  { id: "Linen", keywords: ["linen"] },
  { id: "Chiffon", keywords: ["chiffon"] },
  { id: "Georgette", keywords: ["georgette"] },
  { id: "Velvet", keywords: ["velvet"] },
  { id: "Organza", keywords: ["organza"] },
  { id: "Brocade", keywords: ["brocade"] },
  { id: "Modal", keywords: ["modal"] },
  { id: "Silk", keywords: ["silk"] },
];

/**
 * Colour language resolves onto the catalogue swatch names. Aliases map a
 * shopper's word onto every stocked shade that can honestly answer it.
 */
export const COLOUR_KEYWORDS = [
  { id: "Red", keywords: ["red"], aliases: ["Red", "Maroon"] },
  { id: "Maroon", keywords: ["maroon", "burgundy", "deep red"], aliases: ["Maroon", "Wine"] },
  { id: "Wine", keywords: ["wine"], aliases: ["Wine", "Maroon"] },
  { id: "Gold", keywords: ["gold", "golden", "gold toned"], aliases: ["Gold"] },
  { id: "Silver", keywords: ["silver"], aliases: ["Silver"] },
  { id: "Ivory", keywords: ["ivory", "white", "cream", "off white"], aliases: ["Ivory", "Beige"] },
  { id: "Beige", keywords: ["beige", "nude", "tan"], aliases: ["Beige", "Ivory"] },
  { id: "Blush", keywords: ["blush", "pale pink", "powder pink"], aliases: ["Blush", "Rose"] },
  { id: "Rose", keywords: ["rose", "pink", "rose pink"], aliases: ["Rose", "Blush"] },
  { id: "Emerald", keywords: ["emerald", "green", "bottle green"], aliases: ["Emerald", "Sage"] },
  { id: "Sage", keywords: ["sage", "olive", "pastel green"], aliases: ["Sage"] },
  { id: "Teal", keywords: ["teal"], aliases: ["Teal"] },
  { id: "Navy", keywords: ["navy", "dark blue"], aliases: ["Navy", "Indigo"] },
  { id: "Indigo", keywords: ["indigo", "blue"], aliases: ["Indigo", "Navy"] },
  { id: "Mustard", keywords: ["mustard", "haldi yellow"], aliases: ["Mustard", "Saffron"] },
  { id: "Saffron", keywords: ["saffron", "orange", "kesari"], aliases: ["Saffron", "Mustard"] },
  { id: "Rust", keywords: ["rust", "terracotta", "burnt orange"], aliases: ["Rust"] },
  { id: "Black", keywords: ["black", "kaala"], aliases: ["Black"] },
];

export const OCCASION_KEYWORDS = [
  { id: "Bridal", keywords: ["bridal", "bride", "my wedding", "my own wedding"] },
  { id: "Wedding", keywords: ["wedding", "shaadi", "shadi", "marriage", "sister s wedding", "brother s wedding", "cousin s wedding"] },
  { id: "Reception", keywords: ["reception"] },
  { id: "Sangeet", keywords: ["sangeet"] },
  { id: "Mehendi", keywords: ["mehendi", "mehndi", "haldi"] },
  { id: "Festive", keywords: ["festive", "festival", "diwali", "durga puja", "navratri", "eid", "onam", "pongol", "celebration"] },
  { id: "Puja", keywords: ["puja", "pooja"] },
  { id: "Party", keywords: ["party", "cocktail", "evening event", "celebration dinner"] },
  { id: "Office", keywords: ["office", "work", "corporate", "meeting"] },
  { id: "Everyday", keywords: ["everyday", "daily", "casual", "regular wear"] },
  { id: "Gifting", keywords: ["gift", "gifting", "gift for"] },
];

export const COLLECTION_KEYWORDS = [
  { id: "bridal-trousseau", keywords: ["bridal trousseau", "trousseau"] },
  { id: "festive-edit", keywords: ["festive edit"] },
  { id: "heritage-weaves", keywords: ["heritage weaves", "heritage"] },
  { id: "handloom-stories", keywords: ["handloom stories"] },
  { id: "everyday-atelier", keywords: ["everyday atelier"] },
  { id: "groom-atelier", keywords: ["groom atelier"] },
  { id: "little-heirlooms", keywords: ["little heirlooms"] },
];

/** Categories that count as full apparel looks for outfit building. */
export const OUTFIT_MAIN_CATEGORY_IDS = new Set([
  "sarees", "lehengas", "bridal-couture", "kurtis-and-suits", "menswear", "kidswear",
]);

/** Finishing pieces that may complete an AI Shopping outfit. */
export const OUTFIT_COMPANION_CATEGORY_IDS = new Set([
  "dupattas", "bangles", "jewellery",
]);

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

  const categories = matchAllKeywordGroups(text, CATEGORY_KEYWORDS);
  const fabrics = matchAllKeywordGroups(text, FABRIC_KEYWORDS);
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
    flags.similar || flags.pairing || flags.outfit || flags.compare || flags.viewDetails
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

const productColours = (product) => (product.colors ?? []).map((entry) => String(entry).toLowerCase());

/**
 * The cloth haystack: fabric and craft, plus subcategory and name so a
 * shopper asking for "Banarasi" still matches a piece woven in Katan Silk
 * under the Banarasi Saree style.
 */
const productFabricHaystack = (product) =>
  [product.fabric, product.material, product.subcategory, product.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

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
  if (intent.category && product.category === intent.category.id) {
    score += 40;
    reasons.push(`matches your ${intent.category.label} request`);
  } else if (intent.category) {
    return { score: -1, reasons: [] };
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
    const productOccasions = (product.occasion ?? []).map((entry) => entry.toLowerCase());
    const match = intent.occasions.find((group) =>
      productOccasions.includes(group.id.toLowerCase())
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
  const ids = product.collectionIds ?? [];
  const labels = (product.collections ?? []).map((entry) => String(entry).toLowerCase());
  return ids.includes(wanted) || labels.includes(String(wanted).toLowerCase());
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
    .filter((product) => OUTFIT_COMPANION_CATEGORY_IDS.has(product.category))
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
    const mainIntent = { ...intent, category: intent.category && OUTFIT_MAIN_CATEGORY_IDS.has(intent.category.id) ? intent.category : null };
    const ranked = rankShoppingCandidates(
      products.filter((product) => OUTFIT_MAIN_CATEGORY_IDS.has(product.category)),
      mainIntent,
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
    const pool = intent.category
      ? products.filter((product) => product.category === intent.category.id)
      : products.filter((product) =>
          intent.occasions?.length
            ? (product.occasion ?? []).some((entry) => intent.occasions.some((group) => group.id === entry))
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
