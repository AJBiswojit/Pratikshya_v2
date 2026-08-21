# PRATIKSHYA FASHON — Feature Rationalization & Architecture Cleanup Audit

**Status:** AUDIT COMPLETE — awaiting explicit approval before ANY code change.  
**Date:** 2026-08-21  
**Scope:** Entire frontend at `AJBiswojit/Pratikshya_v2` (`src/`, `public/`, `tests/`, `scripts/`, configs).  
**Constraint honoured:** NO application code was modified, deleted, renamed, refactored, or migrated during this audit. This document is the only deliverable. All conclusions were reached by tracing definitions, imports, writers, readers, persistence, routes, UI and tests.  
**Baseline health:** 347/347 tests pass · production build is a single file (vite-plugin-singlefile) · ~92K lines of source · 128 authored products · 238 static media files (76 MB) · 37 test files · 21 dev scripts.

**Companion document:** `docs/backend-integration-audit.md` (the Backend Integration Master Audit) — this audit intentionally does not repeat its API map; it answers the *rationalization* questions (what is duplicated, what is dead, what is demo, what should exist at all) that must be decided **before** backend implementation.

---

## 1. Executive summary

PRATIKSHYA FASHON is a **complete operational UX** — customer storefront, Admin Portal and Employee Operations Portal — with **no HTTP backend**. Persistence is `localStorage` plus authored seed modules. The architecture is already shaped as repository/command layers that a backend can replace feature-by-feature without rewriting UI.

The codebase is, on the whole, **remarkably disciplined**: a single product register, a single lifecycle command layer, one permission vocabulary per identity domain, one activity diary, and documented compatibility wrappers everywhere a legacy seam exists. The audit did **not** find parallel catalogue databases, per-department product tables, or competing permission systems.

What the audit *did* find, in descending order of importance:

1. **Two customer stores.** Customer truth is split between `pratikshya_customers_registry` (written by sign-up/account flows) and `pratikshya_customers` (an admin demo list that is **never written**, always falls back to `INITIAL_DEMO_CUSTOMERS`). Admin customer pages read the stale store; the employee directory and analytics read the live one. → **MERGE** (R1 — removal simulation §12).
2. **Assisted orders live outside the order register.** `EmployeeAssistedOrder` writes to `pratikshya_employee_assisted_orders`, a second order data store that the order register, returns, analytics and admin never see. → **MERGE** (R2 — removal simulation §12).
3. **Dead-but-linked Preferences page.** `AccountPreferences.jsx` is not routed; `/account/preferences` is listed in `dedicatedPaths` but has no `<Route>`, so the working links in `AccountNav`, `AccountDashboard` and `AiShoppingAssistant` land on 404. → **REPAIR** (route it) or remove page + links (R4).
4. **Unrouted, fully-built employee analytics page.** `EmployeeReports.jsx` (permission-aware, real analytics read-model) is never routed; `/employee/reports` renders a **hardcoded mock desk** inside `EmployeeDesk.jsx`. → **REPLACE** mock desk with the real page (R5).
5. **Unreachable desk definitions.** Eight `EmployeeDesk` desk entries for `/employee/inventory*` are shadowed by real inventory routes and can never render — ~130 lines of dead code (R6).
6. **Hardcoded mock returns on the employee desk.** `/employee/returns` and `/employee/support/returns` render hardcoded return rows while the real return register (`returnService` + `/admin/returns`) exists. → **REPLACE** with real data (R8).
7. **Three broken collection nav links.** The Collections mega-menu links to `/collections/cotton`, `/collections/linen`, `/collections/chiffon`, and the Fabrics rail has no such collections in the taxonomy register — the pages 404. The nav hardcodes slugs instead of reading the managed collection catalogue. → **REPAIR** (R7).
8. **Dead code:** `CorrectionDialog.jsx` (0 references), `AdminModulePlaceholder.jsx` + `AdminComingSoon.jsx` (unrouted), `ADMIN_PLACEHOLDER_COPY` + `MODULE_STATUS` (unused), stubbed `demoOrders.js` generator, legacy attendance key constants, `operationsService.loadAttendanceMap` (no callers), legacy `data/products/catalogue.js` shim (1 importer).
9. **Demo/simulated layers that are honestly labelled** and should be *replaced, not removed*: three mock auth domains, `MockPaymentService`, sandbox QR (correctly sandbox-only), mock AI provider + procedural AI-mirror, `dashboardData.js` static admin dashboard numbers, hardcoded employee desk rows, `INITIAL_DEMO_CUSTOMERS` / walk-in mocks, workforce seed.
10. **Canonical architecture protection (§13) is intact** with one deliberate exception flagged for backend: `orderService.buildOrderRecord` stamps `PAYMENT_CONFIRMED` on the client at order creation (payment is confirmed by the frontend today — the known `HIGH` item in the backend audit).

**Recommendation headline:** nothing critical must be removed to reach a clean backend seam. The cleanup is concentrated in (a) merging the two customer stores and the two order stores, (b) repairing five broken/duplicate surface links, (c) deleting ~10 confirmed-dead files/configs, and (d) converting mock desks to real read-models where the real data already exists.

---

## 2. Complete feature inventory

Classification key: **CORE** = the business cannot run without it · **SUPPORTING** = needed for operations/merchandising · **OPTIONAL** = value-add, deferrable · **FUTURE** = placeholder/skeleton · **DEMO** = intentionally simulated · **UI ONLY** = presentation/preference.

### 2.1 Storefront (customer)

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

### 2.2 Catalogue & merchandising

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

### 2.3 Media & marketing

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

### 2.4 Inventory

