# PRATIKSHYA FASHON — Product Catalogue Specification

Companion dataset: **`data/product-catalogue.json`** — all 168 products, IDs and fields verbatim.

---

## 1. Catalogue composition

| Slice | Count |
| --- | --- |
| Total products | **168** |
| `PUBLISHED` | 99 |
| `DRAFT` | 69 |
| `PENDING_REVIEW` | 0 |
| `ARCHIVED` | 0 |

By category:

| Category | Products |
| --- | --- |
| kidswear | 42 |
| sarees | 29 |
| jewellery | 24 |
| innerwear | 19 |
| menswear | 14 |
| lehengas | 12 |
| bridal-couture | 12 |
| bangles | 9 |
| kurtis-and-suits | 4 |
| dupattas | 3 |

**The 99 published products are the 99 authored rows** in `src/data/products/catalogue.js`. The 69 drafts were produced by the media-reconciliation pipeline (`catalogueReconciliation`, `kidsProductFinalization`) from unmapped library media and are deliberately invisible to customers until a human publishes them.

**Do not "clean up" the drafts.** They are real pending work items with permanent IDs (`KID-001`…`KID-021` and the reconciliation drafts). Merging, renaming or deleting them destroys the review queue.

---

## 2. Product identity

### 2.1 Two ID families, both permanent

| Family | Pattern | Origin |
| --- | --- | --- |
| Authored storefront rows | `pf-001` … `pf-099` | positional: `pf-${index+1}` zero-padded to 3, assigned once and now permanent |
| Workflow products | `KID-001`, `MEN-001`, … | `nextStableProductId(categoryId, preferredNumber)` |
| Runtime-created | `pf-<base36 timestamp>` | `createProduct()` only |

`nextStableProductId()` is **deterministic**: it takes the category's prefix (`src/config/productIdPrefixes.js`), scans the entire register for taken IDs, honours a `preferredNumber` derived from the media group key when exactly one number is present, otherwise picks the lowest free integer. It is **never random and never derived from the product name.**

### 2.2 `id` vs `productId`
`productId` mirrors `id`. The mirror exists so the UI can display a stable "Product ID" that is visibly independent of the editable `name`. They never diverge.

### 2.3 Changing an ID
`changeProductId()` is the only path. It validates `^[A-Z0-9][A-Z0-9-]{1,14}$`, refuses a taken ID, writes `history` and logs `PRODUCT_RENAMED_ID`.
`BACKEND DECISION REQUIRED`: cascade policy — media ownership, inventory rows, collection membership and **historical order line references** all point at the old ID. Order lines are snapshots and arguably should keep the old value.

### 2.4 SKU and slug
- `sku` default `PF-#####` (positional), **unique**; required to publish. `skuTaken()`.
- `slug` default `slugify(name || id)`, **unique among non-archived**; `slugTaken()` / `suggestSlug()` produce a free variant.
- Kids drafts carry slugs like `kid-001` and SKUs like `KID-001-SKU`.

---

## 3. The canonical product record

`normaliseProductRecord()` is **the** projection. Every read passes through it, so a partial stored row is always widened to the full shape with the defaults below. A backend response that omits a field forces the frontend into a default — which is why the full shape must be returned.

### Identity
`id` · `productId` · `name` (`''`) · `slug` · `sku` · `brand` (`'Pratikshya Fashon'`) · `productType` (`'fashion'`) · `productCode` · `barcode` · `internalReference`

### Placement
`category` (`''`) · `subcategory` (`''`, **a label today, not an id**) · `gender` (`'Women'`)

### Content
`shortDescription` · `description` · `highlights[]` · `specifications{}` · `careInstructions[]` (a bare string is coerced to a 1-element array) · `deliveryInfo` · `returnInfo` · `returnPolicy{eligibility, window, notes}`

### Attributes
`fabric` · `material` · `primaryColor` · `secondaryColor` · `colors[]` · `patterns[]` · `work[]` · `occasion[]` · `sizes[]` · `unavailableColors[]` · `unavailableSizes[]` · `season` · `fit` · `length`

### Merchandising
`collection` (primary label; falls back to `collections[0]`) · `collections[]` · `tags[]` · `badges[]` · `isFeatured` · `isBestseller` · `isNew` · `isLimitedEdition` · `isTrending` · `flags{featured, bestseller, newArrival, limitedEdition, trending}`

**Flag aliasing is load-bearing:** `isNew ⇔ flags.newArrival`, `isFeatured ⇔ flags.featured`, etc. The `RULE_BASED` collections `new-arrivals` and `featured` filter on these.

### Pricing
`price` · `originalPrice` (only when `mrp > finalPrice`) · `compareAtPrice` · `currency` (`'INR'`) · `pricing{}` · `priceHistory[]` (≤ 24)

