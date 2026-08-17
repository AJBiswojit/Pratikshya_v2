# PRATIKSHYA FASHON — Backend Implementation Checklist

An ordered build plan. Each phase lists its dependencies, its work items, and **acceptance criteria that can be verified against the existing frontend and the existing test suite**.

Ground rule for the whole programme:

> **Replace the storage tier inside each service module. Keep every exported function signature and return shape identical. The component layer must not change.**

---

## Phase 0 — Decisions before any code

These block design; none is answered by the repository.

- [ ] **HTTP status code mapping** — the frontend defines none. Agree the table, write it back into `ERROR_AND_VALIDATION_SPEC.md`.
- [ ] **Auth transport** — cookie vs bearer, TTL, refresh, CSRF, CORS for the SPA origin.
- [ ] **Product status model** — persist 4 + derive 6 (recommended, matches the repo) vs persist 6.
- [ ] **Does approval stay coupled to publication?** Today `approveProduct()` publishes immediately.
- [ ] **Password policy** — customers ≥ 6 with no complexity vs employees ≥ 8 with complexity. Reconcile.
- [ ] **Pagination** — server-side paging for admin lists, or keep whole-list loads (168 products, 205 media).
- [ ] **Real-time transport** — polling, SSE or WebSocket to replace the six `pratikshya-*-changed` window events.
- [ ] **File storage** — bucket, CDN URL scheme, thumbnail/poster generation, checksum, EXIF stripping, signed URLs.
- [ ] **Payment provider** — the entire gateway contract; today it is a deterministic mock.
- [ ] **Money precision** — stay in whole rupees or move to minor units before payments go live.
- [ ] **Concurrency** — add a version column / ETag, or accept last-write-wins.
- [ ] **Idempotency** — keys for order placement and payment.
- [ ] **Retention** — activity log (client keeps 200), inventory movements (1000), transfers/reservations (300).
- [ ] **`product.subcategory`** — keep the label or migrate to an FK.
- [ ] **Guest → account merge** for cart and wishlist (undefined; defined only for orders and recently-viewed).

---

## Phase 1 — Foundation & reference data

**Depends on:** nothing.

- [ ] Schema for `role`, `permission`, `role_permission` — seed from `data/roles-permissions.json` (8 roles, 82 permissions).
- [ ] `setting` table — seed all 19 sections from `SETTINGS_DEFAULTS`, with the deep-merge-on-read behaviour.
- [ ] `activity` table — one shared diary, ~96 actions, the exact 11-field record shape.
- [ ] `hasPermission()` server-side with the **exact** evaluation order: no employee → deny; cannot sign in → deny; `SUPER_ADMIN` → allow; explicit → allow; family implication (`offers/attendance/leave/performance .manage`) → allow; else deny.
- [ ] The uniform result envelope in every handler.

**Acceptance**
- 8 roles and 82 permission keys match `data/roles-permissions.json` exactly.
- A `SUSPENDED` employee is denied every permission, including ones they explicitly hold.
- `SUPER_ADMIN` is allowed every permission regardless of stored rows.
- `GET /admin/settings` returns all 19 sections with the documented defaults; an unknown section returns `Unknown settings section`.

---

## Phase 2 — Taxonomy

**Depends on:** Phase 1.

- [ ] `category`, `subcategory`, `collection`, `collection_product`.
- [ ] Seed verbatim from `data/taxonomy.json` and `data/collections.json`.
- [ ] Implement membership resolution: **explicit ∪ label match ∪ rule**.
- [ ] Derive `displayStatus` from status + dates on every read; never persist `SCHEDULED`/`EXPIRED`.
- [ ] All 35 `taxonomyRepository` methods behind endpoints.
- [ ] Taxonomy activity actions (13).

**Acceptance**
- 10 categories, 38 subcategories, 11 collections with the exact ids, slugs and sort orders.
- Collection resolved counts match: new-arrivals 13, featured 13, heritage-weaves 13, festive-edit 17, handloom-stories 8, bridal-trousseau 24, everyday-atelier 20, groom-atelier 8, little-heirlooms 42, silk 27, wedding 34.
- Archiving a category removes its products from `GET /products` while their own `status` still reads `PUBLISHED`.
- No alternative slugs were created.

---

## Phase 3 — Media register

**Depends on:** Phase 2.

