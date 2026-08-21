# PRATIKSHYA FASHON — Backend Integration Audit

> **Status:** AUDIT UPDATED — backend is not implemented; all endpoints/tables remain migration targets.
> **Date:** 2026-08-21
> **Scope:** Entire Phase 1-stabilized frontend and its migration to the planned Python + FastAPI backend.
> **Ownership:** This document answers what moves from frontend to backend. System architecture is authoritative in `backend-architecture.md`; exact employee endpoints are authoritative in `employee-management-api-contract.md`.
> **Constraint honoured:** No application code was modified by the audit. This document is documentation/audit only.


## 1 Executive Findings

## 2 Executive findings

The frontend is a **complete operational UX** (customer storefront + Admin Portal + Employee Operations Portal) with **no HTTP backend**. Persistence is `localStorage` plus authored seed modules. Phase 1 stabilization is **complete** (canonical customer/order stores, collection/Explore fixes, shared portal sidebar, responsive Admin Collection Detail). The architecture is already shaped as a **repository/command layer** that a FastAPI backend can replace feature-by-feature without rewriting UI.

### 2.1 What must be preserved

1. **One canonical Product catalogue.** There are no Kids / Bridal / Women / Men / Collection product repositories. Department filtering is derived from `product.department` on the canonical record (`src/data/catalog/products.js` → `catalogRepository` → `getLiveStorefrontProducts()`).
2. **Canonical product identity.** IDs follow `PF-{DEPT}-{FAMILY}-{NNNN}` (`src/config/productIdPrefixes.js`). IDs are never inferred from filenames, folders, names, indexes, or clocks.
3. **Publication lifecycle (non-skippable):**
   - Persistence vocabulary: `DRAFT` → `PENDING_REVIEW` (SUBMITTED) → `review.state = APPROVED` → `PUBLISHED` (+ `ARCHIVED`).
   - Canonical projection: `DRAFT → ASSIGNED → IN_EMPLOYEE_REVIEW → SUBMITTED → IN_ADMIN_REVIEW → APPROVED → PUBLISHED` (`src/services/workflow/productWorkflowState.js`).
   - **Approval does not publish.** Bulk operations already delegate to the same commands.
4. **Storefront visibility:** only `status === PUBLISHED` **and** parent category `ACTIVE` (`isCustomerVisible` in `src/data/products/index.js`). Marketing placements resolve IDs against that live list; unpublished IDs simply do not appear.
5. **Marketing placements store product IDs only** — never product snapshots (`marketingPlacementRepository`).
6. **Brand lock:** `src/assets/pratikshya_logo.webp` is the only logo path (`Brand.jsx` glob). Do not introduce a competing brand asset.
7. **Sandbox QR is demo-only** (`env: "sandbox"`). Frontend must never mark an order paid in production.

### 2.2 Current stack

| Layer | Reality |
|---|---|
| UI | React 19, Vite 7, Tailwind 4, React Router 7 |
| Backend | **None** |
| Database | **None** |
| Auth | Three isolated mock sessions in `localStorage` |
| Payments | `MockPaymentService` (in-memory, delayed fake outcomes) |
| Media files | Static files under `public/images/` + browser blob previews (never persisted as production URLs) |
| Tests | Node test runner + architecture audit scripts (`package.json`) |

## 3 Current Frontend → Backend Migration Model

```text
CURRENT
React + Vite
↓
Repository / service layer
↓
localStorage + authored seeds

TARGET
React + Vite
↓
Existing repository/service adapter
↓
FastAPI `/api/v1`
↓
Backend services / repositories
↓
PostgreSQL + object storage + payment gateway
```

**Migration rule:** replace repositories, not pages.

## 4 Canonical Sources of Truth

| Domain | Current Authority | Target Authority | Status |
|---|---|---|---|
| Products | `catalogRepository` / `pratikshya_products` | `products` | READY |
| Customers | `customerRegistry` / `pratikshya_customers_registry` | `customers` | READY |
| Orders | `orderService` / `pratikshya_orders` | `orders` | READY |
| Collections / taxonomy | `taxonomyRepository` | taxonomy / collections | READY |
| Media | media repository / register | media metadata + object storage | READY |
| Inventory | inventory repositories | inventory tables | READY |
| Offers / settings | offers + settings repositories | offers / settings | READY |
| Employees / workforce | employee + workforce services | employees + workforce tables | READY |

The complete entity model remains in `backend-architecture.md`.

## 5 Persistence Inventory

### 5.1 Persistence inventory (current source of truth)

| Key | Domain | Status |
|---|---|---|
| `pratikshya_products` | Canonical product register | ACTIVE |
| `pratikshya_media` | Managed media register | ACTIVE |
| `pratikshya_canonical_media_state_2026_08_17` | One-shot media seed wipe marker | LEGACY/DEV |
| `pratikshya_media_groups` | Human group-review decisions | ACTIVE |
| `pratikshya_marketing_placements` | Placement → ordered product IDs | ACTIVE |
| `pratikshya_taxonomy_v2` | Categories, subcategories, collections | ACTIVE |
| `pratikshya_offers` | Coupons / promotions | ACTIVE |
| `pratikshya_inventory` / `_movements` / `_locations` / `_transfers` / `_reservations` | Stock layer | ACTIVE |
| `pratikshya_orders` / `pratikshya_current_order` / `pratikshya_order_sequence` | Orders (canonical) | ACTIVE |
| `pratikshya_cart` / `pratikshya_wishlist` | Shopping (survive sign-out) | ACTIVE (client until server) |
| `pratikshya_checkout` | In-progress checkout draft | ACTIVE (client until server) |
| `pratikshya_auth` / `pratikshya_customers_registry` / `pratikshya_account_{id}` | Customer identity + profile | ACTIVE (canonical registry) |
| `pratikshya_customers` | Legacy admin demo list — **merged into the registry in Phase 1, then removed** | LEGACY/MIGRATION |
| `pratikshya_admins` / `pratikshya_admin_credentials` / `pratikshya_admin_auth` | Admin identity | ACTIVE (mock) |
| `pratikshya_employees` / `pratikshya_employee_credentials` / `pratikshya_employee_auth` / `pratikshya_employee_activity` | Employees + diary | ACTIVE (mock auth) |
| `pratikshya_employee_assisted_orders` | Legacy second order store — **merged into `pratikshya_orders` in Phase 1, then removed** | LEGACY/MIGRATION |
| `pratikshya_attendance` / `pratikshya_leave` / `pratikshya_performance` | Workforce | ACTIVE |
| `pratikshya_employee_attendance` / `pratikshya_attendance_settings` | Legacy keys (migrated once, never written) | LEGACY/MIGRATION |
| `pratikshya_settings` | House configuration | ACTIVE |
| `pratikshya_preferences` / `pratikshya_recently_viewed` | Personalization | ACTIVE (client cache) |
| `pratikshya_ai_shopping_session_*` / `pratikshya_ai_business_session_*` / `pratikshya_ai_mirror_recent_*` | AI mock sessions | DEMO/CLIENT |
| `pratikshya_admin_sidebar_collapsed` / `pratikshya_employee_sidebar_collapsed` | Rail collapse preference (UI chrome) | ACTIVE (client) |
| `pf_admin_nav_groups` / `pf_employee_nav_groups` | Nav group expansion state (UI chrome) | ACTIVE (client) |

Authored static seeds (used when registers are empty, and merged by ID so admin edits win):

- `src/data/catalog/products.js` — canonical products
- `src/data/catalog/taxonomy.js` — departments / categories / subcategories / routes
- `src/data/catalog/collections.js` — editorial plates (not products)
- `src/data/catalog/hero.js` — hero copy
- `src/data/media/seedMedia.js` — currently empty managed-media seed
- `src/data/offers/seedOffers.js`
- `src/data/mockCustomers.js`, `src/data/admin/*`, `src/data/employees/*`

--

## 6 Frontend → Backend Feature Matrix

Legend for **STATUS**: `MOCK` = demo-only; `CLIENT_AUTH` = rules exist but client-enforced; `SEED` = static authored data; `READY` = command/repository seam exists and should be lifted, not rewritten.

### 6.1 Identity & access