| # | Feature | Where it lives | Class |
|---|---|---|---|
| I1 | Inventory register (locations, balances, status, thresholds) | `services/inventory/inventoryRepository.js`, keys `pratikshya_inventory*` | CORE |
| I2 | Stock movements ledger (receive/adjust/damage/return/inspect) | `inventoryRepository` + `pratikshya_inventory_movements` | CORE |
| I3 | Transfers (request/approve/dispatch/receive lifecycle) | `inventoryRepository` + `pratikshya_inventory_transfers` | SUPPORTING |
| I4 | Reservations (cart reserve, expiry, sale confirm/release, cancellation restock) | `inventoryRepository` + `pratikshya_inventory_reservations` | CORE |
| I5 | Inventory UI (dashboard, operations, transfers, movements, low-stock — shared by Admin & Employee portals) | `components/inventory/*`, `context/InventoryContext.jsx` | CORE |

### 2.5 Commerce

| # | Feature | Where it lives | Class |
|---|---|---|---|
| O1 | Offers / coupons (CRUD, eligibility, validation, redemption, lifecycle) | `services/offers/offerRepository.js`, `data/offers/seedOffers.js`, key `pratikshya_offers`; legacy adapter `data/shopping/coupons.js` | CORE |
| O2 | Orders (creation, status journey, fulfillment transitions) | `services/orders/orderService.js` + `fulfillmentService.js` + `orderTimelineService.js`, `context/OrderContext.jsx`, keys `pratikshya_orders` / `pratikshya_current_order` / `pratikshya_order_sequence` | CORE |
| O3 | Assisted orders (employee-created) | `pages/employee/EmployeeAssistedOrder.jsx`, key `pratikshya_employee_assisted_orders` — **second order store (§3.8)** | CORE (data-store bug) |
| O4 | Order tracking (customer view, carrier legs) | `services/orders/trackingService.js`, `pages/account/OrderTracking.jsx` | SUPPORTING |
| O5 | Returns / refunds (request→review→pickup→receive→inspect→refund) | `services/orders/returnService.js`, `pages/account/OrderReturn.jsx`, `pages/admin/AdminReturns|AdminReturnDetail` | CORE |
| O6 | Admin order invoice | `pages/admin/orders/AdminOrderInvoice.jsx`, `components/orders/InvoicePreview.jsx` | SUPPORTING |

### 2.6 Customers

| # | Feature | Where it lives | Class |
|---|---|---|---|
| U1 | Customer registry (sign-up writes here) | `context/AuthContext.jsx` → key `pratikshya_customers_registry`, fallback `data/mockCustomers.js` | CORE (mock identity) |
| U2 | Customer profile / addresses / preferences / security | `context/AccountContext.jsx` → key `pratikshya_account_{id}` | CORE (mock identity) |
| U3 | Admin customer list/detail | `pages/admin/AdminCustomers|AdminCustomerDetail` → key `pratikshya_customers` (stale — §3.5) | SUPPORTING |
| U4 | Employee customer directory (walk-ins + registry) | `pages/employee/EmployeeCustomers.jsx`, `operationsService.getDirectoryCustomers`, `data/employees/operations.js` walk-in mocks | SUPPORTING |

### 2.7 Admin portal

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

### 2.8 Employee portal & workforce

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

### 2.9 Cross-cutting

| # | Feature | Where it lives | Class |
|---|---|---|---|
| X1 | Design system (tokens, typography, spacing, motion, ~30 components) | `src/design-system/*` | UI ONLY |
| X2 | Shared portal sidebar | `components/navigation/PortalSidebar.jsx` (used by Admin + Employee sidebars) | UI ONLY |
| X3 | Dev QA/audit scripts (21) | `scripts/*.mjs` + `scripts/node-loader/*` | DEV ONLY |
| X4 | Test suite (37 files, 347 tests) | `tests/*.test.js`, `tests/helpers`, `tests/temporary/qa-review-prod.mjs` | DEV ONLY |
| X5 | Static media (products 214 files, collections 19, hero 5) | `public/images/*` | CORE asset (fallback) |

---

## 3. Duplicate feature report

Trace method per candidate: **definition → imports → consumers → writers → readers → persistence → routes → UI → tests → business purpose**. Conclusion from {KEEP BOTH, MERGE, SIMPLIFY, DEPRECATE, REMOVE}.

### 3.1 Product vs Catalogue
- **Product:** `services/catalogRepository.js` — ONE register `pratikshya_products`, seeded from `src/data/catalog/products.js` (128 records), merged by ID, stored wins.
- **Catalogue:** `src/data/products/index.js` — pure read projection (`getLiveStorefrontProducts`, `toStorefrontProduct`, `getProductByIdentifier`, search haystack). No persistence of its own.
- **Traced:** 24+ storefront/admin/employee consumers import `data/products`; every admin mutation goes through `catalogRepository`. No second register exists anywhere (no `kids_products`, `women_products`, etc.).
- **Conclusion:** **KEEP BOTH** (canonical register + derived projection). One simplification: `src/data/products/catalogue.js` is a 7-line legacy re-export consumed only by `taxonomyRepository` → **SIMPLIFY** (import `data/catalog/products` directly, then delete shim).

### 3.2 Product Media vs Managed Media
- **Authored plates:** `product.media.primary/gallery` inside the canonical seed (paths under `public/images/products/…`).
- **Managed media:** `mediaRepository`/`mediaStore` register `pratikshya_media` (uploads, review, scopes PRODUCT/MARKETING, ownership).
- **Resolution:** `productMediaSet.js` + `data/products/index.js` authored-plates-first, managed override at render (`useProductCovers`/`getProductMediaSet`).
- **Conclusion:** **KEEP BOTH** — deliberately layered fallback, not a duplicate store. Backend note: seed paths must migrate into `media_assets`; precedence must stay “managed wins, authored plate fallback”.

### 3.3 Marketing Media vs Editorial Media
- Both are the same register differentiated by `scope`/`usageRoles` (HOME_HERO, EDITORIAL, PROMOTION, LOOKBOOK, COLLECTION_COVER…). No separate editorial media store.
- **Conclusion:** **KEEP** — one register, two usage vocabularies. No merge needed.

