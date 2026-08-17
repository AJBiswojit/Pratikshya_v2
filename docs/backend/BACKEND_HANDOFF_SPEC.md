# PRATIKSHYA FASHON — Backend Handoff Specification

**Repository:** `AJBiswojit/Pratikshya_Fashon`
**Branch analysed:** `arena/019ffcd9-pratikshya-fashon` (branched from `main` @ `24962e0`)
**Document date:** 2026-08-13
**Status:** Documentation and data extraction only. **No backend was implemented. No frontend file was modified.**

---

## 0. How to read this package

This package describes **what the frontend already implements and already depends on** — nothing else.

Three markers are used throughout, and they are load-bearing:

| Marker | Meaning |
| --- | --- |
| *(no marker)* | Implemented in the repository. Traceable to a named file, function or constant. The backend must preserve this behaviour exactly. |
| `NOT DEFINED / BACKEND DECISION REQUIRED` | The frontend does **not** define this. It has **not** been invented here. The backend team must decide, and the decision must be fed back into this package. |
| `FRONTEND ASSUMES` | The frontend behaves as though this were true but never states or enforces it. Treat these as latent requirements. |

Nothing in this package is aspirational. Every table, enum, ID, count and rule was read out of the running data layer. Where the repository is silent, this package is silent too.

---

## 1. What this system currently is

PRATIKSHYA FASHON is a **complete, working, browser-only fashion commerce application**:

- React 19 + Vite 7 + Tailwind 4, `react-router-dom` 7, `framer-motion`, `lucide-react`.
- **Three portals in one SPA**: the customer storefront (`/`), the employee workspace (`/employee/*`), and the admin console (`/admin/*`).
- **No server exists.** Every "service" under `src/services/**` is a repository module that reads and writes `window.localStorage` behind a stable function API, dispatching `window` events on change.

The architecture was deliberately shaped so a backend can be slid underneath it:

```
React component
      ↓  (never touches storage directly)
context provider  (CartContext, OrderContext, AuthContext, …)
      ↓
service / repository  (catalogRepository, taxonomyRepository, mediaRepository, …)
      ↓
localStorage key + window change event      ← THIS LAYER IS WHAT THE BACKEND REPLACES
```

**The migration contract is therefore: replace the storage tier inside each repository module with HTTP calls, and keep every exported function signature identical.** The component layer must not need to change. That is why `API_CONTRACT.md` is organised by the service functions that exist, not by a wished-for REST surface.

---

## 2. Scope of this handoff

### In scope
- Every persisted entity the frontend reads or writes.
- Every workflow state and transition the frontend can produce.
- Every authorization rule the frontend enforces.
- Every validation and error message the frontend already emits.
- The complete product catalogue, taxonomy, collection register, media register and media grouping as **data** (see `data/`).

### Explicitly out of scope
- Backend implementation of any kind.
- Any change to frontend behaviour, product data, media mapping, taxonomy, routes or UI.
- Inventing endpoints, fields, statuses, roles or business rules the repository does not contain.

---

## 3. The nine data-integrity rules the backend must enforce

These are not suggestions. Each is enforced somewhere in the current frontend, and each is documented with its enforcement point.

