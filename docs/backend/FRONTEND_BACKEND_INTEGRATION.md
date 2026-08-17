# PRATIKSHYA FASHON — Frontend ↔ Backend Integration Map

Every row below is a **real function in the repository** with real call sites. The migration rule is the same for all of them:

> **Replace the storage tier inside the service module. Keep the exported function signature and return shape identical. The component layer must not change.**

Return-shape contract that must survive: `{ ok: true, … }` / `{ ok: false, error }` / `{ ok: false, errors: [] }`; lists are plain arrays.

---

## 1. Architecture

```
components / pages                     ← never touch storage, never call fetch today
        ↓
context providers                      ← Auth, Account, Cart, Wishlist, Checkout, Order,
        ↓                                Shopping, Inventory, EmployeeManagement, Workforce,
service / repository module              AdminAuth, EmployeeAuth
        ↓
localStorage + window change event     ← REPLACE THIS TIER ONLY
```

**Change events are part of the contract.** Contexts subscribe to `pratikshya-{products,taxonomy,media,media-groups,offers,inventory}-changed` to revalidate. After every mutation the backend integration must dispatch the same event (or refetch), or the cart will not notice a price change and the storefront will not notice a publish.

---

## 2. Storefront catalogue

| Frontend function (file) | Call sites | Endpoint | Notes |
| --- | --- | --- | --- |
| `getLiveStorefrontProducts()` (`src/data/products/index.js`) | `NewArrivals`, `AiShoppingAssistant`, resolvers, audits | `GET /products` | Applies the visibility gate. **Never returns DRAFT/ARCHIVED.** |
| `queryCatalogue(filters, sort, …)` (`data/products/query.js`) | `CatalogueBrowser` (shop, category, collection, search), `ExploreBrowser` | `GET /products` | The gate + facets + sort live here. |
| `buildFacets(scoped, filters, scopeFilters)` (`data/products/facets.js`) | `CatalogueBrowser`, `ExploreBrowser` | facet block of `GET /products` | Counts computed against the *other* applied facets. |
| `sortProducts` / `resolveSort` / `SORT_ALIASES` | inside `queryCatalogue` | `?sort=` | 8 sorts + 4 aliases. |
| `matchesSearch` / `normaliseSearchText` | `/search` | `GET /search?q=` | Exact field list in `API_CONTRACT.md`. |
| `getProductById` / `getProductBySlug` / `getProductByIdentifier` | `ProductDetail`, `CartContext`, `WishlistContext`, recommendations | `GET /products/{idOrSlug}` | Identifier accepts id **or** slug. |
| `toStorefrontProduct(record)` | everywhere a card renders | response shape of `GET /products*` | The customer projection. |
| `productHref(product)` | all cards | — | Client-side; keep `slug` in payloads. |
| `getProductDetails`, `getProductDescription`, `getCareInstructions`, `getProductSpecifications`, `getDeliveryInfo`, `getReturnInfo` (`data/products/details.js`) | `ProductDetailsAccordion` | included in `GET /products/{id}` | Derived from product fields + settings. |
| `getRelatedProducts`, `getCompleteTheLook`, `getRecommendedProducts`, `getProductRecommendations`, `getCartRecommendations` | `ProductRecommendations`, cart | `GET /products/{id}/recommendations?type=` | Gate applies; never returns the source product. |
| `getExploreProducts`, `queryExplore`, `paginateExplore`, `buildExploreStream`, `getExploreOffers` (`data/products/explore.js`) | `ExploreBrowser` | `GET /explore` | **The only paginated surface** — `EXPLORE_PAGE_SIZE = 20`. |
| `categoryCounts`, `subcategoriesByCategory`, `catalogueValues` | filter panels, nav | derived fields on `GET /categories` | Server should precompute. |
| `listRecentlyViewed`, `recordRecentlyViewed`, `resolveRecentlyViewedProducts`, `mergeGuestRecentlyViewed` (`services/customer/recentlyViewed.js`) | `ProductDetail`, account | `GET|POST /products/recently-viewed` | Guest history merges on sign-in. |
| `deriveStyleSignals`, `getPersonalizedProducts` (`services/customer/personalization.js`) | account, AI shopping | folded into recommendations | |

