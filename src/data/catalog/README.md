# PRATIKSHYA FASHON — Frontend Catalogue Data

The single source of truth for the storefront product catalogue, generated
from the organised product media under `public/images/products/`.

```
public/images/products/          →  src/data/catalog/products.js
public/images/hero/              →  src/data/catalog/hero.js
public/images/collections/       →  src/data/catalog/collections.js
folder structure + house labels  →  src/data/catalog/taxonomy.js
```

## Files

| File            | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `products.js`   | One record per product-media folder. The folder id is the permanent product id; `department` / `category` / `subcategory` are read straight from the media path; every product carries a curated, customer-facing name grounded in its own imagery. Commercial fields (`pricing.mrp`, `pricing.sellingPrice`, `description`) are **entered by an administrator** through Admin → Product Management, never generated — the generator preserves whatever has been completed and leaves the rest empty. Completed records still stay `draft` until a human takes them through the review workflow. |
| `taxonomy.js`   | The four departments (Women, Bridal, Men, Kids) with their categories and subcategories, exactly as the media folders define them, plus the routable listing paths (`/women`, `/women/sarees`, `/women/sarees/silk`, …) and their navigation scopes. |
| `hero.js`        | The five landing slideshow slides — image, copy and CTA. The slideshow consumes this data; nothing is hardcoded in the JSX. |
| `collections.js` | Editorial (`festive-edit`, `heritage-weaves`, `new-arrival`) and fabric (`chiffon`, `cotton`, `linen`, `silk`) storytelling plates. These are editorial assets, **not** product records. |

## How the storefront consumes it

* The product register (`catalogRepository`) merges `products.js` into the
  shared `pratikshya_products` register — workspace edits always win for the
  same id, and the register never loses a catalogue record.
* `src/data/products/index.js` normalises every record into the one
  storefront product shape and hydrates the authored `media.primary` /
  `media.gallery` plates that `ProductCard`, `ProductGrid`,
  `ProductGallery` and the product-detail route render.
* Listings, search and filters run the same query engine over that shape —
  only `published` records reach customers; drafts stay in the workspace
  until a human completes them.
* Swapping this static data for a future API response happens at the
  repository boundary — no component changes.

## Regeneration

The data files are generated from the media folders:

```bash
node scripts/generate-catalog.mjs
```

Regenerate rather than hand-editing media paths. Validation:

```bash
npm run audit:frontend-catalog   # folder ↔ record ↔ file integrity
npm run qa:storefront-catalog    # server-renders the storefront surfaces
```