| # | Rule | Where the frontend enforces it |
| --- | --- | --- |
| 1 | **Unique Product ID.** A product ID is permanent. It is never regenerated, never derived from a product name, never randomised for catalogue products. | `nextStableProductId()` scans the whole register for collisions (`src/services/productWorkflow.js`); `changeProductId()` validates `^[A-Z0-9][A-Z0-9-]{1,14}$` and refuses a taken ID (`src/services/catalogRepository.js`). |
| 2 | **Unique Media ID.** Media IDs (`pm-seed-001`, `pm-ing-…`) are stable and unique across the register. | `mediaRepository.normaliseMedia()` / `writeMedia()` (`src/services/media/mediaRepository.js`). |
| 3 | **Unique media ownership.** A media record has **at most one** owning product, expressed *only* by `media.productId`. | `validateMediaAssignment()` returns `MEDIA_ALREADY_ASSIGNED` unless the target is the current owner (`src/services/productWorkflow.js`); `mediaRepository.assignToProduct()` returns `null` for a contested reassignment without `confirmReassign`. |
| 4 | **No cross-product media.** A product may never display another product's image. | `assembleProductMediaSet()` drops any item whose `productId` differs and marks the set `CROSS_PRODUCT_REFERENCE` (`src/services/media/productMediaSet.js`). |
| 5 | **Valid category / collection.** A product references an existing taxonomy record; a category that is not `ACTIVE` removes its products from the storefront. | `queryCatalogue()` visibility gate (`src/data/products/query.js`); `getPublishIssues()` requires a category. |
| 6 | **No duplicate active slug.** | `catalogRepository.slugTaken()` / `suggestSlug()`; `taxonomyRepository` slug normalisation. |
| 7 | **No random product media.** A product's plates come from its own owned media, or from its authored fallback plate — never from a similarity guess. | `getProductMediaSet()` — authored plates are used *only* when the register owns nothing for that product; visual similarity is never an input. |
| 8 | **No duplicate product cards.** One product ID renders once per surface. | `getExploreProducts()` / `queryCatalogue()` return unique IDs; `tests/productRepetition` and `npm run audit:product-repetition` assert it. |
| 9 | **No draft/archived leakage, and no unauthorized employee edits.** | Visibility gate (rule 5) excludes `DRAFT` and `ARCHIVED`; `employeeCanEditProduct()` requires `products.manage` **and** ownership of the assignment. |

---

## 4. Canonical counts extracted from the repository

Produced by running the live data layer (see `data/*.json` `_meta` blocks).

| Entity | Count | Detail |
| --- | --- | --- |
| Products | **168** | `PUBLISHED` 99 · `DRAFT` 69 · `PENDING_REVIEW` 0 · `ARCHIVED` 0 |
| Categories | **10** | all `ACTIVE` |
| Subcategories | **38** | across the 10 categories |
| Collections | **11** | all `ACTIVE`; 7 `MANUAL`, 4 `RULE_BASED` |
| Media records | **205** | `IMAGE` 202 · `VIDEO` 3 |
| Owned media (`productId` set) | **117** | across **65** distinct owning products, **0** orphan owners |
| Media by scope | | `PRODUCT` 117 · `UNASSIGNED` 78 · `MARKETING` 10 |
| Media by status | | `ACTIVE` 197 · `DRAFT` 4 · `PENDING_REVIEW` 2 · `REJECTED` 1 · `ARCHIVED` 1 |
| Filename media groups | **129** | 46 multi-view · 90 standalone |
| Stored human group decisions | **0** | the decision register is operator-written at runtime and is empty in the repo |
| Product media sets | 168 | `OK` 42 · `NO_ALTERNATE` 105 · `NEEDS_REVIEW` 21 · `CROSS_PRODUCT_REFERENCE` 0 |
| Employee roles | **8** | + 1 admin role (`SUPER_ADMIN`) |
| Permissions | **82** | one flat vocabulary, grouped for the UI |
| Confirmed Kids identities | **21** | `KID-001` … `KID-021`, all `SEPARATE_PRODUCT` |

Products per category: kidswear 42, sarees 29, jewellery 24, innerwear 19, menswear 14, lehengas 12, bridal-couture 12, bangles 9, kurtis-and-suits 4, dupattas 3.

---

## 5. Persistence map — every storage key is a future table or session

