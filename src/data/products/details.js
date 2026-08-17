/**
 * PRATIKSHYA FASHON — Product-detail enrichment.
 *
 * The catalogue remains the source of truth. This module supplies restrained
 * editorial defaults for optional PDP fields and category-aware gallery and
 * specification data. An authored value on a catalogue record always wins.
 * Keeping this as pure data logic lets a future product service replace it
 * without changing the Product Detail UI.
 */

const descriptions = {
  sarees: (product) =>
    `${product.name} is an ode to the enduring poetry of the Indian drape. Articulated in ${product.fabric} with ${product.material.toLowerCase()} detailing, the piece moves between quiet lustre and ceremonial richness. Its considered border and fluid fall make it a beautiful companion for ${product.occasion.slice(0, 2).join(" and ").toLowerCase()} dressing.`,
  lehengas: (product) =>
    `${product.name} is composed as a complete celebration look: a sculpted blouse, sweeping lehenga and softly framed dupatta. ${product.fabric} gives the silhouette its graceful volume, while ${product.material.toLowerCase()} brings light and dimension to every movement.`,
  "bridal-couture": (product) =>
    `${product.name} belongs to the house trousseau — a ceremony piece shaped with patience and finished by hand. Cut in ${product.fabric}, its ${product.material.toLowerCase()} is placed to catch candlelight without overwhelming the bride who wears it.`,
  "kurtis-and-suits": (product) =>
    `${product.name} brings atelier proportion to everyday Indian dressing. The ${product.fabric.toLowerCase()} base is light against the skin, balanced by precise ${product.material.toLowerCase()} finishing and an easy, considered silhouette.`,
  innerwear: (product) =>
    `${product.name} is designed as the quiet foundation beneath an assured drape. Made in ${product.fabric}, it balances clean lines, ease of movement and a finish that remains discreet throughout the day.`,
  dupattas: (product) =>
    `${product.name} is a finishing layer with presence of its own. Woven in ${product.fabric}, the ${product.material.toLowerCase()} detail frames the face and lends a measured note of colour and craft to festive separates.`,
  bangles: (product) =>
    `${product.name} is composed as an heirloom-inspired stack, rich in texture yet balanced on the wrist. The ${product.material.toLowerCase()} finish is detailed to hold the light, creating a graceful accent for wedding and festive dressing.`,
  jewellery: (product) =>
    `${product.name} draws on ceremonial Indian adornment with a lighter, contemporary hand. Its ${product.material.toLowerCase()} setting is arranged for warmth, proportion and a luminous finish beside silk, brocade and velvet.`,
  menswear: (product) =>
    `${product.name} approaches occasion tailoring with restraint. Cut in ${product.fabric}, the silhouette is clean through the shoulder and easy through the body, with ${product.material.toLowerCase()} lending a precise note of ceremony.`,
  kidswear: (product) =>
    `${product.name} is a comfort-first everyday piece for children. Cut in soft ${product.fabric.toLowerCase()}, with ${product.material.toLowerCase()} finishing and an easy, movement-friendly fit, it stays neat through play, birthdays and everything in between.`,
};

const categoryDetails = {
  sarees: "A finished saree with a coordinated unstitched blouse piece. Slight variations in weave are signatures of its making, not imperfections.",
  lehengas: "A coordinated three-piece ensemble with lehenga, blouse and dupatta. The blouse is supplied semi-stitched for an individual fit.",
  "bridal-couture": "A made-to-measure occasion ensemble, finished in the atelier. Placement and minor details may vary with the handwork.",
  "kurtis-and-suits": "A relaxed ethnic silhouette designed for ease through the day. Styling pieces shown in editorial imagery are not included unless specified.",
  innerwear: "A clean, close foundation designed to sit smoothly beneath traditional silhouettes.",
  dupattas: "One finished dupatta or stole with hand-finished edges. Styling pieces shown are not included.",
  bangles: "A coordinated bangle set with a warm, jewellery-grade finish. Store each piece separately to preserve its surface.",
  jewellery: "One jewellery piece or coordinated set as named. Each setting is checked and finished by hand.",
  menswear: "A tailored Indian silhouette with considered ease. Bottoms and styling accessories are included only when named as part of a set.",
  kidswear: "A comfortable everyday children's silhouette with soft internal finishing and room for play.",
};

