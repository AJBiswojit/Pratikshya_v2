# PRATIKSHYA FASHON — Feature Rationalization Audit

> **Status:** AUDIT UPDATED — Phase 1 frontend stabilization is complete.
> **Date:** 2026-08-21
> **Scope:** Entire stabilized frontend and its feature/architecture decisions.
> **Purpose:** Decide what should remain, merge, simplify, deprecate, remove, defer, or move to backend.

## 1 Executive Verdict

PRATIKSHYA FASHON is a **complete operational UX** — customer storefront, Admin Portal and Employee Operations Portal — with **no HTTP backend**. Persistence is `localStorage` plus authored seed modules. The architecture is already shaped as repository/command layers that a **Python + FastAPI** backend (the planned stack) can replace feature-by-feature without rewriting UI.

The original audit's findings and their **current resolution status** are summarized below. Detailed evidence per finding follows in the referenced sections.

Recommendation headline (updated):** the Phase 1 cleanup is done. What remains is (a) backend-owned work (payments, auth, authoritative persistence), (b) sandbox/demo seams that stay until the backend exists, and (c) a small set of optional V1.5 simplifications (§11, §16 Phase 4).

---

## 2 Classification System

Classification key: **CORE** = the business cannot run without it · **SUPPORTING** = needed for operations/merchandising · **OPTIONAL** = value-add, deferrable · **FUTURE** = placeholder/skeleton · **DEMO** = intentionally simulated · **UI ONLY** = presentation/preference.

### 2.1 Action vocabulary

- **KEEP** — retain.
- **MERGE** — consolidate into the canonical implementation.
- **SIMPLIFY** — reduce optional complexity without removing the business capability.
- **DEPRECATE** — stop new use while preserving a migration path.
- **REMOVE** — dead or redundant implementation with no remaining business need.
- **BACKEND** — required to become authoritative in production.
- **FUTURE AI** — intentionally deferred to the future AI layer.

## 3 Resolution of Previous Findings

| # | Original finding | Resolution | Evidence |
|---|---|---|---|
| 1 | Two customer stores (`pratikshya_customers` vs `pratikshya_customers_registry`) | **FIXED** | `services/customer/customerRegistry.js` is the single register; `LEGACY_CUSTOMERS_KEY` merged once then removed. Admin CRM, employee directory, account area and analytics all read it (§3.5). |
| 2 | Assisted orders outside the order register (`pratikshya_employee_assisted_orders`) | **FIXED** | `orderService` merges legacy key once then removes it; assisted orders are canonical orders with `channel="ASSISTED"`, `source="employee_assisted"` (§3.8). |
| 3 | Dead-but-linked Preferences page (`/account/preferences` unrouted) | **FIXED** | `<Route path="/account/preferences" element={<AccountPreferences/>}>` now exists (§8). |
| 4 | Unrouted employee analytics page (`EmployeeReports`) | **FIXED** | `/employee/reports` (+ 7 section sub-routes) render `EmployeeReports.jsx` (§8). |
| 5 | Unreachable inventory desk definitions (8 rows) | **FIXED** | Removed from `EmployeeDesk.jsx` (§7.3). |
| 6 | Hardcoded mock returns on employee desk | **FIXED** | `/employee/returns` + `/employee/support/returns` project from the canonical order register (`projectReturns(allOrders)`) (§8, R8). |
| 7 | Three broken collection nav links (`/collections/cotton|linen|chiffon`) | **FIXED** | Nav now derives links from `taxonomyRepository.activeCollections()` (fabric rail from `rule.fabricIncludes`); no hardcoded slugs (§3.4). |
| 8 | Dead code (CorrectionDialog, AdminModulePlaceholder, AdminComingSoon, placeholder copy, catalogue shim, `loadAttendanceMap`, demoOrders stub) | **FIXED** | All removed/simplified in Phase 1 (§7). |
| 9 | Demo/simulated layers (mock auth, payments, AI, dashboard numbers, desk rows) | **STILL OPEN (by design)** | Sandbox/demo seams intentionally remain until the backend exists (§5). |
| 10 | Client-stamped `PAYMENT_CONFIRMED` in `buildOrderRecord` | **STILL OPEN** | Backend-owned (webhook-only) — not a frontend change (§13, HIGH risk item). |
| — | `/collection/:slug` vs `/collections/:slug` routing duality | **FIXED** | `/collection/:slug` is now a legacy redirect to `/collections/:slug` (§8). |
| — | Duplicate collection rule-based resolution | **FIXED** | Single `taxonomyRepository.isProductInCollection` (§3.4). |
| — | Explore `FREE_SHIPPING_THRESHOLD` undefined | **FIXED** | Defined via `commerceDefaults`; Explore reads `readShippingRules()` (§8). |
| — | New Arrivals disconnected from Admin collection assignment | **FIXED** | `NewArrivals.jsx` uses `taxonomyRepository.isProductInCollection(product, "new-arrivals")` (§2.1 S1). |
| — | Legacy `collectionPlates` duplicated collection information | **SUPERSEDED** | `collectionPlates` is now a **derived keyed index** of authored editorial/fabric plates (imagery), not duplicated product membership (§3.4). |
| — | Rigid Admin Collection Detail layout (`min-w-[720px]`, clipped controls) | **FIXED** | Shrinkable `minmax(0,…)` tracks, `min-w-0`, `table-fixed`, truncation, internal scrolling (§2.7 A8). |
| — | Fixed-only portal sidebar | **FIXED** | Shared `PortalShell`/`PortalSidebar` with desktop rail collapse (72px) + mobile drawer (§2.9 X2). |
| — | Shipping/COD config duplication (checkoutConfig vs settings vs utils) | **FIXED** | `config/commerceDefaults.js` single defaults; settings authority via `readShippingRules`/`readPaymentRules` (§3.12). |
| — | `/employee/sales` desk hardcoded figures | **PARTIALLY FIXED** | Real reports routed (R5); `/employee/sales` desk still shows clearly-labelled demo figures (R5 §8). |

**

## 4 Storefront & Customer Features

### 4.1 Storefront (customer)

| # | Feature | Where it lives | Class |
|---|---|---|---|
| S1 | Home / landing (`AtelierDesign`: hero, saree edit, placement rails, bride & groom, celebrations, shop-by-category, new arrivals, kids rail, sale banner) | `pages/AtelierDesign.jsx`, `components/storefront/*` | CORE |
| S2 | Shop catalogue front door | `pages/Shop.jsx` + `CatalogueBrowser` | CORE |
| S3 | Explore discovery feed (offers strip, promo/editorial inserts, load-more grid) | `pages/Explore.jsx`, `components/explore/*`, `data/products/explore.js`, `services/explore/explorePlacements.js` | CORE |
| S4 | Category / collection listing with facets, sort, toolbar | `pages/CatalogueListing.jsx`, `components/storefront/CatalogueBrowser|Toolbar|FilterPanel|ActiveFilters|SortControl|CategoryTabs`, `hooks/useCatalogueQuery`, `data/products/query.js` | CORE |
| S5 | Static interior pages (about / contact / privacy / terms + department group landings) | `pages/CategoryPage.jsx` + `config/navigationConfig.js` manifest | OPTIONAL |
| S6 | Product detail (gallery, purchase panel, accordions, recommendations, staff preview seam) | `pages/ProductDetail.jsx`, `components/product/*` | CORE |
| S7 | Search | `pages/SearchResults.jsx`, `components/shell/SearchPanel.jsx` | CORE |
| S8 | Cart / bag (lines, coupons, quantity, drawer) | `pages/Cart.jsx`, `context/CartContext.jsx`, `components/cart/*`, `data/shopping/coupons.js` | CORE |
| S9 | Wishlist | `pages/Wishlist.jsx`, `context/WishlistContext.jsx` | CORE |
| S10 | Checkout (information → delivery → payment → review) | `pages/Checkout.jsx`, `context/CheckoutContext.jsx`, `components/checkout/*`, `config/checkoutConfig.js` | CORE |
| S11 | Payments (UPI / card / netbanking / sandbox QR / COD) | `services/payment/paymentService.js` (MockPaymentService), `utils/sandboxQr.js`, `components/checkout/PaymentStep.jsx` | DEMO (sandbox) |
| S12 | Order success page | `pages/OrderSuccess.jsx` | CORE |
| S13 | Customer auth (sign in/up, forgot/reset) | `pages/auth/*`, `context/AuthContext.jsx` | DEMO (mock identity) |
| S14 | Account area (dashboard, profile, addresses, orders, order detail, tracking, returns, settings, security) | `pages/account/*`, `context/AccountContext.jsx` | CORE (DEMO auth) |
| S15 | Style preferences (AccountPreferences page) | `pages/account/AccountPreferences.jsx`, `services/customer/stylePreferences.js`, `services/customer/personalization.js` | OPTIONAL — **dead route today** (§7) |
| S16 | Recently viewed | `services/customer/recentlyViewed.js`, `hooks/useRecentlyViewed.js` | OPTIONAL |
| S17 | Personalization engine (style signals → product ranking) | `services/customer/personalization.js` | OPTIONAL |
| S18 | AI Shopping Assistant | `pages/account/AiShoppingAssistant.jsx`, `services/ai/*` | OPTIONAL / DEMO (mock provider) |
| S19 | AI Mirror (virtual try-on) | `pages/account/AiMirror.jsx`, `services/aiMirror/*` | OPTIONAL / DEMO (mock provider, procedural preview) |

## 5 Catalogue & Merchandising

### 5.1 Catalogue & merchandising

| # | Feature | Where it lives | Class |
|---|---|---|---|
| C1 | Canonical product register (one register, seed merged by ID, stored wins) | `services/catalogRepository.js`, `src/data/catalog/products.js` (128 records), key `pratikshya_products` | CORE |
| C2 | Department/category/subcategory taxonomy (managed, seeded from canonical paths) | `services/taxonomyRepository.js`, `src/data/catalog/taxonomy.js`, key `pratikshya_taxonomy_v2` | CORE |
| C3 | Collections (manual IDs + rule-based, lifecycle DRAFT/SCHEDULED/ACTIVE/PAUSED/EXPIRED/ARCHIVED) | `taxonomyRepository.collections*`, `src/data/catalog/collections.js` (editorial plates) | CORE |
| C4 | Storefront projection (`getLiveStorefrontProducts`: PUBLISHED + ACTIVE category only) | `src/data/products/index.js` | CORE |
| C5 | Product lifecycle commands (create/assign/save/submit/return/approve/publish/unpublish/archive/restore/bulk, ID change, permanent delete) | `services/workflow/productWorkflowCommands.js` (canonical), `workflowCommandRegistry`, `workflowState`, `productPublishValidator`, `employeeEditableFields`; compat wrappers in `services/productWorkflow.js` + `catalogRepository` | CORE |
| C6 | Product review workspace (unified queue, flags, draft/group panels, media inbox, product groups) | `services/unifiedProductReview.js`, `productReviewFlags.js`, `components/admin/UnifiedReviewQueue|ProductReviewDetail|ProductDraftReviewPanel|ProductGroupReviewPanel|MediaInboxCard` | CORE |
| C7 | Product editor (admin + employee, field whitelist per stage) | `components/products/*`, `pages/admin/ProductForm.jsx`, `pages/employee/EmployeeProductForm.jsx` | CORE |
| C8 | Pricing engine (MRP ≥ selling, tax mode, price history) | `utils/pricing.js` | CORE |
| C9 | Product IDs (canonical prefixes per family, allocation, rename) | `config/productIdPrefixes.js`, `catalogRepository.validateProductIdChange`, `changeProductId` | CORE |
| C10 | Product deletion safety (dependencies, hard-delete rules) | `services/productDeletionService.js` | SUPPORTING |

## 6 Media & Marketing

### 6.1 Media & marketing