| localStorage key | Becomes | Change event |
| --- | --- | --- |
| `pratikshya_products` | `product` (+ `product_variant`, `product_price_history`, `product_history`) | `pratikshya-products-changed` |
| `pratikshya_taxonomy` | `category`, `subcategory`, `collection`, `collection_product` | `pratikshya-taxonomy-changed` |
| `pratikshya_media` | `media` (+ `product_media` link data held inline today) | `pratikshya-media-changed` |
| `pratikshya_media_groups` | `product_media_group` (the human decision register) | `pratikshya-media-groups-changed` |
| `pratikshya_offers` | `offer` | `pratikshya-offers-changed` |
| `pratikshya_inventory` | `inventory` | `pratikshya-inventory-changed` |
| `pratikshya_inventory_movements` | `inventory_movement` | ″ |
| `pratikshya_inventory_locations` | `inventory_location` | ″ |
| `pratikshya_inventory_transfers` | `inventory_transfer` | ″ |
| `pratikshya_inventory_reservations` | `inventory_reservation` | ″ |
| `pratikshya_orders` | `order`, `order_item`, `order_status_history`, `order_timeline`, `order_return`, `refund`, `shipment` | — |
| `pratikshya_current_order` | transient confirmation hand-off (not a table) | — |
| `pratikshya_cart` | `cart`, `cart_item` (guest cart is client-side today) | — |
| `pratikshya_wishlist` | `wishlist_item` | — |
| `pratikshya_checkout` | transient checkout draft (not a table) | — |
| `pratikshya_auth` | customer session | — |
| `pratikshya_customers_registry` / `pratikshya_customers` | `customer` | — |
| `pratikshya_account_<customerId>` | `customer_profile`, `address`, `customer_preferences`, `customer_session` | — |
| `pratikshya_employee_auth` | employee session | — |
| `pratikshya_admin_auth` | admin session | — |
| `pratikshya_settings` | `setting` (19 sections) | — |
| `pratikshya_attendance_settings` | legacy, migrated into `pratikshya_settings.attendance` | — |
| `pratikshya_recently_viewed` | `recently_viewed` | `pratikshya-recently-viewed-changed` |
| `pratikshya_ai_mirror_recent_<id>` | `ai_mirror_history` | — |
| `pratikshya_catalogue_reconciliation_version` | migration bookkeeping | — |
| workforce keys (`attendance`, `leave`, `performance`) | `attendance`, `leave_request`, `performance_review`, `performance_target` | — |

**The change events matter.** Contexts subscribe to them to revalidate the cart, the storefront and the inventory view. Whatever transport the backend uses (polling, SSE, WebSocket) must be able to trigger the same revalidation, or the equivalent must be simulated after each mutation. `NOT DEFINED / BACKEND DECISION REQUIRED`: the real-time transport.

---

## 6. Product visibility — the single most important rule

`queryCatalogue()` (`src/data/products/query.js`) is the one gate every customer-facing surface passes through:

```
visible  ⇔  status !== "DRAFT"
        AND status !== "ARCHIVED"
        AND published !== false
        AND taxonomy status of product.category === "ACTIVE"
```

Surfaces bound by this gate: homepage, `/explore`, `/category/:slug`, `/collection/:slug`, `/search`, product recommendations, "complete the look", cart recommendations, AI Shopping Assistant, AI Mirror, new arrivals, saree edit, bride/groom edit, sale banner.

**A backend that returns a `DRAFT` or `ARCHIVED` product on any customer endpoint is a defect.** The frontend does not re-filter defensively on every surface — it trusts the gate.

---

## 7. Status vocabulary — a required reconciliation

The handoff brief asks for six product states:
`DRAFT · EMPLOYEE_REVIEW · SUBMITTED · APPROVED · PUBLISHED · ARCHIVED`

The repository persists **four**:

```js
PRODUCT_STATUS = { DRAFT, PENDING_REVIEW, PUBLISHED, ARCHIVED }   // src/services/catalogRepository.js
REVIEW_STATE   = { NONE, PENDING, APPROVED, REJECTED }            // orthogonal review sub-state
```

The six-stage vocabulary **does exist**, but as a *derived* view for the Kids finalization desk:

```js
KIDS_STAGES = { DRAFT, EMPLOYEE_REVIEW, SUBMITTED, APPROVED, PUBLISHED, ARCHIVED }  // src/services/kidsProductFinalization.js
```

derived as: `DRAFT` + an `assignedEmployeeId` ⇒ `EMPLOYEE_REVIEW`; `PENDING_REVIEW` ⇒ `SUBMITTED`; `PUBLISHED` + `review.state === APPROVED` ⇒ `PUBLISHED`; `review.state === APPROVED` without publication ⇒ `APPROVED`.

`BACKEND DECISION REQUIRED` — choose one and record it here:
- **(a)** persist four statuses + `review.state` + `assignedEmployeeId` exactly as today, and derive the six stages on read (zero frontend change), **or**
- **(b)** persist all six as first-class statuses, which changes `PRODUCT_STATUS`, every status filter in the admin/employee product lists, and the visibility gate.

This package documents **(a)**, because that is what the repository implements. See `WORKFLOW_SPEC.md` §2.

---

## 8. Media model — the rule that must not be softened

```
Product ──1:N──▶ Media          (ownership: media.productId — the ONLY truth)
Product ──1:1──▶ ProductMediaSet {primary, front, side, back, detail, gallery[], hover}
Media   ──N:1──▶ MediaGroup     (groupKey = filename base minus the view suffix)
```