### 3.4 Collections vs Editorial Collections
- **Managed collections:** `taxonomyRepository` seeds + `pratikshya_taxonomy_v2` (ids `new-arrivals`, `featured`, `heritage-weaves`, `festive-edit`, `handloom-stories`, `bridal-trousseau`, `everyday-atelier`, `groom-atelier`, `silk`, `wedding`; some RULE_BASED).
- **Editorial plates:** `src/data/catalog/collections.js` `editorialCollections` (festive-edit, heritage-weaves, new-arrival) — storytelling imagery for plates, explicitly “NOT product records”.
- **Nav hardcoding:** `config/navigationConfig.js` hardcodes collection links; **three are dead** — `/collections/cotton`, `/collections/linen`, `/collections/chiffon` have no collection record (only `silk` exists) → CatalogueListing renders NotFound. `/collections/festive-edit` works only because `findCollection` matches by **id** while the record’s slug is `festive` (fragile).
- **Conclusion:** **KEEP BOTH layers** (plates are fallback imagery, membership is managed), **REPAIR** nav: derive Fabric-collection links from the collection register; add/remove collections in the register, not in `navigationConfig`.

### 3.5 Customer vs Customer Registry — **REAL DUPLICATE**
- `pratikshya_customers_registry` — written by `AuthContext` (sign-up) and `AccountContext` (profile updates). Read by employee directory (`operationsService.getRegisteredCustomers`), analytics, account area.
- `pratikshya_customers` — read by `AdminCustomers`, `AdminCustomerDetail`, and as a **legacy fallback** in `analyticsService`. **No writer anywhere.** Always `INITIAL_DEMO_CUSTOMERS` (10 records).
- Consequence: a customer who signs up appears in the employee directory but **not** in the admin customer list (and vice versa with the demo records).
- **Conclusion:** **MERGE** into the registry. Admin pages must read `customers_registry` (+ orders). Remove key `pratikshya_customers` and the analytics legacy fallback. Risk LOW (read-only change + key removal).

### 3.6 Customer Account vs Admin Customer Store
- Same finding as 3.5 (`pratikshya_account_{id}` is a per-user profile cache written by `AccountContext`; it is a *projection* of the registry record + addresses/preferences/security, not a second identity). The true duplication is the two list stores.
- **Conclusion:** **MERGE** (admin reads registry); **KEEP** the per-account projection until backend sessions exist, then it becomes `GET /me`.

### 3.7 Offers vs Promotions
- `offerRepository` is the single offers/promotions store; `data/shopping/coupons.js` is a documented Phase-17 adapter with one `@deprecated` export (`coupons = []`) kept only for old imports; legacy codes WELCOME10/FESTIVE15/BRIDAL20 were migrated into the offer register.
- **Conclusion:** **KEEP** adapter, **SIMPLIFY** later (drop deprecated export once cart/checkout import paths are the only consumers — they already go through the adapter functions).

### 3.8 Checkout vs Order Draft vs Assisted Orders — **REAL DUPLICATE (orders)**
- `pratikshya_checkout` = in-progress checkout draft (cart snapshot + steps). Correct as a draft.
- `pratikshya_orders` = the order register (checkout orders). `pratikshya_current_order` = the last placed order pointer.
- `pratikshya_employee_assisted_orders` = **a second order store** written by `EmployeeAssistedOrder.jsx` and read by `operationsService.getAssistedOrders` (desk/dashboard). These orders never enter the order register → invisible to admin orders, returns, analytics, customer history.
- **Conclusion:** **MERGE** — assisted orders must flow through `orderService` (flag `channel: "ASSISTED"` + employee actor). Remove the dedicated key. Checkout draft itself: **KEEP** (correct staging concept).

### 3.9 Review vs Approval
- Both are steps of ONE lifecycle (`DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED`). `productReviewFlags` / media groups are review *signals*; `approveProduct` is a *command* that does not publish. The unified review queue (`unifiedProductReview` + `UnifiedReviewQueue`) superseded per-category review panels; `ProductDraftReviewPanel`/`ProductGroupReviewPanel`/`ProductReviewDetail` remain as sub-views of the same queue.
- **Conclusion:** **KEEP** (single workflow, multiple views). Optional SIMPLIFY: fold the four review-presentation components into the unified queue after backend.

### 3.10 Inventory vs Stock
- One inventory layer (`inventoryRepository`, five namespaced keys). `operationsService.getCatalogueStock` is a derived read-model for dashboards. EmployeeDesk’s inventory desk views are **shadowed by real routes and unreachable** (dead code — §7.3).
- **Conclusion:** **KEEP** repository + read-model; **REMOVE** unreachable desk rows.

### 3.11 Activity vs Audit Logs
- One diary: `activityService` + `pratikshya_employee_activity`, written by every repository command, read by `/admin/activity`, employee feeds, per-entity timelines.
- Naming collision only: `mediaAudit.js` / `mediaExposure.js` are **QA tooling** (dev scripts/tests), not runtime audit logs. **KEEP** diary; re-label tooling as dev-only.

### 3.12 Settings vs Checkout Configuration — **OVERLAP**
- `settingsRepository` (`pratikshya_settings`, admin-editable) owns sections for shipping, payments, returns, orders, inventory thresholds, media limits.
- `config/checkoutConfig.js` hardcodes delivery methods/fees (₹99 flat, ₹5,000 free threshold, ₹199 express, ₹49 COD) and payment methods; `utils/shopping.js` hardcodes the same shipping constants; `SETTINGS_DEFAULTS.shipping` stores the same numbers a third time.
- **Conclusion:** **MERGE** direction — checkout must resolve delivery/payment rules from `settingsRepository` with `checkoutConfig` demoted to defaults; single source = settings. Risk MEDIUM (touch checkout pricing paths).

### 3.13 Hero vs Marketing Media
- `data/catalog/hero.js` = authored slide copy + static fallback images; managed `HOME_HERO` marketing media overrides at render (`resolveHeroImageIds` + `useMarketingMedia`). Fallback pattern again.
- **Conclusion:** **KEEP** (fallback pattern). Backend: hero copy becomes CMS content; static images migrate to object storage.