| # | Feature | Where it lives | Class |
|---|---|---|---|
| M1 | Managed media register (upload, review, approve/reject, archive, dedupe) | `services/media/mediaRepository.js` + `mediaStore.js`, key `pratikshya_media` | CORE |
| M2 | Product media ownership (assign/unassign/transfer with contest rules, rename rollback) | `services/media/mediaOwnershipService.js`, `productMediaSet.js` | CORE |
| M3 | Marketing placements (PRODUCT mode — ordered IDs only, never snapshots) | `services/media/marketingPlacementRepository.js` + `Resolver`, `config/mediaTypes.MARKETING_PLACEMENTS`, key `pratikshya_marketing_placements` | CORE |
| M4 | Marketing media (GENERIC mode — scope=MARKETING, HOME_HERO/EDITORIAL/PROMOTION) | `mediaRepository.getMarketingMedia`, `hooks/useMedia`, `components/storefront/HeroCarousel|SaleBanner|CelebrationEdit` | CORE |
| M5 | Navigation editorial media (group → editorial image resolution) | `services/media/navigationEditorialMedia.js` | SUPPORTING |
| M6 | Media groups (deterministic filename parsing + human group decisions) | `mediaGroups.js` + `productMediaGroups.js` (key `pratikshya_media_groups`) | SUPPORTING |
| M7 | Media access / permissions resolution | `services/media/mediaAccess.js`, `hooks/useMediaActions.js` | SUPPORTING |
| M8 | Media QA audit tooling (exposure, audit, validation) | `services/media/mediaExposure.js`, `mediaAudit.js`, `mediaValidation.js` | DEV ONLY |
| M9 | Hero slides (authored copy + static fallback images) | `src/data/catalog/hero.js`, `public/images/hero/*` | SUPPORTING (fallback) |
| M10 | Editorial collection plates (authored) | `src/data/catalog/collections.js`, `public/images/collections/*` | SUPPORTING (fallback) |
| M11 | Brand lockup | `design-system/components/Brand.jsx`, `src/assets/pratikshya_logo.webp` | UI ONLY (LOCKED) |

## 7 Inventory

### 7.1 Inventory

| # | Feature | Where it lives | Class |
|---|---|---|---|
| I1 | Inventory register (locations, balances, status, thresholds) | `services/inventory/inventoryRepository.js`, keys `pratikshya_inventory*` | CORE |
| I2 | Stock movements ledger (receive/adjust/damage/return/inspect) | `inventoryRepository` + `pratikshya_inventory_movements` | CORE |
| I3 | Transfers (request/approve/dispatch/receive lifecycle) | `inventoryRepository` + `pratikshya_inventory_transfers` | SUPPORTING |
| I4 | Reservations (cart reserve, expiry, sale confirm/release, cancellation restock) | `inventoryRepository` + `pratikshya_inventory_reservations` | CORE |
| I5 | Inventory UI (dashboard, operations, transfers, movements, low-stock — shared by Admin & Employee portals) | `components/inventory/*`, `context/InventoryContext.jsx` | CORE |

## 8 Commerce & Customers

### 8.1 Commerce

| # | Feature | Where it lives | Class |
|---|---|---|---|
| O1 | Offers / coupons (CRUD, eligibility, validation, redemption, lifecycle) | `services/offers/offerRepository.js`, `data/offers/seedOffers.js`, key `pratikshya_offers`; legacy adapter `data/shopping/coupons.js` | CORE |
| O2 | Orders (creation, status journey, fulfillment transitions) | `services/orders/orderService.js` + `fulfillmentService.js` + `orderTimelineService.js`, `context/OrderContext.jsx`, keys `pratikshya_orders` / `pratikshya_current_order` / `pratikshya_order_sequence` | CORE |
| O3 | Assisted orders (employee-created) | `pages/employee/EmployeeAssistedOrder.jsx`, key `pratikshya_employee_assisted_orders` — **second order store (§3.8)** | CORE (data-store bug) |
| O4 | Order tracking (customer view, carrier legs) | `services/orders/trackingService.js`, `pages/account/OrderTracking.jsx` | SUPPORTING |
| O5 | Returns / refunds (request→review→pickup→receive→inspect→refund) | `services/orders/returnService.js`, `pages/account/OrderReturn.jsx`, `pages/admin/AdminReturns|AdminReturnDetail` | CORE |
| O6 | Admin order invoice | `pages/admin/orders/AdminOrderInvoice.jsx`, `components/orders/InvoicePreview.jsx` | SUPPORTING |

### 8.2 Customers

| # | Feature | Where it lives | Class |
|---|---|---|---|
| U1 | Customer registry (sign-up writes here) | `context/AuthContext.jsx` → key `pratikshya_customers_registry`, fallback `data/mockCustomers.js` | CORE (mock identity) |
| U2 | Customer profile / addresses / preferences / security | `context/AccountContext.jsx` → key `pratikshya_account_{id}` | CORE (mock identity) |
| U3 | Admin customer list/detail | `pages/admin/AdminCustomers|AdminCustomerDetail` → key `pratikshya_customers` (stale — §3.5) | SUPPORTING |
| U4 | Employee customer directory (walk-ins + registry) | `pages/employee/EmployeeCustomers.jsx`, `operationsService.getDirectoryCustomers`, `data/employees/operations.js` walk-in mocks | SUPPORTING |

## 9 Admin Portal

### 9.1 Admin portal

| # | Feature | Where it lives | Class |
|---|---|---|---|
| A1 | Admin auth (login/logout/session/profile) | `context/AdminAuthContext.jsx`, `services/admin/adminAuthService.js`, keys `pratikshya_admins/_credentials/_auth`, `data/admin/*` | CORE (mock identity) |
| A2 | Admin dashboard (metrics, charts, recent orders fallback) | `pages/admin/AdminDashboard.jsx`, `services/admin/adminDashboardService.js`, `data/admin/dashboardData.js` (static numbers) | CORE (DEMO data) |
| A3 | Employee account management (CRUD, roles, permissions, status, temp password) | `pages/admin/employees/*`, `services/employees/employeeService.js`, `context/EmployeeManagementContext.jsx`, `docs/employee-management-api-contract.md` | CORE |
| A4 | Admin activity diary | `pages/admin/AdminActivity.jsx` ← one shared `activityService` | SUPPORTING |
| A5 | Analytics workspace (overview/sales/products/customers/inventory/returns/offers/employees) | `pages/admin/analytics/AdminAnalytics.jsx`, `components/analytics/*`, `services/analytics/*` | CORE |
| A6 | Settings (17 sections) | `pages/admin/AdminSettings.jsx`, `services/settingsRepository.js`, key `pratikshya_settings` | SUPPORTING |
| A7 | AI Business Assistant | `pages/admin/AiBusinessAssistant.jsx`, `services/ai/business/*` | OPTIONAL / DEMO |
| A8 | Admin product/taxonomy/media/offer/order/customer/return/inventory pages | `pages/admin/*` (shared services with employee portal) | CORE |

## 10 Employee Portal & Workforce

### 10.1 Employee portal & workforce

| # | Feature | Where it lives | Class |
|---|---|---|---|
| E1 | Employee auth (login, forgot, change password, session) | `context/EmployeeAuthContext.jsx`, `services/employees/employeeAuthService.js`, keys `pratikshya_employees/_credentials/_auth` | CORE (mock identity) |
| E2 | Role dashboards (manager/sales/inventory/warehouse/support/stylist) | `pages/employee/EmployeeDashboard.jsx` → `components/employee/dashboards/*` | CORE |
| E3 | Employee products (assigned list, draft edit, review) | `pages/employee/EmployeeProducts|EmployeeProductForm|EmployeeProductReview.jsx` | CORE |
| E4 | Employee offers / orders / customers / media | `pages/employee/EmployeeOffers*|EmployeeOrders|EmployeeOrderDetail|EmployeeCustomers|EmployeeMedia*` | CORE |
| E5 | Attendance (check-in/out, corrections, summaries, history) | `pages/employee/EmployeeAttendance.jsx`, `services/workforce/attendance*`, key `pratikshya_attendance` | CORE |
| E6 | Leave (request/approve/balance) | `pages/employee/EmployeeLeave.jsx`, `services/workforce/leave*`, key `pratikshya_leave` | SUPPORTING |
| E7 | Performance (targets, reviews, comments) | `pages/employee/EmployeePerformance.jsx`, `services/workforce/performance*`, key `pratikshya_performance` | SUPPORTING |
| E8 | Workforce seed (all three stores together) | `services/workforce/bootstrap.js` + `seedWorkforce.js` | DEMO (sandbox seed) |
| E9 | Employee Desk — warehouse/support/styling/sales/team/reports/returns | `pages/employee/EmployeeDesk.jsx` + `operationsService` mocks | FUTURE placeholder (partially mock — §5) |
| E10 | Employee reports (real analytics page, **unrouted**) | `pages/employee/EmployeeReports.jsx` | CORE — dead route (§7) |

## 11 Shared UI Infrastructure

### 11.1 Cross-cutting

| # | Feature | Where it lives | Class |
|---|---|---|---|
| X1 | Design system (tokens, typography, spacing, motion, ~30 components) | `src/design-system/*` | UI ONLY |
| X2 | Shared portal shell + sidebar (collapsible rail + mobile drawer) | `components/navigation/PortalShell.jsx`, `PortalSidebar.jsx`, `usePortalSidebarCollapse.js`, `usePortalDrawer.js`, `RailTooltip.jsx` (Admin + Employee share them; collapse keys `pratikshya_admin_sidebar_collapsed` / `pratikshya_employee_sidebar_collapsed`) | UI ONLY |
| X3 | Dev QA/audit scripts (21) | `scripts/*.mjs` + `scripts/node-loader/*` | DEV ONLY |
| X4 | Test suite (41 files; grew from 37/347 in the original audit) | `tests/*.test.js`, `tests/helpers`, `tests/temporary/qa-review-prod.mjs` | DEV ONLY |
| X5 | Static media (products 214 files, collections 19, hero 5) | `public/images/*` | CORE asset (fallback) |

---

## 12 Duplication, Legacy & Mock Layers

Trace method per candidate: **definition → imports → consumers → writers → readers → persistence → routes → UI → tests → business purpose**. Conclusion from {KEEP BOTH, MERGE, SIMPLIFY, DEPRECATE, REMOVE}.

### 12.1 Product vs Catalogue
- **Product:** `services/catalogRepository.js` — ONE register `pratikshya_products`, seeded from `src/data/catalog/products.js` (128 records), merged by ID, stored wins.
- **Catalogue:** `src/data/products/index.js` — pure read projection (`getLiveStorefrontProducts`, `toStorefrontProduct`, `getProductByIdentifier`, search haystack). No persistence of its own.
- **Traced:** 24+ storefront/admin/employee consumers import `data/products`; every admin mutation goes through `catalogRepository`. No second register exists anywhere (no `kids_products`, `women_products`, etc.).
- **Conclusion:** **KEEP BOTH** (canonical register + derived projection). One simplification: `src/data/products/catalogue.js` is a 7-line legacy re-export consumed only by `taxonomyRepository` → **SIMPLIFY** (import `data/catalog/products` directly, then delete shim).

### 12.2 Product Media vs Managed Media
- **Authored plates:** `product.media.primary/gallery` inside the canonical seed (paths under `public/images/products/…`).
- **Managed media:** `mediaRepository`/`mediaStore` register `pratikshya_media` (uploads, review, scopes PRODUCT/MARKETING, ownership).
- **Resolution:** `productMediaSet.js` + `data/products/index.js` authored-plates-first, managed override at render (`useProductCovers`/`getProductMediaSet`).
- **Conclusion:** **KEEP BOTH** — deliberately layered fallback, not a duplicate store. Backend note: seed paths must migrate into `media_assets`; precedence must stay “managed wins, authored plate fallback”.