- Filename convention: `[department]-[category]-[style]-[number]-[view].webp`.
- `groupKey` = the basename with the view suffix removed. **Different `groupKey` = different product.** Two groups are merged **only** by an explicit human decision written into the decision register — never by a similarity heuristic, never automatically.
- Ownership is **never** implied by category, folder, filename prefix or usage role.
- `hoverImage` on the authored product record **never** confers ownership.
- Hover behaviour: Front+Back ⇒ hover Back · Front+Side ⇒ hover Side · Front only ⇒ **no hover swap** (`hover === primary`, `hasAlternate === false`).

Full detail in `MEDIA_PRODUCT_MAPPING_SPEC.md`.

---

## 9. Authorization model

- **Customer** — anonymous or `pratikshya_auth` session. No permission vocabulary; capability is implicit in the customer endpoints.
- **Employee** — `role` ∈ 8 roles, `status` ∈ 5 (only `ACTIVE`, `PENDING`, `ON_LEAVE` may sign in), `permissions[]` from 82 keys, `permissionMode` ∈ `role | custom`.
- **Admin** — `SUPER_ADMIN` only, status `ACTIVE | SUSPENDED`. `hasPermission()` short-circuits to allow-all for `SUPER_ADMIN`.

`hasPermission()` (`src/services/employees/authorization.js`) denies everything for an employee who cannot sign in, before any permission is consulted. Four permissions imply their families: `offers.manage`, `attendance.manage`, `leave.manage`, `performance.manage`.

Full matrix in `AUTHORIZATION_MATRIX.md`.

---

## 10. Deliverables in this package

| File | Contents |
| --- | --- |
| `BACKEND_HANDOFF_SPEC.md` | This document — scope, architecture, integrity rules, counts, decisions. |
| `API_CONTRACT.md` | Every endpoint the frontend actually needs, derived from real call sites. |
| `DATABASE_SCHEMA.md` | Entity-by-entity schema with types, defaults, enums, constraints, indexes, FKs. |
| `PRODUCT_CATALOGUE_SPEC.md` | The product record, pricing engine, variants, IDs, publish blockers. |
| `TAXONOMY_AND_COLLECTIONS.md` | Categories, subcategories, collections, membership resolution, routing. |
| `MEDIA_PRODUCT_MAPPING_SPEC.md` | Media register, ownership, grouping, hover, Kids identities. |
| `FRONTEND_BACKEND_INTEGRATION.md` | Service function → endpoint map, per call site. |
| `AUTHORIZATION_MATRIX.md` | Feature × Customer/Employee/Admin, plus the permission vocabulary. |
| `WORKFLOW_SPEC.md` | Product lifecycle, actors, blockers, transitions, Kids workflow, activity logging. |
| `ERROR_AND_VALIDATION_SPEC.md` | Every validation rule and literal error string the frontend produces. |
| `BACKEND_IMPLEMENTATION_CHECKLIST.md` | Ordered build plan with acceptance criteria. |
| `data/taxonomy.json` | 10 categories + 38 subcategories, verbatim. |
| `data/collections.json` | 11 collections with rules and resolved counts, verbatim. |
| `data/product-catalogue.json` | 168 products, verbatim IDs and fields. |
| `data/media-product-mapping.json` | 205 media records with ownership, verbatim. |
| `data/product-media-groups.json` | 129 filename groups + 168 product media sets. |
| `data/roles-permissions.json` | 8 roles, 82 permissions, statuses, ID prefixes. |

---

## 11. Verification

```bash
npm test     # node --test over tests/*.test.js — run unchanged, no test was modified
```

The 22 test files encode the invariants above (`productWorkflow`, `kidsFinalization`, `mediaResolver`, `productMediaSet`, `mediaProductDiscovery`, `kidswearMapping`, `catalogueReconciliation`, `storefrontVisibility`, `fallbackResolution`, …). They are the executable half of this specification; **the backend should be validated against the same invariants.**

Additional read-only audits available (`npm run audit:*`): explore, homepage, product-media, media-product-discovery, media-products, catalog-completeness, storefront-coverage, storefront-images, rendered-product-media, product-repetition, kids-products, media, hero-runtime.