---

## 3. Taxonomy & collections

| Frontend function (`services/taxonomyRepository.js`) | Call sites | Endpoint |
| --- | --- | --- |
| `categories`, `activeCategories`, `categoryOptions`, `findCategory`, `getCategoryLabel` | `CategoryPage`, nav, admin taxonomy, `ProductForm` | `GET /categories`, `GET /categories/{id}` |
| `subcategories`, `activeSubcategories`, `subcategoryOptionsFor`, `findSubcategory` | category page, product forms | `GET /categories/{id}/subcategories` |
| `collections`, `activeCollections`, `collectionOptions`, `findCollection`, `getCollectionLabel` | `/collection/:slug`, homepage, admin | `GET /collections`, `GET /collections/{id}` |
| `createCategory`, `updateCategory`, `archiveCategory`, `restoreCategory` | `pages/admin/taxonomy/*` | `POST|PATCH /admin/categories…` |
| `createSubcategory`, `updateSubcategory`, `archiveSubcategory`, `restoreSubcategory` | admin taxonomy | `…/subcategories…` |
| `createCollection`, `updateCollection`, `activateCollection`, `pauseCollection`, `archiveCollection`, `restoreCollection` | admin collections | `POST|PATCH /admin/collections…` |
| `assignProductsToCollection`, `addProductsToCollection`, `removeProductsFromCollection` | `/admin/collections/:id/products` | `PUT /admin/collections/{id}/products` |
| `productCounts`, `collectionsForProduct`, `isProductInCollection`, `metrics` | admin dashboards, PDP | derived / `GET /admin/taxonomy/metrics` |
| `getRouteMeta`, `primaryNavigation`, `categoryRoutes`, `collectionRoutes`, `navigationScopes` (`config/navigationConfig.js`, `services/taxonomyRouting.js`) | shell nav, `CategoryPage` | derived from `GET /categories` + `/collections` |

**Critical:** collection membership resolves through explicit ids **∪ label match ∪ rule**. All 11 collections currently rely on the label arm — see `TAXONOMY_AND_COLLECTIONS.md` §3.2.

---

## 4. Media

| Frontend function | Call sites | Endpoint |
| --- | --- | --- |
| `getProductMediaSet(product)` (`services/media/productMediaSet.js`) | `ProductGallery`, `ProductGrid` cards, `getPublishIssues`, Kids desk, audits | `GET /products/{id}/media-set` |
| `resolveProductCover`, `resolveProductGallery`, `decorateProductWithMedia(s)` (`mediaResolver.js`) | every card and gallery | folded into product payloads |
| `resolveCategoryCover`, `resolveCollectionCover` | `ShopByCategory`, collection hero | fields on `GET /categories` / `/collections` |
| `resolveHomepageHeroMedia`, `resolveHeroSlideImage(s)`, `resolveHeroImageIds` | `HeroCarousel` | `GET /home` |
| `resolveEditorialFrame`, `resolveSaleBackdrop`, `resolveFestiveCampaignImage` | homepage seams | `GET /home` |
| `selectNewArrivalProducts`, `selectSareeEditProducts`, `selectBrideGroomLooks` | `NewArrivals`, `SareeEditCarousel`, `BrideGroomEdit` | `GET /home` |
| `resolveAiMirrorImage`, `resolveAiShoppingImage`, `isAiMirrorSafeMedia` | AI Mirror, AI Shopping | `GET /ai/mirror/products` |
| `mediaRepository.getAll/getById/update/setStatus/assignToProduct/setCover` | `/admin/media/*`, `/employee/media/*` | `GET|PATCH /admin/media…` |
| `validateMediaAssignment`, `transferMediaOwnership`, `unassignProductMedia` (`productWorkflow.js`) | product-mapping desk | `POST /admin/media/{id}/assign\|transfer\|unassign` |
| `setPrimaryMedia`, `updateMediaViewLabel` | product media page | `POST /admin/products/{id}/media/primary`, `POST /admin/media/{id}/view-label` |
| `getAllGroups`, `setGroupDecision`, `mergeGroups`, `splitGroup`, `unresolvedGroupConflictsFor` (`productMediaGroups.js`) | group review desk | `GET|POST /admin/media/groups…` |
| `getMediaInbox`, `getPotentialProductGroups`, `getMediaProductDiscovery`, `uncoveredProductGroups` | media inbox, discovery | `GET /admin/media/inbox\|discovery\|potential-groups` |
| `resolveMediaAccess` (`mediaAccess.js`) | every media screen | server-side permission checks |