### 12.3 Marketing Media vs Editorial Media
- Both are the same register differentiated by `scope`/`usageRoles` (HOME_HERO, EDITORIAL, PROMOTION, LOOKBOOK, COLLECTION_COVER…). No separate editorial media store.
- **Conclusion:** **KEEP** — one register, two usage vocabularies. No merge needed.

### 12.4 Collections vs Editorial Collections — **FIXED (nav) / SUPERSEDED (plates)**
- **Managed collections:** `taxonomyRepository` seeds + `pratikshya_taxonomy_v2` (ids `new-arrivals`, `featured`, `heritage-weaves`, `festive-edit`, `handloom-stories`, `bridal-trousseau`, `everyday-atelier`, `groom-atelier`, `silk`, `wedding`; some RULE_BASED with `rule.flag`/`rule.occasion`/`rule.fabricIncludes`).
- **Editorial plates:** `src/data/catalog/collections.js` `editorialCollections` + `fabricCollections` (festive-edit, heritage-weaves, new-arrival, chiffon, cotton, linen, silk) — storytelling imagery, explicitly “NOT product records”.
- **Nav hardcoding (historical):** `navigationConfig.js` previously hardcoded collection links; three were dead (`/collections/cotton`, `/collections/linen`, `/collections/chiffon`). **FIXED:** `collectionNavigationColumns()` now derives both editorial and fabric rails from `taxonomyRepository.activeCollections()`, filtering the fabric rail by `collection.rule?.fabricIncludes`. No hardcoded slugs remain.
- **`collectionPlates` (historical “duplicate information” finding):** **SUPERSEDED** — `collectionPlates` is now a derived keyed index built from `editorialCollections` + `fabricCollections` (keyed by both `id` and `taxonomyId`) and consumed only as imagery fallback by `CatalogueListing` and `mediaResolver`. It no longer duplicates product membership; membership is resolved by `taxonomyRepository.isProductInCollection` (single resolver — see below).
- **Conclusion:** **KEEP BOTH layers** (plates are fallback imagery, membership is managed). **FIXED** for nav; membership resolution now has exactly one rule evaluator (`taxonomyRepository.isProductInCollection`: manual `productIds` + label match + `rule.flag` + `rule.occasion` + `rule.fabricIncludes`).

### 12.5 Customer vs Customer Registry — **REAL DUPLICATE → FIXED**
- `pratikshya_customers_registry` — the canonical register (`services/customer/customerRegistry.js`). Written by `AuthContext` (sign-up) and `AccountContext` (profile updates); read by the employee directory, analytics, account area, **and now Admin CRM**.
- `pratikshya_customers` — **historical** legacy admin list. **FIXED in Phase 1:** `customerRegistry.migrateLegacyCustomers()` merges it into the registry once, then removes the key (`LEGACY_CUSTOMERS_KEY`). `AdminCustomers`/`AdminCustomerDetail` and `analyticsService` now read `loadCustomerRegistry()`.
- **Resolution:** **FIXED** — one list store; the legacy key is migration/legacy only.

### 12.6 Customer Account vs Admin Customer Store
- `pratikshya_account_{id}` is a per-user profile cache written by `AccountContext` — a *projection* of the registry record + addresses/preferences/security, not a second identity. **FIXED:** the list-store duplication is resolved (§3.5); the per-account projection remains until backend sessions exist, then it becomes `GET /me`.

### 12.7 Offers vs Promotions
- `offerRepository` is the single offers/promotions store; `data/shopping/coupons.js` is a documented Phase-17 adapter with one `@deprecated` export (`coupons = []`) kept only for old imports; legacy codes WELCOME10/FESTIVE15/BRIDAL20 were migrated into the offer register.
- **Conclusion:** **KEEP** adapter, **SIMPLIFY** later (drop deprecated export once cart/checkout import paths are the only consumers — they already go through the adapter functions).

### 12.8 Checkout vs Order Draft vs Assisted Orders — **REAL DUPLICATE (orders) → FIXED**
- `pratikshya_checkout` = in-progress checkout draft (cart snapshot + steps). Correct as a draft — **KEEP**.
- `pratikshya_orders` = the canonical order register. `pratikshya_current_order` = the last placed order pointer (derived).
- `pratikshya_employee_assisted_orders` = **historical** second order store. **FIXED in Phase 1:** `orderService.migrateAssistedOrders()` lifts legacy tickets into `pratikshya_orders` once, then removes the key. New assisted orders are created through `orderService` with `channel: "ASSISTED"` / `source: "employee_assisted"`; `operationsService.getAssistedOrders` now filters the canonical register (`loadOrders().filter(isAssistedOrder)`).
- **Conclusion:** **FIXED** — one order entity. Checkout draft itself: **KEEP** (correct staging concept).

### 12.9 Review vs Approval
- Both are steps of ONE lifecycle (`DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED`). `productReviewFlags` / media groups are review *signals*; `approveProduct` is a *command* that does not publish. The unified review queue (`unifiedProductReview` + `UnifiedReviewQueue`) superseded per-category review panels; `ProductDraftReviewPanel`/`ProductGroupReviewPanel`/`ProductReviewDetail` remain as sub-views of the same queue.
- **Conclusion:** **KEEP** (single workflow, multiple views). Optional SIMPLIFY: fold the four review-presentation components into the unified queue after backend.

### 12.10 Inventory vs Stock
- One inventory layer (`inventoryRepository`, five namespaced keys). `operationsService.getCatalogueStock` is a derived read-model for dashboards. EmployeeDesk’s inventory desk views are **shadowed by real routes and unreachable** (dead code — §7.3).
- **Conclusion:** **KEEP** repository + read-model; **REMOVE** unreachable desk rows.

### 12.11 Activity vs Audit Logs
- One diary: `activityService` + `pratikshya_employee_activity`, written by every repository command, read by `/admin/activity`, employee feeds, per-entity timelines.
- Naming collision only: `mediaAudit.js` / `mediaExposure.js` are **QA tooling** (dev scripts/tests), not runtime audit logs. **KEEP** diary; re-label tooling as dev-only.

### 12.12 Settings vs Checkout Configuration — **OVERLAP → FIXED**
- `settingsRepository` (`pratikshya_settings`, admin-editable) is the runtime authority for shipping, payments, returns, orders, inventory thresholds, media limits.
- **FIXED in Phase 1:** `config/commerceDefaults.js` is now the **single authored default** (`COMMERCE_DEFAULTS`: ₹99 flat, ₹5,000 free threshold, ₹199 express, ₹49 COD). `readShippingRules()` / `readPaymentRules()` resolve **settings-first, defaults-fill**. `utils/shopping.js` re-exports from `commerceDefaults` (`FREE_SHIPPING_THRESHOLD`, `FLAT_SHIPPING_FEE`). `checkoutConfig.js` is demoted to **UI metadata only** (method labels, icons, captions, demo scenarios).
- **Conclusion:** **FIXED** — one source for commerce numbers; `checkoutConfig` is UI-only. (Backend target: settings become server truth; public numbers via `GET /api/v1/catalog/settings`.)

### 12.13 Hero vs Marketing Media
- `data/catalog/hero.js` = authored slide copy + static fallback images; managed `HOME_HERO` marketing media overrides at render (`resolveHeroImageIds` + `useMarketingMedia`). Fallback pattern again.
- **Conclusion:** **KEEP** (fallback pattern). Backend: hero copy becomes CMS content; static images migrate to object storage.

### 12.14 Employee roles vs employee permissions; Admin roles vs admin permissions
- ONE employee permission catalogue (`employeePermissions.js`) + role defaults (`employeeRoles.js`) + per-employee custom grants; admin domain owns a separate `SUPER_ADMIN` role with `employees.manage` — deliberately isolated from employee permissions (employee records can never carry admin authority; admin identity is never an employee). 
- **Conclusion:** **KEEP** both vocabularies (separate identity domains, by design). Do not unify.

### 12.15 Product workflow: three layers, one implementation
- `workflow/productWorkflowCommands.js` = canonical commands; `workflowCommandRegistry` = late-binding seam; `services/productWorkflow.js` = documented compatibility wrappers (delegate 1:1); `catalogRepository.LEGACY_STATUS_COMMANDS` = adapter section delegating to the registry. No second implementation exists.
- **Conclusion:** **KEEP** now; **SIMPLIFY** after backend (delete wrapper module, update 8 importers).

### 12.16 Workforce attendance: two keys, one live
- `pratikshya_attendance` (canonical, via `ATTENDANCE_STORAGE_KEY`) vs legacy `pratikshya_employee_attendance` (migrated once, never written). Legacy `pratikshya_attendance_settings` likewise migrated into `pratikshya_settings` by `settingsRepository.migrated()`.
- **Conclusion:** **REMOVE** legacy constants + migration readers once migration is retired (dev-only keys).

### 12.17 Order summary components (visual overlap only)
- `cart/OrderSummary` (Cart page), `checkout/CheckoutOrderSummary` (Checkout), `orders/OrderSummaryPanel` (account OrderDetail). All three are used and render differently-scoped data.
- **Conclusion:** **KEEP**; optional design-system consolidation only — no business duplication.

---

Per entity: current source, secondary copies, derived data, cache, seed, mock, static data — then the single authoritative source recommended for backend.

| Entity | Current source of truth | Secondary copies | Derived | Cache | Seed | Mock | Static | Authoritative (keep) |
|---|---|---|---|---|---|---|---|---|
| Product data | `pratikshya_products` (catalogRepository) | none (register is single) | `data/products/index.js` projections (in-memory) | normalized-list cache w/ fingerprint | `src/data/catalog/products.js` (128 records, merged by ID, stored wins) | — | — | **products table** (seed migrates with existing IDs) |
| Customer data | `pratikshya_customers_registry` | **`pratikshya_customers` (stale admin list, no writer) + `pratikshya_account_{id}` per-user projection + `INITIAL_DEMO_CUSTOMERS` + walk-in mocks** | directory views, analytics joins | account projection cache | `data/mockCustomers.js` (10 demo) | demo accounts, walk-ins | — | **users table** — after merge, registry is the ONLY list store |
| Category data | `pratikshya_taxonomy_v2` (taxonomyRepository) | `data/catalog/taxonomy.js` authored hierarchy (seed) | `data/products/taxonomy.js` facade + `departments.js` helpers (derived at load) | none | authored taxonomy | — | — | **departments/categories/subcategories tables**; seed is the canonical path vocabulary |
| Collection membership | `pratikshya_taxonomy_v2` collection records (productIds + optional rule) | `data/catalog/collections.js` editorial plates (imagery only) | `collectionsForProduct`, `collectionRoutes` | none | 10 collection seeds | — | plates under `public/images/collections/` | **collections + collection_products** (IDs or rule — never hardcoded in pages) |
| Media metadata | `pratikshya_media` (mediaStore/mediaRepository) | product.authored `media.primary/gallery` plates (fallback) | product media set resolution, exposure indexes | memoized library cache | `data/media/seedMedia.js` (empty) | — | `public/images/products/**` (fallback files) | **media_assets + object storage** (authored plates migrate in; managed wins) |
| Pricing | product record via `utils/pricing.js` (`computePricing`) | `checkoutConfig.js` + `utils/shopping.js` shipping constants (see §3.12) | cart/checkout totals, inventory valuation | none | product seed prices | — | — | **product pricing columns, server-recomputed**; shipping rules from settings |
| Inventory | `pratikshya_inventory*` (5 keys, one repository) | `operationsService.getCatalogueStock` derived read-model | dashboards, availability | none | seed locations/bootstrapping | — | — | **balances/movements/transfers/reservations tables** |
| Order state | `pratikshya_orders` + `pratikshya_current_order` + `pratikshya_order_sequence` | **`pratikshya_employee_assisted_orders` (second order store — merge)** | analytics, dashboards | context state | `demoOrders.js` (stubbed `[]`) | demo customers list in stub | — | **orders/order_items/order_timeline** |
| Payment state | in-memory `MockPaymentService` session only | checkout context state | — | — | — | fake outcomes | sandbox QR payload | **payments/payment_events (server webhook authority)** |
| Employee permissions | employee record in `pratikshya_employees` (role + custom grants) | `employeeRoles.js` defaults + `employeePermissions.js` catalogue (vocabulary, not data) | nav filtering, route rules | none | `data/employees/mockEmployees.js` seeds | demo credentials | — | **roles/permissions/grants; server re-checks every mutation** |
| Settings | `pratikshya_settings` (settingsRepository) | legacy `pratikshya_attendance_settings` (migrated once) | attendance thresholds read-through | none | `SETTINGS_DEFAULTS` | — | — | **settings table**; checkout/attendance must read here |
| Marketing placements | `pratikshya_marketing_placements` (IDs only) | media scope=MARKETING records (separate dimension, not a copy) | placement resolver joins | none | mediaTypes placement catalogue | — | — | **marketing_placements + _products (IDs only — never snapshots)** |
| Cart / Wishlist / Checkout draft | `pratikshya_cart` / `pratikshya_wishlist` / `pratikshya_checkout` | context in-memory state (mirror) | totals | — | — | — | — | **server carts/wishlists/checkout session** |
| Activity | `pratikshya_employee_activity` (one diary) | in-memory mirror for consistency | per-entity timelines | — | — | — | — | **audit_logs (append-only)** |
| Workforce | `pratikshya_attendance` / `pratikshya_leave` / `pratikshya_performance` | legacy `pratikshya_employee_attendance` (migrated, never written) | summaries, analytics | — | `seedWorkforce.js` (sandbox-only bootstrap) | — | — | **attendance_events/leave_requests/performance_records** |
| AI sessions | `pratikshya_ai_*_session_*` + `pratikshya_ai_mirror_recent_*` | page state | — | — | — | deterministic mock provider | — | **server-side sessions (future)**; sandbox-only today |
| Brand | `src/assets/pratikshya_logo.webp` | none | `Brand.jsx` glob resolution | — | — | — | bundled asset | **LOCKED — keep as frontend asset** |