### Variants
`variants[]`, each `{id: "${productId}-var-NN", sku, color, size, priceOverride, stock, barcode, status: ACTIVE|INACTIVE, createdAt}`; `variantCount` is derived.

### Inventory snapshot
`stock` (0) · `availability` (`'in-stock'`) · `inventoryTracked` (false) · `lowStockThreshold` (5)

### SEO
`seo{title, description}`

### Publishing
`status` · `published` (= `status === 'PUBLISHED'`) · `review{state, submittedBy, submittedAt, reviewedBy, reviewedAt, rejectionReason}` · `reviewedAt` · `reviewFlags[]` · `assignedEmployeeId`

### Media claims
`mediaIds[]` · `primaryMediaId` · `galleryMediaIds[]` · legacy `image` · `hoverImage` · `additionalImages[]`

### Audit
`createdBy/At` · `updatedBy/At` · `publishedBy/At` · `history[]` (≤ 60)

---

## 4. Pricing engine — `computePricing()` (`src/utils/pricing.js`)

```
DISCOUNT_TYPES = none | percentage | fixed
taxMode        = INCLUSIVE | EXCLUSIVE          (default INCLUSIVE)
ALLOW_SELLING_ABOVE_MRP = false

discountAmount = percentage → sellingPrice * value / 100
                 fixed      → value
                 none       → 0
finalPrice     = max(0, roundINR(sellingPrice - discountAmount))
savings        = mrp > 0 ? max(0, mrp - finalPrice) : 0
effectiveDiscountPercent = mrp>0 && savings>0 ? round((savings/mrp)*100, 2) : 0
```

**Validation errors (all block publication):**
- `"MRP must be greater than zero."`
- `"Selling price must be greater than zero."`
- `"Selling price cannot be above MRP."`
- `"Percentage discount must be between 0 and 100."`
- `"Fixed discount cannot be negative."`
- `"Fixed discount cannot exceed the selling price."`
- `"GST rate must be between 0% and 100%."`
- `"Final price must never be negative."`

`toStorefrontPricing()` maps the engine onto the storefront fields: `price = finalPrice`; `originalPrice` present **only** when `mrp > finalPrice` (so no fake strike-through prices ever render).

**The backend must be the pricing authority and must produce identical numbers.** Every displayed price, discount badge, cart subtotal and order total derives from this function today.

---

## 5. Publish blockers — `getPublishIssues()`

Returns a de-duplicated array of human sentences. **Non-empty ⇒ `publishProduct()` and `approveProduct()` both refuse.**

| # | Condition | Message |
| --- | --- | --- |
| 1 | no `id`/`productId` | `Product ID is required.` |
| 2 | empty name | `Product name is required.` |
| 3 | placeholder name (`isPlaceholderProductName`) | `Product name must be real product information, not a placeholder.` |
| 4 | no SKU | `SKU is required.` |
| 5 | no category | `Category is required.` |
| 6 | `price ≤ 0` **and** `computed.finalPrice ≤ 0` | `Selling price must be greater than zero.` |
| 7 | no description and no short description | `A description is required.` |
| 8 | no authored image, no cover, no media-set primary | `At least one cover image is required before publishing.` |
| 9 | `mediaSet.ownershipConflicts.length` | `Media ownership must be resolved before publishing (N conflicts).` |
| 10 | no owned primary and no catalogue plate | `A primary image owned by this product is required before publishing.` |
| 11 | any blocking review flag | `Review flags must be resolved before publishing: <labels>.` |
| 12 | unresolved group conflicts on claimed/gallery media | `Grouping review must be resolved before publishing (<groupIds>).` |
| 13 | pricing engine errors | the messages from §4 |

Expose this as `GET /admin/products/{id}/publish-issues` — the review desks render the list live, before the button is pressed.

---

## 6. Review flags

Deterministic, computed, **not a second status system**. `blockingReviewFlags()` filters the blocking subset; `flagsSatisfiedByProduct()` decides which may be auto-cleared; `clearReviewFlags()` records `PRODUCT_REVIEW_FLAGS_CLEARED`.

**Blocking (9):** `NAME_REVIEW_REQUIRED`, `PRICE_REVIEW_REQUIRED`, `TAXONOMY_REVIEW_REQUIRED`, `GROUP_REVIEW_REQUIRED`, `VARIANT_REVIEW_REQUIRED`, `NEEDS_MEDIA`, `MEDIA_OWNERSHIP_REVIEW`, `CONFLICT_UNRESOLVED`, `KIDS_MIGRATION_REVIEW`
**Informational (3):** `CONFLICT_REVIEW_LATER`, `MEDIA_OWNERSHIP_MOVED`, `MEDIA_UNASSIGNED`

