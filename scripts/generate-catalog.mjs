/**
 * PRATIKSHYA FASHON — Frontend catalogue generator.
 *
 * Builds `src/data/catalog/{products,taxonomy,hero,collections}.js` from the
 * single source of truth: the organised product media under
 * `public/images/products/` (plus `public/images/hero/` and
 * `public/images/collections/`).
 *
 * Rules honoured here:
 *   · one product folder → one product record (folder id = product id)
 *   · department / category / subcategory are DERIVED from the media path
 *   · media paths are root-relative public URLs; nothing is moved or converted
 *   · names are grounded in the product's own imagery (dominant colour,
 *     analysed from the actual pixels), its folder taxonomy and its product
 *     id — no invented fabrics, prices or specifications
 *
 * Usage:  node scripts/generate-catalog.mjs
 * Requires ImageMagick (`convert`) for the colour analysis.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PRODUCTS_DIR = join(ROOT, "public", "images", "products");
const OUT_DIR = join(ROOT, "src", "data", "catalog");

/* ------------------------------------------------------------------ */
/* Media scan                                                          */
/* ------------------------------------------------------------------ */

const numericAware = (a, b) => {
  const na = Number.parseInt(a, 10);
  const nb = Number.parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
};

const scanProductFolders = () => {
  const folders = [];
  const walk = (dir, segments) => {
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      if (!statSync(path).isDirectory()) continue;
      if (/^PF-/.test(entry)) {
        const files = readdirSync(path).sort(numericAware);
        const primaryFile = files.find((f) => /^primary\./i.test(f)) ?? files[0] ?? null;
        folders.push({
          id: entry,
          segments,
          path,
          files,
          primaryFile,
        });
      } else {
        walk(path, [...segments, entry]);
      }
    }
  };
  walk(PRODUCTS_DIR, []);
  return folders;
};

const mediaFor = (folder) => {
  const base = `/images/products/${[...folder.segments, folder.id].join("/")}`;
  const primary = folder.primaryFile ? `${base}/${folder.primaryFile}` : null;
  const gallery = folder.files
    .filter((file) => file !== folder.primaryFile)
    .map((file) => `${base}/${file}`);
  return { primary, gallery };
};

/* ------------------------------------------------------------------ */
/* Colour analysis                                                     */
/* ------------------------------------------------------------------ */

const rgbOf = (hex) => {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
};

const hslOf = ([r, g, b]) => {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === nr) h = ((ng - nb) / d + (ng < nb ? 6 : 0)) * 60;
  else if (max === ng) h = ((nb - nr) / d + 2) * 60;
  else h = ((nr - ng) / d + 4) * 60;
  return { h, s, l };
};