**Verdicts:** every business capability has exactly ONE authoritative store today, with two exceptions that are the audit’s top cleanup items — **customer lists** (`pratikshya_customers` is a legacy, never-written copy) and **orders** (`pratikshya_employee_assisted_orders` is a second register). Everything else marked “Secondary/Seed/Static” is a documented fallback or derivation, not a competing authority.

---

| Item | Where | Verdict | Class |
|---|---|---|---|
| `MockPaymentService` (in-memory, scenario delays, fake outcomes) | `services/payment/paymentService.js` | **REPLACE WITH REAL BACKEND**; keep for sandbox until gateway exists | KEEP FOR SANDBOX |
| Sandbox QR (`env: "sandbox"`, no credentials, structured payload) | `utils/sandboxQr.js` + `PaymentStep` | **KEEP FOR SANDBOX ONLY** — correctly labelled, must never appear in production | KEEP FOR SANDBOX |
| Frontend payment confirmation (`buildOrderRecord` stamps PAYMENT_CONFIRMED + timeline) | `services/orders/orderService.js` | **REPLACE** — backend webhook must confirm; flag `PAYMENT_CONFIRMED` today is the one canonical-rule breach (§13) | REPLACE |
| Mock customer auth (identity lookup, no passwords, demo accounts, always-“sent” forgot-password) | `AuthContext`, `AccountContext`, `data/mockCustomers.js` (10 demo customers) | **REPLACE WITH REAL BACKEND**; demo accounts stay sandbox-only | REPLACE |
| Mock admin auth (`INITIAL_ADMINS`, fingerprint-not-hash credentials, demo login fill buttons) | `adminAuthService`, `data/admin/*`, `AdminLogin` | **REPLACE** | REPLACE |
| Mock employee auth (temp-password generator, credential fingerprint, demo login buttons) | `employeeAuthService`, `employeeService`, `data/employees/demoCredentials.js` | **REPLACE** | REPLACE |
| Demo customers list (`INITIAL_DEMO_CUSTOMERS` + `pratikshya_customers`) | `data/mockCustomers.js`, admin customer pages | **MERGE into registry**, then REPLACE with backend | MERGE |
| Walk-in mock customers (floor directory) | `data/employees/operations.js` | **KEEP FOR DEVELOPMENT** (offline floor book), defer | KEEP FOR DEVELOPMENT |
| Demo orders generator — `generateDemoOrders()` returns `[]`; 12 customer records unused | `services/orders/demoOrders.js` | **REMOVE or REVIVE** — currently dead stub (§7.7) | REMOVE |
| Admin dashboard static business numbers (sales series, category sales, department performance, metrics) | `data/admin/dashboardData.js` + `adminDashboardService` | **REPLACE** with analytics read-model (same tables already exist) — defer to backend | REPLACE |
| Employee Desk hardcoded rows (support cases, styling requests, appointments, sales figures, reports, returns, feedback) | `EmployeeDesk.jsx`, `operationsService` MOCK_* | **REPLACE for returns** (real register exists), **DEFER for support/styling** (no real entity exists yet), **REMOVE sales/reports mocks** in favour of real analytics (E10 page exists but is unrouted) | REPLACE / DEFER / REMOVE |
| `MOCK_PERFORMANCE` fallback in `operationsService.getPerformance` | `services/employees/operationsService.js` | **REPLACE** — workforce performance register already exists | REPLACE |
| Mock AI provider (deterministic intent resolver + response builder, honest demo footnote) | `services/ai/*` | **KEEP FOR SANDBOX**; provider seam (`aiProvider.js`) is the REPLACE point | KEEP FOR SANDBOX |
| AI Mirror mock try-on (procedural preview; `aiMirrorMockData` overrides are empty) | `services/aiMirror/*` | **KEEP FOR SANDBOX**; empty override files are scaffolding — keep until real provider | KEEP FOR SANDBOX |
| AI mock sessions (`pratikshya_ai_*_session_*`) | `aiSessionStore.js` | **REMOVE** with mock AI, or keep client-side only for sandbox | KEEP FOR SANDBOX |
| Workforce seed (attendance/leave/performance bootstrap) | `services/workforce/bootstrap.js` + `seedWorkforce.js` | **KEEP FOR SANDBOX** (demo data on empty store) | KEEP FOR SANDBOX |
| Browser-only inventory reservations (15-minute expiry, browser clock) | `inventoryRepository.reserveCart` etc. | **REPLACE** with backend atomic reservations | REPLACE |
| Seed catalogue (128 products + taxonomy + collections + hero) | `src/data/catalog/*` | **KEEP** — authored product truth; becomes backend seed migration | KEEP FOR DEVELOPMENT |
| `pratikshya_canonical_media_state_2026_08_17` one-shot wipe marker | `mediaStore.js` | **REMOVE** post-migration | REMOVE |
| `tests/temporary/qa-review-prod.mjs` (runs dist build in jsdom) | `tests/temporary/` | **KEEP FOR DEVELOPMENT** | KEEP FOR DEVELOPMENT |

---

| Key | Purpose | Writer | Reader | Business entity | Authoritative? | Category |
|---|---|---|---|---|---|---|
| `pratikshya_products` | canonical product register | catalogRepository (workflow/editor) | catalogRepository → all portals | Products | **YES** | A |
| `pratikshya_media` | managed media register | mediaStore/mediaRepository | media UI, product media set, placements | Media | **YES** | A |
| `pratikshya_media_groups` | human group-review decisions | productMediaGroups | review UI, publish validator | Media groups | **YES** | A |
| `pratikshya_marketing_placements` | placement → ordered product IDs | marketingPlacementRepository | rails, hero, listing surfaces | Marketing placements | **YES** | A |
| `pratikshya_taxonomy_v2` | categories/subcategories/collections (+ productIds) | taxonomyRepository | nav, listings, admin taxonomy | Taxonomy | **YES** | A |
| `pratikshya_offers` | offers/coupons register | offerRepository | cart coupon adapter, admin/employee offers, explore strip | Offers | **YES** | A |
| `pratikshya_inventory` | balances per product/location | inventoryRepository | availability, stock UI, reservations | Inventory | **YES** | A |
| `pratikshya_inventory_movements` | stock ledger | inventoryRepository | movements pages, analytics | Movements | **YES** | A |
| `pratikshya_inventory_locations` | locations | inventoryRepository | transfers, operations | Locations | **YES** | A |
| `pratikshya_inventory_transfers` | transfer requests | inventoryRepository | transfers pages, desk | Transfers | **YES** | A |
| `pratikshya_inventory_reservations` | cart/order stock holds | inventoryRepository | checkout, expiry sweeper | Reservations | **YES** | A |
| `pratikshya_orders` | order register | OrderContext/orderService | account, admin, employee, analytics | Orders | **YES** | A |
| `pratikshya_current_order` | last placed order id | orderService | OrderSuccess page | Orders | Derived | A |
| `pratikshya_order_sequence` | invoice number sequence | orderService | invoice builder | Orders | **YES** | A |
| `pratikshya_cart` | bag lines + coupon (survives logout) | CartContext | bag UI, checkout | Cart | Yes (until server cart) | A |
| `pratikshya_wishlist` | saved product ids | WishlistContext | wishlist UI, AI | Wishlist | Yes (until server) | A |
| `pratikshya_checkout` | in-progress checkout draft | CheckoutContext | checkout steps | Checkout draft | Yes (until server) | A |
| `pratikshya_auth` | customer session snapshot | AuthContext | storefront guards | Customer session | Yes (mock) | A |
| `pratikshya_customers_registry` | customer identity register | AuthContext / AccountContext | account, employee directory, analytics | Customers | **YES (after §3.5 merge)** | A |
| `pratikshya_account_{id}` | per-customer profile/addresses/preferences cache | AccountContext | account pages | Customer profile | Derived | A |
| `pratikshya_customers` | **legacy** admin demo customer list | *(legacy merge only)* | `customerRegistry.migrateLegacyCustomers()` (merge-once then remove) | Customers | **NO — FIXED in Phase 1 (merged into registry)** | E |
| `pratikshya_admins` | admin identity register | adminAuthService | admin guards/profile | Admins | Yes (mock) | A |
| `pratikshya_admin_credentials` | admin credential fingerprints | adminAuthService | admin sign-in | Admin credentials | Yes (mock) | A |
| `pratikshya_admin_auth` | admin session | adminAuthService | guards | Admin session | Yes (mock) | A |
| `pratikshya_employees` | employee register (role/permissions/status) | employeeService | employee + admin portals, workflow principal | Employees | **YES** | A |
| `pratikshya_employee_credentials` | employee credential fingerprints | employeeService | sign-in / password change | Employee credentials | Yes (mock) | A |
| `pratikshya_employee_auth` | employee session | employeeAuthService | guards | Employee session | Yes (mock) | A |
| `pratikshya_employee_activity` | house diary (append-only) | activityService (all repositories) | admin activity, feeds, timelines | Activity | **YES** | A |
| `pratikshya_employee_assisted_orders` | **legacy** second order store | *(legacy merge only)* | `orderService.migrateAssistedOrders()` (merge-once then remove) | Orders | **NO — FIXED in Phase 1 (merged into `pratikshya_orders`)** | E |
| `pratikshya_attendance` | attendance events | workforce/attendanceRepository | attendance UI, analytics | Attendance | **YES** | A |
| `pratikshya_leave` | leave requests | workforce/leaveRepository | leave UI, analytics | Leave | **YES** | A |
| `pratikshya_performance` | performance records | workforce/performanceRepository | performance UI, analytics | Performance | **YES** | A |
| `pratikshya_settings` | house configuration (17 sections) | settingsRepository | admin settings, checkout config (planned), attendance thresholds | Settings | **YES** | A |
| `pratikshya_recently_viewed` | per-customer recent product ids | recentlyViewed service | account dashboard, AI shopping | Personalization | Client cache; backend-able later | B |
| `pratikshya_preferences` | style preferences (personalization) | stylePreferences | AccountPreferences (now routed), AI | Personalization | Client; backend-able later | B |
| `pratikshya_admin_sidebar_collapsed` / `pratikshya_employee_sidebar_collapsed` | sidebar **rail collapse** preference | `usePortalSidebarCollapse` | `PortalSidebar`/`PortalShell` | UI chrome | UI-only, never migrate | D |
| `pf_admin_nav_groups` / `pf_employee_nav_groups` | sidebar **nav group expansion** state | `PortalSidebar` | same component | UI chrome | UI-only, never migrate | D |
| `pratikshya_ai_shopping_session_*` / `pratikshya_ai_business_session_*` / `pratikshya_ai_mirror_recent_*` | AI demo session transcripts / mirror history | aiSessionStore / aiMirrorService | AI pages | AI sessions | Demo; server-side later | C |
| `pratikshya_canonical_media_state_2026_08_17` | one-shot media seed wipe marker | mediaStore | mediaStore | Migration marker | Dev-only; remove post-migration | C |
| `pratikshya_employee_attendance` | legacy attendance key (migrated once) | *(migrated only)* | attendanceRepository migration + dead `loadAttendanceMap` | Attendance | Legacy; remove | C/D |
| `pratikshya_attendance_settings` | legacy settings (merged into settings) | *(migrated only)* | settingsRepository.migrated() | Settings | Legacy; remove | C/D |

