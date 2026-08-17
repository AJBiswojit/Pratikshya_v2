# PRATIKSHYA FASHON — Media ↔ Product Mapping Specification

Companion datasets: **`data/media-product-mapping.json`** (205 media records) and **`data/product-media-groups.json`** (129 filename groups + 168 product media sets).

This is the most rule-dense area of the system and the one most likely to be broken by a well-meaning backend. Read §2 and §5 before writing any code.

---

## 1. The model

```
Product ──1:N──▶ Media                      ownership = media.productId (the ONLY truth)
Product ──1:1──▶ ProductMediaSet            { primary, front, side, back, detail, gallery[], hover }
Media   ──N:1──▶ MediaGroup (filename)      groupKey = filename base minus the view suffix
MediaGroup ─────▶ Human decision register   SAME_PRODUCT | SEPARATE_PRODUCTS | REVIEW_LATER
```

**One image ≠ one product.** A product is a *set* of views. Two photographs that look alike are two photographs — never, by themselves, one product.

---

## 2. The five ownership rules

1. **`media.productId` is the only ownership truth.** Category, subcategory, folder, filename prefix, usage role and campaign never imply ownership.
2. **One owner per media.** Reassigning contested media requires an explicit confirm flag; without it the operation fails with `MEDIA_ALREADY_ASSIGNED`.
3. **Never another product's image.** `assembleProductMediaSet()` discards any item whose `productId` differs from the product being assembled and marks the set `CROSS_PRODUCT_REFERENCE`.
4. **`hoverImage` never confers ownership.** The authored `product.hoverImage` field is a legacy display hint only; `authoredOwnedPlates()` excludes it deliberately.
5. **Authored plates are a fallback, not a peer.** `product.image` / `additionalImages` enter the media set **only when the register owns nothing** for that product. A shared house/category/campaign plate must never join the gallery of a product that already owns library media.

---

## 3. The register — 205 media records

| Split | Counts |
| --- | --- |
| Type | `IMAGE` 202 · `VIDEO` 3 |
| Scope | `PRODUCT` 117 · `UNASSIGNED` 78 · `MARKETING` 10 |
| Status | `ACTIVE` 197 · `DRAFT` 4 · `PENDING_REVIEW` 2 · `REJECTED` 1 · `ARCHIVED` 1 |
| Product role | `COVER` 62 · `GALLERY` 43 · `DETAIL` 4 · `CLOSEUP` 2 · `LIFESTYLE` 2 · `MODEL` 2 · `PRODUCT_VIDEO` 1 · `SHOWCASE` 1 · *(none)* 88 |
| Mapping status | `MAPPED` 170 · `NEEDS_REVIEW` 6 · `UNMAPPED` 5 · *(none)* 24 |
| Owned (`productId` set) | **117**, across **65** distinct owning products |
| Orphan owners (productId pointing at a missing product) | **0** |

### Enums
```js
MEDIA_TYPES          = { IMAGE, VIDEO }
MEDIA_SCOPES         = { PRODUCT, MARKETING, UNASSIGNED }
MEDIA_STATUS         = { DRAFT, PENDING_REVIEW, ACTIVE, REJECTED, ARCHIVED }
PRODUCT_MEDIA_ROLES  = { COVER, GALLERY, DETAIL, LIFESTYLE, MODEL, CLOSEUP,
                         PRODUCT_VIDEO, SHOWCASE, DETAIL_VIDEO, LIFESTYLE_VIDEO }
MAPPING_STATUS       = { MAPPED, UNMAPPED, NEEDS_REVIEW }
DUPLICATE_STATUS     = { UNIQUE, DUPLICATE, POSSIBLE_DUPLICATE }
USAGE_ROLES          = { HERO, EDITORIAL, LOOKBOOK, CATEGORY_COVER, COLLECTION_COVER, SALE, CAMPAIGN, … }
```

### Immutable fields
`mediaRepository.update()` refuses to change `id`, `scope`, `productId`, `placement`, `createdAt`. It also rejects ephemeral blob URLs, so a browser preview can never be persisted as production media. **Keep both guards.**

### Cover uniqueness
At most one `role = COVER` per product. Promotion to `COVER` demotes the incumbent to `GALLERY` in the same write — implement as one transaction.

---

## 4. Filename convention and grouping