const analyseImage = (filePath) => {
  try {
    const avgLine = execFileSync("convert", [filePath, "-resize", "1x1!", "-colorspace", "sRGB", "txt:-"], { encoding: "utf8" });
    const avgHex = avgLine.match(/#([0-9A-Fa-f]{6})/);
    const hist = execFileSync("convert", [filePath, "-resize", "96x96", "-colors", "6", "-format", "%c", "histogram:info:-"], { encoding: "utf8" });
    const entries = [];
    let total = 0;
    for (const line of hist.split("\n")) {
      const match = line.match(/(\d+):\s*\([\d.]+,[\d.]+,[\d.]+\)\s*(#(?:[0-9A-Fa-f]{6}))/);
      if (!match) continue;
      const count = Number(match[1]);
      const rgb = rgbOf(match[2]);
      total += count;
      entries.push({ count, rgb, hsl: hslOf(rgb) });
    }
    const avg = avgHex ? hslOf(rgbOf(avgHex[1])) : { h: 0, s: 0, l: 0.5 };
    return { entries, total, avg };
  } catch {
    return null;
  }
};

/** Colour families — near-synonyms keep names varied within the same
 *  image-grounded band, so the catalogue never reads as one repeated word. */
const FAMILY_ROTATIONS = {
  "warm-light": ["Coral", "Apricot", "Peach"],
  "warm-mid": ["Terracotta", "Copper", "Sienna"],
  "warm-dark": ["Rust", "Umber"],
  gold: ["Gold", "Saffron", "Amber"],
  "gold-mid": ["Mustard", "Honey"],
  pink: ["Rose", "Blush"],
  "warm-neutral": ["Beige", "Sand", "Wheat"],
};

/** Classifies an HSL colour into a palette band. */
const colourBand = ({ h, s, l }) => {
  if (s < 0.18) {
    if (s < 0.12 && l >= 0.55 && l <= 0.78 && h >= 170 && h <= 265) return "Silver";
    if (l >= 0.86) return "Ivory";
    if (l >= 0.76) return "Pearl";
    if (l >= 0.64) return "Champagne";
    if (l >= 0.5) return "Taupe";
    if (l >= 0.34) return "Mocha";
    return "Charcoal";
  }
  const hue = ((h % 360) + 360) % 360;
  /* Pale warm cloth reads as beige / sand / wheat, not orange. */
  if (s < 0.32 && l > 0.58) return "warm-neutral";
  if (hue >= 345 || hue < 12) {
    if (l < 0.3) return "Wine";
    if (l < 0.42) return "Maroon";
    if (l < 0.52) return "Crimson";
    return "Scarlet";
  }
  if (hue < 28) {
    if (s < 0.55) return l > 0.48 ? "warm-light" : "warm-dark";
    return l < 0.5 ? "Vermilion" : "warm-light";
  }
  if (hue < 45) {
    if (l > 0.62) return "warm-light";
    if (l > 0.45) return "warm-mid";
    return "warm-dark";
  }
  if (hue < 60) return l >= 0.55 ? "gold" : "warm-mid";
  if (hue < 75) return l > 0.72 ? "gold" : l > 0.55 ? "gold-mid" : "Olive";
  if (hue < 100) return l > 0.7 ? "Pistachio" : "Olive";
  if (hue < 165) {
    if (l < 0.3) return "Forest";
    if (l < 0.45) return "Emerald";
    if (l < 0.62) return "Jade";
    return "Sage";
  }
  if (hue < 190) return "Teal";
  if (hue < 220) return l < 0.35 ? "Midnight" : "Peacock";
  if (hue < 250) {
    if (l < 0.3) return "Midnight";
    if (l < 0.45) return "Navy";
    if (l < 0.6) return "Sapphire";
    if (l >= 0.8 && s < 0.45) return "Powder Blue";
    if (l < 0.8) return "Azure";
    return "Sky";
  }
  if (hue < 270) return "Indigo";
  if (hue < 315) {
    if (l < 0.35) return "Plum";
    if (l < 0.55) return "Violet";
    if (l < 0.7) return "Amethyst";
    return "Lilac";
  }
  if (l > 0.72 && s < 0.6) return "pink";
  if (l > 0.62) return "pink";
  if (l < 0.45) return "Raspberry";
  if (l < 0.6) return "Fuchsia";
  return "Mauve";
};

/** The colour word a product's imagery supports — warm metal/gold first,
 *  then vivid garment hues, then the remaining dominant tones. Studio-skin
 *  oranges never outrank the piece itself; near-synonyms rotate by product
 *  id so one band never floods a page with the same word. */
const colourWordOf = (analysis, productId = "") => {
  if (!analysis) return null;
  const entries = (analysis.entries ?? [])
    .map((entry) => ({ ...entry, ratio: entry.count / Math.max(analysis.total, 1) }))
    .filter((entry) => entry.ratio >= 0.07);
  const hsl = (() => {
    if (!entries.length) return analysis.avg;
    const priority = (candidate) => {
      const hue = ((candidate.h % 360) + 360) % 360;
      const { s, l } = candidate;
      /* Warm bright metal — gold, brass, champagne — reads as the piece on
         dark studio ground. */
      if (hue >= 25 && hue <= 75 && l >= 0.55 && s >= 0.22) return 0;
      /* Vivid hues outside the skin range are unmistakably garment colour. */
      if (s >= 0.34 && !(hue >= 15 && hue < 45)) return 1;
      if (s >= 0.22 && !(hue >= 12 && hue < 45)) return 2;
      /* Warm / neutral tones; the brightest usually belongs to the piece. */
      return 3;
    };
    const pick = entries.sort((a, b) => {
      const delta = priority(a.hsl) - priority(b.hsl);
      if (delta) return delta;
      return b.ratio - a.ratio;
    })[0];
    return pick.hsl;
  })();

  let band = colourBand(hsl);

  /* When the whole frame reads warm (studio wood, skin, gold metal), a
     vivid garment hue still in frame is the more honest descriptor. */
  if (["warm-light", "warm-mid", "warm-dark", "gold", "gold-mid", "warm-neutral"].includes(band)) {
    const vivid = entries
      .filter((entry) => {
        const hue = ((entry.hsl.h % 360) + 360) % 360;
        return entry.hsl.s >= 0.34 && !(hue >= 15 && hue < 45) && entry.ratio >= 0.12;
      })
      .sort((a, b) => b.ratio - a.ratio)[0];
    if (vivid) band = colourBand(vivid.hsl);
  }

  const rotation = FAMILY_ROTATIONS[band];
  if (!rotation) return band;
  const numeric = Number.parseInt(productId.match(/(\d+)$/)?.[1] ?? "0", 10) || 0;
  return rotation[numeric % rotation.length];
};

/* ------------------------------------------------------------------ */
/* Naming                                                              */
/* ------------------------------------------------------------------ */

/**
 * One curated, non-repeating evocative word per product — a fashion-house
 * name, not a code. Words are allocated per media group so siblings in the
 * same edit read as a series rather than numbered copies.
 */
const WORD_POOLS = {
  "women/sarees/banarasi": ["Mumtaz", "Anarkali", "Begum"],
  "women/sarees/cotton": ["Vasanti", "Dhara", "Usha", "Kiran", "Rituparna"],
  "women/sarees/silk": ["Chandni", "Noor", "Saanjh", "Mehfil", "Aabha", "Yamini"],
  "women/lehengas/bridal": ["Maharani"],
  "women/lehengas/party": ["Roop", "Jhankar", "Gulzar"],
  "women/lehengas/designer": ["Shringar", "Zarina", "Nayika"],
  "women/essentials/kurtis-suits": ["Kavya", "Roshni", "Meher", "Aditi"],
  "women/essentials/innerwear": ["Nazakat", "Sukoon", "Chhaya", "Ruhi", "Maya", "Lila", "Aaram"],
  "women/essentials/dupattas-stoles": ["Leher", "Baadal", "Saawan", "Phagun", "Jhoomar", "Sitara"],
  "bridal/the-bride/sarees": ["Dulhan", "Varmala", "Solah", "Saubhagya"],
  "bridal/the-bride/lehengas": ["Rajkumari", "Kanchan"],
  "bridal/the-bride/reception-wear": ["Shaam", "Raunaq", "Shabab", "Bahaar"],
  "bridal/celebrations/mehendi-haldi": ["Hariyali", "Ambiya", "Phoolan"],
  "bridal/celebrations/sangeet": ["Jhankaar", "Surili"],
  "bridal/celebrations/trousseau": ["Shagun", "Kangan"],
  "bridal/finishing-touches/bangles:classic": ["Choodi", "Rimjhim", "Chamak"],
  "bridal/finishing-touches/bangles:bridal": ["Doli", "Phere", "Suhagan"],
  "bridal/finishing-touches/bangles:gold": ["Kanak", "Sunheri", "Sona"],
  "bridal/finishing-touches/bangles:kada": ["Shaan", "Vijay", "Sher"],
  "bridal/finishing-touches/jewellery:jewellery": ["Zeenat", "Ara", "Jahan"],
  "bridal/finishing-touches/jewellery:earrings": ["Jhalak", "Damini", "Jugnu", "Naina", "Chanchal", "Kajal", "Raima", "Sonali", "Jyoti", "Neha"],
  "bridal/finishing-touches/jewellery:aear-earrings": ["Mehak", "Khushboo", "Mahi", "Pari"],
  "bridal/finishing-touches/jewellery:necklace": ["Rani", "Malika", "Shahzadi"],
  "bridal/finishing-touches/jewellery:ring": ["Vaada", "Sagai", "Nikaah", "Bandhan"],
  "bridal/finishing-touches/jewellery:anklet": ["Payal", "Nupur", "Jhanjhar", "Chham", "Kinkini"],
  "bridal/finishing-touches/jewellery:maang-tikka": ["Bindiya", "Shobha"],
  "bridal/finishing-touches/jewellery:set": ["Aabhar", "Inayat"],
  "bridal/finishing-touches/jewellery:bridal": ["Vyah", "Anjum"],
  "men/ethnic-wear/kurta-pajama": ["Aditya", "Rudra", "Veer", "Nawab", "Sultan", "Raja", "Abir", "Yash"],
  "men/ethnic-wear/nehru-jackets": ["Sikandar", "Arman", "Farhan"],
  "men/groom/groom-collection": ["Sehra", "Baraat", "Dulha", "Yuvraj", "Maharaja"],
  "kids/girls/dresses": ["Guddi", "Chanda", "Titli"],
  "kids/girls/casual-sets": ["Khushi", "Muskaan", "Mishti"],
  "kids/boys/t-shirt-shorts": ["Toofan", "Jigar"],
  "kids/boys/casual-sets": ["Chhota", "Yoddha"],
};

/** Type phrase + style, both grounded in the folder taxonomy / product id. */
const TYPE_PHRASES = {
  "women/sarees/banarasi": { type: "Banarasi Saree", style: "banarasi" },
  "women/sarees/cotton": { type: "Cotton Saree", style: "cotton" },
  "women/sarees/silk": { type: "Silk Saree", style: "silk" },
  "women/lehengas/bridal": { type: "Bridal Lehenga", style: "bridal" },
  "women/lehengas/party": { type: "Party Lehenga", style: "party" },
  "women/lehengas/designer": { type: "Designer Lehenga", style: "designer" },
  "women/essentials/kurtis-suits": { type: "Kurti Ensemble", style: "kurti-suit" },
  "women/essentials/innerwear": { type: "Innerwear", style: "innerwear" },
  "women/essentials/dupattas-stoles": { type: "Dupatta", style: "dupatta-stole" },
  "bridal/the-bride/sarees": { type: "Bridal Saree", style: "bridal-saree" },
  "bridal/the-bride/lehengas": { type: "Bridal Lehenga", style: "bridal-lehenga" },
  "bridal/the-bride/reception-wear": { type: "Reception Ensemble", style: "reception-wear" },
  "bridal/celebrations/mehendi-haldi": { type: "Mehendi Ensemble", style: "mehendi" },
  "bridal/celebrations/sangeet": { type: "Sangeet Ensemble", style: "sangeet" },
  "bridal/celebrations/trousseau": { type: "Trousseau Ensemble", style: "trousseau" },
  "bridal/finishing-touches/bangles:classic": { type: "Bangles", style: "bangles" },
  "bridal/finishing-touches/bangles:bridal": { type: "Bridal Bangles", style: "bridal-bangles" },
  "bridal/finishing-touches/bangles:gold": { type: "Gold-Finish Bangles", style: "gold-finish-bangles", noColour: true },
  "bridal/finishing-touches/bangles:kada": { type: "Kada", style: "kada-bangles" },
  "bridal/finishing-touches/jewellery:jewellery": { type: "Jewellery", style: "jewellery" },
  "bridal/finishing-touches/jewellery:earrings": { type: "Earrings", style: "earrings" },
  "bridal/finishing-touches/jewellery:aear-earrings": { type: "Earrings", style: "earrings" },
  "bridal/finishing-touches/jewellery:necklace": { type: "Necklace", style: "necklace" },
  "bridal/finishing-touches/jewellery:ring": { type: "Ring", style: "ring" },
  "bridal/finishing-touches/jewellery:anklet": { type: "Anklet", style: "anklet" },
  "bridal/finishing-touches/jewellery:maang-tikka": { type: "Maang Tikka", style: "maang-tikka" },
  "bridal/finishing-touches/jewellery:set": { type: "Jewellery Set", style: "jewellery-set" },
  "bridal/finishing-touches/jewellery:bridal": { type: "Bridal Jewellery", style: "bridal-jewellery" },
  "men/ethnic-wear/kurta-pajama": { type: "Kurta Pajama", style: "kurta-pajama" },
  "men/ethnic-wear/nehru-jackets": { type: "Nehru Jacket", style: "nehru-jacket" },
  "men/groom/groom-collection": { type: "Groom Ensemble", style: "groom" },
  "kids/girls/dresses": { type: "Dress", style: "dress" },
  "kids/girls/casual-sets": { type: "Casual Set", style: "casual-set" },
  "kids/boys/t-shirt-shorts": { type: "T-Shirt & Shorts Set", style: "tshirt-shorts" },
  "kids/boys/casual-sets": { type: "Casual Set", style: "casual-set" },
};

const GENDER_BY_DEPARTMENT = { women: "Women", bridal: "Women", men: "Men", kids: "Kids" };

/** The jewellery/bangles group key is the id's middle segment. */
const groupKeyFor = (segments, id) => {
  const key = segments.join("/");
  if (key === "bridal/finishing-touches/bangles") {
    if (/BRI/.test(id)) return `${key}:bridal`;
    if (/GOL/.test(id)) return `${key}:gold`;
    if (/KAD/.test(id)) return `${key}:kada`;
    return `${key}:classic`;
  }
  if (key === "bridal/finishing-touches/jewellery") {
    if (/AEAR/.test(id)) return `${key}:aear-earrings`;
    if (/EAR/.test(id)) return `${key}:earrings`;
    if (/NCK/.test(id)) return `${key}:necklace`;
    if (/RNG/.test(id)) return `${key}:ring`;
    if (/ANK/.test(id)) return `${key}:anklet`;
    if (/MTK/.test(id)) return `${key}:maang-tikka`;
    if (/SET/.test(id)) return `${key}:set`;
    if (/BRI/.test(id)) return `${key}:bridal`;
    return `${key}:jewellery`;
  }
  return key;
};

const buildProducts = (folders) => {
  const products = [];
  const usedWords = new Set();
  const usedNames = new Set();
  const usage = new Map();

  for (const folder of folders) {
    const [department, category, subcategory] = folder.segments;
    const groupKey = groupKeyFor(folder.segments, folder.id);
    const pool = WORD_POOLS[groupKey] ?? [];
    const phrase = TYPE_PHRASES[groupKey] ?? { type: subcategory, style: subcategory };

    let index = usage.get(groupKey) ?? 0;
    let word = pool[index % pool.length] ?? "";
    while (word && usedWords.has(word)) {
      index += 1;
      word = pool[index % pool.length] ?? "";
    }
    usage.set(groupKey, index + 1);
    if (word) usedWords.add(word);

    const media = mediaFor(folder);
    const colour = phrase.noColour
      ? null
      : colourWordOf(analyseImage(join(folder.path, folder.primaryFile)), folder.id);

    const name = [word, colour, phrase.type].filter(Boolean).join(" ");
    if (usedNames.has(name)) {
      throw new Error(`Duplicate product name generated: ${name}`);
    }
    usedNames.add(name);

    products.push({
      id: folder.id,
      sku: `PFS-${folder.id.replace(/^PF-/, "")}`,
      name,
      department,
      category,
      subcategory,
      style: phrase.style,
      gender: GENDER_BY_DEPARTMENT[department] ?? "Women",
      description: "",
      price: null,
      compareAtPrice: null,
      media,
      status: "draft",
    });
  }
  return products;
};

/* ------------------------------------------------------------------ */
/* Taxonomy                                                            */
/* ------------------------------------------------------------------ */

const labelCase = (value) =>
  String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const TAXONOMY_LABELS = {
  "sarees": "Sarees",
  "banarasi": "Banarasi Sarees",
  "cotton": "Cotton Sarees",
  "silk": "Silk Sarees",
  "lehengas": "Lehengas",
  "bridal": "Bridal Lehengas",
  "party": "Party Lehengas",
  "designer": "Designer Lehengas",
  "essentials": "Essentials",
  "kurtis-suits": "Kurtis + Suits",
  "innerwear": "Innerwear",
  "dupattas-stoles": "Dupattas + Stoles",
  "the-bride": "The Bride",
  "reception-wear": "Reception Wear",
  "celebrations": "Celebrations",
  "mehendi-haldi": "Mehendi + Haldi",
  "sangeet": "Sangeet Edit",
  "trousseau": "Trousseau Edit",
  "finishing-touches": "Finishing Touches",
  "bangles": "Bridal Bangles",
  "jewellery": "Bridal Jewellery",
  "ethnic-wear": "Ethnic Wear",
  "kurta-pajama": "Kurta Pajama",
  "nehru-jackets": "Nehru Jackets",
  "groom": "Groom",
  "groom-collection": "Groom Collection",
  "girls": "Girls",
  "boys": "Boys",
  "dresses": "Dresses",
  "casual-sets": "Casual Sets",
  "t-shirt-shorts": "T-Shirt & Shorts",
};

const DEPARTMENT_COPY = {
  women: {
    name: "Women",
    eyebrow: "Women's Collection",
    description:
      "Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.",
  },
  bridal: {
    name: "Bridal",
    eyebrow: "Bridal + Wedding",
    description:
      "Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.",
  },
  men: {
    name: "Men",
    eyebrow: "Men + Groom",
    description:
      "Kurta, kurta pajama, Nehru jackets and groom edits, tailored for the celebration.",
  },
  kids: {
    name: "Kids",
    eyebrow: "Little Heirlooms",
    description:
      "Girls' dresses, boys' tee-and-shorts sets and everyday coordinates for the youngest guests.",
  },
};

const CATEGORY_COPY = {
  sarees: { eyebrow: "Six Yards", description: "Banarasi, cotton and silk sarees from the house looms." },
  lehengas: { eyebrow: "The Ceremony", description: "Bridal, party and designer lehengas cut for the long celebration." },
  essentials: { eyebrow: "Everyday", description: "Kurtis, innerwear and dupattas for the daily wardrobe." },
  "the-bride": { eyebrow: "The Trousseau", description: "Sarees, lehengas and reception ensembles made for the bride." },
  celebrations: { eyebrow: "The Ceremonies", description: "Mehendi, sangeet and trousseau edits for every function." },
  "finishing-touches": { eyebrow: "Adornment", description: "Bridal jewellery and bangles that finish the look." },
  "ethnic-wear": { eyebrow: "Everyday + Festive", description: "Kurta pajama and Nehru jackets tailored in-house." },
  groom: { eyebrow: "The Groom", description: "The groom's ceremonial wardrobe, considered as one edit." },
  girls: { eyebrow: "Little Heirlooms", description: "Dresses and casual sets for the youngest guests." },
  boys: { eyebrow: "Little Heirlooms", description: "T-shirt and shorts sets and everyday coordinates for boys." },
};

const buildTaxonomy = (folders) => {
  const departments = [];
  const departmentById = new Map();
  const categoryById = new Map();
  const routes = [];

  for (const folder of folders) {
    const [departmentId, categoryId, subcategoryId] = folder.segments;
    let department = departmentById.get(departmentId);
    if (!department) {
      const copy = DEPARTMENT_COPY[departmentId] ?? { name: labelCase(departmentId), eyebrow: "", description: "" };
      department = {
        id: departmentId,
        name: copy.name,
        slug: departmentId,
        path: `/${departmentId}`,
        eyebrow: copy.eyebrow,
        description: copy.description,
        categories: [],
      };
      departmentById.set(departmentId, department);
      departments.push(department);
    }
    let category = categoryById.get(`${departmentId}::${categoryId}`);
    if (!category) {
      const copy = CATEGORY_COPY[categoryId] ?? { eyebrow: "", description: "" };
      category = {
        id: categoryId,
        name: TAXONOMY_LABELS[categoryId] ?? labelCase(categoryId),
        slug: categoryId,
        path: `/${departmentId}/${categoryId}`,
        eyebrow: copy.eyebrow,
        description: copy.description,
        subcategories: [],
      };
      categoryById.set(`${departmentId}::${categoryId}`, category);
      department.categories.push(category);
    }
    if (!category.subcategories.some((entry) => entry.id === subcategoryId)) {
      category.subcategories.push({
        id: subcategoryId,
        name: TAXONOMY_LABELS[subcategoryId] ?? labelCase(subcategoryId),
        slug: subcategoryId,
        path: `/${departmentId}/${categoryId}/${subcategoryId}`,
      });
    }
  }

  const DEPARTMENT_ORDER = ["women", "bridal", "men", "kids"];
  departments.sort(
    (a, b) => DEPARTMENT_ORDER.indexOf(a.id) - DEPARTMENT_ORDER.indexOf(b.id)
  );

  for (const department of departments) {
    routes.push({
      path: department.path,
      label: department.name,
      eyebrow: department.eyebrow,
      description: department.description,
      group: department.id,
      breadcrumb: [{ label: department.name }],
    });
    for (const category of department.categories) {
      routes.push({
        path: category.path,
        label: category.name,
        eyebrow: `${department.name} · ${category.name}`,
        description: department.description,
        group: department.id,
        breadcrumb: [{ label: department.name, to: department.path }, { label: category.name }],
      });
      for (const subcategory of category.subcategories) {
        routes.push({
          path: subcategory.path,
          label: subcategory.name,
          eyebrow: `${department.name} · ${category.name}`,
          description: department.description,
          group: department.id,
          breadcrumb: [
            { label: department.name, to: department.path },
            { label: category.name, to: category.path },
            { label: subcategory.name },
          ],
        });
      }
    }
  }

  return { departments, routes };
};

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const heroSlides = [
  {
    id: "hero-001",
    image: "/images/hero/hero001.avif",
    eyebrow: "New Collection",
    title: "The Festive Edit",
    body: "Timeless silhouettes crafted for the celebrations that matter most.",
    cta: { label: "Explore Edit", href: "/collections/festive-edit" },
    objectPosition: "52% center",
    tone: "light",
  },
  {
    id: "hero-002",
    image: "/images/hero/hero002.avif",
    eyebrow: "Bridal Couture",
    title: "Made for Your Moment",
    body: "Statement craftsmanship and heirloom detail for the day you'll always remember.",
    cta: { label: "Shop Lehengas", href: "/women/lehengas/bridal" },
    objectPosition: "48% center",
    tone: "dark",
  },
  {
    id: "hero-003",
    image: "/images/hero/hero003.avif",
    eyebrow: "Heritage Weaves",
    title: "The Art of the Saree",
    body: "Banarasi, Pato and silk — traditional craft, reimagined for today.",
    cta: { label: "Shop Sarees", href: "/women/sarees" },
    objectPosition: "58% center",
    tone: "light",
  },
  {
    id: "hero-004",
    image: "/images/hero/hero004.avif",
    eyebrow: "The Celebration Edit",
    title: "Dressed, Together",
    body: "Coordinated festive wardrobes for weddings, receptions and every gathering around them.",
    cta: { label: "Shop Bridal", href: "/bridal" },
    objectPosition: "52% center",
    tone: "dark",
  },
  {
    id: "hero-005",
    image: "/images/hero/hero005.avif",
    eyebrow: "New Arrivals",
    title: "Your Next Signature Look",
    body: "The latest pieces to arrive from the PRATIKSHYA atelier.",
    cta: { label: "Discover Now", href: "/collections/new-arrivals" },
    objectPosition: "62% center",
    tone: "dark",
  },
];

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

const COLLECTIONS_ROOT = join(ROOT, "public", "images", "collections");

const scanCollection = (relativeDir) => {
  const dir = join(COLLECTIONS_ROOT, relativeDir);
  const groups = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (!statSync(path).isDirectory()) continue;
    const files = readdirSync(path).sort(numericAware);
    const primaryFile = files.find((file) => /^primary\./i.test(file)) ?? files[0] ?? null;
    groups.push({ path, id: entry, files, primaryFile });
  }
  const base = `/images/collections/${relativeDir.replaceAll(sep, "/")}`;
  const gallery = groups.flatMap((group) =>
    group.files
      .filter((file) => file !== group.primaryFile)
      .map((file) => `${base}/${group.id}/${file}`)
  );
  const primary = groups[0]?.primaryFile
    ? `${base}/${groups[0].id}/${groups[0].primaryFile}`
    : null;
  return { primary, gallery };
};

const COLLECTION_DEFS = [
  {
    id: "festive-edit",
    taxonomyId: "festive-edit",
    name: "Festive Edit",
    eyebrow: "Season of Light",
    description: "The season of light, dressed.",
    folder: "editorial/festive-edit",
  },
  {
    id: "heritage-weaves",
    taxonomyId: "heritage-weaves",
    name: "Heritage Weaves",
    eyebrow: "Looms of Odisha & Banaras",
    description: "Looms of Odisha and Banaras, documented and preserved.",
    folder: "editorial/heritage-weaves",
  },
  {
    id: "new-arrival",
    taxonomyId: "new-arrivals",
    name: "New Arrivals",
    eyebrow: "Just In",
    description: "The pieces that reached the atelier floor this month.",
    folder: "editorial/new-arrival",
  },
  {
    id: "chiffon",
    taxonomyId: "chiffon",
    name: "Chiffon",
    eyebrow: "Fabric Stories",
    description: "Airy, fluid chiffon across the atelier's drapes.",
    folder: "fabrics/chiffon",
  },
  {
    id: "cotton",
    taxonomyId: "cotton",
    name: "Cotton",
    eyebrow: "Fabric Stories",
    description: "Everyday cotton, woven and finished with care.",
    folder: "fabrics/cotton",
  },
  {
    id: "linen",
    taxonomyId: "linen",
    name: "Linen",
    eyebrow: "Fabric Stories",
    description: "Breathable linen for the considered wardrobe.",
    folder: "fabrics/linen",
  },
  {
    id: "silk",
    taxonomyId: "silk",
    name: "Silk",
    eyebrow: "Fabric Stories",
    description: "Silk sarees, lehengas and heirloom weaves across the atelier.",
    folder: "fabrics/silk",
  },
];

const buildCollections = () => {
  const editorial = [];
  const fabrics = [];
  for (const definition of COLLECTION_DEFS) {
    const media = scanCollection(definition.folder);
    const record = {
      id: definition.id,
      taxonomyId: definition.taxonomyId,
      name: definition.name,
      eyebrow: definition.eyebrow,
      description: definition.description,
      media,
    };
    (definition.folder.startsWith("fabrics") ? fabrics : editorial).push(record);
  }
  return { editorial, fabrics };
};

/* ------------------------------------------------------------------ */
/* Emit                                                                */
/* ------------------------------------------------------------------ */

const emit = () => {
  const folders = scanProductFolders();
  const products = buildProducts(folders);
  const { departments, routes } = buildTaxonomy(folders);
  const collections = buildCollections();

  mkdirSync(OUT_DIR, { recursive: true });

  const banner = `/**
 * PRATIKSHYA FASHON — generated frontend catalogue data.
 *
 * ⚠ Generated by \`scripts/generate-catalog.mjs\` from the organised product
 * media under \`public/images/products/\` — the folder structure IS the
 * source of truth. Regenerate rather than hand-editing paths.
 *
 *   node scripts/generate-catalog.mjs
 */`;

  const productRows = products
    .map((product) => {
      const record = {
        id: product.id,
        sku: product.sku,
        name: product.name,
        department: product.department,
        category: product.category,
        subcategory: product.subcategory,
        style: product.style,
        gender: product.gender,
        description: product.description,
        price: null,
        compareAtPrice: null,
        media: product.media,
        status: "draft",
      };
      return JSON.stringify(record, null, 2)
        .replace(/\n  \{/g, "\n    {")
        .replace(/\n\}/g, "\n  }");
    })
    .join(",\n");

  const productsJs = `${banner}

/**
 * The complete frontend product catalogue — one record per product-media
 * folder. The folder id is the permanent product id; the SKU is the stable
 * \`PFS-\` form of that id; department, category and subcategory are read
 * straight from the media path. Every product carries a curated,
 * customer-facing name grounded in its own imagery (dominant colour),
 * its folder taxonomy and its product id.
 *
 * Commercial fields (price, compare-at, descriptions) are intentionally
 * absent — nothing here invents product facts. Records stay \`draft\` until
 * a human completes them, so incomplete pieces never auto-publish.
 */

export const products = [
${productRows},
];

export default products;
`;

  writeFileSync(join(OUT_DIR, "products.js"), productsJs);

  const departmentRows = departments
    .map((department) => {
      const categoryRows = department.categories
        .map((category) => {
          const subRows = category.subcategories
            .map(
              (sub) => `      { id: ${JSON.stringify(sub.id)}, name: ${JSON.stringify(sub.name)}, slug: ${JSON.stringify(sub.slug)}, path: ${JSON.stringify(sub.path)} },`
            )
            .join("\n");
          return `    {
      id: ${JSON.stringify(category.id)},
      name: ${JSON.stringify(category.name)},
      slug: ${JSON.stringify(category.slug)},
      path: ${JSON.stringify(category.path)},
      eyebrow: ${JSON.stringify(category.eyebrow)},
      description: ${JSON.stringify(category.description)},
      subcategories: [
${subRows}
      ],
    },`;
        })
        .join("\n");
      return `  {
    id: ${JSON.stringify(department.id)},
    name: ${JSON.stringify(department.name)},
    slug: ${JSON.stringify(department.slug)},
    path: ${JSON.stringify(department.path)},
    eyebrow: ${JSON.stringify(department.eyebrow)},
    description: ${JSON.stringify(department.description)},
    categories: [
${categoryRows}
    ],
  },`;
    })
    .join("\n");

  const taxonomyJs = `${banner}

/**
 * The four departments — Women, Bridal, Men, Kids — with the categories and
 * subcategories their product media defines. Labels follow the house
 * vocabulary; ids and slugs match the media folders exactly, so category
 * pages and product records resolve the same truth.
 */

export const departments = [
${departmentRows}
];

export const departmentNames = Object.fromEntries(
  departments.map((department) => [department.id, department.name])
);

export const categoryNames = Object.fromEntries(
  departments.flatMap((department) =>
    department.categories.map((category) => [category.id, category.name])
  )
);

/** Every routable listing path (department / category / subcategory). */
export const catalogueRoutes = [
${routes.map((route) => `  ${JSON.stringify(route)},`).join("\n")}
];

/**
 * Resolves a pathname to the listing scope it represents: the locked
 * filters, masthead copy and breadcrumb trail. Unknown paths return null.
 */
export const resolveCatalogueScope = (pathname) => {
  const route = catalogueRoutes.find((entry) => entry.path === pathname);
  if (!route) return null;
  const segments = pathname.split("/").filter(Boolean);
  const filters = { department: segments[0] };
  if (segments[1]) filters.category = segments[1];
  if (segments[2]) filters.subcategory = segments[2];
  return { ...route, filters };
};

/** navigationScopes entries for every catalogue listing path. */
export const catalogueNavigationScopes = Object.fromEntries(
  catalogueRoutes.map((route) => [route.path, resolveCatalogueScope(route.path).filters])
);

export default { departments, departmentNames, categoryNames, catalogueRoutes, resolveCatalogueScope, catalogueNavigationScopes };
`;

  writeFileSync(join(OUT_DIR, "taxonomy.js"), taxonomyJs);

  const heroJs = `${banner}

/**
 * The landing slideshow, as structured data. The slideshow renders this
 * list — no image address is authored inside the JSX.
 */
export const heroSlides = [
${heroSlides.map((slide) => `  ${JSON.stringify(slide, null, 2)},`).join("\n")}
];

export default heroSlides;
`;

  writeFileSync(join(OUT_DIR, "hero.js"), heroJs);

  const collectionsJs = `${banner}

/**
 * Editorial + fabric storytelling assets. These are NOT product records —
 * they are the collection plates behind the editorial pages and fabric
 * stories, sourced from \`public/images/collections/\`.
 */
export const editorialCollections = [
${collections.editorial.map((collection) => `  ${JSON.stringify(collection, null, 2)},`).join("\n")}
];

export const fabricCollections = [
${collections.fabrics.map((collection) => `  ${JSON.stringify(collection, null, 2)},`).join("\n")}
];

/** Every collection plate, keyed by taxonomy collection id (and folder id). */
export const collectionPlates = Object.fromEntries(
  [...editorialCollections, ...fabricCollections].flatMap((collection) => [
    [collection.id, collection],
    [collection.taxonomyId, collection],
  ])
);

export default { editorialCollections, fabricCollections, collectionPlates };
`;

  writeFileSync(join(OUT_DIR, "collections.js"), collectionsJs);

  console.log(`catalogue: ${products.length} products`);
  console.log(`taxonomy:  ${departments.length} departments, ${routes.length} routes`);
  console.log(`collections: ${collections.editorial.length} editorial, ${collections.fabrics.length} fabric`);
};

emit();