const fabricCare = (product) => {
  const delicate = ["Silk", "Velvet", "Organza", "Chiffon", "Georgette", "Brocade"];
  const isDelicate = delicate.some((fabric) => product.fabric?.includes(fabric));
  const isAdornment = ["bangles", "jewellery"].includes(product.category);

  if (isAdornment) {
    return [
      "Wipe gently with a soft, dry cloth after wear.",
      "Keep away from moisture, fragrance and direct heat.",
      "Store separately in the provided soft pouch.",
    ];
  }

  if (isDelicate || product.material !== "Powerloom") {
    return [
      "Dry clean only with a specialist familiar with Indian occasion wear.",
      "Store folded in breathable muslin, away from moisture and direct light.",
      "Use a cool iron on the reverse; never press directly over embellishment.",
    ];
  }

  return [
    "Gentle hand wash separately in cold water.",
    "Dry in shade and store away from moisture.",
    "Use a warm iron on the reverse when required.",
  ];
};

const originFor = (product) => {
  const odishaTerms = ["Pato", "Sambalpuri", "Bomkai", "Berhampuri", "Khandua", "Kotpad", "Ikat"];
  if (odishaTerms.some((term) => `${product.name} ${product.subcategory}`.includes(term))) {
    return "Odisha, India";
  }
  if (`${product.name} ${product.subcategory}`.includes("Banarasi")) return "Varanasi, India";
  return "Designed in Bhubaneswar, India";
};

const patternFor = (product) => {
  if (product.material?.includes("Print")) return "Artisanal print";
  if (["Zardozi", "Sequin", "Mirror Work", "Thread Embroidery"].includes(product.material)) {
    return "Embellished";
  }
  if (["Handloom", "Ikat", "Zari Work"].includes(product.material)) return "Woven";
  return "Solid with crafted detail";
};

const categorySpecifications = (product) => {
  switch (product.category) {
    case "sarees":
      return { Length: "5.5 metres", "Blouse piece": "0.8 metre, included" };
    case "lehengas":
    case "bridal-couture":
      return { Components: "Lehenga, blouse and dupatta", Blouse: "Semi-stitched" };
    case "bangles":
      return { Composition: "Coordinated set", Fit: "Traditional bangle sizing" };
    case "jewellery":
      return { Setting: "Hand-finished", Closure: "Adjustable where applicable" };
    case "menswear":
      return { Fit: "Regular tailored fit", Components: product.subcategory.includes("Set") ? "Two-piece set" : "As named" };
    case "kidswear":
      return { Fit: "Comfort fit", Sizing: "Age-based sizing" };
    default:
      return { Fit: "Regular fit" };
  }
};

export const getProductDescription = (product) =>
  product.description ??
  (descriptions[product.category] ?? descriptions["kurtis-and-suits"])(product);

export const getProductDetails = (product) =>
  product.details ?? categoryDetails[product.category] ?? categoryDetails["kurtis-and-suits"];

export const getCareInstructions = (product) => product.careInstructions ?? fabricCare(product);

export const getProductSpecifications = (product, sku) => ({
  Fabric: product.fabric,
  Material: product.material,
  Pattern: patternFor(product),
  Occasion: product.occasion?.join(", "),
  Origin: originFor(product),
  ...categorySpecifications(product),
  SKU: sku,
  ...(product.specifications ?? {}),
});

export const getDeliveryInfo = (product) =>
  product.deliveryInfo ??
  (product.availability === "made-to-order"
    ? "Made for you and usually dispatched within 21–28 days."
    : "Complimentary standard delivery across India, usually within 4–7 working days.");

export const getReturnInfo = (product) =>
  product.returnInfo ??
  (product.availability === "made-to-order"
    ? "Made-to-order pieces may be returned only for a verified quality concern."
    : "Easy returns within 7 days of delivery, subject to the piece remaining unworn with its original tags.");