**Buckets (updated to the A–E taxonomy used across documents):** A = MUST MOVE TO BACKEND (all registers + sessions) · B = SHOULD MOVE TO BACKEND / client cache acceptable in V1 (personalization caches, cart/wishlist) · C = CAN REMAIN CLIENT-SIDE (sandbox AI sessions, dev markers) · D = FRONTEND SESSION/UX STATE (sidebar collapse, nav group expansion) · E = LEGACY/MIGRATION ONLY (stale customer list, assisted-orders second store, legacy attendance/settings keys — all consolidated in Phase 1).

---

> **Phase 1 outcome:** the HIGH-confidence dead items were removed in Phase 1 — `CorrectionDialog.jsx` (7.1), `AdminModulePlaceholder.jsx` + `AdminComingSoon.jsx` (7.4), `ADMIN_PLACEHOLDER_COPY`/`MODULE_STATUS` (7.5), the 8 shadowed inventory desk rows (7.6), the `demoOrders.js` stub body + 12 unused customers (7.7/7.16), `operationsService.loadAttendanceMap` (7.8), and the `data/products/catalogue.js` shim (7.10). Items 7.2 and 7.3 were **repaired, not removed** (routed). Legacy migration readers (7.9) remain intentionally until migration is retired. Dev tooling (7.12–7.14) is kept.

| # | File / Symbol | References | Last consumer | Why dead | Confidence |
|---|---|---|---|---|---|
| 7.1 | `src/components/workforce/CorrectionDialog.jsx` | **0** | none found | Attendance correction UI was replaced by `AttendanceHistory`/`ReviewPanel` flows; no import anywhere, not routed | HIGH |
| 7.2 | `src/pages/account/AccountPreferences.jsx` | nav + dashboard + AI assistant **link** to `/account/preferences`; no `<Route>` renders it | — | Route missing (path only exists in `dedicatedPaths`), so every link 404s and the page is unreachable | HIGH |
| 7.3 | `src/pages/employee/EmployeeReports.jsx` | **0 imports**; `/employee/reports` route renders `EmployeeDesk` instead | — | Real analytics page superseded by a mock desk at its own route | HIGH |
| 7.4 | `src/pages/admin/AdminModulePlaceholder.jsx` + `src/components/admin/AdminComingSoon.jsx` | only each other; **not routed** | pre-Phase-11 placeholder era | All modules are implemented; page unreachable | HIGH |
| 7.5 | `ADMIN_PLACEHOLDER_COPY`, `MODULE_STATUS` in `config/adminNavigation.js` | self-described “retained for compatibility… unused by the live sidebar” | — | Placeholder copy for the unrouted placeholder page | HIGH |
| 7.6 | `EmployeeDesk.jsx` desk entries for `/employee/inventory`, `/inventory/movements`, `/inventory/transfers`, `/inventory/low-stock`, `/inventory/out-of-stock`, `/inventory/receive`, `/inventory/adjust`, `/inventory/requests` | unreachable — real routes bind those paths to `Inventory*Page` | — | ~130 lines shadowed by routes | HIGH |
| 7.7 | `src/services/orders/demoOrders.js` (`generateDemoOrders` returns `[]`; 12-customer array unused) | wired in `orderService.loadOrders` seed branch | — | Generator stubbed out; array is dead data | HIGH (as data), MEDIUM (as seam — keep file if a real demo generator is wanted) |
| 7.8 | `operationsService.loadAttendanceMap` | **0 callers** | — | Reads the legacy employee-attendance key; workforce repositories replaced it | HIGH |
| 7.9 | `EMPLOYEE_STORAGE_KEYS.ATTENDANCE` (`pratikshya_employee_attendance`) | only the migration reader in `attendanceRepository` + dead 7.8 | — | One-time migration complete | MEDIUM (keep until migration retired) |
| 7.10 | `src/data/products/catalogue.js` (legacy re-export) | 1 importer: `taxonomyRepository` | — | 7-line shim; switch importer to `data/catalog/products` | HIGH |
| 7.11 | `data/products/details.js` | used by `data/products/index.js` accessors | active | NOT dead (early grep missed `./details` relative import) | — |
| 7.12 | `services/media/mediaAudit.js` | only `scripts/audit-media.mjs` | dev tooling | QA script support — keep as dev tooling | HIGH (dev-only, not dead) |
| 7.13 | `services/media/mediaValidation.js` | only `mediaAudit.js` | dev tooling | same | HIGH (dev-only) |
| 7.14 | `services/media/mediaExposure.js` | tests + `scripts/audit-homepage.mjs` | dev tooling | same | HIGH (dev-only) |
| 7.15 | `aiMirrorMockData` empty overrides (`PRODUCT_PREVIEW_OVERRIDES={}`, `CATEGORY_PREVIEW_SETS={}`) | `mockVirtualTryOnProvider` | active demo path | Empty scaffolding; harmless; keep until real provider | MEDIUM |
| 7.16 | 12 hardcoded customers in `demoOrders.js` | none | — | same as 7.7 | HIGH |
| 7.17 | `tests/temporary/qa-review-prod.mjs` | manual QA script | — | scratch QA — keep in dev | n/a |

---

Legend: **KEEP** · **MERGE** · **REMOVE** · **DEFER** · **REPAIR**.

### 12.18 Storefront (CustomerLayout)

| Route | Purpose | User | Nav? | Verdict |
|---|---|---|---|---|
| `/` | home | public | — | KEEP |
| `/shop` | catalogue front door | public | header | KEEP |
| `/explore` | discovery feed | public | header/footer | KEEP |
| `/category/:slug`, `/collections/:slug` | managed listing pages | public | direct URLs (required) | KEEP |
| `/collection/:slug` | legacy collection URL | public | direct/old links | **FIXED** — `LegacyCollectionRedirect` → `/collections/:slug` (backward-compatible) |
| `/search` | results | public | header | KEEP |
| `/product/:productId` | detail | public | direct (required) | KEEP |
| `/cart`, `/checkout`, `/order-success` | journey | public | header (cart) | KEEP |
| `/account/wishlist` (+ `/wishlist` redirect) | saved pieces | any | header | KEEP |
| `/signin`, `/signup`, `/forgot-password`, `/reset-password` | auth | public | account links | KEEP |
| `/account`, `/account/profile`, `/account/addresses`, `/account/orders`, `/account/settings`, `/account/security`, `/account/ai-mirror`, `/account/ai-shopping` | account area | customer (guard) | AccountNav | KEEP |
| `/account/orders/:orderId` (+`/track`, `/return`) | order follow-up | customer | account | KEEP |
| **`/account/preferences`** | style preferences | customer | AccountNav + dashboard | **FIXED (R4) — route added; page reachable** |
| ~38 manifest paths (`/women/…`, `/bridal/…`, `/men/…`, `/kids/…`, `/collections/*`) | department/category/subcategory listings | public | mega menu/footer | KEEP (all resolve via managed taxonomy) |
| `/about`, `/contact`, `/privacy`, `/terms` | static interior pages | public | footer | KEEP |
| `*` | 404 | public | — | KEEP |

**Fixed (R7):** the mega-menu fabric rail is now derived from `taxonomyRepository.activeCollections()` (`collection.rule?.fabricIncludes`); the dead hardcoded `/collections/cotton|linen|chiffon` links are gone. Collection links are generated from the managed register, not authored in `navigationConfig`.

### 12.19 Admin (AdminProtectedRoute + AdminLayout)

| Route | Purpose | Verdict |
|---|---|---|
| `/admin/login` | admin auth | KEEP (mock → backend) |
| `/admin` (+ `/admin/dashboard` redirect) | dashboard | KEEP |
| `/admin/employees`, `/employees/new`, `/employees/:employeeId`, `/employees/:employeeId/edit` | employee management | KEEP |
| `/admin/activity`, `/admin/profile` | diary, self profile | KEEP |
| `/admin/products`, `/products/review`, `/products/new`, `/products/:productId/edit`, `/products/:productId`, `/products/:productId/media` | product workspace | KEEP |
| `/admin/media`, `/media/upload`, `/media/review`, `/media/marketing`, `/media/product-mapping`, `/media/:mediaId` | media workspace | KEEP |
| `/admin/categories*` (5), `/admin/collections*` (5), `/admin/offers*` (4) | taxonomy/offers | KEEP |
| `/admin/orders`, `/admin/orders/:orderId`, `/admin/orders/:orderId/invoice` | order ops | KEEP |
| `/admin/customers`, `/admin/customers/:customerId` | CRM | KEEP (fix data source §3.5) |
| `/admin/returns`, `/admin/returns/:returnId` | returns | KEEP |
| `/admin/inventory` + receive/adjust/transfers/movements/low-stock; `/admin/warehouses` & `/admin/stock-movements` redirects | inventory | KEEP |
| `/admin/analytics` + 6 section paths | analytics | KEEP |
| `/admin/ai-assistant` | AI business assistant | KEEP (mock → backend) |
| `/admin/settings` | house settings | KEEP |
| `/admin/*` | admin 404 | KEEP |
| *(none for AdminModulePlaceholder)* | — | **REMOVE page** (§7.4) |

### 12.20 Employee (EmployeeProtectedRoute + EmployeeLayout)

| Route | Purpose | Verdict |
|---|---|---|
| `/employee/login`, `/employee/forgot-password`, `/employee/change-password` | auth | KEEP (mock → backend) |
| `/employee` | role dashboard | KEEP |
| `/employee/profile`, `/employee/access-denied` | self profile / denied | KEEP |
| `/employee/attendance`, `/employee/attendance/leave` | workforce | KEEP |
| `/employee/performance`, `/employee/performance/:employeeId` | performance | KEEP |
| `/employee/media`, `/media/upload`, `/media/:mediaId` | media ops | KEEP |
| `/employee/products`, `/products/review`, `/products/new`, `/products/:productId/edit` | product workspace | KEEP |
| `/employee/customers` | directory | KEEP |
| `/employee/orders`, `/employee/orders/:orderId`, `/employee/orders/assisted` | order ops | KEEP (merge assisted-orders store §3.8) |
| `/employee/offers*` (4) | offers | KEEP |
| `/employee/inventory*` (6 + 3 redirects) | inventory (shared pages) | KEEP |
| `/employee/warehouse*` (6) | warehouse desk | **DEFER** (placeholder rows fed by real transfer/movement data; no warehouse backend yet) |
| `/employee/returns` | returns desk | **FIXED (R8) — `projectReturns(allOrders)` reads the canonical order register** |
| `/employee/support*` (4) | care desk | **DEFER** (no support-case entity exists) |
| `/employee/styling*` (6) | styling desk | **DEFER** (no styling entity exists) |
| `/employee/sales` | sales desk | **PARTIALLY FIXED (R5)** — still shows clearly-labelled demo figures; real analytics now lives at `/employee/reports` |
| `/employee/team` | team list | KEEP (real employee data) |
| `/employee/reports` | reports | **FIXED (R5) — routed to `EmployeeReports.jsx` (+ 7 section sub-routes)** |
| `/employee/management/*` | legacy redirect → profile | KEEP (safe redirect) |

