# PRATIKSHYA FASHON — Taxonomy & Collections

Companion datasets: **`data/taxonomy.json`** (10 categories, 38 subcategories) and **`data/collections.json`** (11 collections). IDs and slugs are verbatim; **no alternative slugs were created.**

Single source: `src/services/taxonomyRepository.js` (storage key `pratikshya_taxonomy`, event `pratikshya-taxonomy-changed`). `src/data/products/taxonomy.js` is a thin facade over it plus the facet vocabularies.

---

## 1. Categories (10, all `ACTIVE`)

| id / slug | Name | Sort | Featured | Products | Subcategories |
| --- | --- | --- | --- | --- | --- |
| `sarees` | Sarees | 10 | ✔ | 29 | 6 |
| `lehengas` | Lehengas | 20 | ✔ | 12 | 4 |
| `bridal-couture` | Bridal Couture | 30 | ✔ | 12 | 5 |
| `kurtis-and-suits` | Kurtis + Suits | 40 | ✖ | 4 | 2 |
| `innerwear` | Innerwear | 50 | ✖ | 19 | 3 |
| `dupattas` | Dupattas + Stoles | 60 | ✖ | 3 | 2 |
| `bangles` | Bangles | 70 | ✔ | 9 | 3 |
| `jewellery` | Jewellery | 80 | ✔ | 24 | 5 |
| `menswear` | Men's Wear | 90 | ✔ | 14 | 4 |
| `kidswear` | Kids Wear | 100 | ✔ | 42 | 4 |

`id === slug` for every category. Sort order is in tens so rows can be inserted between.

**Category record:** `{ id, name, slug, eyebrow, description, image, bannerMediaId, status, sortOrder, featured, seoTitle, seoDescription }` — `productCount` is derived, never stored.

**Status enum:** `TAXONOMY_STATUS = { DRAFT, ACTIVE, ARCHIVED }`.

> **The rule everyone forgets:** a category that is not `ACTIVE` removes **all** of its products from every customer surface, no matter what those products' own statuses say. Archiving `sarees` hides 29 published products instantly. Surface this in the admin UI and enforce it server-side.

---

## 2. Subcategories (38)

**ID convention:** `<categoryId>-<slug>` (e.g. `sarees-pato-saree`). Slugs are unique **within** a category.

| Category | Subcategory slugs |
| --- | --- |
| sarees (6) | `pato-saree`, `silk-saree`, `banarasi-saree`, `cotton-saree`, `printed-saree`, `designer-saree` |
| lehengas (4) | `bridal-lehenga`, `wedding-lehenga`, `designer-lehenga`, `party-lehenga` |
| bridal-couture (5) | `bridal-saree`, `reception-wear`, `sangeet-wear`, `mehendi-wear`, `trousseau` |
| kurtis-and-suits (2) | `kurti`, `suit-set` |
| innerwear (3) | `petticoat`, `blouse`, `shapewear` |
| dupattas (2) | `dupatta`, `stole` |
| bangles (3) | `bridal-bangles`, `gold-finish-bangles`, `kada-cuffs` |
| jewellery (5) | `jewellery-set`, `necklaces`, `earrings`, `maang-tikka`, `rings` |
| menswear (4) | `sherwani`, `kurta`, `kurta-pajama`, `nehru-jacket` |
| kidswear (4) | `girls-dress`, `girls-casual-set`, `boys-casual-set`, `boys-t-shirt-and-shorts-set` |

**Record:** `{ id, categoryId, name, slug, description, image, status, sortOrder }` + derived `productCount`.

> **Known modelling debt:** `product.subcategory` stores the **display label** (`"Girls Dress"`), not the subcategory id (`kidswear-girls-dress`). Filters and counts therefore match on the label. `BACKEND DECISION REQUIRED` — migrate to a proper FK (a data migration touching all 168 products, deliberately **not** performed here), or keep the label and add a resolver. Until then the backend must accept **both** the label and the id when filtering.

---

## 3. Collections (11, all `ACTIVE`)

| id / slug | Name | Type | Rule | Featured | Sort | Resolved products |
| --- | --- | --- | --- | --- | --- | --- |
| `new-arrivals` | New Arrivals | RULE_BASED | `{flag: "isNew"}` | ✔ | 5 | 13 |
| `featured` | Featured | RULE_BASED | `{flag: "isFeatured"}` | ✔ | 8 | 13 |
| `heritage-weaves` | Heritage Weaves | MANUAL | — | ✔ | 10 | 13 |
| `festive-edit` | Festive Edit | MANUAL | — | ✔ | 20 | 17 |
| `handloom-stories` | Handloom Stories | MANUAL | — | ✖ | 30 | 8 |
| `bridal-trousseau` | Bridal Trousseau | MANUAL | — | ✔ | 40 | 24 |
| `everyday-atelier` | Everyday Atelier | MANUAL | — | ✖ | 50 | 20 |
| `groom-atelier` | Groom Atelier | MANUAL | — | ✖ | 60 | 8 |
| `little-heirlooms` | Little Heirlooms | MANUAL | — | ✖ | 70 | 42 |
| `silk` | Silk | RULE_BASED | `{fabricIncludes: "silk"}` | ✖ | 80 | 27 |
| `wedding` | Wedding | RULE_BASED | `{occasion: "Wedding"}` | ✔ | 90 | 34 |

**Enums**
```js
COLLECTION_STATUS = { DRAFT, SCHEDULED, ACTIVE, PAUSED, EXPIRED, ARCHIVED }
COLLECTION_TYPES  = { MANUAL, RULE_BASED }
```

