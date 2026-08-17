# Phase 3F — Storefront Media Integrity + Admin Media/Product Deletion

**Status: COMPLETE — 477/477 tests, all audits PASS, golden data unchanged.**

---

## 1. Investigation — what was actually found

The phase brief described symptoms ("men's sections show bangle images",
"multiple sarees display the same photograph"). Per the instructions the
cause was **traced, not assumed**. Every rendered image source of all 99
published products was resolved through the same code path the ProductCard
uses (`getProductCardMedia` → `getProductMediaSet`) and cross-referenced
against the media register and the physical `public/library/` tree.

### Root cause of every reported symptom

| Symptom | Actual mechanism found | Classification |
|---|---|---|
| The same image appears for multiple Product IDs | 40 published products have **no canonical photograph of their own** and render the **authored legacy fallback tier**: shared house plates (`house-heritage-textile.jpg` → 12 products, `house-bridal-bangles.jpg` → 5 products, `house-minimal-hero.jpg` → 2 products, …) and external Pexels demo plates (`pexels-photo-20790059` → 5 lehengas, `pexels-photo-3998093` → 3 men's kurtas, …) | **Shared authored fallback — by design of earlier phases, not a cross-product ownership bug** |
| Men's sections show women's-jewellery-looking imagery | 5 jewellery products (pf-054/055/058/059/060) fall back to `house-bridal-bangles.jpg`; menswear pf-077 (Nehru Jacket) falls back to the `fabric-embroidered` textile plate. These are **marketing/house plates**, not another product's canonical photograph | Authored fallback, category-plausible but shared |
| One product's image becoming another product's primary | **Zero cases.** `audit:rendered-product-media`, `audit:storefront-coverage` and the new Phase 3F audits all confirm 0 cross-product canonical renders at baseline | Not present |
| Landing sections with hardcoded product photos | **Zero hardcoded product image paths** in customer-facing components. Homepage rails (`NewArrivals`, `SareeEditCarousel`) resolve through the canonical catalogue; hero/banner/editorial seams resolve marketing artwork through `mediaResolver` / `resolvePlacementImage` | Not present (HeroCarousel names its five managed `hero00x.avif` plates only for its runtime integrity check — explicitly allowlisted) |
| Duplicate register rows | 4 shared legacy house-seed register rows (`house-heritage-textile.jpg`, `house-editorial-hero.jpg`, `pexels-photo-28943474.jpeg`, demo video `forbiggerblazes.mp4`) are registered under multiple pf-00x products from the original seed data | Legacy seed plates — reported for review, never treated as canonical |

**Conclusion:** the storefront had **no active cross-product or cross-category
canonical mapping bug** at the start of Phase 3F. The remaining risk was
*architectural*: nothing prevented a future assignment from creating exactly
the violations described (a bangle photograph assigned to a men's product, a
marketing plate silently becoming product media). Phase 3F closes those doors
and adds the missing admin deletion lifecycle.

### Source distribution (unchanged before → after)

| Source | Count | Meaning |
|---|---|---|
| CANONICAL | 59 | product-owned `/library/` photograph, register-verified |
| MARKETING (authored fallback) | 40 | house/Pexels plate — explicit, shared-by-design fallback tier |
| SAFE_PLACEHOLDER | 0 | — |
| Cross-product renders | **0** | — |
| Category mismatches | **0** | — |

---

## 2. Affected components (audited surfaces)

Product surfaces (must resolve through `getProductMediaSet`): `ProductCard`,
`ProductPreview`, `ProductGallery`, `ProductPurchasePanel`,
`ProductRecommendations`, `ProductGrid`, `NewArrivals`, `SareeEditCarousel`,
`CatalogueBrowser`, `ExploreProductGrid`, `AiProductCard`,
`CatalogueListing`, `CategoryPage`, `Explore`, `SearchResults`, `Shop`,
`Wishlist`, `ProductDetail`. **All clean — no changes required.**

Marketing surfaces (may use authored artwork via `mediaResolver`):
`HeroCarousel`, `SaleBanner`, `CelebrationEdit`, `BrideGroomEdit`,
`ShopByCategory`, `CategoryShortcuts`, `AtelierDesign`. **All clean.**

---

## 3. Affected products

- **0 products had a confirmed bad canonical mapping.** Per Part 19
  ("fix ONLY confirmed bad mappings") **no product/media assignment was
  changed**. Assigning different imagery to the 40 authored-fallback
  products would have required guessing, which the brief forbids.
- The 40 authored-fallback products (22 sarees/lehengas/bridal pieces,
  5 jewellery, 5 menswear, 4 kurtis/dupattas variants, …) are listed
  verbatim by `npm run audit:rendered-image-integrity` with
  `SOURCE = MARKETING`.

## 4. Before / after image ownership

**Identical.** No ownership was transferred, no product IDs changed, no
prices changed, no Kids mappings changed, no media file was touched.
Golden data after implementation:

| Metric | Expected | Actual |
|---|---|---|
| Products | 168 | **168** |
| Media | 205 | **205** |
| Published | 99 | **99** |
| Storefront | 99 | **99** |
| Marketing media | 10 | **10** |
| Confirmed Kids (KID-001…021) | 21 | **21** |
| Cross-product primaries | 0 | **0** |
| Category mismatches | 0 | **0** |
| Hardcoded product-image violations | 0 | **0** |
| Unsafe deletions | 0 | **0** |

## 5. Marketing vs product media distinction

- **Register level** — already explicit: `MEDIA_SCOPES.PRODUCT` /
  `MARKETING` / `UNASSIGNED`. Marketing→product assignment was already
  refused by `mediaOwnershipService`.
- **New in 3F** — *identity level*: `mediaCategorySafety.isMarketingFileName`
  recognises house/hero artwork by name (`house-*`, `hero00x`). A NEW
  assignment of a house plate as product media is now refused at the
  ownership door even if the record sits in the unassigned library.
  Legacy product-scoped house-seed rows keep their existing ownership
  (nothing mutated) and are reported by the audits for review.

## 6. Duplicate primary findings

- Canonical (`/library/` family-named photography): **0 duplicates** —
  59 canonical primaries, 59 distinct owners.
- Legacy house-seed register rows: 4 files registered under multiple
  pf-00x products (see §1). Reported as review warnings by
  `audit:product-image-integrity`; explicitly classified shared
  non-product artwork, not canonical duplicates.

## 7. Cross-category findings

**0 at baseline, and now structurally impossible for new assignments.**
`src/services/media/mediaCategorySafety.js` defines the deterministic
family map (filename → allowed categories):

| Family | Allowed categories |
|---|---|
| `women-innerwear-*` | innerwear |
| `women-saree-*` | sarees, bridal-couture |
| `women-lehenga-*` | lehengas, bridal-couture |
| `women-bridal-*` | bridal-couture |
| `jewellery-bangle-*` | bangles, jewellery |
| `jewellery-earring-*` / `jewellery-anklet-*` | jewellery |
| `men-*` | menswear |
| `kids-*` | kidswear (plus the stricter KID-001…021 identity lock) |

The gate is enforced inside `validateOwnershipChange` in the ONE canonical
ownership service — assignment/transfer time only, **never during
storefront rendering** (no per-render cost; Part 22 honoured). Files
outside the naming convention are not judged (no guessing).

## 8. Media mapping corrections

**None required.** No confirmed bad canonical mapping existed. Nothing was
reassigned, per Part 18/19 ("DO NOT automatically modify products until
the mapping is proven").

## 9. Admin delete/archive behaviour

"Delete" is now a two-tier lifecycle decision surfaced in Admin Media
Management (`/admin/products/:id/media` → *Retire or delete this product*
panel, `ProductLifecycleActions`):

- **Archive (default retirement)** — canonical `archiveProduct` workflow
  command. Product leaves the storefront; orders, reviews, history and
  media all preserved. Restore returns it to DRAFT.
- **Permanent delete (narrow door)** — new
  `src/services/productDeletionService.js`:
  1. Super Admin principal resolved from the register (employees refused)
  2. product must be a DRAFT that was never published
  3. dependency check: 0 orders, 0 reviews, 0 inventory records/movements,
     0 workflow/business lifecycle events, not a confirmed Kids identity
  4. media-ownership summary shown to the admin
  5. explicit confirmation: the admin must re-type the Product ID
  6. owned media is **released to the unassigned library through the
     canonical `unassignMediaFromProduct`** — never physically deleted,
     never reassigned
  7. one `PRODUCT_DELETED` activity event
- The repository primitive `removeProductRecord` refuses to remove a
  PUBLISHED product regardless of caller, so the storefront count can
  never change through deletion.

The Media Management library additionally gained the Part 16 queues:
**Orphaned** (product-scoped media whose owner no longer exists) and
**Archived Product** (owner retired), each with badges and a
*View product* action; existing queues (Unassigned / Product / Marketing /
Duplicates / Needs Review) unchanged.

## 10. Dependency rules

| Product state | Available action |
|---|---|
| Published | Unpublish / Archive only |
| Has orders / reviews / inventory / workflow history | Archive only (each blocker listed verbatim in the UI) |
| Confirmed Kids identity | Never deletable |
| Archived | Restore to draft |
| Untouched dependency-free draft | Permanent delete after re-typed-ID confirmation |

## 11. Tests

`tests/productImageIntegrity.test.js` — 18 tests covering all Part 21
requirements: one primary per product; cross-product primary refusal;
front/back/side stay one product; marketing→product refusal (scope AND
house-name identity); category-mismatch rejection at the ownership door;
men's/bangles, innerwear/sarees, jewellery/textile isolation (rule +
runtime verification of every published product); safe fallbacks that never
belong to another product; homepage rails / Explore / category pages / PDP
on the canonical catalogue; ownership stability across reads; archived
products invisible; permanent-delete dependency rules; media never
physically deleted. Suite total: **477 pass, 0 fail**.

## 12. Audits

New: `npm run audit:product-image-integrity` (static + register + rendered,
0 dangerous violations; the 4 legacy house-seed duplicates are review
warnings, not ignored paths) and `npm run audit:rendered-image-integrity`
(per-product rendered source table with MARKETING / SAFE_PLACEHOLDER
classification; 0 cross-product renders, 0 category mismatches).

All 18 pre-existing audit commands plus `qa:render` re-run: **PASS**. The
only audit-script change is one comment-level pattern fix in none — the
`audit:canonical-lifecycle` classification list was left untouched; the
deletion service routes media release through the canonical ownership
service precisely so no new whitelist entry was needed.

## 13. Golden data comparison

See §4 — zero unexplained differences.

## 14. Remaining unresolved media

- 61 uncatalogued media groups (mostly innerwear/jewellery photography
  awaiting new product records) remain in the library — untouched, visible
  in `audit:catalog-completeness` as before.
- 4 legacy house-seed multi-owner register rows (§1) remain as review
  warnings.

## 15. Images that require human assignment

**Unresolved — human mapping required** for the 40 authored-fallback
products listed by `npm run audit:rendered-image-integrity`
(`SOURCE = MARKETING`). Each needs its own photography (or a deliberate
human decision to assign an existing unowned library group). Assigning
imagery programmatically would violate the "DO NOT GUESS" rule; until then
they safely render their explicit authored fallback, which the audits now
permanently distinguish from canonical product photography.