### 3.14 Employee roles vs employee permissions; Admin roles vs admin permissions
- ONE employee permission catalogue (`employeePermissions.js`) + role defaults (`employeeRoles.js`) + per-employee custom grants; admin domain owns a separate `SUPER_ADMIN` role with `employees.manage` — deliberately isolated from employee permissions (employee records can never carry admin authority; admin identity is never an employee). 
- **Conclusion:** **KEEP** both vocabularies (separate identity domains, by design). Do not unify.

### 3.15 Product workflow: three layers, one implementation
- `workflow/productWorkflowCommands.js` = canonical commands; `workflowCommandRegistry` = late-binding seam; `services/productWorkflow.js` = documented compatibility wrappers (delegate 1:1); `catalogRepository.LEGACY_STATUS_COMMANDS` = adapter section delegating to the registry. No second implementation exists.
- **Conclusion:** **KEEP** now; **SIMPLIFY** after backend (delete wrapper module, update 8 importers).

### 3.16 Workforce attendance: two keys, one live
- `pratikshya_attendance` (canonical, via `ATTENDANCE_STORAGE_KEY`) vs legacy `pratikshya_employee_attendance` (migrated once, never written). Legacy `pratikshya_attendance_settings` likewise migrated into `pratikshya_settings` by `settingsRepository.migrated()`.
- **Conclusion:** **REMOVE** legacy constants + migration readers once migration is retired (dev-only keys).

### 3.17 Order summary components (visual overlap only)
- `cart/OrderSummary` (Cart page), `checkout/CheckoutOrderSummary` (Checkout), `orders/OrderSummaryPanel` (account OrderDetail). All three are used and render differently-scoped data.
- **Conclusion:** **KEEP**; optional design-system consolidation only — no business duplication.

---

## 4. Single source of truth report

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

## 5. Mock / demo / experimental audit

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

## 6. localStorage audit

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
| `pratikshya_customers` | **stale** admin demo customer list | *(no writer)* | AdminCustomers / AdminCustomerDetail / analytics fallback | Customers | **NO — remove after merge** | D |
| `pratikshya_admins` | admin identity register | adminAuthService | admin guards/profile | Admins | Yes (mock) | A |
| `pratikshya_admin_credentials` | admin credential fingerprints | adminAuthService | admin sign-in | Admin credentials | Yes (mock) | A |
| `pratikshya_admin_auth` | admin session | adminAuthService | guards | Admin session | Yes (mock) | A |
| `pratikshya_employees` | employee register (role/permissions/status) | employeeService | employee + admin portals, workflow principal | Employees | **YES** | A |
| `pratikshya_employee_credentials` | employee credential fingerprints | employeeService | sign-in / password change | Employee credentials | Yes (mock) | A |
| `pratikshya_employee_auth` | employee session | employeeAuthService | guards | Employee session | Yes (mock) | A |
| `pratikshya_employee_activity` | house diary (append-only) | activityService (all repositories) | admin activity, feeds, timelines | Activity | **YES** | A |
| `pratikshya_employee_assisted_orders` | **second order store** | EmployeeAssistedOrder page | operationsService desk/dashboard | Orders | **NO — merge into `pratikshya_orders`** | D |
| `pratikshya_attendance` | attendance events | workforce/attendanceRepository | attendance UI, analytics | Attendance | **YES** | A |
| `pratikshya_leave` | leave requests | workforce/leaveRepository | leave UI, analytics | Leave | **YES** | A |
| `pratikshya_performance` | performance records | workforce/performanceRepository | performance UI, analytics | Performance | **YES** | A |
| `pratikshya_settings` | house configuration (17 sections) | settingsRepository | admin settings, checkout config (planned), attendance thresholds | Settings | **YES** | A |
| `pratikshya_recently_viewed` | per-customer recent product ids | recentlyViewed service | account dashboard, AI shopping | Personalization | Client cache; backend-able later | B |
| `pratikshya_preferences` | style preferences (personalization) | stylePreferences | AccountPreferences (dead), AI | Personalization | Client; backend-able later | B |
| `pf_admin_nav_groups` / `pf_employee_nav_groups` | sidebar collapse state | AdminSidebar / EmployeeSidebar | same components | UI chrome | UI-only, never migrate | B |
| `pratikshya_ai_shopping_session_*` / `pratikshya_ai_business_session_*` / `pratikshya_ai_mirror_recent_*` | AI demo session transcripts / mirror history | aiSessionStore / aiMirrorService | AI pages | AI sessions | Demo; server-side later | C |
| `pratikshya_canonical_media_state_2026_08_17` | one-shot media seed wipe marker | mediaStore | mediaStore | Migration marker | Dev-only; remove post-migration | C |
| `pratikshya_employee_attendance` | legacy attendance key (migrated once) | *(migrated only)* | attendanceRepository migration + dead `loadAttendanceMap` | Attendance | Legacy; remove | C/D |
| `pratikshya_attendance_settings` | legacy settings (merged into settings) | *(migrated only)* | settingsRepository.migrated() | Settings | Legacy; remove | C/D |

**Buckets:** A = MUST MOVE TO BACKEND (all registers + sessions) · B = CAN REMAIN CLIENT-SIDE (UI chrome, personalization caches — revisit post-backend) · C = DEVELOPMENT ONLY (sandbox AI sessions, migration markers) · D = REMOVE (stale customer list, assisted-orders second store, legacy keys).

---

## 7. Dead code report

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

## 8. Route audit

Legend: **KEEP** · **MERGE** · **REMOVE** · **DEFER** · **REPAIR**.

### 7.1 Storefront (CustomerLayout)