---

## 13 Feature Dependency & Responsibility

```
PRODUCTS (catalogRepository — ONE register)
 ├── TAXONOMY (departments → categories → subcategories → collections)
 ├── MEDIA (media register; product ownership; authored plates fallback)
 ├── MARKETING (placements = product IDs only; marketing media scopes)
 ├── INVENTORY (balances/movements/transfers/reservations)
 ├── OFFERS (product/category/collection eligibility)
 ├── CART ── CHECKOUT ── PAYMENTS(mock) ── ORDERS
 ├── WISHLIST ─────────────────────────────────┘ (cross-sell via orders)
 ├── REVIEW WORKFLOW (flags/groups → lifecycle commands)
 ├── AI SHOPPING (ranks live storefront products)
 └── AI MIRROR (eligible products only)

ORDERS ── FULFILLMENT ── TRACKING ── RETURNS/REFUNDS ── INVENTORY (restock)
CUSTOMERS (registry) ── AUTH ── ACCOUNT ── CART merge on login
EMPLOYEES ── PERMISSIONS ── WORKFLOW PRINCIPAL ── ATTENDANCE/LEAVE/PERFORMANCE
ACTIVITY DIARY ← written by every repository command
SETTINGS ← admin; consumed by attendance thresholds + (should) checkout pricing
ANALYTICS = read-model over ORDERS+PRODUCTS+CUSTOMERS+INVENTORY+OFFERS+RETURNS+WORKFORCE
```

Findings:
- **Orphans:** `CorrectionDialog`, `AdminModulePlaceholder`/`AdminComingSoon`, `AccountPreferences` (linked but unrouted), `EmployeeReports` (unrouted), 8 shadowed desk views, `demoOrders` stub.
- **Duplicate dependencies:** none critical — every portal reads the same repositories. The two data-store duplicates (`pratikshya_customers`, `pratikshya_employee_assisted_orders`) are the only “second source” links and both are read-only-orphaned on the stale side.
- **Circular dependencies:** none found in data flow (workflow → repositories → activity → storage; no repository reads another repository’s storage directly). The `workflowCommandRegistry` late-binding was introduced specifically to avoid an ESM evaluation-order hazard (`main.jsx` comment) — intentional.
- **Unnecessary dependencies:** `taxonomyRepository` → `data/products/catalogue.js` legacy shim (one extra hop); `operationsService` compatibility shim for attendance (`requireCompatibility`) — removable once 7.8 is removed.

---

| Feature | Classification |
|---|---|
| Sidebar rail-collapse preference (`pratikshya_admin/employee_sidebar_collapsed`), nav group expansion, sidebar chrome, page transitions, design-system components, cart drawer animation, brand lockup | FRONTEND ONLY (CLIENT-SIDE ONLY) |
| Storefront listings/facets UI, cart UI, wishlist UI, account UI, checkout steps UI, admin/employee page shells | BACKEND + FRONTEND (UI stays; data becomes API) |
| Product persistence & lifecycle enforcement, taxonomy persistence, media ownership & upload validation, marketing placement persistence | BACKEND REQUIRED (frontend keeps commands/UI as adapter) |
| Inventory ledger/reservations, order state machine, payment verification, returns/refunds, offer redemption limits, auth sessions & password hashing, RBAC enforcement, activity/audit log | BACKEND REQUIRED (server-authoritative; frontend must not confirm payments or grant authority) |
| Pricing computation (final price) | BACKEND REQUIRED (frontend may preview via shared engine only) |
| Recently viewed, style preferences, wishlist, cart while signed out | BACKEND + FRONTEND (server-backed later; client cache acceptable in V1) |
| Sandbox QR, mock AI, mock payments, demo seeds, QA scripts, tests | DEVELOPMENT ONLY |
| AI assistants, AI mirror, personalization ranking, employee styling/support desks | FUTURE (backend later) |

---

## 14 V1 / V1.5 / Future Classification

### 14.1 MUST HAVE — V1 (backend)
Catalogue + lifecycle (C1–C10), taxonomy/collections (C2–C3), storefront projection (C4), media + ownership + placements (M1–M4), inventory (I1–I4), offers (O1), cart/wishlist/checkout/orders/returns (S8–S12, O2–O6), customer identity (U1–U2, merged §3.5), admin + employee portals over the same APIs, activity diary, settings, analytics read-model. (Target: **Python + FastAPI**.)

### 14.2 SHOULD HAVE — V1.5
Recently viewed / style preferences / personalization (S15–S17 — Preferences route **already fixed**), real admin dashboard numbers replacing `dashboardData` static values, support/styling desks (new entities), sandbox QR retired in favor of real gateway UPI. *(Employee assisted orders and the reports route are already done in Phase 1.)*

### 14.3 FUTURE
Real AI provider for shopping/business assistants, real virtual try-on (AI Mirror), recommendation service, support-case/ticketing entity, styling appointment entity, warehouse WMS features.

**Deferral policy per feature:** warehouse/support/styling desks → DEFER WITH PLACEHOLDER UI (they are honest “Later” notes today); mock numbers on routed pages → REPLACE with real read-model data (remaining: `/employee/sales`, `dashboardData`).

---

## 15 Removal Safety Analysis

> **Completion status:** R1 (customer store merge), R2 (assisted-order merge), R3 (dead files), R4 (preferences route), R5 (reports route — sales mock figures remain), R6 (shadowed desk rows), R7 (nav links), R9 (demoOrders stub) and R10 (legacy readers deferred to migration retirement) have been implemented in Phase 1. R8 (returns desk reads register) is implemented. R11 (dashboard numbers → analytics) remains deferred to V1.5.

### 15.1 R1 — Remove `pratikshya_customers` duplicate store + stale admin reads
- Files: `AdminCustomers.jsx`, `AdminCustomerDetail.jsx`, `analyticsService.js` (fallback), `AuthContext.jsx` (unaffected registry)
- Routes: `/admin/customers`, `/admin/customers/:customerId` (keep, re-point data)
- Components: none
- Services: analytics fallback path
- Storage keys: `pratikshya_customers` (remove)
- Tests: `employeeManagement.test.js` (indirect), analytics tests
- Navigation: none
- Backend entities: none yet
- **RISK: LOW** — read-only re-point + key removal.

### 15.2 R2 — Merge assisted orders into order register
- Files: `EmployeeAssistedOrder.jsx`, `operationsService.getAssistedOrders`, `services/employees/storage.js`
- Routes: `/employee/orders/assisted` (keep)
- Storage keys: `pratikshya_employee_assisted_orders` (remove)
- Backend: orders API gains `channel=ASSISTED`
- **RISK: MEDIUM** — touches order creation flow; requires explicit review.

### 15.3 R3 — Remove dead pages/components/config (§7.1, 7.4, 7.5, 7.10)
- Files: `CorrectionDialog.jsx`, `AdminModulePlaceholder.jsx`, `AdminComingSoon.jsx`, `data/products/catalogue.js` (+1 import fix), unused constants in `adminNavigation.js`
- Routes/components/tests/storage/navigation/backend: none (0 references each)
- **RISK: LOW** — automatable after approval.

### 15.4 R4 — Route `/account/preferences` to the existing page (or remove page + links)
- Files: `App.jsx` (add Route), `AccountPreferences.jsx` (exists), `AccountNav.jsx` (link already present)
- Tests: none today
- **RISK: LOW** if routed; **MEDIUM** if instead removing the page (three link sites + stylePreferences service consumers).

### 15.5 R5 — Route `/employee/reports` to `EmployeeReports.jsx`; remove mock reports + sales desks
- Files: `App.jsx` (1 route element swap), `EmployeeDesk.jsx` (remove `/employee/reports`, `/employee/sales` desk rows + MOCK helpers)
- Components: `EmployeeReports.jsx` (already built, permission-aware)
- Tests: none today
- **RISK: MEDIUM** — route behavior change; needs explicit review. Keep `/employee/team` desk (real data).

### 15.6 R6 — Remove 8 shadowed inventory desk rows in `EmployeeDesk.jsx`
- Files: `EmployeeDesk.jsx` only
- Routes: none (routes already point elsewhere)
- **RISK: LOW**.

### 15.7 R7 — Fix/derive collection nav links (remove 3 dead fabric links or add collections)
- Files: `config/navigationConfig.js` (+ optionally taxonomy seeds)
- Routes: `/collections/cotton|linen|chiffon` (currently 404)
- **RISK: LOW** (removal) / **MEDIUM** (adding collections — content decision).

### 15.8 R8 — Replace hardcoded return rows on employee desks with returnService reads
- Files: `EmployeeDesk.jsx` (`/employee/returns`, `/employee/support/returns`), maybe `EmployeeReturns` view of `returnService`
- Storage: none (reads order register)
- **RISK: MEDIUM** — small new read path; requires review.

### 15.9 R9 — Remove dead demo-orders stub (`demoOrders.js` customers + `[]` return)
- Files: `demoOrders.js` (simplify or delete), `orderService.js` (seed call stays safe)
- **RISK: LOW**.

### 15.10 R10 — Retire legacy attendance keys & migration readers (7.8, 7.9, plus `settingsRepository.migrated()` legacy read)
- Files: `operationsService.js`, `attendanceRepository.js`, `settingsRepository.js`, `services/employees/storage.js`
- Storage keys: `pratikshya_employee_attendance`, `pratikshya_attendance_settings` (read-only today)
- **RISK: LOW** for readers of never-written keys; **MEDIUM** until one release after migration, then safe.

### 15.11 R11 — Demo mock labels on routed surfaces (dashboard static numbers, desk sales figures)
- Not removals — replacements. **DEFER to backend** (analytics read-model already exists client-side; admin dashboard can adopt it in V1.5).
- **RISK: MEDIUM** (visual/regression review).

**Nothing in this audit is CRITICAL (do-not-modify).** The canonical lifecycle, brand asset, placement ID semantics, and product register remain untouched by every recommendation above.

---

## 16 Canonical Architecture Verification

| Rule | Status | Evidence |
|---|---|---|
| ONE canonical product catalogue; no per-department registers | ✅ INTACT | `catalogRepository` + `pratikshya_products` only; department filtering derived from `product.department` (`getLiveStorefrontProducts`); `data/products/catalogue.js` is a re-export shim, not a second catalogue |
| Department filtering derived from canonical product data | ✅ INTACT | `storefrontDepartmentFiltering.test.js`, `canonicalDepartmentArchitecture.test.js` (passing) |
| Marketing placements store product IDs, not snapshots | ✅ INTACT | `marketingPlacementRepository` persists ordered ID lists; resolver joins live products |
| Lifecycle DRAFT → SUBMITTED → APPROVED → PUBLISHED | ✅ INTACT | `productWorkflowCommands` transition table; tests `canonicalLifecycle`, `workflowFoundation`, `publishVisibility` pass |
| Approval MUST NOT publish | ✅ INTACT | `approveProduct` never publishes; separate explicit `publishProduct` with full revalidation |
| Payments must not be confirmed by the frontend | ⚠️ VIOLATED BY DESIGN (demo) | `buildOrderRecord` stamps `PAYMENT_CONFIRMED` + timeline at order creation in the browser; CheckoutContext resolves mock payment outcomes client-side. This is the single canonical-rule breach — explicitly a sandbox/demo pattern, flagged HIGH in the backend audit, and the first thing the backend must own. Sandbox QR itself is correctly `env:"sandbox"`. |
| Sandbox QR remains sandbox-only | ✅ INTACT | `SANDBOX_QR_ENV = "sandbox"`; no credentials ever encoded |
| Canonical logo `src/assets/pratikshya_logo.webp` | ✅ INTACT | sole brand asset; `Brand.jsx` lockup; `brandLockup.test.js` passes |
| No competing brand asset | ✅ INTACT | none found |
| No parallel admin/employee catalogues | ✅ INTACT | both portals consume the same repositories |