---

## 5. Product workflow

| Frontend function (`services/productWorkflow.js`, `catalogRepository.js`) | Call sites | Endpoint |
| --- | --- | --- |
| `catalogRepository.all/find/findBySlug` | admin + employee product lists, PDP | `GET /admin/products`, `GET /products/{id}` |
| `createProduct`, `createDraftProduct`, `createProductDraftFromMedia` | `ProductForm`, `EmployeeProductForm`, media inbox | `POST /admin/products`, `POST /admin/products/draft` |
| `nextStableProductId`, `preferredProductIdForMedia` | draft creation | `GET /admin/products/next-id` |
| `updateProduct`, `updateDraft` | admin form | `PATCH /admin/products/{id}` |
| `pickEmployeeEditableFields`, `saveEmployeeDraft`, `employeeCanEditProduct`, `EMPLOYEE_EDITABLE_FIELDS` | `EmployeeProductForm` | `PATCH /employee/products/{id}` — **30-field whitelist** |
| `assignProductToEmployee` / `assignToEmployee` | admin product detail | `POST /admin/products/{id}/assign` |
| `employeeAssignedProducts`, `getProductWorkflowView` | `EmployeeProducts`, `EmployeeDesk` | `GET /employee/me/assigned-products`, `/workflow` |
| `submitProductForReview` / `submitForReview` | `EmployeeProductReview` | `POST /products/{id}/submit-review` |
| `approveProduct`, `rejectProduct`, `publishProduct`, `unpublishProduct`, `archiveProduct`, `restoreProduct` | `AdminProductReview`, `AdminProductDetail` | `POST /admin/products/{id}/…` |
| `getPublishIssues`, `isReadyToPublish` | review desks (rendered live) | `GET /admin/products/{id}/publish-issues` |
| `changeProductId` | admin product detail | `POST /admin/products/{id}/change-id` |
| `clearReviewFlags`, `flagsSatisfiedByProduct`, `blockingReviewFlags` (`productReviewFlags.js`) | review desks | `POST /admin/products/{id}/review-flags/clear` |
| `getWorkflowMetrics`, `catalogMetrics` | dashboards | `GET /admin/workflow/metrics` |
| `getKidsFinalizationRows`, `getKidsFinalizationSummary`, `approveKidsProduct`, `publishKidsProduct`, `returnKidsProductToDraft`, `getKidsPublishBlockers`, `KIDS_CHECKLIST_ITEMS`, `KIDS_STAGES` (`kidsProductFinalization.js`) | Kids finalization desk | reuse the product endpoints + `GET /admin/products/kids/finalization` |
| `getKidsReconciliationRows`, `reconcileKidsConflict`, `KIDS_CONFLICT_ACTIONS` | Kids reconciliation | `POST /admin/products/kids/reconcile` |

---

## 6. Cart, wishlist, checkout