| Route | Purpose | User | Nav? | Verdict |
|---|---|---|---|---|
| `/` | home | public | — | KEEP |
| `/shop` | catalogue front door | public | header | KEEP |
| `/explore` | discovery feed | public | header/footer | KEEP |
| `/category/:slug`, `/collection/:slug` | managed listing pages | public | direct URLs (required) | KEEP |
| `/search` | results | public | header | KEEP |
| `/product/:productId` | detail | public | direct (required) | KEEP |
| `/cart`, `/checkout`, `/order-success` | journey | public | header (cart) | KEEP |
| `/account/wishlist` (+ `/wishlist` redirect) | saved pieces | any | header | KEEP |
| `/signin`, `/signup`, `/forgot-password`, `/reset-password` | auth | public | account links | KEEP |
| `/account`, `/account/profile`, `/account/addresses`, `/account/orders`, `/account/settings`, `/account/security`, `/account/ai-mirror`, `/account/ai-shopping` | account area | customer (guard) | AccountNav | KEEP |
| `/account/orders/:orderId` (+`/track`, `/return`) | order follow-up | customer | account | KEEP |
| **`/account/preferences`** | style preferences | customer | AccountNav + dashboard | **REPAIR (R4) — no route exists; page dead** (§7.2) |
| ~38 manifest paths (`/women/…`, `/bridal/…`, `/men/…`, `/kids/…`, `/collections/*`) | department/category/subcategory listings | public | mega menu/footer | KEEP (all resolve via managed taxonomy) |
| `/about`, `/contact`, `/privacy`, `/terms` | static interior pages | public | footer | KEEP |
| `*` | 404 | public | — | KEEP |

**Repair (R7):** mega-menu links `/collections/cotton`, `/collections/linen`, `/collections/chiffon` → **dead (404)**. Remove them or add those collections to the register; prefer deriving fabric rails from the register.

### 7.2 Admin (AdminProtectedRoute + AdminLayout)

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

### 7.3 Employee (EmployeeProtectedRoute + EmployeeLayout)

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
| `/employee/returns` | returns desk | **REPAIR (R8) — hardcoded mock rows; read real return register instead** |
| `/employee/support*` (4) | care desk | **DEFER** (no support-case entity exists) |
| `/employee/styling*` (6) | styling desk | **DEFER** (no styling entity exists) |
| `/employee/sales` | sales desk | **REMOVE/REPLACE (R5)** — hardcoded figures; `EmployeeReports` (analytics) covers this, once routed |
| `/employee/team` | team list | KEEP (real employee data) |
| `/employee/reports` | reports | **REPAIR (R5) — route to `EmployeeReports.jsx` (real analytics), remove mock desk** |
| `/employee/management/*` | legacy redirect → profile | KEEP (safe redirect) |

---

## 9. Feature dependency graph

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

## 10. Frontend vs backend responsibility

| Feature | Classification |
|---|---|
| Navigation collapse state, sidebar chrome, page transitions, design-system components, cart drawer animation, brand lockup | FRONTEND ONLY |
| Storefront listings/facets UI, cart UI, wishlist UI, account UI, checkout steps UI, admin/employee page shells | BACKEND + FRONTEND (UI stays; data becomes API) |
| Product persistence & lifecycle enforcement, taxonomy persistence, media ownership & upload validation, marketing placement persistence | BACKEND REQUIRED (frontend keeps commands/UI as adapter) |
| Inventory ledger/reservations, order state machine, payment verification, returns/refunds, offer redemption limits, auth sessions & password hashing, RBAC enforcement, activity/audit log | BACKEND REQUIRED (server-authoritative; frontend must not confirm payments or grant authority) |
| Pricing computation (final price) | BACKEND REQUIRED (frontend may preview via shared engine only) |
| Recently viewed, style preferences, wishlist, cart while signed out | BACKEND + FRONTEND (server-backed later; client cache acceptable in V1) |
| Sandbox QR, mock AI, mock payments, demo seeds, QA scripts, tests | DEVELOPMENT ONLY |
| AI assistants, AI mirror, personalization ranking, employee styling/support desks | FUTURE (backend later) |

---

## 11. V1 / V1.5 / Future classification

### MUST HAVE — V1 (backend)
Catalogue + lifecycle (C1–C10), taxonomy/collections (C2–C3), storefront projection (C4), media + ownership + placements (M1–M4), inventory (I1–I4), offers (O1), cart/wishlist/checkout/orders/returns (S8–S12, O2–O6), customer identity (U1–U2, merged §3.5), admin + employee portals over the same APIs, activity diary, settings, analytics read-model.

### SHOULD HAVE — V1.5
Recently viewed / style preferences / personalization (S15–S17 — **repair the Preferences route first**), employee assisted orders unified into the order register (O3), real admin dashboard numbers replacing `dashboardData` static values, employee reports page routed (R5), support/styling desks (new entities), sandbox QR retired in favor of real gateway UPI.

### FUTURE
Real AI provider for shopping/business assistants, real virtual try-on (AI Mirror), recommendation service, support-case/ticketing entity, styling appointment entity, warehouse WMS features.

**Deferral policy per feature:** warehouse/support/styling desks → DEFER WITH PLACEHOLDER UI (they are honest “Later” notes today); dead pages (7.2, 7.3, 7.4) → REMOVE (they are unreachable, not future work); mock numbers on routed pages → REPLACE with real read-model data.

---

## 12. Removal safety analysis (for every recommended removal)

### R1 — Remove `pratikshya_customers` duplicate store + stale admin reads
- Files: `AdminCustomers.jsx`, `AdminCustomerDetail.jsx`, `analyticsService.js` (fallback), `AuthContext.jsx` (unaffected registry)
- Routes: `/admin/customers`, `/admin/customers/:customerId` (keep, re-point data)
- Components: none
- Services: analytics fallback path
- Storage keys: `pratikshya_customers` (remove)
- Tests: `employeeManagement.test.js` (indirect), analytics tests
- Navigation: none
- Backend entities: none yet
- **RISK: LOW** — read-only re-point + key removal.

### R2 — Merge assisted orders into order register
- Files: `EmployeeAssistedOrder.jsx`, `operationsService.getAssistedOrders`, `services/employees/storage.js`
- Routes: `/employee/orders/assisted` (keep)
- Storage keys: `pratikshya_employee_assisted_orders` (remove)
- Backend: orders API gains `channel=ASSISTED`
- **RISK: MEDIUM** — touches order creation flow; requires explicit review.