**Cleanup must not weaken any of these.** In particular, merging customer stores (§3.5) must keep the employee/admin portals on the same registry; merging assisted orders (§3.8) must keep the single order state machine.

---

## 17 Feature Decision Matrix & Priorities

Columns: FEATURE · PURPOSE · CURRENT IMPLEMENTATION · DUPLICATE? · SOURCE OF TRUTH · USED? · USER VALUE · BACKEND REQUIRED? · COMPLEXITY · RECOMMENDATION · RISK · REASON

| Feature | Purpose | Implementation | Dup? | SoT | Used? | Value | BE? | Cx | Rec | Risk | Reason |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Storefront home | brand + merchandising landing | hero + rails over placements | No | placements + media + products | Yes | 5 | Yes | 3 | KEEP | LOW | core |
| Shop/Explore/listings/search | discovery | shared query layer | No | products+taxonomy | Yes | 5 | Yes | 3 | KEEP | LOW | core |
| Product detail | conversion | detail page + preview seam | No | products | Yes | 5 | Yes | 2 | KEEP | LOW | core |
| Canonical products | one catalogue | catalogRepository | No | register | Yes | 5 | Yes | 5 | KEEP | CRITICAL-protected | core |
| Taxonomy (dept/cat/sub) | navigation + filters | taxonomyRepository | No | `pratikshya_taxonomy_v2` | Yes | 5 | Yes | 3 | KEEP | LOW | core |
| Collections (managed) | curation | taxonomyRepository + plates | Overlap w/ plates only | taxonomy register | Yes | 4 | Yes | 3 | KEEP — nav links **FIXED** | LOW | 3 dead links removed |
| Editorial plates | storytelling imagery | `data/catalog/collections.js` static | Fallback, not dup | authored seed | Yes | 3 | Later | 2 | KEEP | LOW | fallback pattern |
| Product lifecycle | governance | workflow command layer | No (wrappers delegate) | products row | Yes | 5 | Yes | 5 | KEEP | CRITICAL-protected | core |
| Unified review queue | review inbox | unifiedProductReview + queue UI | Consolidated already | products+groups | Yes | 4 | Yes | 4 | KEEP | LOW | core |
| Media register | asset management | mediaRepository | No | `pratikshya_media` | Yes | 5 | Yes | 5 | KEEP | HIGH (uploads) | core |
| Media ownership | product↔media | mediaOwnershipService | No | media.productId | Yes | 4 | Yes | 4 | KEEP | MED | core |
| Marketing placements | homepage/listing merchandising | placement repo + resolver | No | `pratikshya_marketing_placements` | Yes | 4 | Yes | 3 | KEEP | CRITICAL-protected | core |
| Marketing media (scopes) | banners/hero/editorial | media register scopes | No | same register | Yes | 4 | Yes | 3 | KEEP | MED | core |
| Hero slides | landing copy/fallbacks | authored hero.js | Fallback | authored seed | Yes | 4 | Later | 1 | KEEP | LOW | fallback |
| Pricing engine | consistent money | utils/pricing | No | product fields | Yes | 5 | Yes (server) | 4 | KEEP | HIGH | core |
| Inventory | stock truth | inventoryRepository | No | 5 keys | Yes | 5 | Yes | 5 | KEEP | HIGH | core |
| Offers/coupons | promotions | offerRepository (+coupon adapter) | Already unified | `pratikshya_offers` | Yes | 4 | Yes | 4 | KEEP; drop deprecated `coupons` export later | MED | unified in P17 |
| Cart | bag | CartContext | No | `pratikshya_cart` | Yes | 5 | Yes | 3 | KEEP | MED | core |
| Wishlist | saves | WishlistContext | No | `pratikshya_wishlist` | Yes | 4 | Yes | 2 | KEEP | LOW | core |
| Checkout | purchase journey | CheckoutContext + config | Overlap w/ settings only | `pratikshya_checkout` | Yes | 5 | Yes | 5 | KEEP; **MERGE pricing rules into settings** | HIGH | §3.12 |
| Payments | money capture | MockPaymentService + sandbox QR | No | in-memory | Yes | 5 | Yes | 5 | REPLACE (backend) | CRITICAL | demo confirm breach |
| Orders | fulfillment | orderService + context | Assisted orders **FIXED** (one entity) | `pratikshya_orders` | Yes | 5 | Yes | 5 | KEEP — assisted orders merged | HIGH | §3.8 |
| Fulfillment | pick/pack/dispatch | fulfillmentService | No | order row | Yes | 5 | Yes | 4 | KEEP (drop client forceTransition on BE) | HIGH | core |
| Returns/refunds | after-sales | returnService | Employee desk **FIXED** (reads order.returns) | order.returns | Yes | 5 | Yes | 4 | KEEP — desk reads register | MED | R8 |
| Tracking | customer visibility | trackingService (synthetic legs) | No | derived | Yes | 3 | Yes | 2 | KEEP / DEFER real carrier | LOW | fine as demo |
| Customer registry | identity | AuthContext | **FIXED** (single registry) | `pratikshya_customers_registry` | Yes | 5 | Yes | 4 | **FIXED** — admin store merged | LOW | §3.5 |
| Customer account | profile/addresses/prefs | AccountContext | Projection (fine) | registry + `pratikshya_account_{id}` | Yes | 5 | Yes | 3 | KEEP | MED | core |
| Auth (customer/admin/employee) | sessions | three isolated mock domains | By design, not dup | own keys | Yes | 5 | Yes | 5 | REPLACE (backend) | HIGH | mock |
| Employee management | people ops | employeeService + admin UI | No | `pratikshya_employees` | Yes | 5 | Yes | 5 | KEEP | MED | core |
| RBAC | authorization | one permission catalogue + roles | No | employee record + admin role | Yes | 5 | Yes | 5 | KEEP | CRITICAL (server must re-check) | core |
| Activity diary | house log | activityService | No | `pratikshya_employee_activity` | Yes | 4 | Yes | 3 | KEEP | LOW | core |
| Attendance/leave/performance | workforce | workforce repositories | legacy key only | own keys | Yes | 4 | Yes | 4 | KEEP; retire legacy keys | LOW | core |
| Workforce seed | demo data | bootstrap + seedWorkforce | No | seeds only when empty | Yes (sandbox) | 2 | No | 2 | KEEP FOR SANDBOX | LOW | demo |
| Analytics | reporting | read-model + workspace | No | aggregates registers | Yes | 5 | Yes | 4 | KEEP | MED | core |
| Admin dashboard metrics | quick view | static dashboardData numbers | **duplicates analytics purpose** | hardcoded | Yes | 3 | Yes | 2 | REPLACE with analytics (V1.5) | MED | demo numbers |
| Settings | house config | settingsRepository | overlap w/ checkoutConfig + attendance legacy | `pratikshya_settings` | Yes | 4 | Yes | 3 | KEEP; become checkout authority | MED | §3.12 |
| AI Shopping Assistant | guided discovery | mock provider over live products | No | live catalogue | Yes | 3 | Later | 4 | KEEP FOR SANDBOX | LOW | mock seam clean |
| AI Business Assistant | operator insights | mock provider over analytics | No | analytics read-model | Yes | 3 | Later | 4 | KEEP FOR SANDBOX | LOW | mock seam clean |
| AI Mirror | virtual try-on | procedural mock | No | products+media | Yes | 3 | Later | 4 | KEEP FOR SANDBOX | LOW | mock seam clean |
| Style preferences page | personalization inputs | AccountPreferences + stylePreferences | No | `pratikshya_preferences` | Yes | 3 | Later | 2 | **FIXED** — route added | LOW | R4 |
| Recently viewed | re-engagement | recentlyViewed service | No | own key | Yes | 3 | Later | 1 | KEEP | LOW | cache |
| Employee desk (warehouse/support/styling) | future ops | placeholder tables + notes | Rows partially real (inventory/transfers) | mixed | Yes (placeholder) | 2 | Later | 2 | DEFER WITH PLACEHOLDER UI | LOW | honest “Later” |
| Employee desk (returns) | returns ops | **hardcoded mock rows** | duplicates returnService | should be orders | Yes | 4 | Yes | 2 | REPLACE with real returns | MED | R8 |
| Employee desk (sales/reports) | store metrics | **hardcoded figures** | duplicates analytics | should be orders | Yes | 3 | Yes | 2 | REPLACE (route EmployeeReports) | MED | R5 |
| Employee reports page | analytics | EmployeeReports (real) | **FIXED** — routed | orders etc. | Yes | 4 | Yes | 3 | **FIXED** — routed | MED | R5 |
| AdminModulePlaceholder/ComingSoon | legacy placeholder | unrouted pages | No | — | No | 0 | — | 1 | REMOVE | LOW | dead |
| CorrectionDialog | attendance corrections | component | No | — | No | 0 | — | 1 | REMOVE | LOW | dead |
| demoOrders generator | demo order seed | stubbed `[]` | No | — | No | 0 | — | 1 | REMOVE | LOW | dead stub |
| Legacy data/products shims (catalogue.js) | compat imports | re-export | facade, 1 importer | canonical seed | Yes | — | — | 1 | SIMPLIFY (remove) | LOW | 1 import fix |
| Dev scripts + tests | QA | 21 scripts, 41 test files | No | — | dev only | 5 (dev) | — | 3 | KEEP | LOW | tooling |

---

| Feature | Business | User | Complexity | Duplication | Maint. | BE dep | Sum | Note |
|---|---|---|---|---|---|---|---|---|
| Canonical products + lifecycle | 5 | 5 | 5 | 0 | 4 | 5 | 24 | HIGH VALUE / HIGH COMPLEXITY — protected, lift not rewrite |
| Orders (+fulfillment+returns) | 5 | 5 | 5 | 1 | 4 | 5 | 25 | core; merge assisted-orders first |
| Payments | 5 | 5 | 5 | 0 | 3 | 5 | 23 | CRITICAL replace |
| Inventory | 5 | 5 | 5 | 0 | 3 | 5 | 23 | core |
| Media + ownership + placements | 4 | 4 | 5 | 0 | 4 | 5 | 22 | core |
| Auth ×3 | 5 | 5 | 4 | 0 | 3 | 5 | 22 | mock → backend |
| Taxonomy + collections | 5 | 5 | 3 | 1 | 3 | 4 | 21 | repair 3 dead nav links |
| Analytics | 5 | 4 | 4 | 0 | 3 | 3 | 19 | real read-model already |
| Offers | 4 | 4 | 4 | 0 | 3 | 4 | 19 | unified |
| Customer registry | 5 | 5 | 3 | **3** | 3 | 5 | 24 | **DUPLICATE/HIGH — top cleanup candidate** |
| Assisted orders | 3 | 3 | 2 | **4** | 3 | 4 | 19 | **DUPLICATE/HIGH — top cleanup candidate** |
| Admin dashboard (static numbers) | 3 | 3 | 1 | **3** | 2 | 2 | 14 | duplicate of analytics; replace V1.5 |
| Employee desk mocks (returns/sales/reports) | 2 | 2 | 2 | **4** | 3 | 2 | 15 | **DUPLICATE — cleanup candidate** |
| Employee desk (support/styling/warehouse) | 2 | 2 | 2 | 1 | 2 | 2 | 11 | defer |
| AI trio | 3 | 3 | 4 | 0 | 3 | 3 | 16 | keep sandbox, provider seam ready |
| Settings | 4 | 3 | 2 | **2** | 2 | 3 | 16 | become checkout authority |
| AccountPreferences (dead route) | 2 | 3 | 2 | 0 | 2 | 2 | 11 | LOW VALUE / MED COMPLEXITY — repair or cut |
| Dead files (7.1–7.10) | 0 | 0 | 1 | 0 | **4** | 0 | 5 | strongest removal candidates |
| Recently viewed / preferences | 2 | 3 | 1 | 0 | 1 | 2 | 9 | keep, defer BE |