- [ ] `media` table + `product_media_group` (+ items).
- [ ] Seed 205 media records verbatim from `data/media-product-mapping.json`.
- [ ] Enforce: immutable `id`/`scope`/`productId`/`placement`/`createdAt`; one `COVER` per product with automatic demotion; ephemeral URLs rejected.
- [ ] Filename grouping — deterministic view-suffix parsing only.
- [ ] `getProductMediaSet()` exactly as specified (ownership filter, authored fallback only when nothing is owned, primaryRank sort, hover priority).
- [ ] `assignToProduct` / `transferMediaOwnership` / `unassignProductMedia` with the confirm flags and `MEDIA_ALREADY_ASSIGNED`.
- [ ] Group decision register with `SAME_PRODUCT | SEPARATE_PRODUCTS | REVIEW_LATER` and `unresolvedGroupConflictsFor()`.
- [ ] Upload rules (10 MB images, 100 MB video, allowed extensions and MIME types).

**Acceptance**
- 205 media; 117 owned across 65 products; **0 orphan owners**.
- Scope split PRODUCT 117 / UNASSIGNED 78 / MARKETING 10; status split ACTIVE 197 / DRAFT 4 / PENDING_REVIEW 2 / REJECTED 1 / ARCHIVED 1.
- 129 filename groups (46 multi-view, 90 standalone).
- Product media set statuses: **OK 42, NO_ALTERNATE 105, NEEDS_REVIEW 21, CROSS_PRODUCT_REFERENCE 0.**
- Front+Back ⇒ hover Back; Front+Side ⇒ hover Side; Front only ⇒ `hasAlternate === false`.
- Assigning already-owned media without confirm fails with `MEDIA_ALREADY_ASSIGNED` and the three owner fields.
- No automatic merge of two group keys is possible through any endpoint.

---

## Phase 4 — Product catalogue

**Depends on:** Phases 2–3.

- [ ] `product`, `product_variant`, `product_price_history`, `product_history`, `product_review_flag`.
- [ ] Seed 168 products verbatim from `data/product-catalogue.json` — **no ID regeneration, no renaming, no merging, no splitting.**
- [ ] Port `normaliseProductRecord()` as the single read projection.
- [ ] Port `computePricing()` exactly, including all 8 error messages and `ALLOW_SELLING_ABOVE_MRP = false`.
- [ ] Port `getPublishIssues()` — all 13 blocker classes.
- [ ] `nextStableProductId()` — deterministic, prefix-aware, `preferredNumber`-aware.
- [ ] Uniqueness: product id, sku, slug (non-archived).
- [ ] Visibility gate on every customer endpoint (all four clauses).
- [ ] Facets, sorts, aliases, search field list.
- [ ] Explore pagination at `EXPLORE_PAGE_SIZE = 20` with the promo/editorial interleave.
- [ ] Run the reconciliation pipeline **as a one-time migration**, not per request.

**Acceptance**
- 168 products; 99 PUBLISHED, 69 DRAFT; category spread kidswear 42 / sarees 29 / jewellery 24 / innerwear 19 / menswear 14 / lehengas 12 / bridal-couture 12 / bangles 9 / kurtis-and-suits 4 / dupattas 3.
- `GET /products` returns exactly the 99 published rows and **never** a DRAFT or ARCHIVED product, including by direct id.
- Every price, discount badge and strike-through matches the current UI to the rupee.
- `KID-001` cannot publish — it carries `CONFLICT_UNRESOLVED`.
- Facet counts match `buildFacets()` for the same filter combinations.

---

## Phase 5 — Product workflow

**Depends on:** Phase 4.

- [ ] Transitions: create draft → assign → edit → submit → approve/reject → publish/unpublish → archive/restore.
- [ ] Approve and publish blocked by `getPublishIssues()`; the errors array is returned.
- [ ] `employeeCanEditProduct()` — assignment **and** `products.manage`.
- [ ] The 30-field `EMPLOYEE_EDITABLE_FIELDS` whitelist.
- [ ] Review flags: 9 blocking, 3 informational; `clearReviewFlags`.
- [ ] Kids workflow: 21 identities, extra blockers, 9-item checklist, 6-stage derivation, no auto-publish, merges refused.
- [ ] Every transition writes an activity entry **and** the per-field `history`.

**Acceptance**
- An employee cannot edit a product assigned to someone else, even with `products.manage`.
- A write containing `status` or `sku` from an employee is dropped (or rejected, per the Phase 0 decision).
- Approving an incomplete product returns `{ ok: false, errors: [...] }` and changes nothing.
- Rejection returns the product to DRAFT with the reason and keeps the assignee.
- `kidsStageOf()` yields the 6-stage view from the 4 persisted statuses.
- 21 Kids products remain 21 — no merge path exists.