| Frontend | Call sites | Endpoint |
| --- | --- | --- |
| `CartContext`: `items, count, totals, coupon, couponLapsed, addToCart, removeFromCart, updateCartQuantity, clearCart, getCartItemQuantity, applyCoupon, removeCoupon, isDrawerOpen, openDrawer, closeDrawer` | `Cart`, `CartDrawer`, PDP, header | `GET /cart`, `POST /cart/items`, `PATCH|DELETE /cart/items/{lineId}`, `POST|DELETE /cart/coupon` |
| `restoreCart()` | on load | server must apply the same repair rules (drop dead products, clamp to stock, merge duplicates, drop lapsed coupon) |
| `cartLineId(productId, {color,size})` | line identity | `(productId,color,size)` is the natural key |
| `WishlistContext`: `saved, products, count, isSaved, add, remove, toggle` | `Wishlist`, cards, PDP | `GET /wishlist`, `POST|DELETE /wishlist/{productId}` |
| `CheckoutContext`: `totals, deliveryEstimate, deliveryMethod, bagChanged, customerValid, addressValid, paymentInProgress, updateCustomer, selectAccountAddress, setGuestAddress, setDeliveryMethod, setPaymentMethod, setDemoScenario, nextStep, backStep, goToStep, startPayment, cancelActivePayment, retryPayment, resetPayment, resetCheckout` | `Checkout` | `GET /cart/totals`, `POST /payments/session`, `POST /orders` |
| `offerRepository.validateOffer()` | coupon apply + checkout | `POST /offers/validate` — **the single discount gate** |
| `inventoryRepository.validateCartItems`, `getCustomerAvailability`, `reserveCart`, `confirmReservationSale` | cart, checkout | `POST /inventory/validate-cart`, `GET /inventory/availability`, `POST /inventory/reserve`, `.../confirm` |
| `utils/pricing.js`, `utils/checkout.js` | totals | server must be the authority; numbers must match to the rupee |

---

## 7. Orders

| `OrderContext` member | Endpoint |
| --- | --- |
| `orders`, `getOrders`, `getCustomerOrders`, `ordersForCustomer` | `GET /orders` |
| `getOrderById` | `GET /orders/{id}` |
| `getTracking` | `GET /orders/{id}/tracking` |
| `createOrder` / `placeOrder` | `POST /orders` |
| `cancelOrder` | `POST /orders/{id}/cancel` |
| `createReturn`, `getReturn` | `POST /orders/{id}/returns`, `GET …/{returnId}` |
| `claimGuestOrders`, `guestOrderCount` | `POST /orders/claim-guest` |
| `currentOrder`, `clearCurrentOrder` | client-only hand-off to `/order-success` |
| `allOrders`, `getAllOrders`, `getOrderByIdAdmin`, `getTrackingAdmin` | `GET /admin/orders…` |
| `allocateOrder`, `assignFulfillment`, `startPicking`, `markItemPicked`, `markPacked`, `markReadyToDispatch`, `dispatchOrder`, `markOutForDelivery`, `markDelivered` | the fulfilment endpoints |
| `addInternalNote`, `cancelOrderAdmin`, `applyStatusAdmin`, `forceTransition` | `POST /admin/orders/{id}/notes\|cancel\|status\|force-status` |
| `approveReturn`, `rejectReturn`, `scheduleReturnPickup`, `receiveReturn`, `inspectReturn`, `initiateReturnRefund`, `completeReturnRefund` | the returns endpoints |
| `updateMockOrderStatus`, `updateMockReturnStatus` | **demo-only helpers — drop at cutover** |

Supporting services: `orders/orderService.js` (`buildOrderRecord`, `loadOrders`, seeding), `orders/returnService.js` (21 exports incl. all `can*` guards and vocabularies), `orders/trackingService.js`, `utils/orders.js` (`normaliseOrder` — the canonical order shape).

---

## 8. Identity & sessions

| Context / service | Members | Endpoint |
| --- | --- | --- |
| `AuthContext` | `user, isAuthenticated, isLoading, signIn, signUp, signOut, forgotPassword, resetPassword, updateUser` | `/auth/customer/*` |
| `AccountContext` | `profile, addresses, defaultAddress, preferences, security, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, updatePreferences, signOutOtherSessions` | `/customers/me*` |
| `EmployeeAuthContext` + `employeeAuthService` | `restoreEmployeeSession, signInEmployee, signOutEmployee, changeEmployeePassword, refreshEmployeeSession` | `/auth/employee/*` |
| `AdminAuthContext` + `adminAuthService` | `toPublicAdmin, loadAdmins, saveAdmins, sign in/out` | `/auth/admin/*` |
| `employees/authorization.js` | `hasPermission, hasAnyPermission, hasAllPermissions, canAccessPath, hasRecognizedRole` | mirrored server-side; the client copy stays for UI gating only |

`refreshEmployeeSession()` exists so a permission change takes effect without re-login — the backend must support re-reading the profile mid-session.

---

## 9. Employee & admin operations