### R3 — Remove dead pages/components/config (§7.1, 7.4, 7.5, 7.10)
- Files: `CorrectionDialog.jsx`, `AdminModulePlaceholder.jsx`, `AdminComingSoon.jsx`, `data/products/catalogue.js` (+1 import fix), unused constants in `adminNavigation.js`
- Routes/components/tests/storage/navigation/backend: none (0 references each)
- **RISK: LOW** — automatable after approval.

### R4 — Route `/account/preferences` to the existing page (or remove page + links)
- Files: `App.jsx` (add Route), `AccountPreferences.jsx` (exists), `AccountNav.jsx` (link already present)
- Tests: none today
- **RISK: LOW** if routed; **MEDIUM** if instead removing the page (three link sites + stylePreferences service consumers).

### R5 — Route `/employee/reports` to `EmployeeReports.jsx`; remove mock reports + sales desks
- Files: `App.jsx` (1 route element swap), `EmployeeDesk.jsx` (remove `/employee/reports`, `/employee/sales` desk rows + MOCK helpers)
- Components: `EmployeeReports.jsx` (already built, permission-aware)
- Tests: none today
- **RISK: MEDIUM** — route behavior change; needs explicit review. Keep `/employee/team` desk (real data).

### R6 — Remove 8 shadowed inventory desk rows in `EmployeeDesk.jsx`
- Files: `EmployeeDesk.jsx` only
- Routes: none (routes already point elsewhere)
- **RISK: LOW**.

### R7 — Fix/derive collection nav links (remove 3 dead fabric links or add collections)
- Files: `config/navigationConfig.js` (+ optionally taxonomy seeds)
- Routes: `/collections/cotton|linen|chiffon` (currently 404)
- **RISK: LOW** (removal) / **MEDIUM** (adding collections — content decision).

### R8 — Replace hardcoded return rows on employee desks with returnService reads
- Files: `EmployeeDesk.jsx` (`/employee/returns`, `/employee/support/returns`), maybe `EmployeeReturns` view of `returnService`
- Storage: none (reads order register)
- **RISK: MEDIUM** — small new read path; requires review.

### R9 — Remove dead demo-orders stub (`demoOrders.js` customers + `[]` return)
- Files: `demoOrders.js` (simplify or delete), `orderService.js` (seed call stays safe)
- **RISK: LOW**.

### R10 — Retire legacy attendance keys & migration readers (7.8, 7.9, plus `settingsRepository.migrated()` legacy read)
- Files: `operationsService.js`, `attendanceRepository.js`, `settingsRepository.js`, `services/employees/storage.js`
- Storage keys: `pratikshya_employee_attendance`, `pratikshya_attendance_settings` (read-only today)
- **RISK: LOW** for readers of never-written keys; **MEDIUM** until one release after migration, then safe.

### R11 — Demo mock labels on routed surfaces (dashboard static numbers, desk sales figures)
- Not removals — replacements. **DEFER to backend** (analytics read-model already exists client-side; admin dashboard can adopt it in V1.5).
- **RISK: MEDIUM** (visual/regression review).

**Nothing in this audit is CRITICAL (do-not-modify).** The canonical lifecycle, brand asset, placement ID semantics, and product register remain untouched by every recommendation above.

---

## 13. Canonical architecture protection — verification result

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

## 14. Feature decision matrix

Columns: FEATURE · PURPOSE · CURRENT IMPLEMENTATION · DUPLICATE? · SOURCE OF TRUTH · USED? · USER VALUE · BACKEND REQUIRED? · COMPLEXITY · RECOMMENDATION · RISK · REASON

| Feature | Purpose | Implementation | Dup? | SoT | Used? | Value | BE? | Cx | Rec | Risk | Reason |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Storefront home | brand + merchandising landing | hero + rails over placements | No | placements + media + products | Yes | 5 | Yes | 3 | KEEP | LOW | core |
| Shop/Explore/listings/search | discovery | shared query layer | No | products+taxonomy | Yes | 5 | Yes | 3 | KEEP | LOW | core |
| Product detail | conversion | detail page + preview seam | No | products | Yes | 5 | Yes | 2 | KEEP | LOW | core |
| Canonical products | one catalogue | catalogRepository | No | register | Yes | 5 | Yes | 5 | KEEP | CRITICAL-protected | core |
| Taxonomy (dept/cat/sub) | navigation + filters | taxonomyRepository | No | `pratikshya_taxonomy_v2` | Yes | 5 | Yes | 3 | KEEP | LOW | core |
| Collections (managed) | curation | taxonomyRepository + plates | Overlap w/ plates only | taxonomy register | Yes | 4 | Yes | 3 | KEEP + REPAIR nav links | LOW | 3 dead links |
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
| Orders | fulfillment | orderService + context | Assisted orders = second store | `pratikshya_orders` | Yes | 5 | Yes | 5 | KEEP + **MERGE assisted orders** | HIGH | §3.8 |
| Fulfillment | pick/pack/dispatch | fulfillmentService | No | order row | Yes | 5 | Yes | 4 | KEEP (drop client forceTransition on BE) | HIGH | core |
| Returns/refunds | after-sales | returnService | Employee desk shows hardcoded copies | order.returns | Yes | 5 | Yes | 4 | KEEP + REPLACE desk mocks | MED | R8 |
| Tracking | customer visibility | trackingService (synthetic legs) | No | derived | Yes | 3 | Yes | 2 | KEEP / DEFER real carrier | LOW | fine as demo |
| Customer registry | identity | AuthContext | **dup with stale admin store** | `pratikshya_customers_registry` | Yes | 5 | Yes | 4 | **MERGE** admin store into registry | LOW | §3.5 |
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
| Style preferences page | personalization inputs | AccountPreferences + stylePreferences | No | `pratikshya_preferences` | **No (404!)** | 3 | Later | 2 | **REPAIR route** (V1.5) | LOW | R4 |
| Recently viewed | re-engagement | recentlyViewed service | No | own key | Yes | 3 | Later | 1 | KEEP | LOW | cache |
| Employee desk (warehouse/support/styling) | future ops | placeholder tables + notes | Rows partially real (inventory/transfers) | mixed | Yes (placeholder) | 2 | Later | 2 | DEFER WITH PLACEHOLDER UI | LOW | honest “Later” |
| Employee desk (returns) | returns ops | **hardcoded mock rows** | duplicates returnService | should be orders | Yes | 4 | Yes | 2 | REPLACE with real returns | MED | R8 |
| Employee desk (sales/reports) | store metrics | **hardcoded figures** | duplicates analytics | should be orders | Yes | 3 | Yes | 2 | REPLACE (route EmployeeReports) | MED | R5 |
| Employee reports page | analytics | EmployeeReports (real) | **unrouted; desk mock shadows it** | orders etc. | **No** | 4 | Yes | 3 | **ROUTE IT** | MED | R5 |
| AdminModulePlaceholder/ComingSoon | legacy placeholder | unrouted pages | No | — | No | 0 | — | 1 | REMOVE | LOW | dead |
| CorrectionDialog | attendance corrections | component | No | — | No | 0 | — | 1 | REMOVE | LOW | dead |
| demoOrders generator | demo order seed | stubbed `[]` | No | — | No | 0 | — | 1 | REMOVE | LOW | dead stub |
| Legacy data/products shims (catalogue.js) | compat imports | re-export | facade, 1 importer | canonical seed | Yes | — | — | 1 | SIMPLIFY (remove) | LOW | 1 import fix |
| Dev scripts + tests | QA | 21 scripts, 347 tests | No | — | dev only | 5 (dev) | — | 3 | KEEP | LOW | tooling |