```
[department]-[category]-[style]-[number]-[view].webp
```
Examples: `kids-001.webp` (standalone), `sarees-silk-banarasi-004-front.webp`, `…-004-back.webp`.

**`groupKey` = the basename with the view suffix removed.** Recognised view suffixes (longest match first, from `mediaNaming` / `mediaGroups`):

```
left-side-detail · right-side-detail · front-detail · front-close · multiple-front
left-side · right-side · close-up · closeup
front · back · side · left · right · close · detail · multiple
```

Grouping is **pure deterministic string parsing**. Visual similarity, colour histograms, embeddings and "these look like the same dress" are **never** inputs.

### Group census
| Metric | Value |
| --- | --- |
| Filename groups | **129** |
| Multi-view groups (2+ files) | 46 |
| Standalone groups (1 file) | 90 |

> Note: 46 + 90 = 136 > 129 because a few group keys contain files that are counted in both views of the report (e.g. duplicated filenames across seeded and ingested records — see `forbiggerblazes`, which has 3 records under one key owned by two different products). Those are exactly the rows a human must adjudicate.

### The identity law
**Different `groupKey` ⇒ different product.** Two groups become one product **only** when a human writes a `SAME_PRODUCT` decision into the register. Automatic merging is forbidden — this rule is what keeps 42 near-identical kidswear photographs from collapsing into 6 products.

---

## 5. `getProductMediaSet()` — the resolution algorithm

Reimplement this exactly; it drives every product card, gallery and hover in the application.

```
1. index  = media grouped by productId
2. owned  = index[productId] filtered by isProductOwnedMedia(item, productId)
3. if owned is empty:
       owned = authoredOwnedPlates(product)      # product.image + additionalImages ONLY
                                                 # (never hoverImage)
4. claims, conflicts = resolveProductMediaClaims(product, productId)
       # product.mediaIds / primaryMediaId / galleryMediaIds
       # consistent claims join `owned`; contested claims go to `conflicts`
5. return assembleProductMediaSet(productId, owned, product, conflicts)
```

### `assembleProductMediaSet()`

```
drop any item whose productId differs      → crossed = true
de-duplicate by media identity
sort by primaryRank, then media identity:
      rank 0 : role === COVER
      rank 1 : view === "front"
      rank 2 : view classifies to the "front" bucket
      rank 10+ : view order score

front   = first view "front"  ||  first role COVER
back    = first view "back"
side    = first view "side"   ||  first of {left-side, right-side, left, right}
detail  = first of {detail, close, closeup, close-up, front-close, front-detail,
                    left-side-detail, right-side-detail}
primary = first role COVER || front || owned[0]
hover   = pickHover(owned, primary)
hasAlternate = hover exists AND hover !== primary
status  = crossed          → CROSS_PRODUCT_REFERENCE
          hasAlternate     → OK
          otherwise        → NO_ALTERNATE
```

If nothing is owned, the set is empty with `status = NO_ALTERNATE` (or `CROSS_PRODUCT_REFERENCE` when a cross-product item was dropped), and the product cannot publish.

### `PRODUCT_MEDIA_STATUS`
| Status | Meaning | Current count |
| --- | --- | --- |
| `OK` | primary + a genuinely different hover view | 42 |
| `NO_ALTERNATE` | exactly one usable view; the card must not swap | 105 |
| `NEEDS_REVIEW` | ownership claims or group decisions are unresolved | 21 |
| `CROSS_PRODUCT_REFERENCE` | a foreign product's media was referenced and dropped | **0** |

`CROSS_PRODUCT_REFERENCE` must stay at 0 in production. A non-zero count is a data-integrity alarm.

---

## 6. Hover behaviour

`HOVER_VIEW_PRIORITY` (first match wins, skipping the primary):

```
back → side → left-side → right-side → left → right
     → detail → close → closeup → close-up
     → front-close → front-detail → left-side-detail → right-side-detail
```

If no prioritised view differs from the primary, `pickHover()` falls back to *any* other owned item; if there is none, **`hover === primary` and `hasAlternate === false`, and the card must not animate a swap.**

The brief's three cases, confirmed against the implementation:

| Product owns | Hover result |
| --- | --- |
| Front + Back | **Back** |
| Front + Side | **Side** |
| Front only | **No hover swap** (`hover === primary`, `hasAlternate === false`) |