---

## Phase 6 — Inventory

**Depends on:** Phase 4.

- [ ] `inventory`, `inventory_location`, `inventory_movement`, `inventory_transfer`, `inventory_reservation`.
- [ ] `calculateStockStatus()` and the quantity invariants.
- [ ] All operations: receive, adjust, damage, return, inspect, threshold, locations, transfers.
- [ ] Reservations with a **15-minute** expiry + a scheduled release job.
- [ ] `getCustomerAvailability`, `validateCartItems`.
- [ ] Every write emits a movement row and an `INVENTORY_MOVEMENT` activity.

**Acceptance**
- `available = max(0, onHand − reserved − damaged)` always holds; negative stock is impossible (`This movement would make stock negative.`).
- An expired reservation is released and its stock becomes available again.
- Movements are append-only and reference the acting employee.

---

## Phase 7 — Offers

**Depends on:** Phases 2, 4.

- [ ] `offer` (+ `offer_redemption`).
- [ ] Migrated coupons `WELCOME10`, `FESTIVE15`, `BRIDAL20`.
- [ ] Code rule: letters/digits/hyphen, 2–24, unique, upper-cased.
- [ ] Status derived from dates.
- [ ] `validateOffer()` as **the single discount gate** with all 18 messages.

**Acceptance**
- No discount can be applied through any path other than `validateOffer()`.
- Usage limit and per-customer limit are enforced against the redemption ledger.
- An offer outside its window reports `This offer isn't open yet.` / `This offer has expired.`

---

## Phase 8 — Identity

**Depends on:** Phase 1.

- [ ] `customer`, `address`, `employee`, `admin` + **separate credential tables**.
- [ ] Real password hashing (argon2/bcrypt) — replace `mockCredentialFingerprint`.
- [ ] `toPublicEmployee` / `toPublicAdmin` stripping enforced at the serialisation boundary.
- [ ] `validateEmployeeDraft` with all 12 messages; `PF-<PREFIX>-#####` generation.
- [ ] Address rules: pincode/phone validation, exactly one default per customer.
- [ ] Session refresh so a permission change lands without re-login.

**Acceptance**
- No endpoint ever returns a password, hash or fingerprint.
- Suspending an employee revokes access on the **next request**, not the next login.
- Setting a default address demotes the previous one atomically.

---

## Phase 9 — Cart, wishlist, checkout

**Depends on:** Phases 4, 6, 7, 8.

- [ ] `cart`/`cart_item` (if server-side) and `wishlist_item`.
- [ ] Cart repair rules: drop dead products, clamp to stock, merge `(productId,color,size)`, drop lapsed coupons.
- [ ] Totals: `FREE_SHIPPING_THRESHOLD 5000`, `FLAT_SHIPPING_FEE 99`, express 199 (never free), `COD_FEE 49`.
- [ ] Reservation on checkout entry; confirm on order placement.

**Acceptance**
- Totals match `utils/pricing.js` and `utils/checkout.js` to the rupee for every delivery/payment combination.
- A coupon that lapses mid-session is removed and `couponLapsed` is surfaced.
- Wishlist count equals the number of distinct products.

---

## Phase 10 — Orders, returns, fulfilment

**Depends on:** Phase 9.

- [ ] `order`, `order_item`, `order_status_history`, `order_timeline`, `order_return`, `return_item`, `refund`, `fulfillment`, `shipment`.
- [ ] Port `normaliseOrder()` and `buildOrderRecord()` including the seeded 3-event timeline and status history.
- [ ] Enforce `ORDER_TRANSITIONS`; `forceTransition` audited separately.
- [ ] Cancellation windows (customer vs admin); returns from `DELIVERED` only.
- [ ] Return lifecycle with all 8 `can*` guards and the 4 vocabularies.
- [ ] Snapshot semantics: order items and customer/address snapshots are immutable.
- [ ] `notes.internal[]` never serialised to a customer endpoint.
- [ ] Guest order claiming by email.

**Acceptance**
- An invalid transition is refused; a forced one is logged distinctly.
- COD orders start `paymentStatus = PENDING`, others `PAID`.
- Renaming a product does not alter historical order lines.
- A customer cannot read another customer's order by id.

---

## Phase 11 — Payments

**Depends on:** Phase 10. **Blocked by the Phase 0 provider decision.**