**Strongest cleanup candidates (now resolved in Phase 1):** customer dual store ✅, assisted-orders second store ✅, mock desk returns/reports ✅ (sales mock figures remain). **Quick wins (shipped):** dead file list §7, shadowed desk rows, dead collection links.

---

## 18 Recommended Cleanup Order

**Phase 0 — approvals.** (Done — Phase 1 was approved and shipped.)

**Phase 1 — zero-risk deletions: ✅ DONE.** Items 1–6 shipped (7.1, 7.4–7.5, 7.6, 7.7, 7.8, 7.10). Item 7 (collection nav links) resolved by deriving the rail from the register (R7).

**Phase 2 — data-store merges: ✅ DONE.** Item 8 (customer registry merge, R1) and item 9 (assisted-order merge, R2) both shipped via `customerRegistry` and `orderService` migration helpers.

**Phase 3 — surface repairs: ✅ MOSTLY DONE.** Item 10 (preferences route, R4) shipped; item 11 (reports route, R5) shipped — but the `/employee/sales` mock desk remains (labelled demo figures); item 12 (returns desk reads real register, R8) shipped; item 13 (shipping/COD single source, 3.12) shipped via `commerceDefaults.js`.

**Phase 4 — post-backend simplifications: ⏳ DEFERRED until the FastAPI backend exists.**
14. Delete compatibility wrappers (`productWorkflow.js`) after importers move to the command layer.
15. Drop deprecated `coupons` export; retire `pratikshya_canonical_media_state_*` marker; retire legacy attendance/settings migration readers.
16. Replace `dashboardData` static numbers with analytics; remove sandbox-only paths (QR, mock AI) behind provider/env flags.
17. Migrate authored media plates (`product.media`, hero images, editorial plates) into the media register/object storage.

---

## 19 High-Risk Items Requiring Manual Approval

1. **Payment confirmation stays frontend-side until backend exists.** Any cleanup touching `CheckoutContext.handlePaymentResolution` / `orderService.buildOrderRecord` requires explicit approval. Never add a production “paid” path client-side.
2. **Lifecycle command layer.** No bulk `status=PUBLISHED` shortcut may ever appear; approval ≠ publish. Any refactor of `productWorkflowCommands` is HIGH risk.
3. **Marketing placements.** They must remain ID lists. Any cleanup of `marketingPlacementRepository` must preserve the resolver’s live-catalogue join.
4. **Order/inventory atomicity.** Merging assisted orders and moving reservations server-side must be one backend transaction per operation.
5. **Three isolated auth domains.** Any customer-store merge must not let an admin/employee session read another portal’s data; separate cookie/session names on the backend.
6. **Media upload validation.** Rejecting `blob:`/`data:` URLs and enforcing MIME/size must move server-side — upload UI changes are MEDIUM risk until then.
7. **Brand asset.** `src/assets/pratikshya_logo.webp` and the `Brand.jsx` lockup are LOCKED; do not touch in cleanup.

---

## 20 Final Recommended Architecture

```
┌────────────────────────── FRONTEND (thin UI + adapters) ──────────────────────────┐
│ Storefront  ·  Admin Portal  ·  Employee Portal   (shared design-system, one shell)│
└───────────────▲───────────────────────────────▲──────────────────────────────────┘
                │ typed adapter layer (same function names as today)                 │
┌───────────────┴───────────────────────────────┴──────────────────────────────────┐
│ BACKEND API — Python + FastAPI + PostgreSQL + SQLAlchemy + Alembic                │
│  auth  · catalog/products  · taxonomy  · media  · marketing  · inventory  ·        │
│  offers · cart/wishlist · checkout · payments (webhook-confirmed) · orders ·       │
│  returns · workforce · analytics · audit · settings · notifications                │
└───────────────────────────────────────────────────────────────────────────────────┘

Single sources of truth (post-cleanup):
  products        → products table (one table, all departments; seed = data/catalog/products.js)
  taxonomy        → departments/categories/subcategories/collections tables (seed = data/catalog/taxonomy.js)
  media           → media_assets + object storage (authored plates migrate here)
  placements      → marketing_placements + _products (IDs only)
  customers       → customers (single table; pratikshya_customers already merged into the registry in Phase 1; account_* projection collapses to /me)
  orders          → orders/order_items/timeline (assisted orders = same table, channel flag — already merged in Phase 1)
  inventory       → balances/movements/transfers/reservations (server transactions)
  payments        → payments/payment_events (server/webhook authority)
  workforce       → attendance/leave/performance tables
  activity        → audit_logs (append-only)
  settings        → settings (checkout reads from here; checkoutConfig demoted to UI defaults — already done in Phase 1 via commerceDefaults)

Frontend-only survivors: design system, shell chrome, sidebar rail-collapse keys
(pratikshya_admin/employee_sidebar_collapsed) + nav group expansion keys,
personalization caches (recently viewed/style prefs until V1.5), sandbox-only
demo seams behind provider/env flags (mock AI, sandbox QR, demo seeds).
```

---

## 21 Exact Remove / Merge / Defer / Unchanged Decisions

**Dead code — safe to delete:** ✅ items 1–8 **removed in Phase 1** (`CorrectionDialog.jsx`, `AdminModulePlaceholder.jsx`, `AdminComingSoon.jsx`, `ADMIN_PLACEHOLDER_COPY`/`MODULE_STATUS`, 8 shadowed desk entries, `data/products/catalogue.js`, `demoOrders.js` stub body, `loadAttendanceMap`). Item 9 (legacy migration readers) remains intentionally until the migration is retired.

**Data stores — remove after merge:** ✅ items 10–11 **done** — `pratikshya_customers` and `pratikshya_employee_assisted_orders` are now merge-once-then-remove legacy keys.

**Duplicate surface — remove after replacement:** ✅ item 12 done (returns desk reads real register); ⚠️ item 13 partially done (reports desk replaced; `/employee/sales` mock figures remain labelled); ✅ item 14 done (nav derives from register).

**Post-backend (deferred removals):** ⏳ items 15–17 remain (require the FastAPI backend).

1. ✅ **Customer list stores** — merged in Phase 1 (`customerRegistry`).
2. ✅ **Order stores** — merged in Phase 1 (`orderService`, `channel: "ASSISTED"`).
3. ✅ **Checkout pricing configuration** — resolved in Phase 1 (`commerceDefaults.js` = defaults, settings = authority, `checkoutConfig` = UI metadata).
4. ⏳ **Admin dashboard numbers** → analytics read-model (V1.5 — deferred).
5. ✅ **Employee returns desk** — reads order returns (Phase 1).
6. ✅ **Employee reports** — `EmployeeReports.jsx` routed (Phase 1); `/employee/sales` mock remains.
7. ⏳ **Legacy attendance settings** — merged already; delete legacy readers at migration retirement.
8. ⏳ **Legacy coupon list** — merged already (Phase 17); remove deprecated export post-backend.

1. Employee warehouse desks (`/employee/warehouse*`) — placeholder UI until WMS backend exists.
2. Employee support desk (`/employee/support*`) — until a support-case entity exists.
3. Employee styling desk (`/employee/styling*`) — until a styling/booking entity exists.
4. Real payment gateway (UPI/cards) — sandbox QR + MockPaymentService remain sandbox-only meanwhile.
5. Real AI providers for shopping/business assistants and virtual try-on — mock provider seam stays.
6. Real carrier tracking integrations — synthetic tracking legs stay.
7. Recently viewed / style preferences / personalization service — client-side caches acceptable until V1.5 (Preferences route now fixed).
8. Per-feature backend APIs — sequenced by the **Phase A–L** plan in `docs/backend-integration-audit.md` (§10/§12) and `docs/backend-architecture.md` (§42) after approval.

1. Canonical product register (`catalogRepository` + `src/data/catalog/products.js`) and its ID scheme.
2. Canonical taxonomy seed (`src/data/catalog/taxonomy.js`) and route vocabulary.
3. Product lifecycle command layer (`workflow/productWorkflowCommands.js`, registry, validators, state machine) — including “approval does not publish”.
4. Storefront visibility rule (`getLiveStorefrontProducts`: PUBLISHED + ACTIVE category).
5. Marketing placement semantics (IDs only) + resolver.
6. Media register + ownership service (assign/unassign/transfer, rename rollback).
7. Pricing engine (`utils/pricing.js`) — server will re-compute, frontend keeps preview.
8. Order state machine + fulfillment transitions (minus the client-side payment stamp, which is backend work).
9. Return/refund state machine (`returnService`).
10. Inventory repository semantics (balances, movements, transfers, reservations) — implementation moves, rules stay.
11. Employee permission catalogue + roles + admin `employees.manage` boundary (one vocabulary per identity domain).
12. Three isolated auth/session domains (customer / admin / employee).
13. Activity diary model (`activityService` + `ACTIVITY_ACTIONS`) — becomes `audit_logs`.
14. Offers register + coupon adapter (minus deprecated export).
15. Analytics read-model (aggregates only — owns nothing).
16. Brand lockup (`src/assets/pratikshya_logo.webp`, `Brand.jsx`) — LOCKED.
17. Sandbox QR payload rules (`env:"sandbox"`, no credentials).
18. Design system, portal shell, and UI-only localStorage keys (`pratikshya_admin_sidebar_collapsed` / `pratikshya_employee_sidebar_collapsed` rail collapse; `pf_admin_nav_groups` / `pf_employee_nav_groups` group expansion).
19. Test suite (41 files) and the 21 dev QA/audit scripts.
20. Static media assets under `public/images/` (migrate to object storage later, never duplicate).

---

## 22 Approvals Needed Before Changes

- [x] Phase 1 deletions (§19 items 1–8) — **DONE**
- [x] Data-store merges (§20 items 1–2) — **DONE**
- [x] Surface repairs (§20 items 3, 5, 6, nav links; preferences route; reports route; returns desk) — **DONE** (except the `/employee/sales` mock figures, which remain labelled demo data)
- [ ] Phase 4 post-backend simplifications (§19 items 15–17, §20 items 4, 7, 8) — **DEFERRED until FastAPI backend**
- [ ] High-risk item #1 (payment confirmation) is backend-only work and must never ship as a frontend change — **STILL OPEN (backend owns it)**

*End of audit. No files were modified during the original audit pass; Phase 1 then implemented the approved cleanups.*

## 23 Backend Requirement Matrix

| Feature | Backend Required? | Reason | Priority |
|---|---|---|---|
| Authentication | Yes | Production identity and session authority | V1 |
| Products / workflow | Yes | Persistence, lifecycle, publication authority | V1 |
| Inventory | Yes | Stock/reservation authority | V1 |
| Orders / payments / returns | Yes | Financial and fulfillment authority | V1 |
| Employees / workforce | Yes | Secure staff identity and operations | V1 |
| Media metadata | Yes | Persistent ownership and object-storage references | V1 |
| PortalShell / sidebar | No | UI-only infrastructure | Client |
| Mock AI / AI Mirror | No in V1 | Future AI layer | Future AI |

Detailed migration mapping belongs in `backend-integration-audit.md`.

## 24 Final Feature Decision

Keep canonical business capabilities, merge legacy duplicates into single sources of truth, simplify optional/UI-only layers, replace demo seams with backend authority, and defer AI capabilities until the future AI boundary is implemented.