**Record:** `{ id, name, slug, eyebrow, description, image, heroMediaId, thumbnailMediaId, type, status, displayStatus, featured, sortOrder, startDate, endDate, rule, explicitProductIds[] }`.

### 3.1 `status` vs `displayStatus`
`status` is what an operator set. `displayStatus` is **derived on every read** from `status` + `startDate`/`endDate`: a future start reads `SCHEDULED`, a past end reads `EXPIRED`. On persist, `SCHEDULED` and `EXPIRED` are normalised back to `ACTIVE` — the dates, not the stored word, are the truth. **Recompute `displayStatus` server-side on every read; never persist it.**

### 3.2 Membership resolution — the exact algorithm

```
members(collection) =
      explicit  : productIds recorded against the collection
    ∪ label     : products whose `collection` or `collections[]` contains the collection NAME
    ∪ rule      : (RULE_BASED only) products matching
                    rule.flag           → product[flag] is truthy      (isNew, isFeatured, …)
                    rule.occasion       → product.occasion[] contains the value
                    rule.fabricIncludes → product.fabric contains the substring (case-insensitive)
```

Then the **customer** view intersects with the storefront visibility gate.

**Every collection in this repository currently has `explicitProductIds: []`.** All 7 `MANUAL` collections resolve entirely through the **label-match** arm — `little-heirlooms` gets its 42 products because those products carry `collection: "Little Heirlooms"`. A backend that implements only the explicit join table will serve **11 empty collections**.

Both arms must survive migration. Recommended: keep the label arm working, and backfill `collection_product` rows from the current resolution so the join table becomes authoritative later without a visible change.

### 3.3 Membership is many-to-many
A product may sit in several collections (`collections[]`, `collectionsForProduct()`, `isProductInCollection()`). The resolved counts above sum to more than 168 — that is correct, not double counting.

---

## 4. `taxonomyRepository` public API (35 methods)

**Categories** — `all`, `categories`, `activeCategories`, `categoryOptions`, `findCategory`, `getCategoryLabel`, `createCategory`, `updateCategory`, `archiveCategory`, `restoreCategory`
**Subcategories** — `subcategories`, `activeSubcategories`, `subcategoryOptionsFor`, `findSubcategory`, `createSubcategory`, `updateSubcategory`, `archiveSubcategory`, `restoreSubcategory`
**Collections** — `collections`, `activeCollections`, `collectionOptions`, `findCollection`, `getCollectionLabel`, `createCollection`, `updateCollection`, `activateCollection`, `pauseCollection`, `archiveCollection`, `restoreCollection`, `assignProductsToCollection`, `addProductsToCollection`, `removeProductsFromCollection`
**Derived** — `productCounts`, `collectionsForProduct`, `isProductInCollection`, `metrics`

`normalizeTaxonomyRecord()` is the one canonical projection — the taxonomy equivalent of `normaliseProductRecord()`.

---

## 5. Routing

`categoryRoutes` → `/category/:slug` · `collectionRoutes` → `/collection/:slug` · `navigationScopes` / `hasNavigationScope` decide which nav entries exist · `src/services/taxonomyRouting.js` resolves a path back to a taxonomy record.

Navigation shorthand is mapped by `CATEGORY_FILTER_ALIASES` / `resolveCategoryFilter()`. **Do not mint alternative slugs to make a nav link work — extend the alias map.** A second slug for one category is how duplicate product cards and split SEO appear.

---

## 6. Facet vocabularies (`src/data/products/taxonomy.js`)

Fixed lists used by filter UIs and by `buildFacets()`:
`categories`, `categoryLabels`, `genders`, `fabrics`, `materials`, `occasions`, `collections`, `collectionLabels`, `colorSwatches`, `colors`, `sizes`, `availabilityOptions`, `ratingOptions`, `priceBands` (5, via `getPriceBand`), `sortOptions`, `defaultSort`, `filterFacets`, `filterKeys`.

These are **presentation vocabularies**, not tables. They must stay in sync with the values actually present on products; a backend-driven facet list should be generated from the same data or the filter chips will show empty options.

---

## 7. Activity actions

`CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_ARCHIVED`, `CATEGORY_RESTORED`, `SUBCATEGORY_CREATED`, `SUBCATEGORY_UPDATED`, `SUBCATEGORY_ARCHIVED`, `COLLECTION_CREATED`, `COLLECTION_UPDATED`, `COLLECTION_ACTIVATED`, `COLLECTION_PAUSED`, `COLLECTION_ARCHIVED`, `COLLECTION_PRODUCTS_UPDATED` — all into the shared diary with `targetCategoryId` / `targetCollectionId` set.

---

## 8. Open items

| Item | Status |
| --- | --- |
| `product.subcategory` stored as a label, not an FK | `BACKEND DECISION REQUIRED` |
| Whether `collection_product` should fully replace label matching | `BACKEND DECISION REQUIRED` (both must work at cutover) |
| Category deletion (only archive/restore exist) | `NOT DEFINED` — no delete path in the frontend |
| Reparenting a subcategory to another category | `NOT DEFINED` — the id embeds the category, so this is a create + archive today |
| Scheduled activation of collections (a job to flip `SCHEDULED → ACTIVE`) | `BACKEND DECISION REQUIRED` — today it is purely derived on read |
| Rule-based collections beyond `flag`/`occasion`/`fabricIncludes` | `NOT DEFINED` — no other rule key is implemented |
| Per-collection SEO fields | `NOT DEFINED` — categories have `seoTitle`/`seoDescription`, collections do not |