- [ ] `payment` table with an idempotency key.
- [ ] Provider integration, webhook + signature verification, authorize/capture, refunds.
- [ ] Map provider states onto the 9 `ORDER_PAYMENT_STATUS` values and the 6 `REFUND_STATUS` values.
- [ ] Keep the 4 demo scenarios behind a flag for QA.

**Acceptance**
- A duplicate submit creates exactly one payment.
- A webhook replay is idempotent.
- Refund states drive `order.paymentStatus` consistently.

---

## Phase 12 — Workforce

**Depends on:** Phase 8.

- [ ] `attendance` (+ corrections), `leave_request`, `performance_review` (+ targets, achievements).
- [ ] Unique `(employeeId, date)` and `(employeeId, period)`.
- [ ] Attendance rules from settings; late/half-day/full-day computation.
- [ ] Leave overlap detection; approval writes through to attendance; cancellation reverses it.
- [ ] Permission families with their implications.

**Acceptance**
- A second check-in on the same day updates the same row.
- Approving overlapping leave is refused.
- Approved leave is reflected in the attendance calendar and reversed on cancellation.

---

## Phase 13 — Analytics & activity

**Depends on:** Phases 4, 6, 7, 10, 12.

- [ ] 17 analytics endpoints.
- [ ] Revenue rules: `isRevenueEligible` excludes failed payments; `orderRevenue = gross − completedRefunds`.
- [ ] `HIGH_VALUE_THRESHOLD`, `CUSTOMER_SEGMENTS`, `ANALYTICS_STATUS_FILTERS`.
- [ ] Activity log query + retention.

**Acceptance**
- Admin revenue figures reconcile with the order ledger under the same date range and filters.
- Every mutating endpoint in every phase has written an activity entry.

---

## Phase 14 — AI surfaces

**Depends on:** Phases 4, 8.

- [ ] AI Shopping proxy; AI Business proxy; AI Mirror products + history.
- [ ] Category eligibility (6 allowed, 4 excluded) and `isAiMirrorSafeMedia`.
- [ ] Provider, keys, rate limits, cost controls — `BACKEND DECISION REQUIRED`.

**Acceptance**
- No API key reaches the browser.
- AI-recommended products obey the visibility gate.
- AI Mirror never offers an excluded category.

---

## Phase 15 — Cutover

- [ ] Point each service module at the API behind a feature flag, module by module.
- [ ] Replace each `window` change event with the chosen real-time mechanism (or a refetch).
- [ ] Run `npm test` **unchanged** at every step.
- [ ] Run the read-only audits: `audit:explore`, `audit:homepage`, `audit:product-media`, `audit:media-product-discovery`, `audit:media-products`, `audit:catalog-completeness`, `audit:storefront-coverage`, `audit:storefront-images`, `audit:rendered-product-media`, `audit:product-repetition`, `audit:kids-products`, `audit:media`, `audit:hero-runtime`, `qa:render`.
- [ ] Delete the demo-only paths: `updateMockOrderStatus`, `updateMockReturnStatus`, `DEMO_SCENARIOS`, demo credential seeds, `mockCredentialFingerprint`.
- [ ] Remove `localStorage` fallbacks only after the corresponding endpoint is verified in production.

---

## Global acceptance — the nine integrity rules

| # | Rule | Verification |
| --- | --- | --- |
| 1 | Unique Product ID | uniqueness constraint + `changeProductId` pattern/collision test |
| 2 | Unique Media ID | PK + seed verification (205 distinct) |
| 3 | Unique media ownership | one `productId` per media; contested reassignment refused |
| 4 | No cross-product media | `CROSS_PRODUCT_REFERENCE` count stays **0** |
| 5 | Valid category/collection | FK + category-status gate |
| 6 | No duplicate active slug | partial unique index on non-archived |
| 7 | No random product media | `getProductMediaSet` uses owned media only; authored plates only as a fallback |
| 8 | No duplicate product cards | each surface returns distinct ids (`audit:product-repetition`) |
| 9 | No draft/archived leakage · no unauthorized employee edits | visibility gate + `employeeCanEditProduct` + field whitelist |

---

## Regression suite to keep green

`npm test` — 22 files, run **unchanged**. The highest-signal ones for a backend port:

`productWorkflow.test.js` · `kidsFinalization.test.js` · `mediaResolver` · `productMediaSet` · `mediaProductDiscovery` · `kidswearMapping` · `catalogueReconciliation` · `storefrontVisibility` · `fallbackResolution`

They encode the invariants above and should be mirrored as backend integration tests.