| FEATURE | CURRENT SOURCE OF TRUTH | CURRENT PERSISTENCE | REQUIRED BACKEND ENTITY | REQUIRED API | READ | WRITE | AUTHORIZATION | VALIDATION | LIFECYCLE | DEPENDENCIES | MIGRATION RISK | STATUS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Customer sign-up / sign-in | `AuthContext` + `INITIAL_DEMO_CUSTOMERS` | `pratikshya_auth`, `pratikshya_customers_registry` | `customers`, `customer_credentials`, `sessions` | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` | session, profile | register, login, logout | none (any ≥6-char password matches known email/phone) | email/phone/password length client-side | none | Account, orders, cart merge | **HIGH** — passwords are never stored; login is identity lookup only | MOCK / CLIENT_AUTH |
| Customer password reset | `AuthContext.forgotPassword/resetPassword` | none (always “sent”) | `password_reset_tokens` | `/auth/forgot`, `/auth/reset` | — | token issue/consume | public + token | email exists (must not leak) | token TTL | customers | LOW (UI already exists) | MOCK |
| Customer profile / addresses / preferences | `AccountContext` | `pratikshya_account_{id}` + registry | `customers`, `customer_addresses`, `customer_preferences` | `/me`, `/me/addresses` | profile, addresses | CRUD address, patch profile | owner session | address fields, unique email | address default flag | checkout | **FIXED in Phase 1** — account_* projection + registry now share one register | CLIENT_AUTH |
| Admin sign-in | `adminAuthService` + `INITIAL_ADMINS` | `pratikshya_admins`, `_credentials`, `_auth` | `admins` (never a `customers` row) | `/admin/auth/login`, `/admin/auth/logout`, `/admin/me` | session | login/logout, profile (name/email/phone/title only) | `SUPER_ADMIN` + `ACTIVE`; fingerprint is **not a hash** | identifier + password | ACTIVE / SUSPENDED | workflow commands | **HIGH** | MOCK / CLIENT_AUTH |
| Employee sign-in / password change | `employeeAuthService` + `employeeService` | `pratikshya_employees`, `_credentials`, `_auth` | `employees`, `employee_credentials`, `sessions` | `/api/v1/auth/employee/login`, `/api/v1/employees/me/password` | session, profile | login, password change | `canEmployeeLogin(status)` | password rules from settings | employee status machine | permissions, assignment | **HIGH** | MOCK / CLIENT_AUTH |
| Employee account admin | Admin portal `/admin/employees` | employee register | `employees`, `employee_permissions` | `/admin/employees` CRUD | list/detail | create/edit/suspend/reset/permissions | Admin `employees.manage` only — never an employee grant | unique employeeId, role, status | ACTIVE / SUSPENDED / … | products.assignedEmployeeId | MEDIUM | CLIENT_AUTH |
| RBAC | `employeePermissions.js`, `employeeRoles.js`, `adminAccess.js` | stored on employee record; admin role-owned | `roles`, `permissions`, `grants` | included in `/me` + server checks | permission catalogue | grant/revoke (admin) | server must re-check every mutation | known permission keys; employee-account keys reserved to Admin | — | every staff mutation | MEDIUM — **do not invent a second permission vocabulary** | CLIENT_AUTH |
| Route guards | `ProtectedRoute`, `AdminProtectedRoute`, `EmployeeProtectedRoute` | session keys | — | 401/403 from API | — | — | UI hide is **not** authority | — | — | all portals | LOW if APIs enforce | CLIENT_AUTH |

### 6.2 Catalogue & merchandising

| FEATURE | CURRENT SOURCE OF TRUTH | CURRENT PERSISTENCE | REQUIRED BACKEND ENTITY | REQUIRED API | READ | WRITE | AUTHORIZATION | VALIDATION | LIFECYCLE | DEPENDENCIES | MIGRATION RISK | STATUS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Canonical products | `catalogRepository` + seed `data/catalog/products.js` | `pratikshya_products` (seed merged by ID; stored wins) | **`products` (ONE table)** + `product_variants` + `product_flags` + `product_history` | `/products`, `/admin/products` | all / by id / by slug | createDraft, updateDraft, duplicate | Super Admin or assigned employee (`products.manage`) | canonical taxonomy path, unique slug/SKU, pricing engine | see §6 | media, taxonomy, inventory, collections | **HIGH if split by department** — do not | READY |
| Storefront catalogue | `getLiveStorefrontProducts()` | derived, not stored | same `products` | `GET /catalog/products`, `GET /catalog/products/:id` | published + active category only | none | public | none (server filters) | PUBLISHED only | taxonomy, media resolver | MEDIUM — keep filter identical | READY |
| Product detail | `ProductDetail` + `getProductById` + `?preview=1` staff seam | derived | products + media | `GET /catalog/products/:id` (+ staff preview) | one | none public | public / staff preview | 404 if unpublished | — | media set, inventory availability, offers badge | LOW | READY |
| Search / facets / listings | `data/products/query.js`, `useCatalogueQuery` | derived | products (indexed) | `GET /catalog/search?…` | filter/sort | none | public | known facet values | PUBLISHED | taxonomy, navigation scopes | MEDIUM — preserve route → filter mapping | READY |
| Department / category / subcategory pages | `data/catalog/taxonomy.js` + `taxonomyRepository` | authored + `pratikshya_taxonomy_v2` | `departments`, `categories`, `subcategories` | `/catalog/taxonomy`, `/admin/categories` | tree, by slug | CRUD / archive / restore | Admin (+ employee category perms) | unique name/slug per parent | DRAFT / ACTIVE / ARCHIVED | products.category, routes | MEDIUM — seed must remain canonical path vocabulary | READY |
| Collections | `taxonomyRepository.collections` + `data/catalog/collections.js` plates | taxonomy register `productIds` + optional `rule` | `collections`, `collection_products` | `/catalog/collections/:slug`, `/admin/collections` | by slug (direct URL) | CRUD, assign products, activate/pause/archive | Admin / collections.* | unique slug; membership = IDs or rule, **never hardcoded in pages** | DRAFT / SCHEDULED / ACTIVE / PAUSED / EXPIRED / ARCHIVED | products, media | **HIGH if membership stays in pages** — it does not today | READY |
| Pricing | `utils/pricing.js` `computePricing` | embedded on product | product pricing columns; **server recomputes** | included in product APIs | computed | never trust client final price | staff write; public read | MRP ≥ selling > 0, tax mode | price_history | cart, offers, inventory value | **HIGH** if client price accepted | READY |
| Product IDs | `nextCanonicalProductId` | allocated at create | server sequence per family prefix | create product | — | allocate | staff | taxonomy family immutable after allocation | permanent | media ownership on rename | MEDIUM — rename already has ownership transfer + rollback | READY |

### 6.3 Product workflow

| FEATURE | CURRENT SOURCE OF TRUTH | CURRENT PERSISTENCE | REQUIRED BACKEND ENTITY | REQUIRED API | READ | WRITE | AUTHORIZATION | VALIDATION | LIFECYCLE | DEPENDENCIES | MIGRATION RISK | STATUS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Workflow commands | `productWorkflowCommands.js` (the ONE command layer) | product.status + review.* + workflow.* | same product row + `audit_logs` | `POST /admin/products/:id/{submit,approve,publish,unpublish,archive,restore,return,assign}` | state projection | **one command per transition** | Super Admin vs assigned employee — **re-resolve principal server-side** | `productPublishValidator` (submit/approve/publish) | DRAFT→SUBMITTED→APPROVED→PUBLISHED | media ownership, taxonomy ACTIVE, price, name | **CRITICAL** — never add a bulk status PATCH | READY / CLIENT_AUTH |
| Bulk submit/approve/publish | `bulkSubmit` / `bulkApprove` / `bulkPublish` | same | same | `POST /admin/products/bulk/{submit,approve,publish}` | — | per-id canonical command | same as individual | same; failures skip, do not force siblings | same | same | HIGH if a “set status=PUBLISHED” shortcut is added | READY |
| Employee draft edit | `saveProductDraft` + `EMPLOYEE_EDITABLE_FIELDS` | product row | products | `PATCH /employee/products/:id` | assigned only | whitelist fields | assigned + `products.manage` + editable stage | stage must be DRAFT/ASSIGNED/IN_EMPLOYEE_REVIEW | no status change | — | MEDIUM | CLIENT_AUTH |
| Review flags / groups | `productReviewFlags`, `productMediaGroups` | product.reviewFlags + `pratikshya_media_groups` | `product_review_flags`, `media_groups` | review APIs | inbox, groups | decide group, clear flags | Super Admin | group decision enum | blocks publish | media | MEDIUM | READY |
| Permanent delete | `productDeletionService` | remove from register | products (hard delete only if unused draft) | `DELETE /admin/products/:id` with confirm body | dependencies | detach media → unassigned, then delete | Super Admin + re-typed Product ID | never-published, no orders/inventory/lifecycle events | archive is default | media, orders, inventory, activity | MEDIUM | READY |
| Activity diary | `activityService` | `pratikshya_employee_activity` | `audit_logs` | `GET /admin/activity` | feed | append from commands | Admin / scoped employee | never log secrets | append-only | all mutations | LOW | READY |

### 6.4 Media & marketing

| FEATURE | CURRENT SOURCE OF TRUTH | CURRENT PERSISTENCE | REQUIRED BACKEND ENTITY | REQUIRED API | READ | WRITE | AUTHORIZATION | VALIDATION | LIFECYCLE | DEPENDENCIES | MIGRATION RISK | STATUS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Managed media | `mediaRepository` / `mediaStore` | `pratikshya_media` | `media_assets` + object storage | `/media`, `/media/:id`, `/media/upload` | library, by product, by placement | upload, update, approve/reject, archive, reorder, cover | media.* / Admin | MIME, extension, size (jpg/jpeg/png/webp/avif, mp4/webm; 10MB/100MB); **reject blob:/data:** | DRAFT → PENDING_REVIEW → ACTIVE / REJECTED / ARCHIVED | products, placements | **HIGH** — uploads today are browser previews | MOCK files / READY metadata |
| Product media ownership | `mediaOwnershipService` | media.productId | media_assets.product_id | `POST /media/:id/assign`, `/unassign`, `/transfer` | owner | assign with confirm on contest | staff; marketing isolation | one product owner; no silent reassign | PRODUCT / MARKETING / UNASSIGNED scopes | product ID rename rollback | HIGH if filenames infer identity (they must not) | READY |
| Product media set | `productMediaSet` | derived from register + authored `product.media` | media_assets + product.media paths | included in product GET | primary/gallery | setCover | staff write | cover is IMAGE | only ACTIVE on storefront | catalog | MEDIUM — authored catalogue plates live on the product record, not the media register | READY |
| Marketing placements (PRODUCT mode) | `marketingPlacementRepository` + `mediaTypes.MARKETING_PLACEMENTS` | `pratikshya_marketing_placements` (IDs only) | `marketing_placements`, `marketing_placement_products` | `/admin/marketing/placements/:id` | ordered IDs | set/add/remove/reorder | Admin `media.manage` | placement id from catalogue; IDs must exist | live vs not | **resolve against live published catalogue** | **CRITICAL** — never snapshot products | READY |
| Marketing media (GENERIC mode) | `getMarketingMedia(placement, {publicOnly})` | media register scope=MARKETING | media_assets.placement | `/media?scope=MARKETING` | ACTIVE + live placement | assignToPlacement | Admin | same upload rules | ACTIVE only on storefront | HOME_HERO, EDITORIAL, PROMOTION | MEDIUM | READY |
| Navigation editorial media | `navigationEditorialMedia` | media + taxonomy | derived | catalog/media | public | admin | public read | — | — | — | LOW | READY |
| Brand logo | `src/assets/pratikshya_logo.webp` | bundled asset | **keep as frontend asset** | none | — | — | — | — | — | Brand.jsx | **Do not migrate / replace** | LOCKED |

### 6.5 Commerce

| FEATURE | CURRENT SOURCE OF TRUTH | CURRENT PERSISTENCE | REQUIRED BACKEND ENTITY | REQUIRED API | READ | WRITE | AUTHORIZATION | VALIDATION | LIFECYCLE | DEPENDENCIES | MIGRATION RISK | STATUS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cart | `CartContext` | `pratikshya_cart` (survives logout) | `carts`, `cart_items` | `/cart` | lines | add/update/remove | optional session; merge on login | published product, availability, qty | — | inventory, pricing **server** | MEDIUM | CLIENT |
| Wishlist | `WishlistContext` | `pratikshya_wishlist` | `wishlists` | `/wishlist` | ids | toggle | owner | published id | — | products | LOW | CLIENT |
| Coupons / offers | `offerRepository` | `pratikshya_offers` | `offers`, `offer_redemptions` | `/offers/validate`, `/admin/offers` | list/validate | CRUD, activate/pause/archive, redeem once per order | staff write; public validate | code format, dates, eligibility, usage limits | DRAFT/ACTIVE/PAUSED/ARCHIVED + derived SCHEDULED/EXPIRED | products, categories, collections, orders, customers | HIGH if cart computes discount without server | READY |
| Checkout | `CheckoutContext` | `pratikshya_checkout` | checkout session or order draft | `/checkout` start/update | draft | steps | authenticated customer (storefront) | address, delivery, stock reserve | 4 steps then payment | cart, inventory reserve, offers, settings.shipping | **HIGH** | MOCK |
| Payments | `MockPaymentService` + Sandbox QR | **in-memory only** (QR payload `env:sandbox`) | `payments`, `payment_events` | `/payments/intents`, webhook `/payments/webhooks` | status | create intent; **webhook confirms** | never client | amount from **server order**, not client | idle→pending→success/failure/cancelled | orders, inventory sale | **CRITICAL** — frontend currently confirms payment and writes PAID | MOCK |
| Orders | `orderService` | `pratikshya_orders` (+ demo seed if empty) | `orders`, `order_items`, `order_timeline` | `/orders`, `/admin/orders`, `/employee/orders` | by owner / all staff | create after **verified payment**; status commands | customer owner; staff perms | `canTransition`; **no client-paid flag** | see orderConfig journey | inventory, payments, customers | **HIGH** — `buildOrderRecord` stamps PAYMENT_CONFIRMED immediately | READY / MOCK paid |
| Fulfillment | orderService allocate/pick/pack/dispatch | embedded on order | `fulfillments` (or order columns) + timeline | `/admin/orders/:id/allocate` etc. | — | canonical transitions | orders.fulfill / pick / pack / dispatch | location, tracking required on dispatch | PENDING→…→DELIVERED | inventory locations, employees | MEDIUM — `forceTransition` must **not** exist in production API | READY |
| Returns / refunds | `returnService` + order.returns | orders document | `returns`, `refunds` | `/orders/:id/returns`, admin return APIs | — | request / review / inspect / refund | customer request; staff manage | RETURNABLE_STATUSES; inspection before restock | return journey | inventory.returnStock / inspectReturnedStock | HIGH if refund marked without payment provider | MOCK money |
| Inventory | `inventoryRepository` | 5 inventory keys | `inventory_balances`, `stock_movements`, `locations`, `transfers`, `reservations` | `/inventory/*` | query/metrics | receive/adjust/damage/return/inspect/transfer/reserve | inventory.* | no negative available; location active; variant required when variants exist | transfer DRAFT→…→RECEIVED | products, orders | HIGH — reservations currently expire in-browser | READY |
| Assisted orders | employee orders UI | orders `source=employee_assisted` (canonical register) | orders.source | `/api/v1/employees/{id}/orders/assisted` | — | create | `orders.create` | customer identity optional only on this path | same order machine | customers, inventory | **FIXED in Phase 1** (single store) | READY |

### 6.6 People, ops, content extras

| FEATURE | CURRENT SOURCE OF TRUTH | CURRENT PERSISTENCE | REQUIRED BACKEND ENTITY | REQUIRED API | READ | WRITE | AUTHORIZATION | VALIDATION | LIFECYCLE | DEPENDENCIES | MIGRATION RISK | STATUS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Admin customers list | `pratikshya_customers_registry` (+ legacy `pratikshya_customers` merged in Phase 1) | **single registry** | **reuse `customers`** — do not keep a second customer table | `/admin/customers` | list/detail + order history | notes later | Admin | — | — | orders | **FIXED in Phase 1** — one registry | MOCK |
| Attendance / leave / performance | workforce repos | `pratikshya_attendance`, `_leave`, `_performance` | `attendance_events`, `leave_requests`, `performance_records` | `/workforce/*` | self / team / admin | check-in/out, leave CRUD, reviews | attendance.* / leave.* / performance.* | location/time rules from settings | leave approve/reject | employees | MEDIUM | READY |
| Settings | `settingsRepository` | `pratikshya_settings` | `settings` (JSON sections) or typed tables | `/admin/settings` | sections | Super Admin | Super Admin | known sections | — | shipping, tax, media limits, attendance | MEDIUM — shipping/tax must become server truth | READY |
| Analytics | `analyticsService` (aggregates local registers) | none (computed) | read models / queries | `/admin/analytics/*` | snapshots | none | analytics.* | date range | — | orders, products, inventory, returns, offers | LOW (read-only) | DERIVED |
| AI Shopping / Business / Mirror | mock providers + session store | namespaced localStorage | **defer** (optional later: `ai_sessions`) | none in v1 backend | — | — | — | — | — | catalogue read | LOW — keep mock until catalogue API exists | MOCK |
| Employee desks (warehouse/support/styling placeholders) | `EmployeeDesk` | none | **no new entities** until those UIs exist | none | — | — | — | — | — | — | Do not invent tables | PLACEHOLDER |
| Recently viewed / style prefs | customer services | `pratikshya_recently_viewed`, `_preferences` | optional `customer_events` | `/me/recent`, `/me/preferences` | — | append | owner | product ids | — | products | LOW | CLIENT |
| Sidebar rail collapse + nav group expansion | `PortalShell`/`PortalSidebar`/`usePortalSidebarCollapse` | `pratikshya_admin_sidebar_collapsed` / `pratikshya_employee_sidebar_collapsed` (rail) + `pf_admin_nav_groups` / `pf_employee_nav_groups` (group expansion) | **none** | none | — | — | — | — | — | — | Keep client-only | UI |

---

## 7 Backend Migration by Domain

> **Relabelled to Phase A–L** so all four documents share one vocabulary (see `backend-architecture.md` §42). The earlier numbered steps 1–16 map onto the phases below. This is a phased, non-“big-bang” migration: frontend repository/service interfaces stay stable, and each phase adds a thin API adapter behind the existing function names.

| Phase | Scope | Old source | Fallback |
|---|---|---|---|
| A | Backend foundation | — (FastAPI + PostgreSQL + SQLAlchemy + Alembic) | — |
| B | Authentication (customer/admin/employee) + RBAC | auth contexts, mock fingerprints | localStorage sessions if `VITE_API_BASE` unset |
| C | Product/catalogue + lifecycle | seed + `pratikshya_products`, `productWorkflowCommands` | seed merge + same function names, HTTP inside |
| D | Taxonomy / categories / collections / marketing | taxonomyRepository, placement register | seed collections; empty assignments = house fallbacks |
| E | Media / marketing media + object storage | mediaStore + public/images | keep static plates; uploads go to object store |
| F | Customers (addresses, preferences) | `pratikshya_customers_registry` + `pratikshya_account_{id}` | single `customers` + addresses |
| G | Cart / wishlist / offers | `pratikshya_cart` / `pratikshya_wishlist` / `pratikshya_offers` | merge guest cart on login |
| H | Orders / inventory | orderService + `pratikshya_inventory*` | **do not seed demo orders in production** |
| I | Payments / returns / refunds | MockPaymentService + returnService | mock only when provider=mock |
| J | Employee / workforce / settings / analytics | workforce repos, settingsRepository, analyticsService | SQL aggregations |
| K | Notifications / background jobs + remove authoritative localStorage | — | seeds, production flag, drop business keys |
| L | AI services (future) | mock AI providers | provider seam stays until real providers |

**Do not** bulk-import random browsers’ localStorage. Provide an optional **dev** “export workspace JSON” later if needed.

Cart/wishlist remain client-cacheable but server is authoritative once logged in.

---

### 7.1 Boundary Classification (A–E)

Every current localStorage / repository / service boundary is classified. **Business-critical persistent data moves server-side eventually; pure UI preferences (sidebar collapse) stay client-side unless there is a strong reason to synchronize them.**

| Category | Meaning |
|---|---|
| **A. MUST MOVE TO BACKEND** | Business-critical persistent data; server must be authoritative (registers, money, stock, identity, lifecycle) |
| **B. SHOULD MOVE TO BACKEND** | Valuable cross-device data, but a client cache is acceptable in V1 |
| **C. CAN REMAIN CLIENT-SIDE** | Development/sandbox or genuinely device-local state |
| **D. FRONTEND SESSION/UX STATE** | UI chrome and ephemeral UX state — never business authority |
| **E. LEGACY/MIGRATION ONLY** | Already consolidated/removed in Phase 1 or one-shot migration keys |

| Boundary | Category | Notes |
|---|---|---|
| `pratikshya_products` | A | Canonical product register → `products` |
| `pratikshya_taxonomy_v2` | A | Categories/subcategories/collections → taxonomy tables |
| `pratikshya_media` | A | Metadata → `media_assets`; bytes → object storage |
| `pratikshya_media_groups` | A | Human group decisions → `media_groups` |
| `pratikshya_marketing_placements` | A | Placement IDs → `marketing_placement_products` |
| `pratikshya_offers` | A | → `offers` / `offer_redemptions` |
| `pratikshya_orders` | A | Canonical orders → `orders` / `order_items` / `order_timeline` |
| `pratikshya_current_order` | A | Derived pointer → **REMOVE** (server derives) |
| `pratikshya_order_sequence` | A | Invoice sequence → `product_id_sequences`-style sequence object |
| `pratikshya_inventory` / `_movements` / `_locations` / `_transfers` / `_reservations` | A | → inventory tables |
| `pratikshya_customers_registry` | A | Canonical customers → `customers` |
| `pratikshya_account_{id}` | A | Per-customer profile projection → `customers` + `customer_addresses`/`customer_preferences` |
| `pratikshya_settings` | A | → `settings` |
| `pratikshya_employees` | A | → `employees` |
| `pratikshya_employee_credentials` | A | → `employee_credentials` (hashed) |
| `pratikshya_employee_activity` | A | → `audit_logs` |
| `pratikshya_attendance` / `pratikshya_leave` / `pratikshya_performance` | A | → workforce tables |
| `pratikshya_admins` / `pratikshya_admin_credentials` | A | → `admins` / `admin_credentials` (hashed) |
| `pratikshya_cart` | B | Server cart authoritative once logged in; client cache meanwhile |
| `pratikshya_wishlist` | B | Server wishlist once logged in; client cache meanwhile |
| `pratikshya_checkout` | A | Checkout draft → `checkout_sessions` (expiring) |
| `pratikshya_recently_viewed` | B | Optional `customer_events` later |
| `pratikshya_preferences` | B | `customer_preferences` later; client cache in V1 |
| `pratikshya_auth` (customer session) | A/D | Mock today (D); production session is server-issued (A) |
| `pratikshya_admin_auth` / `pratikshya_employee_auth` | A/D | Mock today (D); production session is server-issued (A) |
| `pratikshya_admin_sidebar_collapsed` / `pratikshya_employee_sidebar_collapsed` | D | Sidebar rail collapse — pure UI preference; keep client-side |
| `pf_admin_nav_groups` / `pf_employee_nav_groups` | D | Nav group expansion — UI chrome; keep client-side |
| `pratikshya_ai_*_session_*` / `pratikshya_ai_mirror_recent_*` | C | Sandbox AI transcripts — server-side later, never migrated |
| `pratikshya_canonical_media_state_*` | E | One-shot media seed marker — remove post-migration |
| `pratikshya_customers` | E | **Consolidated in Phase 1** (merged into registry, then removed) |
| `pratikshya_employee_assisted_orders` | E | **Consolidated in Phase 1** (merged into `pratikshya_orders`, then removed) |
| `pratikshya_employee_attendance` / `pratikshya_attendance_settings` | E | Migrated once; readers are legacy |

### 7.2 Per-domain migration chain

For each domain, the chain is **CURRENT AUTHORITY → CURRENT STORAGE → CURRENT READERS → CURRENT WRITERS → TARGET FASTAPI ENDPOINT → TARGET DATABASE TABLE → MIGRATION STRATEGY → FRONTEND INTEGRATION STRATEGY**. (Endpoints are planned/target — nothing is implemented.)

**Products** — `catalogRepository` + `productWorkflowCommands` → `pratikshya_products` → all portals, workflow, media, offers, inventory, analytics → catalogRepository/workflow commands → `GET/POST/PATCH /api/v1/admin/products`, `GET /api/v1/catalog/products`, workflow command routes → `products` (+ variants, price/field history, flags) → seed migrates with existing `PF-…` IDs; operator edits only via controlled export → `catalogRepository`/`productWorkflowCommands` keep function names, swap storage for HTTP.

**Taxonomy/collections** — `taxonomyRepository` → `pratikshya_taxonomy_v2` → nav, listings, offers, admin → taxonomyRepository → `GET /api/v1/catalog/taxonomy`, `/api/v1/admin/categories|subcategories|collections` → `departments`/`categories`/`subcategories`/`collections`/`collection_products` → seed authored taxonomy; stored wins by id → `taxonomyRepository` becomes an HTTP adapter; `isProductInCollection` resolution moves server-side (single resolver).

**Media** — `mediaStore`/`mediaRepository` → `pratikshya_media` → media UI, product media set, placements → mediaRepository → `/api/v1/media/*` (signed upload + complete) → `media_assets` + object storage → authored plates migrate as metadata; bytes to object store → `mediaRepository`/`mediaStore` become HTTP + signed PUT.

**Marketing placements** — `marketingPlacementRepository` → `pratikshya_marketing_placements` → rails, hero, listing surfaces → placement admin → `GET /api/v1/catalog/placements/:id`, `/api/v1/admin/marketing/placements/:id/products` → `marketing_placements` + `marketing_placement_products` (IDs only) → IDs migrate; resolver join stays identical server-side → resolver remains pure; repository stores IDs via HTTP.

**Offers** — `offerRepository` → `pratikshya_offers` → cart coupon adapter, admin/employee, explore → offerRepository → `POST /api/v1/offers/validate`, `/api/v1/admin/offers` → `offers` + `offer_redemptions` → seed offers; unique redemption moves server-side → `offerRepository` becomes HTTP; `validateOffer` runs on server.

**Customers** — `customerRegistry` (Phase 1 single store) → `pratikshya_customers_registry` (+ `pratikshya_account_{id}` projection) → AuthContext/AccountContext, admin CRM, employee directory, analytics → AuthContext/AccountContext → `/api/v1/auth/*`, `/api/v1/me`, `/api/v1/admin/customers` → `customers` + `customer_credentials`/`customer_addresses`/`customer_preferences` → identity migrates; passwords cannot be recovered (force reset) → auth contexts become HTTP session adapters; admin/directory read `/admin/customers`.

**Orders** — `orderService` (Phase 1 single store) → `pratikshya_orders` (+ sequence, current-order pointer) → account, admin, employee, analytics, returns → orderService/fulfillment → `/api/v1/orders`, `/api/v1/admin/orders/*`, `/api/v1/employees/{id}/orders/assisted` → `orders`/`order_items`/`order_timeline`/`order_fulfillments` → canonical orders migrate; assisted orders already share the entity (`channel=ASSISTED`); demo orders never seed production → `orderService` becomes HTTP; fulfillment commands map 1:1.

**Inventory** — `inventoryRepository` → 5 `pratikshya_inventory*` keys → stock UI, checkout, analytics, transfers → inventoryRepository → `/api/v1/inventory/*` (+ transfers/transitions) → `inventory_locations`/`balances`/`movements`/`reservations`/`transfers` → seed two locations; quantities/movements migrate if exported → `inventoryRepository` becomes HTTP; reservations move server-side (TTL job).

**Settings** — `settingsRepository` (+ `commerceDefaults`) → `pratikshya_settings` → checkout rules, attendance thresholds, admin settings → settingsRepository → `GET/PUT /api/v1/admin/settings/:section`, `GET /api/v1/catalog/settings` (public slices) → `settings` → sections migrate; shipping/COD/tax become server truth → `readShippingRules`/`readPaymentRules` read API; `checkoutConfig` stays UI metadata.

**Employees/workforce** — `employeeService` + workforce repos → `pratikshya_employees` / `_credentials` / `_activity` / `_attendance` / `_leave` / `_performance` → admin employee management, employee portal, workflow principal, analytics → employeeService + workforce services → `/api/v1/employees/*`, `/api/v1/employees/me`, `/api/v1/employees/{id}/attendance|leave|performance|activity|orders/assisted`, `/api/v1/employees/reports/*` (see `employee-management-api-contract.md`) → `employees`/`employee_credentials`/`roles`/`permissions`/`attendance_events`/`leave_requests`/`performance_records` → identity + workforce migrate; passwords hashed, temp password one-time → `employeeService`/workforce services become HTTP adapters.

**Cart/wishlist** — `CartContext`/`WishlistContext` → `pratikshya_cart`/`pratikshya_wishlist` → bag UI, checkout, AI, account → CartContext/WishlistContext → `/api/v1/cart`, `/api/v1/wishlist` → `carts`/`cart_items`/`wishlists`/`wishlist_items` → merge guest cart/wishlist on login; server reprice/revalidate → contexts become adapters over the API; client price ignored.

**Auth/session (customer/admin/employee)** — three mock auth contexts → `pratikshya_auth`/`pratikshya_admin_*`/`pratikshya_employee_*` → guards, `/me`, RBAC → auth contexts → `/api/v1/auth/*`, `/api/v1/admin/auth/*`, `/api/v1/auth/employee/*` → `sessions` + credential tables → replace mock fingerprints with Argon2id hashes; issue JWT access+refresh; sessions server-issued → auth contexts become HTTP session adapters; guards still hide nav (hiding ≠ security).

**Sidebar UI preference** — `usePortalSidebarCollapse` → `pratikshya_admin_sidebar_collapsed` / `pratikshya_employee_sidebar_collapsed` (and `pf_*_nav_groups` for group expansion) → `PortalSidebar` → `usePortalSidebarCollapse` → **no endpoint** → **no table** → **stay client-side (D)** — no reason to synchronize → unchanged.

---

## 8 Database Migration Plan

The integration migration must preserve canonical IDs and business history while moving localStorage-backed state into PostgreSQL.

- localStorage registers → PostgreSQL tables
- authored seeds → controlled backend seed/import process
- canonical product/customer/order IDs → preserve identity
- legacy keys → one-time migration only; never new writes
- inventory → migrate balances plus movement/reservation history where available
- employees/workforce → migrate employee identity and workforce records under the Employee API contract

For database entities, relationships, constraints, and transaction boundaries, see `backend-architecture.md`.

## 9 API Integration Strategy

**Conventions**

- Base: `/api/v1`
- Auth: `Authorization: Bearer <opaque session>` or httpOnly cookie (preferred for browsers)
- Errors:
  ```json
  { "ok": false, "error": { "code": "FORBIDDEN", "message": "…" }, "issues": [] }
  ```
- Success: `{ "ok": true, "data": …, "meta": { "version": … } }`
- Idempotency-Key on payments, order create, offer redeem, inventory movements

### 9.1 Auth

| Method | Route | Auth | Authz | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | public | — | hash password server-side |
| POST | `/auth/login` | public | — | rate-limit |
| POST | `/auth/logout` | session | owner | |
| POST | `/auth/refresh` | refresh token | — | rotate refresh |
| GET | `/auth/me` | session | owner | |
| POST | `/auth/forgot` | public | — | always generic response |
| POST | `/auth/reset` | token | — | |
| POST | `/admin/auth/login` | public | admin credentials | separate cookie name |
| POST | `/auth/employee/login` | public | employee credentials | cannot use admin cookie |
| POST | `/auth/employee/refresh` | refresh token | — | rotate refresh |
| POST | `/auth/employee/logout` | employee | owner | |

Employee management, attendance, leave, performance, activity, assisted orders and reports use `/api/v1/employees/*` as specified in `docs/employee-management-api-contract.md`.

### 9.2 Catalogue (public)

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/catalog/taxonomy` | public | departments tree ACTIVE only |
| GET | `/catalog/products` | public | **server filters PUBLISHED + ACTIVE category** |
| GET | `/catalog/products/:id` | public | 404 if unpublished |
| GET | `/catalog/search` | public | query.js equivalent |
| GET | `/catalog/collections/:slug` | public | membership resolved server-side; works after refresh / new device |
| GET | `/catalog/placements/:id` | public | resolve IDs against live catalogue only |

Staff preview: `GET /admin/products/:id/preview` (not a public query param that bypasses filters).

### 9.3 Admin products & workflow

| Method | Route | Authz | Side effects |
|---|---|---|---|
| GET | `/admin/products` | products.view / admin | includes drafts |
| POST | `/admin/products` | createProduct command | always DRAFT; allocates ID |
| PATCH | `/admin/products/:id` | saveProductDraft | blocked unless editable stage |
| POST | `/admin/products/:id/duplicate` | duplicateProduct | new DRAFT, no media copy |
| POST | `/admin/products/:id/assign` | Super Admin | ACTIVE employees only |
| POST | `/admin/products/:id/submit` | submitProduct | |
| POST | `/admin/products/:id/begin-review` | Super Admin | marker only |
| POST | `/admin/products/:id/return` | Super Admin | **reason required** |
| POST | `/admin/products/:id/approve` | Super Admin | **does not publish** |
| POST | `/admin/products/:id/publish` | Super Admin | requires APPROVED + full revalidation |
| POST | `/admin/products/:id/unpublish` | Super Admin | → DRAFT, clears approval |
| POST | `/admin/products/:id/archive` | Super Admin | non-destructive |
| POST | `/admin/products/:id/restore` | Super Admin | ARCHIVED → DRAFT |
| POST | `/admin/products/bulk/submit\|approve\|publish` | same commands per id | independent results |
| POST | `/admin/products/:id/change-id` | Super Admin | preflight media, persist, transfer, rollback |
| DELETE | `/admin/products/:id` | deleteProductPermanently | confirmProductId body |

**Forbidden:** `PATCH /admin/products/:id { status: "PUBLISHED" }`

### 9.4 Media

| Method | Route | Notes |
|---|---|---|
| POST | `/media/uploads` | returns signed URL; validates MIME/ext/size/dimensions |
| POST | `/media` | commit metadata after upload; refuse blob/data URLs |
| GET | `/media` | library filters |
| POST | `/media/:id/approve\|reject\|archive` | |
| POST | `/media/:id/assign-product` | ownership service |
| POST | `/media/:id/assign-placement` | marketing isolation |
| POST | `/media/:id/cover` | image only |
| PATCH | `/media/:id/order` | |

### 9.5 Commerce

| Method | Route | Notes |
|---|---|---|
| GET/PUT | `/cart` | server prices + availability |
| POST | `/cart/validate` | port of `validateCartItems` |
| GET/PUT | `/wishlist` | |
| POST | `/offers/validate` | port of `validateOffer` |
| POST | `/checkout/reserve` | `reserveCart`; TTL from settings |
| POST | `/checkout/release` | |
| POST | `/orders` | **only after payment verified or COD**; never accepts `paymentStatus` from client |
| GET | `/orders` | owner only |
| POST | `/orders/:id/cancel` | restock via reservation allocations |
| POST | `/payments/intents` | amount from reservation/order, env flag |
| POST | `/payments/webhooks` | **only path that can mark paid** |
| GET | `/admin/orders` | |
| POST | `/admin/orders/:id/allocate\|pick\|pack\|ready\|dispatch\|deliver` | no `forceTransition` |

### 9.6 Inventory, taxonomy, offers, workforce, analytics, settings

Mirror existing repository methods 1:1 (`receiveStock`, `adjustStock`, `createTransfer`, `transitionTransfer`, category/collection CRUD, offer activate/pause/archive, attendance check-in/out, leave request/review, analytics GETs, settings sections). Employee/workforce endpoints follow `docs/employee-management-api-contract.md` under `/api/v1/employees/*`; admin-side mirrors use `/api/v1/admin/*`.

---

## 10 Security & Authority Migration

### 10.1 Three portals, three sessions

| Portal | Principal | Cookie / audience |
|---|---|---|
| Storefront | `customers` | `pf_customer` |
| Admin | `admins` with `SUPER_ADMIN` + `ACTIVE` | `pf_admin` |
| Employee | `employees` with login-allowed status | `pf_employee` |

A customer session must never authorize `/admin/*`. An employee session must never run Super Admin workflow commands. This matches `resolvePrincipal` today.

### 10.2 Password handling

Replace `mockCredentialFingerprint` with Argon2id/bcrypt. Never persist plaintext. Customer sign-in today **does not verify a stored secret** — that must change (breaking demo logins is expected and required).

### 10.3 Authorization

Port existing keys in `PERMISSIONS` / `ADMIN_PERMISSIONS`. Server loads principal from session, then:

1. Authenticated?
2. Status allows login?
3. Permission / Super Admin role?
4. Resource ownership (assigned product, order.customer_id, media.uploaded_by)?
5. Lifecycle table?

UI continue to hide unauthorized nav (`hasPermission`) but **hiding is not security**.

### 10.4 Platform security

- Rate limit login, forgot-password, payment intents, media upload
- CORS allowlist (storefront + admin origins only)
- Security headers (CSP, nosniff, frame-ancestors)
- CSRF if cookie sessions
- Audit log every command (existing `ACTIVITY_ACTIONS`)
- Secrets only in server env (payment keys, session secret, storage credentials)
- File upload: magic-byte MIME check, not just extension

---

### 10.5 Client-authoritative values that must become backend-authoritative

- price
- stock
- payment status
- publication
- role
- permissions
- order state
- offer calculation

See `backend-architecture.md` for the complete security architecture.

## 11 Migration Phases

**Stop here until this audit is approved.** After approval, implement **Phase A → Phase L** from §10 (each with success / 401 / 403 / 404 / validation / illegal transition / duplicate / refresh / cleared-storage / direct URL tests). The earlier numbered 1–22 list is superseded by the phase plan; the concrete work per phase is unchanged:

- **Phase A — Platform:** FastAPI app, PostgreSQL, SQLAlchemy, Alembic, error envelope, CORS, security headers, rate limits, `audit_logs` table.
- **Phase B — Authentication (customer, admin, employee) + RBAC:** separate sessions + JWT access/refresh; replace mock credentials; `/me`; port permission keys.
- **Phase C — Product/catalogue:** taxonomy + product seed; published-only storefront; wire `getLiveStorefrontProducts`; product CRUD; workflow commands (submit/approve/publish/…, bulk, deleteProductPermanently).
- **Phase D — Taxonomy/collections/marketing:** collection membership IDs/rules; slug URLs; placements IDs-only, resolve live.
- **Phase E — Media + object storage:** upload validation; ownership commands; no blob persistence.
- **Phase F — Customers:** profile, addresses, preferences.
- **Phase G — Cart/wishlist/offers:** server prices; merge on login; offer validate + admin lifecycle.
- **Phase H — Orders + inventory:** locations, receive/adjust/transfer, availability; TTL reservations; orders & fulfillment commands (no `forceTransition`; COD pending).
- **Phase I — Payments/returns/refunds:** sandbox vs live; webhook confirmation; inspect then restock; provider refund.
- **Phase J — Workforce + settings + analytics.**
- **Phase K — Notifications/background jobs + remove production localStorage writes** for authoritative entities (keep UI chrome keys).
- **Phase L — AI services (future):** AI service boundary only; no core-commerce coupling.

### 11.1 Test additions (every integrated feature)

- success  
- validation failure  
- unauthenticated / forbidden  
- missing resource  
- invalid lifecycle transition  
- stale data (version / updated_at)  
- duplicate mutation / idempotency  
- refresh persistence  
- cleared browser storage  
- direct URL (`/product/:id`, `/collection/:slug`, `/admin/products/:id`)  
- concurrent reservation/publish where relevant  

**Do not weaken or delete existing architecture tests** (`canonicalLifecycle`, `publishVisibility`, `marketingPlacement`, `canonicalDepartmentArchitecture`, `collectionResolution`, etc.).

---

## 12 Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Client-trusted payment success | Orders already marked PAID in the SPA | Webhook-only capture; ignore client status |
| Client-trusted auth | Customer password unused; admin fingerprint reversible | Real hashes, httpOnly sessions, re-resolve principal like `resolvePrincipal` |
| Lifecycle bypass | A generic status update would skip APPROVED | No status PATCH; bulk = loop commands |
| Department split | Would break canonical catalogue + IDs | One `products` table; filter by department |
| Placement snapshots | Stale unpublished products on homepage | Store IDs; resolve live |
| Blob URLs | Broken images after refresh | Already stripped; object store required before real uploads |
| Dual customer stores | **FIXED in Phase 1** — `pratikshya_customers` merged into `pratikshya_customers_registry` | One `customers` table |
| `forceTransition` | Admin can skip fulfilment | Omit from production API |
| Demo order seed | Fake orders appear on empty storage | Production: empty; demo flag only |
| Inventory reservations in localStorage | Holds vanish / never expire across devices | Server TTL job |
| Offer usage race | Double redeem | unique (offer_id, order_id) + row lock |
| Product ID rename + media | Partial update | single DB transaction (frontend already rollbacks) |
| Pricing drift | Client `price` vs engine | Server `computePricing`; cart ignores client price |
| Settings vs checkoutConfig | Shipping fee duplicated | Settings become server truth; UI reads API |
| AI mocks | Not persistence-critical | Defer; they already read catalogue repository |
| Brand logo replacement | Explicitly forbidden | Keep `src/assets/pratikshya_logo.webp` |
| Existing tests | Many audits assert localStorage + commands | Keep tests; add API tests alongside; adapter can fake storage in unit tests |
| `EmployeeDesk` placeholders | Incomplete ops UIs | No schema speculation |
| CORS / preview hosts | Arena / production origins | allowlist, not `*` |

**Dependencies between migrations:** Auth (1) before staff writes; Catalogue (2–3) before marketing/collections; Workflow (5) before trusting publish; Media (6) before real uploads; Inventory (9) before checkout reserve (12); Payments (13) before production orders (14).

---

## 13 Open Questions / Approval Required

Only unresolved questions belong here. Solved architecture decisions remain in `backend-architecture.md`; detailed employee API questions belong in `employee-management-api-contract.md`.

## 14 Final Integration Verdict

Phase 1 frontend stabilization is complete. The frontend is shaped for a repository-preserving backend migration, but the HTTP backend, PostgreSQL persistence, production authentication, payment authority, and object storage remain planned work.

## 15 Appendix A. Preserved Target Backend Reference

The original audit contained additional target architecture, database, lifecycle, media, marketing, payment, and approval material. It is retained here so no architectural audit content is discarded; the master architecture remains authoritative for system design.

### 15.1 Principles (non-negotiable)

1. **Frontend remains the UX source of truth.** Backend persists, authorizes, validates, and enforces lifecycle. It does not redesign workflows.
2. **No parallel implementations.** One product service, one workflow command module, one media ownership service, one inventory mutation surface, one payment confirmation path.
3. **Never trust the client** for: role, price, stock, publication status, payment status, order status, offer discount, or media URLs.
4. **Commands, not status PATCH.** `submitProduct`, `approveProduct`, `publishProduct`, `unpublishProduct`, `archiveProduct`, `restoreProduct`, `returnProduct` are the only legal publication transitions. Bulk endpoints loop those commands inside a transaction per item (independent success/failure).
5. **Replace repositories, not pages.** Integration shape:
   ```
   OLD SOURCE → BACKEND API → FRONTEND SERVICE (existing module) → EXISTING UI
   ```
6. **localStorage** may remain as a **development fallback** behind a flag (`VITE_API_BASE` empty → current behaviour). Production builds must not write authoritative business state only to the browser.

### 15.2 Planned backend layout (Python + FastAPI — supersedes the earlier Node suggestion)

> **Updated decision.** The backend stack is **Python + FastAPI + PostgreSQL + SQLAlchemy + Alembic**. The earlier revision suggested "Node + a single SQL database"; that is **superseded** — FastAPI is the locked framework, and PostgreSQL is the database. Nothing here is implemented.

```
backend/
  app/
    main.py           # FastAPI application factory, lifespan, health
    core/             # environment, constants, placement catalogue, permission keys
    api/v1/           # FastAPI routers — HTTP only
    models/           # SQLAlchemy ORM models
    schemas/          # Pydantic v2 request/response schemas
    repositories/     # SQLAlchemy data access (no HTTP, no auth decisions)
    services/         # business commands: identity, catalog, workflow, media,
                      #   marketing, inventory, commerce, payments, workforce, audit, settings
    dependencies/     # auth principal, RBAC, pagination
    middleware/       # auth, RBAC, idempotency, rate-limit, request-id, CORS, CSRF
    workers/          # background jobs (expiry sweepers, notifications)
    ai/               # FUTURE AI service boundary (empty scaffold)
  alembic/            # migrations
  seeds/              # taxonomy, canonical products, admin, settings
  tests/
  requirements.txt
  .env.example
```

Domain grouping is **logical** (a modular monolith), not microservices. One Python process, one PostgreSQL database; cross-domain work (checkout) is a service transaction calling multiple repositories inside `BEGIN … COMMIT`.

Do **not** introduce microservices, a second catalogue DB, or department-specific services.

### 15.3 Frontend integration seam (no UI rewrite)

Each existing module becomes a thin adapter:

| Frontend module | Becomes |
|---|---|
| `catalogRepository` | HTTP to `/admin/products` + `/catalog/products` |
| `productWorkflowCommands` | HTTP to workflow command routes (keep the same function names) |
| `mediaRepository` / `mediaStore` | HTTP + signed upload |
| `marketingPlacementRepository` | HTTP; resolver stays pure |
| `taxonomyRepository` | HTTP |
| `offerRepository` | HTTP |
| `inventoryRepository` | HTTP |
| `orderService` | HTTP |
| `getPaymentService()` | real client SDK **only to tokenize**; capture via backend |
| `AuthContext` / admin / employee auth | HTTP sessions |
| `getLiveStorefrontProducts` | `GET /catalog/products` (or keep hydrate-from-API cache) |

`workflowCommandRegistry` late-binding can stay: register HTTP-backed commands instead of localStorage writers.

---

### 15.4 Entities to create (canonical)

> **Naming note (aligned with `backend-architecture.md`):** this audit previously used `users` for customers. The canonical names are now `customers` / `customer_credentials` / `customer_addresses` / `customer_preferences`, with one shared `sessions` table keyed by `principal_kind`. "users" is retired.

**Identity**

- `customers` — id, email unique, phone, names, dob, avatar, status, timestamps
- `customer_credentials` — customer_id, password_hash (argon2id/bcrypt), password_changed_at
- `customer_addresses` — customer_id, fields matching AddressModal, is_default
- `customer_preferences` — notification flags
- `admins` — admin_id, name, email, phone, role=`SUPER_ADMIN`, status, last_login
- `admin_credentials`
- `employees` — employee_id, names, role, status, department, location, assignment meta
- `employee_credentials`
- `sessions` — one table, `principal_kind ∈ {CUSTOMER, ADMIN, EMPLOYEE}`, token hash, expiry, device meta
- `employee_permission_grants` — extra grants beyond role defaults  
  *(Do not store employee-account admin permissions on employees.)*

Alternatively a single `accounts` table with `kind ∈ {CUSTOMER, ADMIN, EMPLOYEE}` — acceptable **only if** the three auth boundaries remain separate sessions and cannot cross portals. Prefer separate tables to match the frontend’s three isolated contexts (same as `backend-architecture.md`).

**Taxonomy & catalogue**

- `departments` (women, bridal, men, kids) — seed from `data/catalog/taxonomy.js`
- `categories` — department_id, slug unique per department, status, seo, sort, featured
- `subcategories` — category_id, slug unique per category, status
- `products` — **one table for all departments**
- `product_variants`
- `product_collections` (M2M) plus optional denormalised `products.collection` label
- `product_price_history`
- `product_field_history` (Phase 22 field audit)
- `collections` — type MANUAL/RULE_BASED, rule JSON, schedule, status
- `collection_products` — (collection_id, product_id, sort)

**Workflow (columns on products, not a second product table)**

- `status` CHECK IN (`DRAFT`,`PENDING_REVIEW`,`PUBLISHED`,`ARCHIVED`)
- `review_state` CHECK IN (`NONE`,`PENDING`,`APPROVED`,`REJECTED`)
- `assigned_employee_id`
- `workflow` JSON (`employeeReviewStartedAt`, `adminReviewStartedAt`, `approvedAt`)
- `published_at`, `published_by`, `reviewed_*`, `rejection_reason`

**Media**

- `media_assets` — id, type IMAGE/VIDEO, scope, status, product_id nullable, placement nullable, role, sort, urls (never blob), mime, size, dimensions, checksum, ownership, usage_roles[], mapping/duplicate flags, uploaded_by_*
- `media_groups` + `media_group_items` + decision enum
- Object storage keys, not filesystem paths as identity

**Marketing**

- `marketing_placements` — id from `MARKETING_PLACEMENTS` enum (config, not user-invented)
- `marketing_placement_products` — (placement_id, product_id, sort) **IDs only**

**Inventory**

- `inventory_locations` — STORE/WAREHOUSE, status
- `inventory_balances` — unique (product_id, variant_id, location_id)
- `stock_movements` — append-only ledger
- `stock_transfers` + history
- `stock_reservations` + `stock_reservation_allocations`

**Commerce**

- `carts`, `cart_items` (server prices)
- `wishlists`
- `offers`, `offer_redemptions` (unique offer_id+order_id)
- `orders`, `order_items` (snapshot of name/sku/price **at purchase**, plus product_id FK)
- `order_timeline`
- `payments`, `payment_events` (provider, env SANDBOX|LIVE, provider_ref, amount, status)
- `returns`, `return_items`, `refunds`

**Workforce / ops**

- `attendance_events`, `leave_requests`, `performance_records`
- `audit_logs` (house diary — port `ACTIVITY_ACTIONS`)
- `settings` (JSONB sections matching `SETTINGS_DEFAULTS`)

### 15.5 Entities **not** to create

- `kids_products`, `women_products`, `men_products`, `bridal_products`
- `marketing_product_snapshots`
- `admin_catalogue` / `employee_catalogue`
- Parallel offer/cart/order tables per portal
- Payment-success flags writable by the SPA
- A `media` table keyed by filename as product identity
- Placeholder warehouse/support/styling case tables until those UIs exist

### 15.6 Key relationships

```
departments 1—n categories 1—n subcategories
products n—1 department, n—1 category, n—1 subcategory
products 1—n variants
products 1—n media_assets (ownership)
products n—n collections
marketing_placements n—n products (IDs)
inventory_balances n—1 products, n—1 locations
orders n—1 customers, 1—n order_items n—1 products
payments n—1 orders
stock_reservations n—1 carts/orders
employees 1—n assigned products
audit_logs n—0..1 products/orders/media/offers
```

### 15.7 Constraints (minimum)

- Unique: `products.id`, `products.slug`, SKU across products+variants, `offers.code`, `customers.email`, `employees.employee_id`, `admins.admin_id`
- Check: product status, media status/scope, order status, payment env
- FK: product.category → categories; media.product_id → products ON UPDATE CASCADE is **dangerous** — prefer application-level rename command (already implemented) over DB cascade
- Soft-delete: products default **ARCHIVE**; media default **ARCHIVED**; hard delete only via `deleteProductPermanently` rules
- Indexes: products(status, department, category, subcategory), products(slug), media(product_id, scope, status), orders(customer_id, status), inventory unique tuple, placement products (placement_id, sort)

### 15.8 Seed strategy

1. Migrate authored taxonomy (`data/catalog/taxonomy.js`) as immutable seed migration.
2. Migrate authored products (`data/catalog/products.js`) with **existing IDs**.
3. Collections seed + editorial media paths as collection cover URLs (files remain in CDN/`public` until object-store migration).
4. Do **not** auto-import `pratikshya_*` localStorage from browsers into production.

---

### 15.9 Canonical stages (keep)

Publication path:

```
DRAFT → SUBMITTED (status=PENDING_REVIEW, review=PENDING)
      → APPROVED  (review=APPROVED, status still PENDING_REVIEW)
      → PUBLISHED (status=PUBLISHED)
```

Operational overlays (not extra publication steps): ASSIGNED, IN_EMPLOYEE_REVIEW, IN_ADMIN_REVIEW, RETURNED (presentation → editable DRAFT).

Terminal/side paths: `archiveProduct`, `restoreProduct` (→ DRAFT), `unpublishProduct` (→ DRAFT, clears approval). Existing PUBLISHED rows stay PUBLISHED (grandfathering).

### 15.10 Command table (backend must be identical)

| Command | Who | From | To | Extra |
|---|---|---|---|---|
| createProduct / createDraftProduct | Admin or employee `products.manage` | — | DRAFT | allocate canonical ID |
| saveProductDraft | Admin or **assigned** employee | editable stages | same | employee field whitelist |
| assignProduct | Super Admin | any non-archived | same + assignee | employee ACTIVE |
| submitProduct | Admin or assignee | DRAFT/ASSIGNED/IN_EMPLOYEE_REVIEW | SUBMITTED | validator mode=`submit` |
| beginAdminReview | Super Admin | SUBMITTED | IN_ADMIN_REVIEW | timestamp only |
| returnProduct | Super Admin | not PUBLISHED/ARCHIVED | DRAFT + REJECTED | **reason required** |
| approveProduct | Super Admin | SUBMITTED / IN_ADMIN_REVIEW | APPROVED | validator `approve`; **no storefront** |
| publishProduct | Super Admin | **APPROVED only** | PUBLISHED | **full revalidation**; ignore prior pass |
| unpublishProduct | Super Admin | PUBLISHED | DRAFT | clear approvedAt |
| archiveProduct | Super Admin | not archived | ARCHIVED | keep media ownership |
| restoreProduct | Super Admin | ARCHIVED | DRAFT | |
| bulk* | same auth | — | — | loop individual commands |
| deleteProductPermanently | Super Admin | unused DRAFT | removed | confirm ID; unassign media |

Storefront read path **must not** accept client `status`.

### 15.11 Publish validator (port as-is)

`productPublishValidator.js` + `getPublishIssues`: Product ID, real name (not placeholder), SKU, category, price > 0, description, owned primary media, no ownership conflicts, blocking review flags cleared, group decisions resolved, category ACTIVE.

---

### 15.12 Ownership & scopes

Keep `MEDIA_SCOPES`: PRODUCT | MARKETING | UNASSIGNED.  
Keep `MEDIA_STATUS`: DRAFT → PENDING_REVIEW → ACTIVE | REJECTED | ARCHIVED.  
Customer sees **ACTIVE + url** only.

A media asset has **at most one productId**. Transfer requires explicit confirm. Marketing assets cannot be product-owned and vice versa (`mediaOwnershipService`).

Product ID rename: preflight all owned assets → persist new ID → transfer each → rollback on any refusal (already implemented — lift to a DB transaction).

### 15.13 Files

- Production storage: S3-compatible (or equivalent), private bucket + signed read URLs or CDN.
- Accept: JPEG, PNG, WebP, AVIF, MP4, WebM (same as `UPLOAD_RULES` / settings.media).
- Validate: extension, MIME, magic bytes, size, optional min dimensions, ownership of upload session.
- **Never persist** `blob:` or `data:` (`isEphemeralUrl` already strips them).
- Canonical catalogue plates on the product record (`product.media.primary/gallery` under `public/images/products/…`) remain valid **stable URLs**; managed library is additive, not a discovery of folders.
- Product identity is **not** derived from filenames. Filename grouping is a **review signal** only.

### 15.14 Cover / gallery

One COVER image per product; videos cannot be cover. `sortOrder` dense. Deleting cover promotes next image.

---

Placement catalogue stays in config (`MARKETING_PLACEMENT_OPTIONS`):

- **GENERIC / live:** HOME_HERO, EDITORIAL, PROMOTION → media_assets.placement, publicOnly ACTIVE.
- **PRODUCT / live:** SAREE, LEHENGA, FESTIVE, WOMEN, BRIDAL, GROOM, KIDS, BANGLES, JEWELLERY, NEW_ARRIVALS → ordered product IDs only.

Resolver (`marketingPlacementResolver`) already:

1. Reads IDs from placement register  
2. Looks up caller’s product list  
3. **Storefront passes `getLiveStorefrontProducts()`** so unpublished/archived/invalid IDs drop out  
4. Editorial plates require a resolvable primary image  

Backend must do the same join: `placement_products ⋉ products WHERE status=PUBLISHED AND category ACTIVE`. Do not cache product name/price/image on the placement.

House-selection fallbacks (`houseSelectionFallback: true`) remain **frontend merchandising behaviour** driven by live catalogue flags — not hardcoded IDs.

Direct collection URLs (`/collection/:slug`) already go through `taxonomyRepository.findCollection` + `isProductInCollection`. After backend, that query must be server-side so refresh / logout / other device still works.

---

### 15.15 Current (unsafe for production)

- Methods: UPI, card, netbanking, **Sandbox QR**, COD (`checkoutConfig`).
- `MockPaymentService` resolves success/failure in the browser.
- `buildOrderRecord` sets `paymentStatus: PAID` for non-COD and writes PAYMENT_CONFIRMED timeline **at create time**.
- Sandbox QR payload is explicitly `env: "sandbox"` and contains no secrets — keep that separation.

### 15.16 Target

```
Checkout UI
  → POST /checkout/reserve   (stock hold)
  → POST /payments/intents   (amount from server; env=sandbox|live)
  → customer completes gateway / Sandbox QR
  → provider webhook → POST /payments/webhooks
       transaction: verify signature, amount, currency, order
       insert payment_events
       if LIVE success: mark order PAID, confirmReservationSale, record offer redemption
       if SANDBOX: mark order SANDBOX_PAID / demo status — never mix with live settlement reports
  → frontend polls GET /payments/:id or /orders/:id  (never POST paid=true)
```

COD: order created `paymentStatus=PENDING`, no capture.

**Forbidden:** frontend `paymentStatus: "PAID"`, treating Sandbox QR scan as live money, storing gateway secrets in Vite env for the browser.

Refunds: provider API from server after return inspection — demo copy today already says no real movement.

---

This audit is complete. **No backend scaffolding, schema, or frontend persistence rewrite should start until explicit approval** of:

1. One canonical `products` entity (no per-department repositories)  
2. Command-only lifecycle (approve ≠ publish)  
3. Placements as product ID lists resolved at read time  
4. Webhook-only payment capture; Sandbox QR isolated  
5. Three-portal auth  
6. **Python + FastAPI + PostgreSQL + SQLAlchemy + Alembic** stack (§2.2)  
7. Phase A → Phase L migration order (§10, §12)  

After approval, implementation begins at **Phase A**.