| Service | Key functions | Endpoint group |
| --- | --- | --- |
| `employees/employeeService.js` | `loadEmployees, getEmployee, toPublicEmployee, normaliseEmployees, validateEmployeeDraft`, create/update/status/permissions | `/admin/employees*` |
| `employees/activityService.js` | `ACTIVITY_ACTIONS (96), recordActivity, loadActivity, activityForEmployee/Product/Offer, describeActor` | `GET /admin/activity` |
| `employees/operationsService.js` | `getRegisteredCustomers, getDirectoryCustomers, getBusinessOrders, getAssistedOrders, getFollowUps, getOffers, getStockMovements, getTransfers, getWarehouseTasks, getSupportCases, getFeedback, getStylingRequests, getAppointments, getPerformance, getCatalogueStock, searchProducts, attendanceFor, defaultDashboardMetrics` | `/employee/*` desks — **several are derived projections with no entity** |
| `inventory/inventoryRepository.js` | receive/adjust/damage/return/inspect/threshold/locations/transfers/reservations + `calculateStockStatus` | `/admin/inventory*`, `/inventory/*` |
| `offers/offerRepository.js` | CRUD + `validateOffer` + status derivation | `/offers*`, `/admin/offers*` |
| `analytics/analyticsService.js` | 17 `get*` summaries + revenue rules | `/admin/analytics/*` |
| `settingsRepository.js` | `getSettings, getSection, updateSection, updateSetting, resetSection, resetToDefaults` | `/admin/settings*` |
| `workforce/*` (14 modules) | attendance, leave, performance, achievements, scope, dateUtils, seeding | `/employee/attendance\|leave\|performance`, `/admin/attendance\|leave\|performance` |
| `ai/aiService.js`, `aiMirror/*` | `askShoppingAssistant, askBusinessAssistant, getVirtualTryOnProducts, recordRecentTryOn` | `/ai/*` |

---

## 10. Migration order (dependency-safe)

1. **Reference data** — roles, permissions, settings, taxonomy. *(no dependencies)*
2. **Media register + groups** — depends on taxonomy for `categoryId`.
3. **Products** — depends on taxonomy and media (ownership, publish blockers).
4. **Inventory** — depends on products/variants/locations.
5. **Offers** — depends on products, categories, collections.
6. **Identity** — customers, employees, admins, credentials.
7. **Cart / wishlist / recently-viewed** — depends on products + customers.
8. **Orders / returns / refunds / fulfilment** — depends on everything above.
9. **Workforce** — attendance, leave, performance (depends on employees).
10. **Analytics + activity** — read models over the rest.

Seed steps 1–3 directly from `docs/backend/data/*.json`; the IDs there are the production IDs.

---

## 11. What the frontend assumes but does not define

Carry these into backend design; none is answered by the repository.

1. **Transport & auth** — no HTTP client, no token, no refresh, no CSRF, no CORS policy exists.
2. **HTTP status codes** — never produced or inspected. Only `{ ok }` envelopes.
3. **Concurrency** — no ETag, no version column, no optimistic locking. Two admins editing one product last-write-wins today.
4. **Idempotency** — order placement and payment have no idempotency key.
5. **Pagination** — only `EXPLORE_PAGE_SIZE = 20`. All admin lists load whole (168 products, 205 media, 200 activity entries).
6. **Real-time** — `window` events only; no WebSocket/SSE. Multi-user staleness is unhandled.
7. **File storage** — no uploads happen; no bucket, CDN, signing or thumbnailing.
8. **Password hashing** — a non-cryptographic demo fingerprint. Customer passwords are not even that.
9. **Rate limiting / lockout / audit of failed logins** — absent.
10. **Timezone** — everything is ISO UTC strings with `en-IN` display formatting; no per-user timezone.
11. **Money precision** — whole rupees, no paise, no rounding policy for tax.
12. **Soft delete vs hard delete** — products and taxonomy only archive; media can be deleted outright. Inconsistent by design today.
13. **Cascade rules** — deleting a category, product or employee is undefined.
14. **Search infrastructure** — in-memory substring matching over 168 rows; no analyzer, stemming, synonyms or typo tolerance.
15. **Guest→account merge** — defined for recently-viewed and orders, **undefined for cart and wishlist**.
