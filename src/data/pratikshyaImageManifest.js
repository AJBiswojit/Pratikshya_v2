import { resolveHousePlateUrl } from "../services/media/mediaPaths";

/**
 * NOTE (catalogue image fix): `catalogue.js` no longer sources product
 * `image` / `hoverImage` / `additionalImages` from this pool by default.
 * Every catalogue product now points directly at its own real photo under
 * `public/library/...` (matched by category/subcategory, with front/back/
 * side angles of the same real photo shared only within that one product).
 *
 * This manifest remains in use for: (1) the small number of catalogue
 * products whose category/subcategory has no matching real photo left in
 * the library, each of which now references exactly ONE entry below (no
 * entry here is referenced by more than one catalogue product), and
 * (2) non-catalogue call sites (AI Mirror, admin previews, editorial
 * placeholders, category/collection hero fallbacks) that still resolve
 * imagery by id through `getImage` / `imageRef`. Those remaining call
 * sites are unaffected by this fix and are out of scope for it.
 */

const pexels = (id, width = 800, height = 1200, ext = "jpeg") =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.${ext}?auto=compress&cs=tinysrgb&fit=crop&h=${height}&w=${width}`;

/** House plates resolve through the Phase 21.11 canonical library map. */
const local = (path) => resolveHousePlateUrl(path);

export const categoryFallbacks = {
  men: local("pratikshya/groom/groom-sherwani.jpg"),
  groom: local("pratikshya/groom/groom-sherwani.jpg"),
  kids: local("pratikshya/kids/kids-festive.jpg"),
  sarees: local("heritage-textile.jpg"),
  lehengas: local("bridal-editorial.jpg"),
  bridal: local("bridal-editorial.jpg"),
  fabrics: local("atelier-fabric.jpg"),
  cotton: local("atelier-fabric.jpg"),
  silk: local("heritage-textile.jpg"),
  accessories: local("pratikshya/jewellery/bangles-gold.jpg"),
  default: local("atelier-fabric.jpg"),
};

export const pratikshyaImages = {
  "hero-atelier": {
    id: "hero-atelier",
    category: "fabrics",
    purpose: "Atelier macro fabric hero",
    src: local("atelier-fabric.jpg"),
    alt: "Layered premium fabrics with silk and cotton folds for PRATIKSHYA FASHON atelier",
  },
  "groom-sherwani": {
    id: "groom-sherwani",
    category: "groom",
    purpose: "Groom campaign",
    src: local("pratikshya/groom/groom-sherwani.jpg"),
    alt: "PRATIKSHYA FASHON groom in navy sherwani with refined gold embroidery",
  },
  "kids-festive-wear": { id: "kids-festive-wear", category: "kids", purpose: "Kids festive wear category", src: local("pratikshya/kids/kids-festive.jpg"), alt: "Premium kids festive ethnic wear in ivory and gold" },
  "kids-kurta-sets": { id: "kids-kurta-sets", category: "kids", purpose: "Kids kurta sets category", src: pexels(12943586), alt: "Young boy in traditional South Asian kurta set" },

  "men-kurta": { id: "men-kurta", category: "men", purpose: "Men's kurta category", src: pexels(3998093), alt: "Stylish Indian man in elegant white kurta attire" },
  "men-sherwani": { id: "men-sherwani", category: "groom", purpose: "Sherwani category", src: pexels(35043826), alt: "Groom in an ornate traditional sherwani" },

  "women-bridal-wear": { id: "women-bridal-wear", category: "bridal", purpose: "Bridal wear category", src: pexels(38866219), alt: "Indian bride wearing a red bridal lehenga with intricate embroidery" },

  "saree-cotton": { id: "saree-cotton", category: "sarees", purpose: "Cotton saree category", src: pexels(28943484), alt: "Woman in cotton saree reading in a refined market setting" },
  "saree-silk": { id: "saree-silk", category: "silk", purpose: "Silk saree category", src: local("heritage-textile.jpg"), alt: "Rich Banarasi silk saree textile with gold zari details" },
  "saree-banarasi": { id: "saree-banarasi", category: "silk", purpose: "Banarasi silk category", src: local("heritage-textile.jpg"), alt: "Banarasi silk fabric with ornate gold weaving" },
  "saree-printed": { id: "saree-printed", category: "sarees", purpose: "Printed saree category", src: pexels(28943465), alt: "Woman in vibrant printed saree styling" },
  "saree-traditional": { id: "saree-traditional", category: "sarees", purpose: "Traditional saree category", src: pexels(28943474), alt: "Traditional orange saree campaign portrait" },

  "lehenga-bridal": { id: "lehenga-bridal", category: "bridal", purpose: "Bridal lehenga category", src: local("bridal-editorial.jpg"), alt: "PRATIKSHYA FASHON red and gold bridal lehenga editorial" },
  "lehenga-designer": { id: "lehenga-designer", category: "lehengas", purpose: "Designer lehenga category", src: pexels(20790065), alt: "Model in designer Indian lehenga with jewelry" },
  "lehenga-party": { id: "lehenga-party", category: "lehengas", purpose: "Party lehenga category", src: pexels(20790059), alt: "Model in red choli and lehenga-inspired party look" },

  "fabric-cotton": { id: "fabric-cotton", category: "cotton", purpose: "Cotton fabric texture", src: pexels(4814062, 1200, 627), alt: "Soft cotton fabric texture in warm rose tone" },
  "fabric-silk": { id: "fabric-silk", category: "silk", purpose: "Silk fabric texture", src: local("heritage-textile.jpg"), alt: "Lustrous silk textile with gold woven detailing" },
  "fabric-linen": { id: "fabric-linen", category: "fabrics", purpose: "Linen fabric texture", src: pexels(459486, 1200, 627), alt: "Detailed woven linen fabric with natural folds" },
  "fabric-chiffon": { id: "fabric-chiffon", category: "fabrics", purpose: "Chiffon fabric texture", src: pexels(6653658, 1200, 627), alt: "Delicate pink chiffon fabric with soft folds" },
  "fabric-printed": { id: "fabric-printed", category: "fabrics", purpose: "Printed fabric texture", src: pexels(6843268, 1200, 627), alt: "Intricate red printed textile texture" },
  "fabric-embroidered": { id: "fabric-embroidered", category: "fabrics", purpose: "Embroidered fabric texture", src: local("heritage-textile.jpg"), alt: "Embroidered silk textile with gold craftsmanship" },

  "saree-ivory-silk": { id: "saree-ivory-silk", category: "silk", purpose: "Ivory silk saree campaign", src: local("editorial-hero.jpg"), alt: "Woman in an ivory silk saree with woven zari border and temple jewellery" },
  "lehenga-wine": { id: "lehenga-wine", category: "lehengas", purpose: "Wine bridal lehenga campaign", src: local("future-hero.jpg"), alt: "Model in a wine velvet lehenga with mirror and gold zardozi work" },
  "women-contemporary": { id: "women-contemporary", category: "fabrics", purpose: "Women's contemporary wear", src: local("minimal-hero.jpg"), alt: "Woman in a minimal ivory linen dress against a soft studio backdrop" },

  "accessory-dupattas": { id: "accessory-dupattas", category: "accessories", purpose: "Dupattas product", src: local("heritage-textile.jpg"), alt: "Golden embroidered dupatta textile close-up" },
  "bridal-bangles": { id: "bridal-bangles", category: "accessories", purpose: "Bridal bangles campaign", src: local("pratikshya/jewellery/bangles-gold.jpg"), alt: "Gold bridal bangles arranged for a wedding celebration" },
  "bridal-jewellery": { id: "bridal-jewellery", category: "accessories", purpose: "Bridal jewellery detail", src: local("pratikshya/jewellery/bangles-gold.jpg"), alt: "Gold jewellery and bangles with a warm heirloom finish" },
};

Object.values(pratikshyaImages).forEach((image) => {
  image.fallback = image.fallback || categoryFallbacks[image.category] || categoryFallbacks.default;
});

export const getImage = (id) => {
  const image = pratikshyaImages[id] || pratikshyaImages["hero-atelier"];
  return {
    ...image,
    fallback: image.fallback || categoryFallbacks[image.category] || categoryFallbacks.default,
  };
};

export const imageRef = (id) => getImage(id);