Example from the data: `KID-001` currently carries `["CONFLICT_UNRESOLVED"]` and therefore cannot publish.

---

## 7. Storefront projection & visibility

`toStorefrontProduct()` (`src/data/products/index.js`) narrows the admin record to what a customer may see, decorates it with resolved media, and computes `discountPercent`, `isOnSale`, `href`.

`getLiveStorefrontProducts()` → `queryCatalogue()` applies the gate:

```
status !== DRAFT  AND  status !== ARCHIVED  AND  published !== false
AND taxonomy status of product.category === ACTIVE
```

**Reproduce all four clauses.** The fourth is the easy one to miss: archiving a category silently removes its products from the storefront while their own status still reads `PUBLISHED`.

### Sorting (`resolveSort`, `sortProducts`)
`recommended` (default), `newest`, `price-asc`, `price-desc`, `discount`, `name-asc`, `popularity`, `rating`.
Aliases: `price-low → price-asc`, `price-high → price-desc`, `name`/`az` → `name-asc`.
Ties break on product id so pagination is stable.

### Facets (`filterFacets`, `buildFacets`, `countFacet`, `countBand`)
12 facets: `category`, `subcategory`, `gender`, `price` (5 bands via `getPriceBand`), `size`, `color`, `fabric`, `material`, `occasion`, `collection`, `rating`, `availability`.
Semantics: **AND across facets, OR within a facet.** Counts are computed against the other applied filters, so a facet never shows a count that would yield zero results.

### Search (`matchesSearch`, `normaliseSearchText`)
Case- and diacritic-normalised substring over: name, brand, category label, subcategory, fabric, material, colors, occasion, tags, collection, sku.

### Category aliases
`CATEGORY_FILTER_ALIASES` / `resolveCategoryFilter()` map navigation shorthand onto real category ids. **Do not create alternative taxonomy slugs** — extend the alias map instead.

---

## 8. Recommendations

`src/data/products/recommendations.js`:
- `getRelatedProducts(product)` — same category/subcategory affinity.
- `getCompleteTheLook(product)` — complementary categories.
- `getRecommendedProducts()` — homepage/general.
- `getProductRecommendations(product)` — the PDP bundle.
- `getCartRecommendations(cartItems)` — bag-aware.

All obey the visibility gate and never return the source product. `src/services/customer/personalization.js` (`deriveStyleSignals`, `getPersonalizedProducts`) layers signals from recently-viewed and wishlist. `BACKEND DECISION REQUIRED`: whether recommendations stay deterministic server-side or move to a model.

---

## 9. Explore stream

`EXPLORE_PAGE_SIZE = 20` · `EXPLORE_PROMO_AFTER` · `EXPLORE_EDITORIAL_AFTER`.
`buildExploreStream()` interleaves product cards with promo and editorial tiles at fixed offsets. `paginateExplore(products, page, pageSize)` slices it. **This is the only paginated surface in the application.**
Auditors: `compareExploreCoverage()`, `inspectExploreMedia()`, `unpublishedKidsIds()`.

---

## 10. Catalogue read pipeline

Every `catalogRepository` read runs this cached chain before returning:

1. `healRead()` — widen and repair stored rows.
2. `syncKidswearRegister()` — keep the 21 confirmed Kids identities intact.
3. `syncProductDraftRecords()` — keep reconciliation drafts in step with the media register.
4. `syncCatalogueReconciliation()` — versioned via `pratikshya_catalogue_reconciliation_version`.
5. `syncCanonicalMediaAssignment()` — reassert canonical media ownership.

**Backend implication:** these are **migrations/repair jobs, not per-request work.** Run them as one-time migrations plus scheduled integrity checks; do **not** run a reconciliation pass on every `GET /products`. Their *outputs* are already baked into `data/product-catalogue.json`, so the migration can seed from that file.

---

## 11. Public API of `catalogRepository` (the functions a backend must cover)

Reads: `all`, `find`, `findBySlug`, `skuTaken`, `slugTaken`, `suggestSlug`, `getPublishIssues`, `catalogMetrics`
Writes: `upsert`, `createProduct`, `createDraftProduct`, `updateProduct`, `updateDraft`, `assignToEmployee`, `changeProductId`, `submitForReview`, `approveProduct`, `rejectProduct`, `publishProduct`, `unpublishProduct`, `archiveProduct`, `restoreProduct`, `updateStatus` (legacy), `duplicateProduct`, `bulkUpdate`

Every write returns `{ ok, product }` or `{ ok: false, error | errors }`, stamps `updatedBy/At`, appends to `history`, and records an activity entry. **Preserve all three side effects.**