**Never substitute another product's image to manufacture a hover.** 105 of 168 products legitimately have no alternate; that is the correct state, not a bug to paper over.

---

## 7. The human decision register — `productMediaGroups`

Storage `pratikshya_media_groups`, event `pratikshya-media-groups-changed`. **0 records in the repository** — it is written only by operators at runtime.

```js
GROUP_DECISIONS = { SAME_PRODUCT, SEPARATE_PRODUCTS, REVIEW_LATER }
GROUP_STATUS    = { PENDING, CONFIRMED, SPLIT, ARCHIVED }
GROUP_SOURCES   = { FILENAME, MANUAL, REVIEW_FLAG }
```

API: `getAllGroups`, `getGroupById`, `createGroup`, `updateGroup`, `addMediaToGroup`, `removeMediaFromGroup`, `mergeGroups`, `splitGroup`, `setGroupDecision`, `setGroupProduct`, `unresolvedGroupConflictsFor`, `resetGroups`.

**Publication rule:** `unresolvedGroupConflictsFor(mediaIds)` returns groups with no decision or `REVIEW_LATER` touching the product's media. A non-empty result **blocks publication** with `Grouping review must be resolved before publishing (<groupIds>).`

Activities: `PRODUCT_GROUP_CREATED`, `PRODUCT_GROUP_UPDATED`, `PRODUCT_GROUP_MERGED`, `PRODUCT_GROUP_SPLIT`, `PRODUCT_GROUP_DECIDED`.

---

## 8. Assignment, transfer, unassignment

### `validateMediaAssignment(mediaId, targetProductId)`
```
media missing                          → { ok:false, error: "Media not found." }
media.productId empty                  → { ok:true, media }
media.productId === target             → { ok:true, media, alreadyOwned:true }
otherwise                              → { ok:false, error: "MEDIA_ALREADY_ASSIGNED",
                                            ownerProductId, ownerProductName, ownerProductStatus }
```
`MEDIA_ALREADY_ASSIGNED` is the **only machine-readable error code in the entire codebase** — the UI renders the owner's name and offers a transfer. Keep the code and the three owner fields.

### `transferMediaOwnership(mediaId, targetProductId, actor, { confirm })`
The one door for reassignment. Requires `confirm: true`, moves ownership, **strips the previous owner's stale authored references**, and logs `PRODUCT_MEDIA_TRANSFERRED`. Nothing is silent.

### `unassignProductMedia(mediaId, actor)`
Clears `productId`, returns the record to `UNASSIGNED`, logs `PRODUCT_MEDIA_UNASSIGNED`.

### Other write paths
`setPrimaryMedia()` → `MEDIA_COVER_CHANGED`; reorder → `MEDIA_REORDERED`; `updateMediaViewLabel()` sets the `view`; status changes → `MEDIA_SUBMITTED_FOR_REVIEW` / `MEDIA_APPROVED` / `MEDIA_REJECTED`.

---

## 9. Kids identities — 21 confirmed, all separate

`src/services/kidsProductIdentity.js` + `kidsProductFinalization.js`.

| | |
| --- | --- |
| Files | `kids-001.webp` … `kids-021.webp` |
| Product IDs | `KID-001` … `KID-021` |
| Group keys | `kids-001` … `kids-021` |
| Decision | **`SEPARATE_PRODUCT` for every one** |

Each Kids product owns exactly its own plate. `kidsMediaOwnershipIssues(product)` reports any deviation; `kidsMediaFileForProductId()` / `kidsProductIdForFile()` are the bijection. **Merge attempts are refused** — the whole module exists because 21 similar children's outfits were at risk of being collapsed into a handful of products.

Extra Kids-specific gates (`getKidsPublishBlockers`, `canPublishKidsProduct`): correct plate ownership, non-foreign name (`kidsNameLooksForeign`), `category === "kidswear"`, valid kidswear subcategory (`kidsSubcategoryLooksForeign`), valid inventory (`kidsInventoryValid`), hover state (`kidsHoverState`).

**Nothing in the Kids module publishes automatically. Ever.** (Module docstring, and enforced.)

---

## 10. Resolvers — where media reaches the customer

`src/services/media/mediaResolver.js` is the only distribution layer:

`resolveProductCover`, `resolveProductGallery`, `decorateProductWithMedia`, `decorateProductsWithMedia`, `resolveCategoryCover`, `resolveCollectionCover`, `resolveThemeImage`, `resolveHomepageHeroMedia`, `resolveHeroSlideImage(s)`, `resolveHeroImageIds`, `resolveEditorialFrame`, `resolveSaleBackdrop`, `resolveFestiveCampaignImage`, `selectNewArrivalProducts`, `rankNewArrivalProducts`, `selectSareeEditProducts`, `selectBrideGroomLooks`, `isBrideWeddingProduct`, `isGroomWeddingProduct`, `resolveAiMirrorImage`, `resolveAiShoppingImage`, `isAiMirrorSafeMedia`, `productMediaTier`, `buildProductLibraryIndex`, `selectMedia`, `resolveMedia`, `resolveMediaSource`, `compareMedia`, `FALLBACK_REASONS`.

**Homepage reservation order matters:** hero plates are reserved first (`resolveHeroImageIds`), then the editorial, category and sale seams exclude those ids so no plate appears twice on one page. Preserve the ordering if the homepage becomes a composed endpoint.

**AI Mirror eligibility** — allowed: `sarees, lehengas, bridal-couture, kurtis-and-suits, menswear, kidswear`; excluded: `jewellery, bangles, dupattas, innerwear`. Plus `isAiMirrorSafeMedia()` per plate.

---

## 11. Upload rules

| Type | Extensions | MIME | Max size |
| --- | --- | --- | --- |
| IMAGE | `.jpg .jpeg .png .webp` | `image/jpeg`, `image/png`, `image/webp` | **10 MB** |
| VIDEO | `.mp4 .webm` | `video/mp4`, `video/webm` | **100 MB** |

Mirrored in settings section `media`: `maximumImageSizeMb 10`, `maximumVideoSizeMb 100`, `allowedImageFormats "jpg,jpeg,png,webp"`, `allowedVideoFormats "mp4,webm"`.

Canned rejection reasons (`REJECTION_REASONS`, 5): image quality/lighting · wrong product or colorway · format/aspect ratio · resolution/angle · duplicate asset.

Today **nothing is uploaded anywhere** — `UPLOAD_NOTICE_COPY` says files are previewed in the browser session only. `BACKEND DECISION REQUIRED`: object storage, CDN URL scheme, thumbnail and poster generation, checksum computation, EXIF stripping, virus scanning, signed URLs for staff-only media.

---

## 12. Access control

`resolveMediaAccess({ admin, employee })` returns `{ canView, canUpload, canEdit, canDelete, canAssign, canManageMarketing, actorLabel }`.
Admin ⇒ full grant. No actor ⇒ no grant. Employee ⇒ per-permission: `media.view`, `media.upload`, `media.edit`, `media.delete`, `media.assign`, `media.manage`.

---

## 13. Audit and analysis modules (read-only)

`mediaAudit`, `mediaExposure`, `mediaMigration`, `mediaProductDiscovery`, `mediaValidation`, `mediaNaming`, `mediaPaths`, `productMediaSource`, `marketingMediaSource`, `ingestedMedia`, `mediaStore`.

`mediaExposure` is the important one: a media record counts as **exposed** only when a real customer surface actually resolves it. Anything mapped but never returned is reported as "mapped but unused" rather than silently hidden. Worth keeping as a backend health report.

Source datasets: `src/data/media/ingestedManifest.json` (8327 lines), `mediaMigrationManifest.json`, `mediaGroupsReport.json`, `ingestionReport.json`, `seedMedia.js`.

---

## 14. Integrity checks the backend should run continuously

| Check | Expected today |
| --- | --- |
| `media.productId` pointing at a missing product | **0** |
| Products with `> 1` `COVER` media | 0 |
| Media sets with `CROSS_PRODUCT_REFERENCE` | **0** |
| Media claimed by a product but owned by another (`ownershipConflicts`) | reported per product; blocks publish |
| Filename groups with no decision but multiple candidate owners | the `NEEDS_REVIEW` queue (21 sets) |
| Duplicate checksums | flagged `POSSIBLE_DUPLICATE` / `DUPLICATE`, not auto-merged |
| Published products with no owned primary | 0 (blocked by `getPublishIssues`) |
