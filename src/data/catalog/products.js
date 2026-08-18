/**
 * PRATIKSHYA FASHON — canonical catalogue data.
 *
 * The authored canonical Product Catalog. Product identity, taxonomy, commercial data, workflow state, and Product Media associations originate here and are managed through Admin Product Management.
 */

/**
 * The complete frontend Product Catalog. Each stable Product ID owns one
 * Department → Category → Subcategory path and explicit Product Media
 * associations. Commercial fields are edited through Admin Product
 * Management. Records remain storefront-hidden until the universal workflow
 * reaches DRAFT → SUBMITTED → APPROVED → PUBLISHED.
 *
 * Collection & fabric resolution is data-driven: every record carries its own
 * fabric, material, collections, occasion and isNew merchandising
 * metadata (projected from its department/category/subcategory taxonomy), so
 * the Collections storefront resolves from THIS canonical catalogue rather
 * than a parallel product list.
 */

export const products = [
{
  "id": "PF-BR-MEH-0001",
  "sku": "PFS-BR-MEH-0001",
  "name": "Hariyali Vermilion Mehendi Ensemble",
  "department": "bridal",
  "category": "celebrations",
  "subcategory": "mehendi-haldi",
  "style": "mehendi",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A vermilion-led mehendi ensemble built for the brightest morning of the wedding week, its skirt carrying dense multicoloured motif work that photographs beautifully in daylight. The contrast choli and draped dupatta keep the silhouette festive without weighing the wearer down through long hours of music and henna.",
  "price": 24675,
  "compareAtPrice": 32900,
  "pricing": {
    "mrp": 32900,
    "sellingPrice": 24675
  },
  "media": {
    "primary": "/images/products/bridal/celebrations/mehendi-haldi/PF-BR-MEH-0001/primary.avif",
    "gallery": [
      "/images/products/bridal/celebrations/mehendi-haldi/PF-BR-MEH-0001/01.avif",
      "/images/products/bridal/celebrations/mehendi-haldi/PF-BR-MEH-0001/02.webp"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-BR-MEH-0002",
  "sku": "PFS-BR-MEH-0002",
  "name": "Ambiya Sienna Mehendi Ensemble",
  "department": "bridal",
  "category": "celebrations",
  "subcategory": "mehendi-haldi",
  "style": "mehendi",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "Warm sienna tones give this mehendi ensemble an earthy, sunlit character that sits happily against marigold decor. Cut as a celebratory three-piece with a flared skirt and light dupatta, it is made for the henna ceremony and the family photographs that follow.",
  "price": 23940,
  "compareAtPrice": 28500,
  "pricing": {
    "mrp": 28500,
    "sellingPrice": 23940
  },
  "media": {
    "primary": "/images/products/bridal/celebrations/mehendi-haldi/PF-BR-MEH-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-MEH-0003",
  "sku": "PFS-BR-MEH-0003",
  "name": "Phoolan Terracotta Mehendi Ensemble",
  "department": "bridal",
  "category": "celebrations",
  "subcategory": "mehendi-haldi",
  "style": "mehendi",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "isNew": true,
  "description": "Terracotta colouring and a floral-leaning motif language make this a softer choice for the haldi and mehendi mornings. The relaxed flare moves easily when seated on the floor, and the ensemble finishes cleanly with the bride's own bangles and a simple tikka.",
  "price": 21165,
  "compareAtPrice": 24900,
  "pricing": {
    "mrp": 24900,
    "sellingPrice": 21165
  },
  "media": {
    "primary": "/images/products/bridal/celebrations/mehendi-haldi/PF-BR-MEH-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-SNG-0001",
  "sku": "PFS-BR-SNG-0001",
  "name": "Jhankaar Raspberry Sangeet Ensemble",
  "department": "bridal",
  "category": "celebrations",
  "subcategory": "sangeet",
  "style": "sangeet",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A raspberry sangeet ensemble with the shimmer and swing a dance night asks for, its skirt cut full enough to carry movement across the floor. Styled with statement earrings and an open dupatta, it reads celebratory on stage lighting and in close-up photographs alike.",
  "price": 31875,
  "compareAtPrice": 42500,
  "pricing": {
    "mrp": 42500,
    "sellingPrice": 31875
  },
  "media": {
    "primary": "/images/products/bridal/celebrations/sangeet/PF-BR-SNG-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-SNG-0002",
  "sku": "PFS-BR-SNG-0002",
  "name": "Surili Wine Sangeet Ensemble",
  "department": "bridal",
  "category": "celebrations",
  "subcategory": "sangeet",
  "style": "sangeet",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "isNew": true,
  "description": "Deep wine colouring gives this sangeet ensemble an evening-formal mood that suits an indoor reception hall. The fitted bodice and flowing lower half keep the line elegant while leaving room for the choreographed hour everyone rehearsed for.",
  "price": 33210,
  "compareAtPrice": 36900,
  "pricing": {
    "mrp": 36900,
    "sellingPrice": 33210
  },
  "media": {
    "primary": "/images/products/bridal/celebrations/sangeet/PF-BR-SNG-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-TRS-0001",
  "sku": "PFS-BR-TRS-0001",
  "name": "Shagun Umber Trousseau Ensemble",
  "department": "bridal",
  "category": "celebrations",
  "subcategory": "trousseau",
  "style": "trousseau",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "bridal-trousseau",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "An umber trousseau piece intended for the quieter ceremonies around the wedding — the puja, the family lunch, the send-off. Its grounded colour and covered silhouette make it one of the trousseau's most repeatable ensembles long after the wedding week ends.",
  "price": 27600,
  "compareAtPrice": 34500,
  "pricing": {
    "mrp": 34500,
    "sellingPrice": 27600
  },
  "media": {
    "primary": "/images/products/bridal/celebrations/trousseau/PF-BR-TRS-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-TRS-0002",
  "sku": "PFS-BR-TRS-0002",
  "name": "Kangan Rust Trousseau Ensemble",
  "department": "bridal",
  "category": "celebrations",
  "subcategory": "trousseau",
  "style": "trousseau",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "bridal-trousseau",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "Rust-toned and generously cut, this trousseau ensemble is the kind a bride reaches for during the first festive season at her new home. It layers easily with heirloom bangles and a maang tikka, and works equally well for a daytime function.",
  "price": 26910,
  "compareAtPrice": 29900,
  "pricing": {
    "mrp": 29900,
    "sellingPrice": 26910
  },
  "media": {
    "primary": "/images/products/bridal/celebrations/trousseau/PF-BR-TRS-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-0001",
  "sku": "PFS-BR-BNG-0001",
  "name": "Choodi Copper Bangles",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "A stacked set of copper-toned bangles with a fine beaded outline running along each edge, sold as a coordinated set rather than single pieces. Wear the full stack for a festive evening, or split it across both wrists alongside a saree or kurta set.",
  "price": 2549,
  "compareAtPrice": 3400,
  "pricing": {
    "mrp": 3400,
    "sellingPrice": 2549
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-0002",
  "sku": "PFS-BR-BNG-0002",
  "name": "Rimjhim Peach Bangles",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "Soft peach bangles with a delicate sparkle that catches the light without competing with heavier jewellery. They are an easy daytime choice for a mehendi or a family function, and pair naturally with pastel ensembles.",
  "price": 2465,
  "compareAtPrice": 2900,
  "pricing": {
    "mrp": 2900,
    "sellingPrice": 2465
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-0003",
  "sku": "PFS-BR-BNG-0003",
  "name": "Chamak Coral Bangles",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "Coral bangles with a warm glow that flatters both fair and deep skin tones, finished with a fine detailed border. Stack them for a festive look or wear a pair with everyday ethnic wear when a small lift is all that is needed.",
  "price": 3200,
  "compareAtPrice": 3200,
  "pricing": {
    "mrp": 3200,
    "sellingPrice": 3200
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-BRI-0001",
  "sku": "PFS-BR-BNG-BRI-0001",
  "name": "Doli Apricot Bridal Bangles",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "bridal-bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "An apricot-gold bridal bangle set, closely stone-set along the full width so the stack reads as one continuous band of light on the wrist. Made for the wedding day itself, it holds its own beside a heavily worked lehenga or saree.",
  "price": 5760,
  "compareAtPrice": 7200,
  "pricing": {
    "mrp": 7200,
    "sellingPrice": 5760
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-BRI-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-BRI-0002",
  "sku": "PFS-BR-BNG-BRI-0002",
  "name": "Phere Sienna Bridal Bangles",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "bridal-bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "Sienna-toned bridal bangles with a graduated stack that builds volume from the wrist upward. The warm finish sits comfortably with red and maroon bridal palettes and photographs well during the phere.",
  "price": 5199,
  "compareAtPrice": 6500,
  "pricing": {
    "mrp": 6500,
    "sellingPrice": 5199
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-BRI-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-BRI-0003",
  "sku": "PFS-BR-BNG-BRI-0003",
  "name": "Suhagan Pearl Bridal Bangles",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "bridal-bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "A pearl-toned bridal bangle set for a softer, more luminous wedding palette. Its restrained sparkle suits an ivory or pastel bridal look and lets an ornate necklace remain the centre of the ensemble.",
  "price": 6210,
  "compareAtPrice": 6900,
  "pricing": {
    "mrp": 6900,
    "sellingPrice": 6210
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-BRI-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-GOL-0001",
  "sku": "PFS-BR-BNG-GOL-0001",
  "name": "Kanak Gold-Finish Bangles",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "gold-finish-bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "Gold-finish bangles in a clean, classic profile that suits both festive dressing and daily ethnic wear. The plain-and-textured alternation in the set gives the stack rhythm without any fussy detailing.",
  "price": 3599,
  "compareAtPrice": 4800,
  "pricing": {
    "mrp": 4800,
    "sellingPrice": 3599
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-GOL-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-GOL-0002",
  "sku": "PFS-BR-BNG-GOL-0002",
  "name": "Sunheri Gold-Finish Bangles",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "gold-finish-bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "A warm golden stack with fine surface work along each bangle, made to be worn several at a time. It finishes a silk saree beautifully and needs nothing more than a pair of studs to complete the look.",
  "price": 4680,
  "compareAtPrice": 5200,
  "pricing": {
    "mrp": 5200,
    "sellingPrice": 4680
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-GOL-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-GOL-0003",
  "sku": "PFS-BR-BNG-GOL-0003",
  "name": "Sona Gold-Finish Bangles",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "gold-finish-bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "Slim gold-finish bangles designed for stacking with the pieces already in your box rather than replacing them. Understated enough for the office festive day, and easy to layer up for an evening function.",
  "price": 3740,
  "compareAtPrice": 4400,
  "pricing": {
    "mrp": 4400,
    "sellingPrice": 3740
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-GOL-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-KAD-0001",
  "sku": "PFS-BR-BNG-KAD-0001",
  "name": "Shaan Umber Kada",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "kada-bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "A broad umber kada with a substantial, sculptural presence — one on each wrist is a complete jewellery statement. It suits a plain kurta or saree where the wrist is meant to carry the attention.",
  "price": 3450,
  "compareAtPrice": 4600,
  "pricing": {
    "mrp": 4600,
    "sellingPrice": 3450
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-KAD-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-KAD-0002",
  "sku": "PFS-BR-BNG-KAD-0002",
  "name": "Vijay Champagne Kada",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "kada-bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "A champagne-toned kada with a smooth face and detailed edging, cut wide for a confident, modern silhouette. Wear it singly with western separates or paired for a festive ethnic look.",
  "price": 4590,
  "compareAtPrice": 5100,
  "pricing": {
    "mrp": 5100,
    "sellingPrice": 4590
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-KAD-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-BNG-KAD-0003",
  "sku": "PFS-BR-BNG-KAD-0003",
  "name": "Sher Beige Kada",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "bangles",
  "style": "kada-bangles",
  "gender": "Women",
  "material": "Metal",
  "description": "A beige-gold kada with a quieter finish, made for everyday wear rather than occasion dressing alone. Its neutral tone means it never clashes with the rest of the wardrobe.",
  "price": 3900,
  "compareAtPrice": 3900,
  "pricing": {
    "mrp": 3900,
    "sellingPrice": 3900
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/bangles/PF-BR-BNG-KAD-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-0001",
  "sku": "PFS-BR-JWL-0001",
  "name": "Zeenat Umber Jewellery",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "jewellery",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "An umber-toned jewellery piece with dense, ornate detailing across its face, intended as the focal point of a festive look. Keep the rest of the styling simple and let this carry the ensemble.",
  "price": 7350,
  "compareAtPrice": 9800,
  "pricing": {
    "mrp": 9800,
    "sellingPrice": 7350
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-0002",
  "sku": "PFS-BR-JWL-0002",
  "name": "Ara Rust Jewellery",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "jewellery",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Rust-warm jewellery with layered ornamental work that reads rich under evening light. It sits well against deep-toned sarees and lehengas, and photographs with real depth.",
  "price": 7310,
  "compareAtPrice": 8600,
  "pricing": {
    "mrp": 8600,
    "sellingPrice": 7310
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-0003",
  "sku": "PFS-BR-JWL-0003",
  "name": "Jahan Beige Jewellery",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "jewellery",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A beige-gold jewellery piece with a softer, more wearable scale for family functions and festive evenings. Its neutral warmth means it travels across most of the ethnic wardrobe.",
  "price": 6290,
  "compareAtPrice": 7400,
  "pricing": {
    "mrp": 7400,
    "sellingPrice": 6290
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-AEAR-0001",
  "sku": "PFS-BR-JWL-AEAR-0001",
  "name": "Mehak Wine Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Wine-toned earrings with a drop that moves as you do, sized to be noticed without overwhelming the face. They lift a plain silk saree instantly and need no necklace beside them.",
  "price": 2699,
  "compareAtPrice": 3600,
  "pricing": {
    "mrp": 3600,
    "sellingPrice": 2699
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-AEAR-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-AEAR-0002",
  "sku": "PFS-BR-JWL-AEAR-0002",
  "name": "Khushboo Wheat Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Wheat-gold earrings in an easy, everyday-festive scale that suits both an office festive day and a family dinner. The warm neutral finish works across most ethnic colours.",
  "price": 2520,
  "compareAtPrice": 2800,
  "pricing": {
    "mrp": 2800,
    "sellingPrice": 2520
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-AEAR-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-AEAR-0003",
  "sku": "PFS-BR-JWL-AEAR-0003",
  "name": "Mahi Terracotta Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Terracotta-toned earrings with an earthy warmth that pairs naturally with handloom-leaning sarees and cotton kurta sets. A quietly distinctive alternative to plain gold studs.",
  "price": 2480,
  "compareAtPrice": 3100,
  "pricing": {
    "mrp": 3100,
    "sellingPrice": 2480
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-AEAR-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-AEAR-0004",
  "sku": "PFS-BR-JWL-AEAR-0004",
  "name": "Pari Saffron Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Saffron-warm earrings with a festive glow, cut with enough length to frame the jawline. They work particularly well with an updo and an open neckline.",
  "price": 2970,
  "compareAtPrice": 3300,
  "pricing": {
    "mrp": 3300,
    "sellingPrice": 2970
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-AEAR-0004/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-ANK-0001",
  "sku": "PFS-BR-JWL-ANK-0001",
  "name": "Payal Mocha Anklet",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "anklet",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A mocha-toned anklet with fine detailing along its length, made to be seen with a lehenga or a shorter kurta. Delicate enough to wear daily, festive enough for a mehendi morning.",
  "price": 1949,
  "compareAtPrice": 2600,
  "pricing": {
    "mrp": 2600,
    "sellingPrice": 1949
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-ANK-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-ANK-0002",
  "sku": "PFS-BR-JWL-ANK-0002",
  "name": "Nupur Peach Anklet",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "anklet",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A peach-hued anklet with a soft, light jingle that suits younger, playful festive dressing. Wear one alone or a matched pair for the ceremonies.",
  "price": 2200,
  "compareAtPrice": 2200,
  "pricing": {
    "mrp": 2200,
    "sellingPrice": 2200
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-ANK-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-ANK-0003",
  "sku": "PFS-BR-JWL-ANK-0003",
  "name": "Jhanjhar Umber Anklet",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "anklet",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "An umber anklet with a broader band and denser ornamentation, giving the ankle a more ceremonial presence. It sits well below a bridal lehenga hem.",
  "price": 2465,
  "compareAtPrice": 2900,
  "pricing": {
    "mrp": 2900,
    "sellingPrice": 2465
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-ANK-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-ANK-0004",
  "sku": "PFS-BR-JWL-ANK-0004",
  "name": "Chham Apricot Anklet",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "anklet",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "An apricot-toned anklet with a fine chain body and small drops that catch light as you walk. An easy finishing touch for a sangeet or a house function.",
  "price": 1920,
  "compareAtPrice": 2400,
  "pricing": {
    "mrp": 2400,
    "sellingPrice": 1920
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-ANK-0004/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-ANK-0005",
  "sku": "PFS-BR-JWL-ANK-0005",
  "name": "Kinkini Peach Anklet",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "anklet",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A peach anklet with closely set detailing and a graceful drape around the ankle. Pair it with a mid-length kurta or a lehenga where the hemline moves.",
  "price": 2430,
  "compareAtPrice": 2700,
  "pricing": {
    "mrp": 2700,
    "sellingPrice": 2430
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-ANK-0005/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-BRI-0001",
  "sku": "PFS-BR-JWL-BRI-0001",
  "name": "Vyah Copper Bridal Jewellery",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "bridal-jewellery",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A copper-gold bridal jewellery piece scaled for the wedding day, with layered ornamental work that fills the neckline. Designed to be the centre of the bridal look, with earrings and a tikka echoing rather than competing.",
  "price": 13875,
  "compareAtPrice": 18500,
  "pricing": {
    "mrp": 18500,
    "sellingPrice": 13875
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-BRI-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-BRI-0002",
  "sku": "PFS-BR-JWL-BRI-0002",
  "name": "Anjum Wheat Bridal Jewellery",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "bridal-jewellery",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Wheat-gold bridal jewellery with an ornate face and a softer overall tone, suited to ivory, blush and pastel bridal palettes. It brings ceremonial weight without a heavy colour statement.",
  "price": 14365,
  "compareAtPrice": 16900,
  "pricing": {
    "mrp": 16900,
    "sellingPrice": 14365
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-BRI-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-EAR-0001",
  "sku": "PFS-BR-JWL-EAR-0001",
  "name": "Jhalak Apricot Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Apricot-gold earrings with a gentle warmth and a comfortable everyday scale. They finish a kurta set for a festive lunch and stay easy through a long day.",
  "price": 2320,
  "compareAtPrice": 2900,
  "pricing": {
    "mrp": 2900,
    "sellingPrice": 2320
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-EAR-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-EAR-0002",
  "sku": "PFS-BR-JWL-EAR-0002",
  "name": "Damini Peach Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Peach-toned earrings with fine, close detailing that reads delicate rather than loud. A good default pair for the wardrobe's softer colours.",
  "price": 2250,
  "compareAtPrice": 2500,
  "pricing": {
    "mrp": 2500,
    "sellingPrice": 2250
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-EAR-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-EAR-0003",
  "sku": "PFS-BR-JWL-EAR-0003",
  "name": "Jugnu Terracotta Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Terracotta earrings with a slightly larger drop, made for evenings when the neckline is left bare. Warm enough to carry a plain saree on their own.",
  "price": 2399,
  "compareAtPrice": 3200,
  "pricing": {
    "mrp": 3200,
    "sellingPrice": 2399
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-EAR-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-EAR-0004",
  "sku": "PFS-BR-JWL-EAR-0004",
  "name": "Naina Apricot Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Apricot earrings with a rounded, light-catching form that flatters an open face and pulled-back hair. Festive but never fussy.",
  "price": 2700,
  "compareAtPrice": 2700,
  "pricing": {
    "mrp": 2700,
    "sellingPrice": 2700
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-EAR-0004/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-EAR-0005",
  "sku": "PFS-BR-JWL-EAR-0005",
  "name": "Chanchal Charcoal Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Charcoal-toned earrings with a darker, more contemporary character that plays well against ivory and pastel ethnic wear. A useful break from all-gold jewellery.",
  "price": 2890,
  "compareAtPrice": 3400,
  "pricing": {
    "mrp": 3400,
    "sellingPrice": 2890
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-EAR-0005/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-EAR-0006",
  "sku": "PFS-BR-JWL-EAR-0006",
  "name": "Kajal Beige Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Beige-gold earrings in an understated scale for daily wear and small family occasions. The neutral finish means they never need to be matched to an outfit.",
  "price": 1840,
  "compareAtPrice": 2300,
  "pricing": {
    "mrp": 2300,
    "sellingPrice": 1840
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-EAR-0006/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-EAR-0007",
  "sku": "PFS-BR-JWL-EAR-0007",
  "name": "Raima Apricot Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Apricot earrings with layered detailing that gives them depth up close while staying light on the ear. They suit long festive evenings where comfort matters.",
  "price": 2699,
  "compareAtPrice": 3000,
  "pricing": {
    "mrp": 3000,
    "sellingPrice": 2699
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-EAR-0007/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-EAR-0008",
  "sku": "PFS-BR-JWL-EAR-0008",
  "name": "Sonali Wine Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Wine-toned earrings with a rich, saturated colour that sits beautifully with deep silk sarees. Their length draws the eye without needing a matching necklace.",
  "price": 2775,
  "compareAtPrice": 3700,
  "pricing": {
    "mrp": 3700,
    "sellingPrice": 2775
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-EAR-0008/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-EAR-0009",
  "sku": "PFS-BR-JWL-EAR-0009",
  "name": "Jyoti Coral Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Coral earrings with a bright, cheerful warmth intended for daytime functions and festive brunches. They lift a neutral kurta immediately.",
  "price": 2340,
  "compareAtPrice": 2600,
  "pricing": {
    "mrp": 2600,
    "sellingPrice": 2340
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-EAR-0009/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-EAR-0010",
  "sku": "PFS-BR-JWL-EAR-0010",
  "name": "Neha Wine Earrings",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "earrings",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "Wine earrings with a fuller silhouette for occasion dressing, balanced enough to wear through a full evening. Pair them with an open neckline and simple bangles.",
  "price": 2975,
  "compareAtPrice": 3500,
  "pricing": {
    "mrp": 3500,
    "sellingPrice": 2975
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-EAR-0010/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-MTK-0001",
  "sku": "PFS-BR-JWL-MTK-0001",
  "name": "Bindiya Apricot Maang Tikka",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "maang-tikka",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "An apricot-gold maang tikka with a central ornament sized to sit cleanly at the parting. It completes a bridal or sangeet look and works with both open hair and a braided style.",
  "price": 3149,
  "compareAtPrice": 4200,
  "pricing": {
    "mrp": 4200,
    "sellingPrice": 3149
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-MTK-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-MTK-0002",
  "sku": "PFS-BR-JWL-MTK-0002",
  "name": "Shobha Rust Maang Tikka",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "maang-tikka",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A rust-toned maang tikka with a fuller central motif for the wedding-day look. Worn with matching earrings, it frames the face without needing further headwear.",
  "price": 4320,
  "compareAtPrice": 4800,
  "pricing": {
    "mrp": 4800,
    "sellingPrice": 4320
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-MTK-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-NCK-0001",
  "sku": "PFS-BR-JWL-NCK-0001",
  "name": "Rani Apricot Necklace",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "necklace",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "An apricot-gold necklace with a wide, richly detailed centre panel and small drops along the lower edge. It fills a wide neckline confidently and is the natural centre of a festive or wedding-guest look.",
  "price": 9999,
  "compareAtPrice": 12500,
  "pricing": {
    "mrp": 12500,
    "sellingPrice": 9999
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-NCK-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-NCK-0002",
  "sku": "PFS-BR-JWL-NCK-0002",
  "name": "Malika Charcoal Necklace",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "necklace",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A charcoal-toned necklace with a darker, more dramatic character that stands out against ivory and gold ensembles. Its contemporary finish suits a reception or an evening party as much as a traditional function.",
  "price": 10030,
  "compareAtPrice": 11800,
  "pricing": {
    "mrp": 11800,
    "sellingPrice": 10030
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-NCK-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-NCK-0003",
  "sku": "PFS-BR-JWL-NCK-0003",
  "name": "Shahzadi Umber Necklace",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "necklace",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "An umber-gold necklace with dense ornamental work and real visual weight at the collarbone. Keep the earrings small and let this piece define the ensemble.",
  "price": 10425,
  "compareAtPrice": 13900,
  "pricing": {
    "mrp": 13900,
    "sellingPrice": 10425
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-NCK-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-RNG-0001",
  "sku": "PFS-BR-JWL-RNG-0001",
  "name": "Vaada Pearl Ring",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "ring",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A pearl-toned ring with a clustered, floral-leaning setting that catches light from every angle. Elegant enough for an engagement, easy enough to wear to a dinner.",
  "price": 4590,
  "compareAtPrice": 5400,
  "pricing": {
    "mrp": 5400,
    "sellingPrice": 4590
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-RNG-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-RNG-0002",
  "sku": "PFS-BR-JWL-RNG-0002",
  "name": "Sagai Peach Ring",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "ring",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A peach-gold ring with a raised centre stone framed by finer surrounding detail. A considered choice for a roka or engagement, and a piece that wears well every day afterwards.",
  "price": 4900,
  "compareAtPrice": 4900,
  "pricing": {
    "mrp": 4900,
    "sellingPrice": 4900
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-RNG-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-RNG-0003",
  "sku": "PFS-BR-JWL-RNG-0003",
  "name": "Nikaah Coral Ring",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "ring",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A coral-warm ring with a bold face and a comfortable band, made to be noticed across a table. It pairs well with matching earrings for a coordinated ceremony look.",
  "price": 4425,
  "compareAtPrice": 5900,
  "pricing": {
    "mrp": 5900,
    "sellingPrice": 4425
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-RNG-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-RNG-0004",
  "sku": "PFS-BR-JWL-RNG-0004",
  "name": "Bandhan Apricot Ring",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "ring",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "An apricot-gold ring with a slim profile and delicate stone work, suited to stacking with other rings. Understated enough for daily wear through the festive season.",
  "price": 3825,
  "compareAtPrice": 4500,
  "pricing": {
    "mrp": 4500,
    "sellingPrice": 3825
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-RNG-0004/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-SET-0001",
  "sku": "PFS-BR-JWL-SET-0001",
  "name": "Aabhar Apricot Jewellery Set",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "jewellery-set",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A coordinated apricot-gold jewellery set that takes the guesswork out of occasion dressing — the necklace and its matching pieces are designed to be worn together. Ideal for a wedding guest or for the bride's second-day function.",
  "price": 16125,
  "compareAtPrice": 21500,
  "pricing": {
    "mrp": 21500,
    "sellingPrice": 16125
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-SET-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-JWL-SET-0002",
  "sku": "PFS-BR-JWL-SET-0002",
  "name": "Inayat Sienna Jewellery Set",
  "department": "bridal",
  "category": "finishing-touches",
  "subcategory": "jewellery",
  "style": "jewellery-set",
  "gender": "Women",
  "material": "Bridal Alloy",
  "description": "A sienna-toned jewellery set with a fuller, more ceremonial scale across every piece. Made for the wedding day and the receptions that follow, it holds its own against heavily worked bridal wear.",
  "price": 21165,
  "compareAtPrice": 24900,
  "pricing": {
    "mrp": 24900,
    "sellingPrice": 21165
  },
  "media": {
    "primary": "/images/products/bridal/finishing-touches/jewellery/PF-BR-JWL-SET-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-LEH-0001",
  "sku": "PFS-BR-LEH-0001",
  "name": "Rajkumari Wine Bridal Lehenga",
  "department": "bridal",
  "category": "the-bride",
  "subcategory": "lehengas",
  "style": "bridal-lehenga",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "wedding",
    "bridal-trousseau"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A blush-and-wine bridal lehenga with large floral panels worked across the skirt and a fine-detailed bodice, finished with a contrast-bordered dupatta. The full circular flare gives the sweep a bride wants for the phere, and the softer palette reads modern in daylight photography.",
  "price": 67125,
  "compareAtPrice": 89500,
  "pricing": {
    "mrp": 89500,
    "sellingPrice": 67125
  },
  "media": {
    "primary": "/images/products/bridal/the-bride/lehengas/PF-BR-LEH-0001/primary.avif",
    "gallery": [
      "/images/products/bridal/the-bride/lehengas/PF-BR-LEH-0001/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-BR-LEH-0002",
  "sku": "PFS-BR-LEH-0002",
  "name": "Kanchan Vermilion Bridal Lehenga",
  "department": "bridal",
  "category": "the-bride",
  "subcategory": "lehengas",
  "style": "bridal-lehenga",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "wedding",
    "bridal-trousseau"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A vermilion bridal lehenga in the traditional wedding palette, with dense ornamental work across the skirt and a matched dupatta for the head drape. Built for the ceremony itself, its volume and weight photograph exactly as a wedding-day lehenga should.",
  "price": 94500,
  "compareAtPrice": 105000,
  "pricing": {
    "mrp": 105000,
    "sellingPrice": 94500
  },
  "media": {
    "primary": "/images/products/bridal/the-bride/lehengas/PF-BR-LEH-0002/primary.avif",
    "gallery": [
      "/images/products/bridal/the-bride/lehengas/PF-BR-LEH-0002/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-BR-REC-0001",
  "sku": "PFS-BR-REC-0001",
  "name": "Shaam Sand Reception Ensemble",
  "department": "bridal",
  "category": "the-bride",
  "subcategory": "reception-wear",
  "style": "reception-wear",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A sand-toned reception ensemble with a restrained, contemporary line for the evening after the wedding. It reads elegant under indoor lighting and lets bridal jewellery take the lead.",
  "price": 34875,
  "compareAtPrice": 46500,
  "pricing": {
    "mrp": 46500,
    "sellingPrice": 34875
  },
  "media": {
    "primary": "/images/products/bridal/the-bride/reception-wear/PF-BR-REC-0001/primary.webp",
    "gallery": [
      "/images/products/bridal/the-bride/reception-wear/PF-BR-REC-0001/01.avif",
      "/images/products/bridal/the-bride/reception-wear/PF-BR-REC-0001/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-BR-REC-0002",
  "sku": "PFS-BR-REC-0002",
  "name": "Raunaq Wine Reception Ensemble",
  "department": "bridal",
  "category": "the-bride",
  "subcategory": "reception-wear",
  "style": "reception-wear",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A wine reception ensemble with a fitted upper half and a sweeping lower silhouette made for a hall entrance. Deep colour and long lines keep it formal through a full evening of greetings and photographs.",
  "price": 44200,
  "compareAtPrice": 52000,
  "pricing": {
    "mrp": 52000,
    "sellingPrice": 44200
  },
  "media": {
    "primary": "/images/products/bridal/the-bride/reception-wear/PF-BR-REC-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-REC-0003",
  "sku": "PFS-BR-REC-0003",
  "name": "Shabab Umber Reception Ensemble",
  "department": "bridal",
  "category": "the-bride",
  "subcategory": "reception-wear",
  "style": "reception-wear",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "An umber reception ensemble with a warm, grounded palette that suits a candlelit venue. Its clean construction makes it one of the easier bridal pieces to re-wear at a later celebration.",
  "price": 35920,
  "compareAtPrice": 44900,
  "pricing": {
    "mrp": 44900,
    "sellingPrice": 35920
  },
  "media": {
    "primary": "/images/products/bridal/the-bride/reception-wear/PF-BR-REC-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-REC-0004",
  "sku": "PFS-BR-REC-0004",
  "name": "Bahaar Crimson Reception Ensemble",
  "department": "bridal",
  "category": "the-bride",
  "subcategory": "reception-wear",
  "style": "reception-wear",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "isNew": true,
  "description": "A crimson reception gown-style ensemble with a dramatic flare and a jewelled bodice that catches every light in the room. It is the entrance piece of the trousseau, built for the reception line and the first dance.",
  "price": 52650,
  "compareAtPrice": 58500,
  "pricing": {
    "mrp": 58500,
    "sellingPrice": 52650
  },
  "media": {
    "primary": "/images/products/bridal/the-bride/reception-wear/PF-BR-REC-0004/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-SAR-0001",
  "sku": "PFS-BR-SAR-0001",
  "name": "Dulhan Wine Bridal Saree",
  "department": "bridal",
  "category": "the-bride",
  "subcategory": "sarees",
  "style": "bridal-saree",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "festive-edit",
    "bridal-trousseau"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A red bridal saree in the classic wedding palette, its pallu and body carrying dense ornamental work that builds to a heavy border. Drapes with real presence for the ceremony, and pairs naturally with a full bridal jewellery set.",
  "price": 51375,
  "compareAtPrice": 68500,
  "pricing": {
    "mrp": 68500,
    "sellingPrice": 51375
  },
  "media": {
    "primary": "/images/products/bridal/the-bride/sarees/PF-BR-SAR-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-SAR-0002",
  "sku": "PFS-BR-SAR-0002",
  "name": "Varmala Crimson Bridal Saree",
  "department": "bridal",
  "category": "the-bride",
  "subcategory": "sarees",
  "style": "bridal-saree",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "festive-edit",
    "bridal-trousseau"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A crimson bridal saree cut for the varmala and the ceremony that follows, with rich surface work along the pallu and border. Traditional in colour, it photographs deeply saturated under both daylight and mandap lighting.",
  "price": 52700,
  "compareAtPrice": 62000,
  "pricing": {
    "mrp": 62000,
    "sellingPrice": 52700
  },
  "media": {
    "primary": "/images/products/bridal/the-bride/sarees/PF-BR-SAR-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-SAR-0003",
  "sku": "PFS-BR-SAR-0003",
  "name": "Solah Wine Bridal Saree",
  "department": "bridal",
  "category": "the-bride",
  "subcategory": "sarees",
  "style": "bridal-saree",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "festive-edit",
    "bridal-trousseau"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A wine bridal saree with a slightly softer tone than a classic red, giving the bride a more contemporary wedding palette. Its ornate pallu carries the ceremonial weight while the body drapes cleanly.",
  "price": 48875,
  "compareAtPrice": 57500,
  "pricing": {
    "mrp": 57500,
    "sellingPrice": 48875
  },
  "media": {
    "primary": "/images/products/bridal/the-bride/sarees/PF-BR-SAR-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-BR-SAR-0004",
  "sku": "PFS-BR-SAR-0004",
  "name": "Saubhagya Wine Bridal Saree",
  "department": "bridal",
  "category": "the-bride",
  "subcategory": "sarees",
  "style": "bridal-saree",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "festive-edit",
    "bridal-trousseau"
  ],
  "occasion": [
    "Wedding"
  ],
  "isNew": true,
  "description": "A deep wine bridal saree with the fullest ornamentation in this edit, built for the wedding ceremony itself. Heavier through the pallu and border, it holds the drape beautifully through a long ritual.",
  "price": 64350,
  "compareAtPrice": 71500,
  "pricing": {
    "mrp": 71500,
    "sellingPrice": 64350
  },
  "media": {
    "primary": "/images/products/bridal/the-bride/sarees/PF-BR-SAR-0004/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-K-BYS-CS-0001",
  "sku": "PFS-K-BYS-CS-0001",
  "name": "Chhota Silver Casual Set",
  "department": "kids",
  "category": "boys",
  "subcategory": "casual-sets",
  "style": "casual-set",
  "gender": "Kids",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A relaxed boys' casual set in a soft silver-grey tee with easy-fit shorts, cut for running around rather than standing still. Simple to pull on and simple to wash — a weekday favourite that also looks tidy for a family outing.",
  "price": 1799,
  "compareAtPrice": 2400,
  "pricing": {
    "mrp": 2400,
    "sellingPrice": 1799
  },
  "media": {
    "primary": "/images/products/kids/boys/casual-sets/PF-K-BYS-CS-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-K-BYS-CS-0002",
  "sku": "PFS-K-BYS-CS-0002",
  "name": "Yoddha Peach Casual Set",
  "department": "kids",
  "category": "boys",
  "subcategory": "casual-sets",
  "style": "casual-set",
  "gender": "Kids",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A peach-toned boys' casual set with a roomy top and comfortable shorts for warm-weather play. The gentle colour keeps it looking fresh, and the coordinated pieces work just as well split across other outfits.",
  "price": 1870,
  "compareAtPrice": 2200,
  "pricing": {
    "mrp": 2200,
    "sellingPrice": 1870
  },
  "media": {
    "primary": "/images/products/kids/boys/casual-sets/PF-K-BYS-CS-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-K-BYS-TSH-0001",
  "sku": "PFS-K-BYS-TSH-0001",
  "name": "Toofan Sand T-Shirt & Shorts Set",
  "department": "kids",
  "category": "boys",
  "subcategory": "t-shirt-shorts",
  "style": "tshirt-shorts",
  "gender": "Kids",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A sand-coloured t-shirt and shorts set built for everyday play, with a loose cut that gives little arms and legs room to move. Easy to layer under a jacket when the evening cools down.",
  "price": 1425,
  "compareAtPrice": 1900,
  "pricing": {
    "mrp": 1900,
    "sellingPrice": 1425
  },
  "media": {
    "primary": "/images/products/kids/boys/t-shirt-shorts/PF-K-BYS-TSH-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-K-BYS-TSH-0002",
  "sku": "PFS-K-BYS-TSH-0002",
  "name": "Jigar Peach T-Shirt & Shorts Set",
  "department": "kids",
  "category": "boys",
  "subcategory": "t-shirt-shorts",
  "style": "tshirt-shorts",
  "gender": "Kids",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "isNew": true,
  "description": "A peach t-shirt and shorts set in a bright, cheerful colour pairing that children pick out for themselves. Light and unrestrictive for school holidays, playgrounds and weekend trips.",
  "price": 1575,
  "compareAtPrice": 1750,
  "pricing": {
    "mrp": 1750,
    "sellingPrice": 1575
  },
  "media": {
    "primary": "/images/products/kids/boys/t-shirt-shorts/PF-K-BYS-TSH-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-K-GRL-CS-0001",
  "sku": "PFS-K-GRL-CS-0001",
  "name": "Khushi Olive Casual Set",
  "department": "kids",
  "category": "girls",
  "subcategory": "casual-sets",
  "style": "casual-set",
  "gender": "Kids",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "An olive girls' casual set that mixes comfort with a put-together look for playdates and outings. Coordinated top and bottom, cut loose enough for a full day of movement.",
  "price": 1725,
  "compareAtPrice": 2300,
  "pricing": {
    "mrp": 2300,
    "sellingPrice": 1725
  },
  "media": {
    "primary": "/images/products/kids/girls/casual-sets/PF-K-GRL-CS-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-K-GRL-CS-0002",
  "sku": "PFS-K-GRL-CS-0002",
  "name": "Muskaan Wheat Casual Set",
  "department": "kids",
  "category": "girls",
  "subcategory": "casual-sets",
  "style": "casual-set",
  "gender": "Kids",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A wheat-toned girls' casual set in a soft neutral that pairs with almost anything already in the wardrobe. Easy to wear, easy to wash, and smart enough for a family lunch.",
  "price": 1890,
  "compareAtPrice": 2100,
  "pricing": {
    "mrp": 2100,
    "sellingPrice": 1890
  },
  "media": {
    "primary": "/images/products/kids/girls/casual-sets/PF-K-GRL-CS-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-K-GRL-CS-0003",
  "sku": "PFS-K-GRL-CS-0003",
  "name": "Mishti Coral Casual Set",
  "department": "kids",
  "category": "girls",
  "subcategory": "casual-sets",
  "style": "casual-set",
  "gender": "Kids",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A coral girls' casual set with a playful floral character and a relaxed, wide-leg lower half. Bright and comfortable for weekend outings, birthdays and holiday travel.",
  "price": 1999,
  "compareAtPrice": 2600,
  "pricing": {
    "mrp": 2600,
    "sellingPrice": 1999
  },
  "media": {
    "primary": "/images/products/kids/girls/casual-sets/PF-K-GRL-CS-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-K-GRL-DRS-0001",
  "sku": "PFS-K-GRL-DRS-0001",
  "name": "Guddi Pearl Dress",
  "department": "kids",
  "category": "girls",
  "subcategory": "dresses",
  "style": "dress",
  "gender": "Kids",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A pearl-white girls' dress with puffed sleeves and a gathered skirt that twirls exactly as a child hopes it will. Sweet enough for a birthday party or a family celebration, and still comfortable to wear all afternoon.",
  "price": 2240,
  "compareAtPrice": 2800,
  "pricing": {
    "mrp": 2800,
    "sellingPrice": 2240
  },
  "media": {
    "primary": "/images/products/kids/girls/dresses/PF-K-GRL-DRS-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-K-GRL-DRS-0002",
  "sku": "PFS-K-GRL-DRS-0002",
  "name": "Chanda Scarlet Dress",
  "department": "kids",
  "category": "girls",
  "subcategory": "dresses",
  "style": "dress",
  "gender": "Kids",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A scarlet girls' dress with a festive colour and a full skirt made for occasion photographs. Bright, easy to move in, and cheerful enough to become a favourite.",
  "price": 2880,
  "compareAtPrice": 3200,
  "pricing": {
    "mrp": 3200,
    "sellingPrice": 2880
  },
  "media": {
    "primary": "/images/products/kids/girls/dresses/PF-K-GRL-DRS-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-K-GRL-DRS-0003",
  "sku": "PFS-K-GRL-DRS-0003",
  "name": "Titli Coral Dress",
  "department": "kids",
  "category": "girls",
  "subcategory": "dresses",
  "style": "dress",
  "gender": "Kids",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "isNew": true,
  "description": "A coral girls' dress in a light, playful cut for warm days and afternoon parties. Simple styling means it works with sandals for a party or sneakers for a day out.",
  "price": 1875,
  "compareAtPrice": 2500,
  "pricing": {
    "mrp": 2500,
    "sellingPrice": 1875
  },
  "media": {
    "primary": "/images/products/kids/girls/dresses/PF-K-GRL-DRS-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-M-ETH-KPJ-0001",
  "sku": "PFS-M-ETH-KPJ-0001",
  "name": "Aditya Olive Kurta Pajama",
  "department": "men",
  "category": "ethnic-wear",
  "subcategory": "kurta-pajama",
  "style": "kurta-pajama",
  "gender": "Men",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "An olive kurta pajama set with a clean straight cut and understated placket detailing, made for festive days that run long. Neutral enough to layer under a Nehru jacket, complete enough to wear on its own.",
  "price": 5925,
  "compareAtPrice": 7900,
  "pricing": {
    "mrp": 7900,
    "sellingPrice": 5925
  },
  "media": {
    "primary": "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0001/primary.avif",
    "gallery": [
      "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0001/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-ETH-KPJ-0002",
  "sku": "PFS-M-ETH-KPJ-0002",
  "name": "Rudra Wheat Kurta Pajama",
  "department": "men",
  "category": "ethnic-wear",
  "subcategory": "kurta-pajama",
  "style": "kurta-pajama",
  "gender": "Men",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A wheat-toned kurta pajama set with subtle tonal work at the yoke and cuffs. It reads formal enough for a wedding function while staying comfortable through the day.",
  "price": 7225,
  "compareAtPrice": 8500,
  "pricing": {
    "mrp": 8500,
    "sellingPrice": 7225
  },
  "media": {
    "primary": "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0002/primary.avif",
    "gallery": [
      "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0002/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-ETH-KPJ-0003",
  "sku": "PFS-M-ETH-KPJ-0003",
  "name": "Veer Beige Kurta Pajama",
  "department": "men",
  "category": "ethnic-wear",
  "subcategory": "kurta-pajama",
  "style": "kurta-pajama",
  "gender": "Men",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A beige kurta pajama set cut in a relaxed, everyday silhouette for pujas, family gatherings and festive mornings. The neutral colour makes it the easiest set in the ethnic wardrobe to repeat.",
  "price": 5520,
  "compareAtPrice": 6900,
  "pricing": {
    "mrp": 6900,
    "sellingPrice": 5520
  },
  "media": {
    "primary": "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0003/primary.avif",
    "gallery": [
      "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0003/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-ETH-KPJ-0004",
  "sku": "PFS-M-ETH-KPJ-0004",
  "name": "Nawab Sand Kurta Pajama",
  "department": "men",
  "category": "ethnic-wear",
  "subcategory": "kurta-pajama",
  "style": "kurta-pajama",
  "gender": "Men",
  "fabric": "Linen",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A sand kurta pajama with a more decorative front panel, positioned for the ceremonies rather than the everyday. Pair it with a contrast stole for a wedding-guest look.",
  "price": 8820,
  "compareAtPrice": 9800,
  "pricing": {
    "mrp": 9800,
    "sellingPrice": 8820
  },
  "media": {
    "primary": "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0004/primary.avif",
    "gallery": [
      "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0004/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-ETH-KPJ-0005",
  "sku": "PFS-M-ETH-KPJ-0005",
  "name": "Sultan Olive Kurta Pajama",
  "department": "men",
  "category": "ethnic-wear",
  "subcategory": "kurta-pajama",
  "style": "kurta-pajama",
  "gender": "Men",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "An olive kurta pajama in a deeper tone with a straight, unfussy line. It works for an office festive day and moves easily into an evening function.",
  "price": 5549,
  "compareAtPrice": 7400,
  "pricing": {
    "mrp": 7400,
    "sellingPrice": 5549
  },
  "media": {
    "primary": "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0005/primary.avif",
    "gallery": [
      "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0005/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-ETH-KPJ-0006",
  "sku": "PFS-M-ETH-KPJ-0006",
  "name": "Raja Terracotta Kurta Pajama",
  "department": "men",
  "category": "ethnic-wear",
  "subcategory": "kurta-pajama",
  "style": "kurta-pajama",
  "gender": "Men",
  "fabric": "Linen",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A terracotta kurta pajama set with a warm, distinctive colour that stands apart from the usual whites and creams. Well suited to a daytime festive event or a haldi function.",
  "price": 7565,
  "compareAtPrice": 8900,
  "pricing": {
    "mrp": 8900,
    "sellingPrice": 7565
  },
  "media": {
    "primary": "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0006/primary.avif",
    "gallery": [
      "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0006/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-ETH-KPJ-0007",
  "sku": "PFS-M-ETH-KPJ-0007",
  "name": "Abir Sand Kurta Pajama",
  "department": "men",
  "category": "ethnic-wear",
  "subcategory": "kurta-pajama",
  "style": "kurta-pajama",
  "gender": "Men",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A sand-toned kurta pajama built for comfortable, repeatable wear through the festive calendar. Straight cut, quiet detailing, and easy to dress up with a jacket.",
  "price": 4875,
  "compareAtPrice": 6500,
  "pricing": {
    "mrp": 6500,
    "sellingPrice": 4875
  },
  "media": {
    "primary": "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0007/primary.avif",
    "gallery": [
      "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0007/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-ETH-KPJ-0008",
  "sku": "PFS-M-ETH-KPJ-0008",
  "name": "Yash Wheat Kurta Pajama",
  "department": "men",
  "category": "ethnic-wear",
  "subcategory": "kurta-pajama",
  "style": "kurta-pajama",
  "gender": "Men",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "isNew": true,
  "description": "A wheat kurta pajama with a soft neutral finish and a clean neckline, suited to both temple visits and family celebrations. A dependable base layer for jacket pairings.",
  "price": 7200,
  "compareAtPrice": 7200,
  "pricing": {
    "mrp": 7200,
    "sellingPrice": 7200
  },
  "media": {
    "primary": "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0008/primary.avif",
    "gallery": [
      "/images/products/men/ethnic-wear/kurta-pajama/PF-M-ETH-KPJ-0008/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-ETH-NJ-0001",
  "sku": "PFS-M-ETH-NJ-0001",
  "name": "Sikandar Umber Nehru Jacket",
  "department": "men",
  "category": "ethnic-wear",
  "subcategory": "nehru-jackets",
  "style": "nehru-jacket",
  "gender": "Men",
  "fabric": "Linen",
  "collections": [
    "everyday-atelier",
    "festive-edit"
  ],
  "description": "An umber Nehru jacket that instantly formalises a plain kurta, cut close through the body with a standing collar. Works as well over a shirt for a smart-casual evening.",
  "price": 6675,
  "compareAtPrice": 8900,
  "pricing": {
    "mrp": 8900,
    "sellingPrice": 6675
  },
  "media": {
    "primary": "/images/products/men/ethnic-wear/nehru-jackets/PF-M-ETH-NJ-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-M-ETH-NJ-0002",
  "sku": "PFS-M-ETH-NJ-0002",
  "name": "Arman Olive Nehru Jacket",
  "department": "men",
  "category": "ethnic-wear",
  "subcategory": "nehru-jackets",
  "style": "nehru-jacket",
  "gender": "Men",
  "fabric": "Linen",
  "collections": [
    "everyday-atelier",
    "festive-edit"
  ],
  "description": "An olive Nehru jacket with an all-over patterned face that gives a simple kurta set an immediate lift. Its deep colour makes it the most versatile layering piece for the wedding season.",
  "price": 8160,
  "compareAtPrice": 9600,
  "pricing": {
    "mrp": 9600,
    "sellingPrice": 8160
  },
  "media": {
    "primary": "/images/products/men/ethnic-wear/nehru-jackets/PF-M-ETH-NJ-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-M-ETH-NJ-0003",
  "sku": "PFS-M-ETH-NJ-0003",
  "name": "Farhan Umber Nehru Jacket",
  "department": "men",
  "category": "ethnic-wear",
  "subcategory": "nehru-jackets",
  "style": "nehru-jacket",
  "gender": "Men",
  "fabric": "Linen",
  "collections": [
    "everyday-atelier",
    "festive-edit"
  ],
  "isNew": true,
  "description": "An umber Nehru jacket in a quieter finish for men who prefer restraint. Layer it over a cream kurta for a puja, or over a shirt for a festive office day.",
  "price": 6560,
  "compareAtPrice": 8200,
  "pricing": {
    "mrp": 8200,
    "sellingPrice": 6560
  },
  "media": {
    "primary": "/images/products/men/ethnic-wear/nehru-jackets/PF-M-ETH-NJ-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-M-GRM-GEN-0001",
  "sku": "PFS-M-GRM-GEN-0001",
  "name": "Sehra Vermilion Groom Ensemble",
  "department": "men",
  "category": "groom",
  "subcategory": "groom-collection",
  "style": "groom",
  "gender": "Men",
  "fabric": "Silk",
  "collections": [
    "groom-atelier",
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "An ivory-and-red groom's sherwani ensemble with dense ornamental work across the front panel, cuffs and collar, worn with a contrast stole. Built for the baraat and the ceremony, it carries the ceremonial weight the wedding day asks for.",
  "price": 72375,
  "compareAtPrice": 96500,
  "pricing": {
    "mrp": 96500,
    "sellingPrice": 72375
  },
  "media": {
    "primary": "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0001/primary.avif",
    "gallery": [
      "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0001/01.avif",
      "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0001/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-GRM-GEN-0002",
  "sku": "PFS-M-GRM-GEN-0002",
  "name": "Baraat Peach Groom Ensemble",
  "department": "men",
  "category": "groom",
  "subcategory": "groom-collection",
  "style": "groom",
  "gender": "Men",
  "fabric": "Silk",
  "collections": [
    "groom-atelier",
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A peach-toned groom's ensemble with a softer palette for a daytime wedding or an engagement. Ornate but light in colour, it photographs beautifully against outdoor and courtyard venues.",
  "price": 66725,
  "compareAtPrice": 78500,
  "pricing": {
    "mrp": 78500,
    "sellingPrice": 66725
  },
  "media": {
    "primary": "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0002/primary.avif",
    "gallery": [
      "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0002/01.avif",
      "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0002/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-GRM-GEN-0003",
  "sku": "PFS-M-GRM-GEN-0003",
  "name": "Dulha Wine Groom Ensemble",
  "department": "men",
  "category": "groom",
  "subcategory": "groom-collection",
  "style": "groom",
  "gender": "Men",
  "fabric": "Silk",
  "collections": [
    "groom-atelier",
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A wine groom's ensemble with a deep, formal colour and richly worked detailing along the front. It suits an evening wedding and pairs naturally with a matching safa and stole.",
  "price": 70400,
  "compareAtPrice": 88000,
  "pricing": {
    "mrp": 88000,
    "sellingPrice": 70400
  },
  "media": {
    "primary": "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0003/primary.avif",
    "gallery": [
      "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0003/01.avif",
      "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0003/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-GRM-GEN-0004",
  "sku": "PFS-M-GRM-GEN-0004",
  "name": "Yuvraj Copper Groom Ensemble",
  "department": "men",
  "category": "groom",
  "subcategory": "groom-collection",
  "style": "groom",
  "gender": "Men",
  "fabric": "Silk",
  "collections": [
    "groom-atelier",
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A copper-toned groom's ensemble with a warm metallic character that catches venue lighting. Cut long and structured, it holds a confident line through the ceremony.",
  "price": 74250,
  "compareAtPrice": 82500,
  "pricing": {
    "mrp": 82500,
    "sellingPrice": 74250
  },
  "media": {
    "primary": "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0004/primary.avif",
    "gallery": [
      "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0004/01.avif",
      "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0004/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-M-GRM-GEN-0005",
  "sku": "PFS-M-GRM-GEN-0005",
  "name": "Maharaja Raspberry Groom Ensemble",
  "department": "men",
  "category": "groom",
  "subcategory": "groom-collection",
  "style": "groom",
  "gender": "Men",
  "fabric": "Silk",
  "collections": [
    "groom-atelier",
    "festive-edit",
    "wedding"
  ],
  "occasion": [
    "Wedding"
  ],
  "isNew": true,
  "description": "A raspberry groom's ensemble at the top of the collection, with the fullest ornamentation and a commanding ceremonial silhouette. Made for the groom who wants the entrance to be unmistakable.",
  "price": 84000,
  "compareAtPrice": 112000,
  "pricing": {
    "mrp": 112000,
    "sellingPrice": 84000
  },
  "media": {
    "primary": "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0005/primary.avif",
    "gallery": [
      "/images/products/men/groom/groom-collection/PF-M-GRM-GEN-0005/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-DUP-0001",
  "sku": "PFS-W-ESS-DUP-0001",
  "name": "Leher Sand Dupatta",
  "department": "women",
  "category": "essentials",
  "subcategory": "dupattas-stoles",
  "style": "dupatta-stole",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "handloom-stories"
  ],
  "description": "A sand-toned dupatta with scattered motif work across the body and a defined border, light enough to drape without bulk. It finishes a plain kurta set for a festive lunch and folds small enough to keep in a bag.",
  "price": 2549,
  "compareAtPrice": 3400,
  "pricing": {
    "mrp": 3400,
    "sellingPrice": 2549
  },
  "media": {
    "primary": "/images/products/women/essentials/dupattas-stoles/PF-W-ESS-DUP-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-DUP-0002",
  "sku": "PFS-W-ESS-DUP-0002",
  "name": "Baadal Maroon Dupatta",
  "department": "women",
  "category": "essentials",
  "subcategory": "dupattas-stoles",
  "style": "dupatta-stole",
  "gender": "Women",
  "fabric": "Chiffon",
  "collections": [
    "festive-edit"
  ],
  "description": "A maroon dupatta with a deep, saturated colour that turns a neutral kurta into an occasion outfit. Drapes cleanly over one shoulder and holds a pleat well.",
  "price": 3315,
  "compareAtPrice": 3900,
  "pricing": {
    "mrp": 3900,
    "sellingPrice": 3315
  },
  "media": {
    "primary": "/images/products/women/essentials/dupattas-stoles/PF-W-ESS-DUP-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-DUP-0003",
  "sku": "PFS-W-ESS-DUP-0003",
  "name": "Saawan Crimson Dupatta",
  "department": "women",
  "category": "essentials",
  "subcategory": "dupattas-stoles",
  "style": "dupatta-stole",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "handloom-stories"
  ],
  "description": "A crimson dupatta with a festive border, cut long enough to drape across both shoulders or over the head for a ceremony. A useful bridge between everyday kurtas and occasion dressing.",
  "price": 3360,
  "compareAtPrice": 4200,
  "pricing": {
    "mrp": 4200,
    "sellingPrice": 3360
  },
  "media": {
    "primary": "/images/products/women/essentials/dupattas-stoles/PF-W-ESS-DUP-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-DUP-0004",
  "sku": "PFS-W-ESS-DUP-0004",
  "name": "Phagun Apricot Dupatta",
  "department": "women",
  "category": "essentials",
  "subcategory": "dupattas-stoles",
  "style": "dupatta-stole",
  "gender": "Women",
  "fabric": "Chiffon",
  "collections": [
    "festive-edit"
  ],
  "description": "An apricot dupatta in a soft, warm pastel with delicate detailing along the edge. It lightens a dark suit set and works well for daytime functions.",
  "price": 2790,
  "compareAtPrice": 3100,
  "pricing": {
    "mrp": 3100,
    "sellingPrice": 2790
  },
  "media": {
    "primary": "/images/products/women/essentials/dupattas-stoles/PF-W-ESS-DUP-0004/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-DUP-0005",
  "sku": "PFS-W-ESS-DUP-0005",
  "name": "Jhoomar Crimson Dupatta",
  "department": "women",
  "category": "essentials",
  "subcategory": "dupattas-stoles",
  "style": "dupatta-stole",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves"
  ],
  "description": "A crimson dupatta with heavier ornamentation along the border, positioned as the occasion piece of the essentials edit. Pair it with a plain kurta and let the drape carry the look.",
  "price": 3375,
  "compareAtPrice": 4500,
  "pricing": {
    "mrp": 4500,
    "sellingPrice": 3375
  },
  "media": {
    "primary": "/images/products/women/essentials/dupattas-stoles/PF-W-ESS-DUP-0005/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-DUP-0006",
  "sku": "PFS-W-ESS-DUP-0006",
  "name": "Sitara Beige Dupatta",
  "department": "women",
  "category": "essentials",
  "subcategory": "dupattas-stoles",
  "style": "dupatta-stole",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves"
  ],
  "isNew": true,
  "description": "A beige dupatta in a quiet neutral that layers over almost anything in the wardrobe. Light, easy to drape, and the most repeatable stole in the collection.",
  "price": 2900,
  "compareAtPrice": 2900,
  "pricing": {
    "mrp": 2900,
    "sellingPrice": 2900
  },
  "media": {
    "primary": "/images/products/women/essentials/dupattas-stoles/PF-W-ESS-DUP-0006/primary.webp",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-INW-0001",
  "sku": "PFS-W-ESS-INW-0001",
  "name": "Nazakat Apricot Innerwear",
  "department": "women",
  "category": "essentials",
  "subcategory": "innerwear",
  "style": "innerwear",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A soft blush innerwear set with a smooth moulded cup and lace detailing at the hip, designed for comfortable all-day support. Cut to sit invisibly under fitted kurtas and everyday knitwear.",
  "price": 1425,
  "compareAtPrice": 1900,
  "pricing": {
    "mrp": 1900,
    "sellingPrice": 1425
  },
  "media": {
    "primary": "/images/products/women/essentials/innerwear/PF-W-ESS-INW-0001/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-INW-0002",
  "sku": "PFS-W-ESS-INW-0002",
  "name": "Sukoon Wheat Innerwear",
  "department": "women",
  "category": "essentials",
  "subcategory": "innerwear",
  "style": "innerwear",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A wheat-toned innerwear set in a skin-friendly neutral that disappears under light-coloured clothing. Wide, comfortable bands make it an easy daily choice.",
  "price": 1487,
  "compareAtPrice": 1750,
  "pricing": {
    "mrp": 1750,
    "sellingPrice": 1487
  },
  "media": {
    "primary": "/images/products/women/essentials/innerwear/PF-W-ESS-INW-0002/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-INW-0003",
  "sku": "PFS-W-ESS-INW-0003",
  "name": "Chhaya Pearl Innerwear",
  "department": "women",
  "category": "essentials",
  "subcategory": "innerwear",
  "style": "innerwear",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A pearl-white innerwear set with clean lines and a soft finish for everyday wear. The neutral shade is the practical default under whites and pastels.",
  "price": 1440,
  "compareAtPrice": 1600,
  "pricing": {
    "mrp": 1600,
    "sellingPrice": 1440
  },
  "media": {
    "primary": "/images/products/women/essentials/innerwear/PF-W-ESS-INW-0003/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-INW-0004",
  "sku": "PFS-W-ESS-INW-0004",
  "name": "Ruhi Apricot Innerwear",
  "department": "women",
  "category": "essentials",
  "subcategory": "innerwear",
  "style": "innerwear",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "An apricot innerwear set with delicate lace panelling and a comfortable, supportive fit. Pretty enough to feel like a treat, practical enough for a working week.",
  "price": 1679,
  "compareAtPrice": 2100,
  "pricing": {
    "mrp": 2100,
    "sellingPrice": 1679
  },
  "media": {
    "primary": "/images/products/women/essentials/innerwear/PF-W-ESS-INW-0004/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-INW-0005",
  "sku": "PFS-W-ESS-INW-0005",
  "name": "Maya Wheat Innerwear",
  "department": "women",
  "category": "essentials",
  "subcategory": "innerwear",
  "style": "innerwear",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A wheat innerwear set built around comfort — soft edges, gentle elastication and a fit that stays put through the day. A reliable restock piece for the everyday drawer.",
  "price": 1387,
  "compareAtPrice": 1850,
  "pricing": {
    "mrp": 1850,
    "sellingPrice": 1387
  },
  "media": {
    "primary": "/images/products/women/essentials/innerwear/PF-W-ESS-INW-0005/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-INW-0006",
  "sku": "PFS-W-ESS-INW-0006",
  "name": "Lila Wine Innerwear",
  "department": "women",
  "category": "essentials",
  "subcategory": "innerwear",
  "style": "innerwear",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A wine innerwear set in a deeper, more considered colour for wearing under darker clothing. The richer tone gives the everyday drawer a little more range.",
  "price": 1955,
  "compareAtPrice": 2300,
  "pricing": {
    "mrp": 2300,
    "sellingPrice": 1955
  },
  "media": {
    "primary": "/images/products/women/essentials/innerwear/PF-W-ESS-INW-0006/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-INW-0007",
  "sku": "PFS-W-ESS-INW-0007",
  "name": "Aaram Saffron Innerwear",
  "department": "women",
  "category": "essentials",
  "subcategory": "innerwear",
  "style": "innerwear",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "everyday-atelier"
  ],
  "description": "A saffron innerwear set in a warm, cheerful shade with a soft, easy fit. Comfortable enough for long days and light enough for warm weather.",
  "price": 1700,
  "compareAtPrice": 1700,
  "pricing": {
    "mrp": 1700,
    "sellingPrice": 1700
  },
  "media": {
    "primary": "/images/products/women/essentials/innerwear/PF-W-ESS-INW-0007/primary.avif",
    "gallery": []
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-KS-0001",
  "sku": "PFS-W-ESS-KS-0001",
  "name": "Kavya Sand Kurti Ensemble",
  "department": "women",
  "category": "essentials",
  "subcategory": "kurtis-suits",
  "style": "kurti-suit",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "handloom-stories",
    "everyday-atelier"
  ],
  "description": "A sand-toned kurti ensemble with a straight, flattering cut and a coordinated lower half for effortless everyday dressing. Neutral enough for the office, easy to lift with a dupatta for a family function.",
  "price": 3675,
  "compareAtPrice": 4900,
  "pricing": {
    "mrp": 4900,
    "sellingPrice": 3675
  },
  "media": {
    "primary": "/images/products/women/essentials/kurtis-suits/PF-W-ESS-KS-0001/primary.avif",
    "gallery": [
      "/images/products/women/essentials/kurtis-suits/PF-W-ESS-KS-0001/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-KS-0002",
  "sku": "PFS-W-ESS-KS-0002",
  "name": "Roshni Peach Kurti Ensemble",
  "department": "women",
  "category": "essentials",
  "subcategory": "kurtis-suits",
  "style": "kurti-suit",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "handloom-stories",
    "everyday-atelier"
  ],
  "description": "A peach kurti ensemble in a soft, warm shade with a clean neckline and comfortable fall. It works for a daytime gathering as readily as for a weekday at work.",
  "price": 3740,
  "compareAtPrice": 4400,
  "pricing": {
    "mrp": 4400,
    "sellingPrice": 3740
  },
  "media": {
    "primary": "/images/products/women/essentials/kurtis-suits/PF-W-ESS-KS-0002/primary.avif",
    "gallery": [
      "/images/products/women/essentials/kurtis-suits/PF-W-ESS-KS-0002/01.webp",
      "/images/products/women/essentials/kurtis-suits/PF-W-ESS-KS-0002/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-KS-0003",
  "sku": "PFS-W-ESS-KS-0003",
  "name": "Meher Umber Kurti Ensemble",
  "department": "women",
  "category": "essentials",
  "subcategory": "kurtis-suits",
  "style": "kurti-suit",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "handloom-stories",
    "everyday-atelier"
  ],
  "description": "An umber kurti ensemble with a deeper colour and a more structured line, suited to evening wear and festive workdays. Layer a stole over it and the outfit is complete.",
  "price": 4479,
  "compareAtPrice": 5600,
  "pricing": {
    "mrp": 5600,
    "sellingPrice": 4479
  },
  "media": {
    "primary": "/images/products/women/essentials/kurtis-suits/PF-W-ESS-KS-0003/primary.avif",
    "gallery": [
      "/images/products/women/essentials/kurtis-suits/PF-W-ESS-KS-0003/01.avif",
      "/images/products/women/essentials/kurtis-suits/PF-W-ESS-KS-0003/02.webp"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-ESS-KS-0004",
  "sku": "PFS-W-ESS-KS-0004",
  "name": "Aditi Sand Kurti Ensemble",
  "department": "women",
  "category": "essentials",
  "subcategory": "kurtis-suits",
  "style": "kurti-suit",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "handloom-stories",
    "everyday-atelier"
  ],
  "isNew": true,
  "description": "A sand kurti ensemble with an all-over printed character and a relaxed, wearable silhouette. One of the easiest sets in the wardrobe to reach for on a busy morning.",
  "price": 4680,
  "compareAtPrice": 5200,
  "pricing": {
    "mrp": 5200,
    "sellingPrice": 4680
  },
  "media": {
    "primary": "/images/products/women/essentials/kurtis-suits/PF-W-ESS-KS-0004/primary.avif",
    "gallery": [
      "/images/products/women/essentials/kurtis-suits/PF-W-ESS-KS-0004/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-LEH-BRI-0002",
  "sku": "PFS-W-LEH-BRI-0002",
  "name": "Maharani Vermilion Bridal Lehenga",
  "department": "women",
  "category": "lehengas",
  "subcategory": "bridal",
  "style": "bridal",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit",
    "bridal-trousseau"
  ],
  "occasion": [
    "Wedding"
  ],
  "description": "A vermilion bridal lehenga with ornate work across the skirt and bodice and a matched dupatta for the head drape. Cut with a generous flare, it delivers the ceremonial volume the wedding day demands.",
  "price": 70875,
  "compareAtPrice": 94500,
  "pricing": {
    "mrp": 94500,
    "sellingPrice": 70875
  },
  "media": {
    "primary": "/images/products/women/lehengas/bridal/PF-W-LEH-BRI-0002/primary.avif",
    "gallery": [
      "/images/products/women/lehengas/bridal/PF-W-LEH-BRI-0002/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-LEH-DES-0001",
  "sku": "PFS-W-LEH-DES-0001",
  "name": "Shringar Mocha Designer Lehenga",
  "department": "women",
  "category": "lehengas",
  "subcategory": "designer",
  "style": "designer",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit"
  ],
  "description": "A mocha designer lehenga with a contemporary, muted palette and a clean, flowing skirt. It suits a bride's sister or a close friend who wants presence without competing with the bridal party.",
  "price": 30800,
  "compareAtPrice": 38500,
  "pricing": {
    "mrp": 38500,
    "sellingPrice": 30800
  },
  "media": {
    "primary": "/images/products/women/lehengas/designer/PF-W-LEH-DES-0001/primary.avif",
    "gallery": [
      "/images/products/women/lehengas/designer/PF-W-LEH-DES-0001/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-LEH-DES-0002",
  "sku": "PFS-W-LEH-DES-0002",
  "name": "Zarina Rust Designer Lehenga",
  "department": "women",
  "category": "lehengas",
  "subcategory": "designer",
  "style": "designer",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit"
  ],
  "description": "A rust designer lehenga with warm colouring and detailed work concentrated at the bodice and hem. A distinctive choice for a sangeet or an engagement.",
  "price": 35700,
  "compareAtPrice": 42000,
  "pricing": {
    "mrp": 42000,
    "sellingPrice": 35700
  },
  "media": {
    "primary": "/images/products/women/lehengas/designer/PF-W-LEH-DES-0002/primary.avif",
    "gallery": [
      "/images/products/women/lehengas/designer/PF-W-LEH-DES-0002/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-LEH-DES-0003",
  "sku": "PFS-W-LEH-DES-0003",
  "name": "Nayika Vermilion Designer Lehenga",
  "department": "women",
  "category": "lehengas",
  "subcategory": "designer",
  "style": "designer",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "festive-edit"
  ],
  "description": "A vermilion designer lehenga with a bold colour statement and a strong festive silhouette. Made for the guest who is happy to be photographed all evening.",
  "price": 34875,
  "compareAtPrice": 46500,
  "pricing": {
    "mrp": 46500,
    "sellingPrice": 34875
  },
  "media": {
    "primary": "/images/products/women/lehengas/designer/PF-W-LEH-DES-0003/primary.avif",
    "gallery": [
      "/images/products/women/lehengas/designer/PF-W-LEH-DES-0003/01.avif",
      "/images/products/women/lehengas/designer/PF-W-LEH-DES-0003/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-LEH-PTY-0001",
  "sku": "PFS-W-LEH-PTY-0001",
  "name": "Roop Apricot Party Lehenga",
  "department": "women",
  "category": "lehengas",
  "subcategory": "party",
  "style": "party",
  "gender": "Women",
  "fabric": "Chiffon",
  "collections": [
    "festive-edit"
  ],
  "description": "An apricot party lehenga with a lighter build and a soft, moving skirt made for a full evening on the floor. Easy to carry, and dressed up or down by the choice of jewellery.",
  "price": 19875,
  "compareAtPrice": 26500,
  "pricing": {
    "mrp": 26500,
    "sellingPrice": 19875
  },
  "media": {
    "primary": "/images/products/women/lehengas/party/PF-W-LEH-PTY-0001/primary.avif",
    "gallery": [
      "/images/products/women/lehengas/party/PF-W-LEH-PTY-0001/01.webp",
      "/images/products/women/lehengas/party/PF-W-LEH-PTY-0001/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-LEH-PTY-0002",
  "sku": "PFS-W-LEH-PTY-0002",
  "name": "Jhankar Wine Party Lehenga",
  "department": "women",
  "category": "lehengas",
  "subcategory": "party",
  "style": "party",
  "gender": "Women",
  "fabric": "Chiffon",
  "collections": [
    "festive-edit"
  ],
  "description": "A wine party lehenga with a deep evening colour and a sparkle that reads well under indoor lighting. Ideal for a cocktail night or a reception as a guest.",
  "price": 25415,
  "compareAtPrice": 29900,
  "pricing": {
    "mrp": 29900,
    "sellingPrice": 25415
  },
  "media": {
    "primary": "/images/products/women/lehengas/party/PF-W-LEH-PTY-0002/primary.avif",
    "gallery": [
      "/images/products/women/lehengas/party/PF-W-LEH-PTY-0002/01.webp",
      "/images/products/women/lehengas/party/PF-W-LEH-PTY-0002/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-LEH-PTY-0003",
  "sku": "PFS-W-LEH-PTY-0003",
  "name": "Gulzar Wine Party Lehenga",
  "department": "women",
  "category": "lehengas",
  "subcategory": "party",
  "style": "party",
  "gender": "Women",
  "fabric": "Chiffon",
  "collections": [
    "festive-edit"
  ],
  "isNew": true,
  "description": "A wine party lehenga in a more relaxed, everyday-festive cut for house functions and smaller celebrations. Comfortable enough to wear for hours, festive enough to feel like an occasion.",
  "price": 22050,
  "compareAtPrice": 24500,
  "pricing": {
    "mrp": 24500,
    "sellingPrice": 22050
  },
  "media": {
    "primary": "/images/products/women/lehengas/party/PF-W-LEH-PTY-0003/primary.avif",
    "gallery": [
      "/images/products/women/lehengas/party/PF-W-LEH-PTY-0003/01.avif",
      "/images/products/women/lehengas/party/PF-W-LEH-PTY-0003/02.webp"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-BAN-0001",
  "sku": "PFS-W-SAR-BAN-0001",
  "name": "Mumtaz Sand Banarasi Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "banarasi",
  "style": "banarasi",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "handloom-stories",
    "festive-edit"
  ],
  "description": "A sand-and-maroon Banarasi saree with a broad ornamental border and a densely patterned pallu in the classic Banarasi idiom. The lustrous surface catches light across the drape, making it a natural choice for weddings and festive evenings.",
  "price": 13875,
  "compareAtPrice": 18500,
  "pricing": {
    "mrp": 18500,
    "sellingPrice": 13875
  },
  "media": {
    "primary": "/images/products/women/sarees/banarasi/PF-W-SAR-BAN-0001/primary.avif",
    "gallery": [
      "/images/products/women/sarees/banarasi/PF-W-SAR-BAN-0001/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-BAN-0002",
  "sku": "PFS-W-SAR-BAN-0002",
  "name": "Anarkali Sienna Banarasi Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "banarasi",
  "style": "banarasi",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "handloom-stories",
    "festive-edit"
  ],
  "description": "A sienna Banarasi saree with warm, glowing colour and traditional motif work running through the body and border. It holds a crisp drape and pairs beautifully with gold-finish jewellery.",
  "price": 14365,
  "compareAtPrice": 16900,
  "pricing": {
    "mrp": 16900,
    "sellingPrice": 14365
  },
  "media": {
    "primary": "/images/products/women/sarees/banarasi/PF-W-SAR-BAN-0002/primary.avif",
    "gallery": [
      "/images/products/women/sarees/banarasi/PF-W-SAR-BAN-0002/01.avif",
      "/images/products/women/sarees/banarasi/PF-W-SAR-BAN-0002/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-BAN-0003",
  "sku": "PFS-W-SAR-BAN-0003",
  "name": "Begum Wine Banarasi Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "banarasi",
  "style": "banarasi",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "handloom-stories",
    "festive-edit"
  ],
  "description": "A wine Banarasi saree with a rich, saturated ground and an ornate border that gives the drape real ceremonial weight. A wardrobe anchor for weddings and family celebrations.",
  "price": 19350,
  "compareAtPrice": 21500,
  "pricing": {
    "mrp": 21500,
    "sellingPrice": 19350
  },
  "media": {
    "primary": "/images/products/women/sarees/banarasi/PF-W-SAR-BAN-0003/primary.avif",
    "gallery": [
      "/images/products/women/sarees/banarasi/PF-W-SAR-BAN-0003/01.avif",
      "/images/products/women/sarees/banarasi/PF-W-SAR-BAN-0003/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-COT-0001",
  "sku": "PFS-W-SAR-COT-0001",
  "name": "Vasanti Copper Cotton Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "cotton",
  "style": "cotton",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "heritage-weaves",
    "handloom-stories"
  ],
  "description": "A copper-olive cotton saree with a light, breathable drape and a fine border, styled here with a contrast printed blouse. Comfortable enough for a working day and smart enough for a daytime gathering.",
  "price": 2925,
  "compareAtPrice": 3900,
  "pricing": {
    "mrp": 3900,
    "sellingPrice": 2925
  },
  "media": {
    "primary": "/images/products/women/sarees/cotton/PF-W-SAR-COT-0001/primary.avif",
    "gallery": [
      "/images/products/women/sarees/cotton/PF-W-SAR-COT-0001/01.avif",
      "/images/products/women/sarees/cotton/PF-W-SAR-COT-0001/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-COT-0002",
  "sku": "PFS-W-SAR-COT-0002",
  "name": "Dhara Rust Cotton Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "cotton",
  "style": "cotton",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "heritage-weaves",
    "handloom-stories"
  ],
  "description": "A rust cotton saree in a warm earthy shade that suits handloom-leaning styling. Easy to drape, easy to maintain, and a dependable choice for the everyday saree wardrobe.",
  "price": 2890,
  "compareAtPrice": 3400,
  "pricing": {
    "mrp": 3400,
    "sellingPrice": 2890
  },
  "media": {
    "primary": "/images/products/women/sarees/cotton/PF-W-SAR-COT-0002/primary.avif",
    "gallery": [
      "/images/products/women/sarees/cotton/PF-W-SAR-COT-0002/01.avif",
      "/images/products/women/sarees/cotton/PF-W-SAR-COT-0002/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-COT-0003",
  "sku": "PFS-W-SAR-COT-0003",
  "name": "Usha Terracotta Cotton Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "cotton",
  "style": "cotton",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "heritage-weaves",
    "handloom-stories"
  ],
  "description": "A terracotta cotton saree with a soft fall and a quiet border, made for regular wear rather than occasion dressing. Pairs equally well with a printed blouse or a plain one.",
  "price": 2699,
  "compareAtPrice": 3600,
  "pricing": {
    "mrp": 3600,
    "sellingPrice": 2699
  },
  "media": {
    "primary": "/images/products/women/sarees/cotton/PF-W-SAR-COT-0003/primary.avif",
    "gallery": [
      "/images/products/women/sarees/cotton/PF-W-SAR-COT-0003/01.avif",
      "/images/products/women/sarees/cotton/PF-W-SAR-COT-0003/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-COT-0004",
  "sku": "PFS-W-SAR-COT-0004",
  "name": "Kiran Apricot Cotton Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "cotton",
  "style": "cotton",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "heritage-weaves",
    "handloom-stories"
  ],
  "description": "An apricot cotton saree in a light, warm-weather shade that stays comfortable through a long day. A practical, cheerful addition to the daily saree rotation.",
  "price": 3200,
  "compareAtPrice": 3200,
  "pricing": {
    "mrp": 3200,
    "sellingPrice": 3200
  },
  "media": {
    "primary": "/images/products/women/sarees/cotton/PF-W-SAR-COT-0004/primary.avif",
    "gallery": [
      "/images/products/women/sarees/cotton/PF-W-SAR-COT-0004/01.avif",
      "/images/products/women/sarees/cotton/PF-W-SAR-COT-0004/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-COT-0005",
  "sku": "PFS-W-SAR-COT-0005",
  "name": "Rituparna Peach Cotton Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "cotton",
  "style": "cotton",
  "gender": "Women",
  "fabric": "Cotton",
  "collections": [
    "heritage-weaves",
    "handloom-stories"
  ],
  "isNew": true,
  "description": "A peach cotton saree with a slightly finer finish and a neat border, sitting at the dressier end of the cotton edit. Good for a festive workday or an afternoon function.",
  "price": 3690,
  "compareAtPrice": 4100,
  "pricing": {
    "mrp": 4100,
    "sellingPrice": 3690
  },
  "media": {
    "primary": "/images/products/women/sarees/cotton/PF-W-SAR-COT-0005/primary.avif",
    "gallery": [
      "/images/products/women/sarees/cotton/PF-W-SAR-COT-0005/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-SIL-0001",
  "sku": "PFS-W-SAR-SIL-0001",
  "name": "Chandni Raspberry Silk Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "silk",
  "style": "silk",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "festive-edit"
  ],
  "description": "A raspberry silk saree with a lustrous surface and a defined contrast border that frames the drape. The colour holds its depth in photographs, making it a strong choice for weddings and festive evenings.",
  "price": 16875,
  "compareAtPrice": 22500,
  "pricing": {
    "mrp": 22500,
    "sellingPrice": 16875
  },
  "media": {
    "primary": "/images/products/women/sarees/silk/PF-W-SAR-SIL-0001/primary.avif",
    "gallery": [
      "/images/products/women/sarees/silk/PF-W-SAR-SIL-0001/01.avif",
      "/images/products/women/sarees/silk/PF-W-SAR-SIL-0001/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-SIL-0002",
  "sku": "PFS-W-SAR-SIL-0002",
  "name": "Noor Sienna Silk Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "silk",
  "style": "silk",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "festive-edit"
  ],
  "description": "A sienna silk saree with a warm glow and a traditional border, drawn from the house's classic silk edit. It drapes with weight and structure and suits gold-toned jewellery.",
  "price": 16575,
  "compareAtPrice": 19500,
  "pricing": {
    "mrp": 19500,
    "sellingPrice": 16575
  },
  "media": {
    "primary": "/images/products/women/sarees/silk/PF-W-SAR-SIL-0002/primary.avif",
    "gallery": [
      "/images/products/women/sarees/silk/PF-W-SAR-SIL-0002/01.avif",
      "/images/products/women/sarees/silk/PF-W-SAR-SIL-0002/02.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-SIL-0003",
  "sku": "PFS-W-SAR-SIL-0003",
  "name": "Saanjh Wine Silk Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "silk",
  "style": "silk",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "festive-edit"
  ],
  "description": "A wine silk saree with a deep, formal colour and a rich sheen across the body. Made for evening functions where the drape itself is the statement.",
  "price": 19599,
  "compareAtPrice": 24500,
  "pricing": {
    "mrp": 24500,
    "sellingPrice": 19599
  },
  "media": {
    "primary": "/images/products/women/sarees/silk/PF-W-SAR-SIL-0003/primary.avif",
    "gallery": [
      "/images/products/women/sarees/silk/PF-W-SAR-SIL-0003/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-SIL-0004",
  "sku": "PFS-W-SAR-SIL-0004",
  "name": "Mehfil Wine Silk Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "silk",
  "style": "silk",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "festive-edit"
  ],
  "description": "A wine silk saree with more ornate borderwork, positioned as an occasion piece within the silk collection. It pairs naturally with a full jewellery set for a wedding function.",
  "price": 24210,
  "compareAtPrice": 26900,
  "pricing": {
    "mrp": 26900,
    "sellingPrice": 24210
  },
  "media": {
    "primary": "/images/products/women/sarees/silk/PF-W-SAR-SIL-0004/primary.avif",
    "gallery": [
      "/images/products/women/sarees/silk/PF-W-SAR-SIL-0004/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-SIL-0005",
  "sku": "PFS-W-SAR-SIL-0005",
  "name": "Aabha Umber Silk Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "silk",
  "style": "silk",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "festive-edit"
  ],
  "description": "An umber silk saree with an earthy, grounded tone and a smooth, weighted drape. A versatile silk for festive days that do not call for bright colour.",
  "price": 15375,
  "compareAtPrice": 20500,
  "pricing": {
    "mrp": 20500,
    "sellingPrice": 15375
  },
  "media": {
    "primary": "/images/products/women/sarees/silk/PF-W-SAR-SIL-0005/primary.avif",
    "gallery": [
      "/images/products/women/sarees/silk/PF-W-SAR-SIL-0005/01.avif"
    ]
  },
  "status": "draft"
  },
{
  "id": "PF-W-SAR-SIL-0006",
  "sku": "PFS-W-SAR-SIL-0006",
  "name": "Yamini Wine Silk Saree",
  "department": "women",
  "category": "sarees",
  "subcategory": "silk",
  "style": "silk",
  "gender": "Women",
  "fabric": "Silk",
  "collections": [
    "heritage-weaves",
    "festive-edit"
  ],
  "isNew": true,
  "description": "A wine silk saree with a soft lustre and a clean border, cut for elegant, uncomplicated occasion dressing. It works across weddings, receptions and family celebrations alike.",
  "price": 19975,
  "compareAtPrice": 23500,
  "pricing": {
    "mrp": 23500,
    "sellingPrice": 19975
  },
  "media": {
    "primary": "/images/products/women/sarees/silk/PF-W-SAR-SIL-0006/primary.avif",
    "gallery": [
      "/images/products/women/sarees/silk/PF-W-SAR-SIL-0006/01.avif",
      "/images/products/women/sarees/silk/PF-W-SAR-SIL-0006/02.avif"
    ]
  },
  "status": "draft"
  }
];

export default products;