---

## 15. Priority score (1–5 each; duplication 0–5; backend dependency 0–5)

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

**Strongest cleanup candidates (DUPLICATE / HIGH COMPLEXITY):** customer dual store, assisted-orders second store, mock desk returns/sales/reports. **Quick wins (LOW VALUE / LOW COMPLEXITY):** dead file list §7, shadowed desk rows, dead collection links.

---

## 16. Recommended cleanup order

**Phase 0 — approvals (no code without it).** Items in §19–§22 are the approval checklist.

**Phase 1 — zero-risk deletions (LOW, automatable):**
1. `CorrectionDialog.jsx` (7.1)
2. `AdminModulePlaceholder.jsx` + `AdminComingSoon.jsx` + `ADMIN_PLACEHOLDER_COPY` + `MODULE_STATUS` (7.4–7.5)
3. 8 shadowed inventory desk rows in `EmployeeDesk.jsx` (7.6)
4. `demoOrders.js` stub body (keep file only if a future generator is wanted) (7.7)
5. `operationsService.loadAttendanceMap` + legacy attendance key constant (7.8–7.9, after one release)
6. `data/products/catalogue.js` shim + 1 import fix (7.10)
7. Remove 3 dead fabric collection links or add collections (R7)

**Phase 2 — data-store merges (MEDIUM, explicit review):**
8. Merge `pratikshya_customers` → registry; re-point admin pages + analytics fallback (R1)
9. Merge assisted orders → order register with `channel: ASSISTED` (R2)

**Phase 3 — surface repairs (MEDIUM, explicit review):**
10. Route `/account/preferences` (R4) — or remove page + links
11. Route `/employee/reports` → `EmployeeReports.jsx`; remove reports/sales mock desks (R5)
12. Employee returns desk reads `returnService` (R8)
13. Checkout resolves delivery/payment rules from settings (keep checkoutConfig as defaults) (3.12)

**Phase 4 — post-backend simplifications (deferred until API exists):**
14. Delete compatibility wrappers (`productWorkflow.js`) after importers move to command layer
15. Drop deprecated `coupons` export; retire `pratikshya_canonical_media_state_*` marker; retire legacy attendance/settings migration readers
16. Replace `dashboardData` static numbers with analytics; remove sandbox-only paths (QR, mock AI) behind provider/env flags
17. Migrate authored media plates (`product.media`, hero images, editorial plates) into the media register/object storage

---

## 17. High-risk items requiring manual approval

1. **Payment confirmation stays frontend-side until backend exists.** Any cleanup touching `CheckoutContext.handlePaymentResolution` / `orderService.buildOrderRecord` requires explicit approval. Never add a production “paid” path client-side.
2. **Lifecycle command layer.** No bulk `status=PUBLISHED` shortcut may ever appear; approval ≠ publish. Any refactor of `productWorkflowCommands` is HIGH risk.
3. **Marketing placements.** They must remain ID lists. Any cleanup of `marketingPlacementRepository` must preserve the resolver’s live-catalogue join.
4. **Order/inventory atomicity.** Merging assisted orders and moving reservations server-side must be one backend transaction per operation.
5. **Three isolated auth domains.** Any customer-store merge must not let an admin/employee session read another portal’s data; separate cookie/session names on the backend.
6. **Media upload validation.** Rejecting `blob:`/`data:` URLs and enforcing MIME/size must move server-side — upload UI changes are MEDIUM risk until then.
7. **Brand asset.** `src/assets/pratikshya_logo.webp` and the `Brand.jsx` lockup are LOCKED; do not touch in cleanup.

---

## 18. Final recommended architecture AFTER cleanup

```
┌────────────────────────── FRONTEND (thin UI + adapters) ──────────────────────────┐
│ Storefront  ·  Admin Portal  ·  Employee Portal   (shared design-system, one shell)│
└───────────────▲───────────────────────────────▲──────────────────────────────────┘
                │ typed adapter layer (same function names as today)                 │
┌───────────────┴───────────────────────────────┴──────────────────────────────────┐
│ BACKEND API (single Node service + PostgreSQL — per docs/backend-integration-audit.md) │
│  auth  · catalog/products  · taxonomy  · media  · marketing  · inventory  ·        │
│  offers · cart/wishlist · checkout · payments (webhook-confirmed) · orders ·       │
│  returns · workforce · analytics · audit · settings                                │
└───────────────────────────────────────────────────────────────────────────────────┘

Single sources of truth (post-cleanup):
  products        → products table (one table, all departments; seed = data/catalog/products.js)
  taxonomy        → departments/categories/subcategories/collections tables (seed = data/catalog/taxonomy.js)
  media           → media_assets + object storage (authored plates migrate here)
  placements      → marketing_placements + _products (IDs only)
  customers       → users (single table; pratikshya_customers and account_* projections collapse)
  orders          → orders/order_items/timeline (assisted orders = same table, channel flag)
  inventory       → balances/movements/transfers/reservations (server transactions)
  payments        → payments/payment_events (server/webhook authority)
  workforce       → attendance/leave/performance tables
  activity        → audit_logs (append-only)
  settings        → settings (checkout reads from here; checkoutConfig demoted to UI defaults)

Frontend-only survivors: design system, shell chrome, nav collapse keys,
personalization caches (recently viewed/style prefs until V1.5), sandbox-only
demo seams behind provider/env flags (mock AI, sandbox QR, demo seeds).
```

---

## 19. Exact list of features/files to REMOVE (after approval)

**Dead code — safe to delete:**
1. `src/components/workforce/CorrectionDialog.jsx`
2. `src/pages/admin/AdminModulePlaceholder.jsx`
3. `src/components/admin/AdminComingSoon.jsx`
4. `ADMIN_PLACEHOLDER_COPY` + `MODULE_STATUS` exports from `src/config/adminNavigation.js`
5. Eight unreachable desk entries in `src/pages/employee/EmployeeDesk.jsx` (`/employee/inventory`, `inventory/movements`, `inventory/transfers`, `inventory/low-stock`, `inventory/out-of-stock`, `inventory/receive`, `inventory/adjust`, `inventory/requests`)
6. `src/data/products/catalogue.js` (after re-pointing the single importer `taxonomyRepository.js` to `data/catalog/products`)
7. Stub body of `src/services/orders/demoOrders.js` (12 unused customers + `[]` generator) — keep or delete file per approval
8. `loadAttendanceMap` from `src/services/employees/operationsService.js`
9. Legacy constants/readers after one migration-safe release: `EMPLOYEE_STORAGE_KEYS.ATTENDANCE` (`pratikshya_employee_attendance`), `pratikshya_attendance_settings` legacy read in `settingsRepository.js`

**Data stores — remove after merge:**
10. localStorage key `pratikshya_customers` (+ its readers re-pointed to the registry)
11. localStorage key `pratikshya_employee_assisted_orders` (+ writer re-pointed to `orderService`)

**Duplicate surface — remove after replacement:**
12. Hardcoded return rows at `/employee/returns` and `/employee/support/returns` (replace with `returnService` reads)
13. Hardcoded sales/reports desk rows at `/employee/sales` and `/employee/reports` (replace with `EmployeeReports.jsx` analytics)
14. Dead collection nav links `/collections/cotton`, `/collections/linen`, `/collections/chiffon` (or create the collections — content decision)

**Post-backend (deferred removals):**
15. `services/productWorkflow.js` compatibility wrapper module (after its 8 importers move to the command layer)
16. Deprecated `coupons` export in `src/data/shopping/coupons.js`
17. `pratikshya_canonical_media_state_2026_08_17` one-shot marker (with mediaStore migration code)

## 20. Exact list of features to MERGE

1. **Customer list stores** → `pratikshya_customers` into `pratikshya_customers_registry` (admin pages, analytics fallback, employee directory read the same register).
2. **Order stores** → `pratikshya_employee_assisted_orders` into `pratikshya_orders` via `orderService` with `channel: "ASSISTED"`.
3. **Checkout pricing configuration** → `checkoutConfig.js` + `utils/shopping.js` shipping constants into `settingsRepository` (settings become the authority; checkoutConfig stays as UI defaults).
4. **Admin dashboard numbers** → replace `dashboardData.js` static series with the analytics read-model (V1.5).
5. **Employee returns desk** → read `returnService`/order returns instead of hardcoded rows.
6. **Employee reports** → the already-built `EmployeeReports.jsx` (merge the route; remove the mock desk).
7. **Legacy attendance settings** → already merged into `pratikshya_settings`; finish by deleting the legacy readers (completion, not new merge).
8. **Legacy coupon list** → already merged into the offer register (Phase 17); finish by removing the deprecated export.

## 21. Exact list of features to DEFER

1. Employee warehouse desks (`/employee/warehouse*`) — placeholder UI until WMS backend exists.
2. Employee support desk (`/employee/support*`) — until a support-case entity exists.
3. Employee styling desk (`/employee/styling*`) — until a styling/booking entity exists.
4. Real payment gateway (UPI/cards) — sandbox QR + MockPaymentService remain sandbox-only meanwhile.
5. Real AI providers for shopping/business assistants and virtual try-on — mock provider seam stays.
6. Real carrier tracking integrations — synthetic tracking legs stay.
7. Recently viewed / style preferences / personalization service — client-side caches acceptable until V1.5 (fix the Preferences route first if keeping the UI).
8. Per-feature backend APIs — sequenced by `docs/backend-integration-audit.md` after this audit is approved.

## 22. Exact list of features to REMAIN UNCHANGED

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
18. Design system, portal shell, and UI-only localStorage keys (`pf_admin_nav_groups`, `pf_employee_nav_groups`).
19. Test suite (347 tests) and the 21 dev QA/audit scripts.
20. Static media assets under `public/images/` (migrate to object storage later, never duplicate).

---

## 23. Approvals needed before any change

- [ ] Phase 1 deletions (§19 items 1–7) — LOW risk, automatable
- [ ] Data-store merges (§20 items 1–2) — MEDIUM
- [ ] Surface repairs (§20 items 3–7: settings authority, preferences route, reports route, returns desk, nav links)
- [ ] Phase 4 post-backend simplifications (§19 items 15–17, §20 item 8)
- [ ] High-risk item #1 (payment confirmation) is backend-only work and must never ship as a frontend change

*End of audit. No files were modified.*
