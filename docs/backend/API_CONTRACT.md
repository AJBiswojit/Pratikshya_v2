# PRATIKSHYA FASHON — API Contract

Derived **exclusively** from what the current frontend calls. Every endpoint below exists because a real component, context or service function needs it. No endpoint was invented to look complete.

## Conventions

- Base path: `/api/v1` — `NOT DEFINED / BACKEND DECISION REQUIRED` (the frontend has no HTTP layer at all today).
- **HTTP status codes are `NOT DEFINED / BACKEND DECISION REQUIRED` throughout.** The frontend never produces or inspects one. It uses a uniform result envelope:
  ```js
  { ok: true,  ...payload }
  { ok: false, error: "Human readable sentence." }
  { ok: false, errors: ["Sentence.", "Sentence."] }   // publish/approve blockers
  ```
  Whatever status codes the backend chooses, **the body must keep this envelope**, or every call site changes.
- Envelope for lists: the frontend receives plain arrays today. Any wrapper (`{ data, meta }`) is a **breaking change** unless the repository layer unwraps it.
- Auth transport (cookie vs bearer), token lifetime, refresh: `NOT DEFINED / BACKEND DECISION REQUIRED`. The frontend stores a plain session object in `localStorage` with no token.
- **Pagination**: only one page size exists in the whole application — `EXPLORE_PAGE_SIZE = 20` (`src/data/products/explore.js`). Every other list is fetched whole and filtered in memory. Server-side pagination for admin lists is `BACKEND DECISION REQUIRED`.
- **Sorting**: the sort vocabulary is fixed by `SORT_ALIASES` / `resolveSort()` — `recommended` (default), `newest`, `price-asc`, `price-desc`, `discount`, `name-asc`, `popularity`, `rating`; aliases `price-low`→`price-asc`, `price-high`→`price-desc`, `name`/`az`→`name-asc`.
- **Filtering**: the 12 facets are fixed by `filterFacets` — `category`, `subcategory`, `gender`, `price` (5 bands), `size`, `color`, `fabric`, `material`, `occasion`, `collection`, `rating`, `availability`. Multi-select, AND across facets, OR within a facet.
- Currency is always `INR`. Prices are whole rupees.
- All timestamps are ISO-8601 UTC strings.

---

# AUTH

### `POST /auth/customer/sign-in`
- **PURPOSE** — Customer sign in. Source: `AuthContext.signIn()`.
- **AUTHORIZATION** — Public.
- **BODY** — `{ identifier: string (email OR 10-digit phone), password: string, remember?: boolean = true }`
- **RESPONSE** — `{ ok: true, user: Customer }` (see `DATABASE_SCHEMA.md` → Customer). Session persisted at `pratikshya_auth`.
- **ERRORS** — `"Please enter your email address or phone number."` · `"Please enter a valid password (minimum 6 characters)."` · `"No account found with those details."` *(exact copy: see `ERROR_AND_VALIDATION_SPEC.md`)*
- **NOTES** — Password rule today is length ≥ 6 only. Hashing, lockout, rate limiting, 2FA: `BACKEND DECISION REQUIRED`.

### `POST /auth/customer/sign-up`
- **PURPOSE** — Registration. Source: `AuthContext.signUp()`.
- **AUTHORIZATION** — Public.
- **BODY** — `{ firstName, lastName, email, phone?, password, dateOfBirth? }`
- **RESPONSE** — `{ ok: true, user: Customer }` — signed in immediately.
- **ERRORS** — `"First name is required."` · `"Please provide a valid email address."` · `"Please enter a valid 10-digit mobile number."` · password message from `validatePassword()` · duplicate-email message.

### `POST /auth/customer/sign-out`
- **PURPOSE** — Clear session. Source: `AuthContext.signOut()`.
- **AUTHORIZATION** — Customer session.
- **RESPONSE** — `{ ok: true }`.

### `POST /auth/customer/forgot-password`
- **PURPOSE** — Request reset. Source: `AuthContext.forgotPassword(identifier)`.
- **BODY** — `{ identifier: string }`
- **RESPONSE** — `{ ok: true, message: "Password reset instructions have been sent to <identifier>." }`
- **NOTES** — Currently a pure mock; **no token is generated or verified**. Token format, delivery channel and TTL: `BACKEND DECISION REQUIRED`.

### `POST /auth/customer/reset-password`
- **BODY** — `{ token?: string /* NOT DEFINED */, newPassword, confirmPassword }`
- **RESPONSE** — `{ ok: true, message: "Your password has been successfully updated." }`
- **ERRORS** — `"Password must be at least 6 characters."` · `"Passwords do not match."`

### `POST /auth/employee/sign-in`
- **PURPOSE** — Employee portal login. Source: `signInEmployee()` (`src/services/employees/employeeAuthService.js`).
- **BODY** — `{ employeeId: "PF-<PREFIX>-#####", password: string }`
- **RESPONSE** — `{ ok: true, employee: PublicEmployee, mustChangePassword: boolean }`
- **ERRORS** — invalid credentials; blocked sign-in when `status ∈ {SUSPENDED, INACTIVE}` (`canEmployeeLogin()`).
- **NOTES** — The demo uses a non-cryptographic `mockCredentialFingerprint()`. It **must** be replaced. Employee credentials live in a table separate from the employee profile — preserve that separation.

### `POST /auth/employee/change-password`
- **AUTHORIZATION** — Employee session; forced when `mustChangePassword`.
- **BODY** — `{ currentPassword, newPassword, confirmPassword }`
- **RESPONSE** — `{ ok: true, employee }`
- **VALIDATION** — Policy comes from settings section `employees`: `minimumPasswordLength` 8, `requireUppercase` true, `requireLowercase` true, `requireNumber` true, `requireSpecialCharacter` false, `passwordExpiryDays` 30.

### `POST /auth/employee/sign-out` · `POST /auth/employee/refresh`
- Sources: `signOutEmployee()`, `refreshEmployeeSession()`. Refresh re-reads the profile so a role/permission/status change takes effect without re-login. Session TTL: `BACKEND DECISION REQUIRED`.

### `POST /auth/admin/sign-in` · `POST /auth/admin/sign-out`
- **PURPOSE** — Admin console. Source: `src/services/admin/adminAuthService.js`.
- **BODY** — `{ adminId, password }`
- **RESPONSE** — `{ ok: true, admin: PublicAdmin }` — never carries a password or fingerprint.
- **ERRORS** — invalid credentials; `status === SUSPENDED` blocks sign in (`canAdminSignIn()`).

---

# USERS

### `GET /customers/me`
- **AUTHORIZATION** — Customer. Source: `AccountContext` (`pratikshya_account_<customerId>`).
- **RESPONSE** — `{ profile, addresses[], preferences, security: { activeSessions[] } }`

### `PATCH /customers/me`
- **BODY** — any of `firstName, lastName, email, phone, dateOfBirth, avatar`. Source: `AccountContext.updateProfile()` / `AuthContext.updateUser()`.

### `GET|POST /customers/me/addresses` · `PATCH|DELETE /customers/me/addresses/{addressId}` · `POST /customers/me/addresses/{addressId}/default`
- Sources: `addAddress`, `updateAddress`, `deleteAddress`, `setDefaultAddress`.
- **BODY** — `{ fullName, phone, addressLine, landmark?, city, state, pincode, type: "Home"|"Work"|string, isDefault?: boolean }`
- **VALIDATION** — pincode `^[1-9][0-9]{5}$`; phone `^(?:\+91|0)?[6-9]\d{9}$`.
- **RULE** — Setting a default demotes the previous default. Exactly one `isDefault` per customer.

### `PATCH /customers/me/preferences`
- **BODY** — `{ emailNotifications, smsNotifications, promotionalUpdates, orderUpdates, stylingInvitations }` (all boolean). Source: `AccountContext.updatePreferences()`.

### `POST /customers/me/sessions/revoke-others`
- Source: `signOutOtherSessions()`. Session records are demo data today; real session storage is `BACKEND DECISION REQUIRED`.

### `GET /admin/customers` · `GET /admin/customers/{customerId}`
- **AUTHORIZATION** — `customers.view`.
- Sources: `AdminCustomers.jsx`, `AdminCustomerDetail.jsx`, `operationsService.getRegisteredCustomers()` / `getDirectoryCustomers()`.
- **RESPONSE** — customer + derived `{ orderCount, lifetimeSpend, addresses[] }` (frontend derives these from the order list today; server-side derivation is preferred).
- **NOTE** — The customer detail page shows `PF-CUS-<n>` as a *display* label derived from `id.replace("cust-","")`. It is **not** a stored field. `BACKEND DECISION REQUIRED`: make it a real column or keep it derived.

---

# PRODUCTS

### `GET /products`
- **PURPOSE** — The customer catalogue. Source: `getLiveStorefrontProducts()` → `queryCatalogue()`.
- **AUTHORIZATION** — Public.
- **QUERY** — `q`, `category`, `subcategory`, `gender`, `price` (band id ×5), `size`, `color`, `fabric`, `material`, `occasion`, `collection`, `rating`, `availability`, `sort`, `page`, `pageSize`.
  Multi-value facets repeat the key. `resolveCategoryFilter()` maps navigation aliases onto real category ids.
- **RESPONSE** — `{ items: StorefrontProduct[], total: number, facets: FacetCounts, appliedFilters: {…} }`
  `FacetCounts` shape from `buildFacets()`: per facet, `[{ value, label, count }]` — counts are computed against the *other* applied facets, not the full set.
- **PAGINATION** — `pageSize` defaults to 20 (`EXPLORE_PAGE_SIZE`); other surfaces request everything.
- **SORTING / FILTERING** — see Conventions.
- **MANDATORY FILTER** — Only `PUBLISHED` products in an `ACTIVE` category, with `published !== false`. See `BACKEND_HANDOFF_SPEC.md` §6.

### `GET /products/{idOrSlug}`
- **PURPOSE** — Product detail page. Source: `getProductById()` / `getProductBySlug()` / `getProductByIdentifier()`.
- **PATH** — accepts the product id (`pf-001`, `KID-007`) **or** the slug.
- **RESPONSE** — full `StorefrontProduct` + `details` (`getProductDetails`, `getCareInstructions`, `getProductSpecifications`, `getDeliveryInfo`, `getReturnInfo`) + `mediaSet` (see MEDIA).
- **ERRORS** — not found → the SPA renders its 404 view.

### `GET /products/{id}/recommendations`
- **QUERY** — `type=related|complete-the-look|recommended|cart`
- Sources: `getRelatedProducts`, `getCompleteTheLook`, `getRecommendedProducts`, `getProductRecommendations`, `getCartRecommendations`.
- **RULE** — Same visibility gate. Never returns the source product itself.

### `GET /products/recently-viewed` · `POST /products/recently-viewed`
- Source: `src/services/customer/recentlyViewed.js`. `RECENTLY_VIEWED_LIMIT` caps the list; guest history merges into the account on sign-in (`mergeGuestRecentlyViewed`).

### `GET /admin/products`
- **AUTHORIZATION** — `products.view`.
- **QUERY** — `status` (DRAFT|PENDING_REVIEW|PUBLISHED|ARCHIVED), `category`, `assignedEmployeeId`, `q`, `sort`. Source: `catalogRepository.all()` + in-memory filters in `AdminProducts.jsx` / `EmployeeProducts.jsx`.
- **RESPONSE** — full product records **including** `review`, `reviewFlags`, `history[]`, `assignedEmployeeId`.
- **PAGINATION** — none today (`BACKEND DECISION REQUIRED` — 168 rows load whole).

### `POST /admin/products`
- **PURPOSE** — Create a product. Source: `catalogRepository.createProduct()` — generates `pf-<base36 time>`.
- **AUTHORIZATION** — `products.manage`.
- **RESPONSE** — `{ ok: true, product }`

### `POST /admin/products/draft`
- **PURPOSE** — Create a **draft with a caller-supplied permanent ID** (`KID-007`, `MEN-001`). Source: `createDraftProduct()` / `createProductDraftFromMedia()`.
- **BODY** — `{ id, name?, category, subcategory?, mediaIds?[], … }`
- **RULE** — Starts in `DRAFT`, invisible to customers. ID must be unique and match `^[A-Z0-9][A-Z0-9-]{1,14}$`.

### `GET /admin/products/next-id?category={categoryId}&preferredNumber={n}`
- Source: `nextStableProductId()` / `preferredProductIdForMedia()`. Deterministic scan, never random. Prefixes from `src/config/productIdPrefixes.js`.

### `PATCH /admin/products/{id}`
- Source: `updateProduct()`. Full-field patch for admin.
- **AUTHORIZATION** — `products.manage`.

### `PATCH /employee/products/{id}`
- Source: `saveEmployeeDraft()` → `pickEmployeeEditableFields()`.
- **AUTHORIZATION** — `employeeCanEditProduct()`: `products.manage` **AND** `product.assignedEmployeeId === employee.employeeId` (SUPER_ADMIN bypasses).
- **BODY — whitelist only** (30 fields): `name, price, compareAtPrice, description, shortDescription, category, subcategory, gender, fabric, material, primaryColor, secondaryColor, colors, patterns, work, occasion, sizes, season, fit, length, highlights, careInstructions, collectionIds, collections, tags, stock, availability`.
  **Anything outside this list must be rejected or silently dropped server-side — the frontend already drops it.**

### `POST /admin/products/{id}/assign`
- **BODY** — `{ employeeId: string|null }` — `null` unassigns.
- Sources: `assignToEmployee()` / `assignProductToEmployee()`. Logs `PRODUCT_ASSIGNED`.

### `POST /products/{id}/submit-review`
- **AUTHORIZATION** — assigned employee, or admin.
- **EFFECT** — `status = PENDING_REVIEW`; `review = { state: PENDING, submittedBy, submittedAt, rejectionReason: "", reviewedBy: null, reviewedAt: null }`. Activity `PRODUCT_SUBMITTED_FOR_REVIEW`.

### `POST /admin/products/{id}/approve`
- **AUTHORIZATION** — Admin.
- **PRECONDITION** — `getPublishIssues()` must return `[]`.
- **EFFECT** — `status = PUBLISHED`, `review.state = APPROVED`, `reviewedBy/At` stamped. **Approve publishes in one step** in the current implementation.
- **ERRORS** — `{ ok: false, errors: [...] }` — the full blocker list (see `WORKFLOW_SPEC.md` §5).

### `POST /admin/products/{id}/reject`
- **BODY** — `{ reason: string }`
- **EFFECT** — `status = DRAFT`, `review.state = REJECTED`, `review.rejectionReason = reason`. Activity `PRODUCT_REJECTED`.

### `POST /admin/products/{id}/publish` · `/unpublish` · `/archive` · `/restore`
- `publish` → `PUBLISHED`, blocked by `getPublishIssues()`.
- `unpublish` → `DRAFT`. `archive` → `ARCHIVED`. `restore` → `DRAFT`.
- Activities: `PRODUCT_PUBLISHED`, `PRODUCT_UNPUBLISHED`, `PRODUCT_ARCHIVED`, `PRODUCT_RESTORED`.

### `GET /admin/products/{id}/publish-issues`
- **RESPONSE** — `{ issues: string[] }` — the live blocker list rendered by the review desks before the button is pressed.

### `POST /admin/products/{id}/change-id`
- **BODY** — `{ newId }` — validated `^[A-Z0-9][A-Z0-9-]{1,14}$`, must be free. Activity `PRODUCT_RENAMED_ID`.
- **RULE** — must cascade to media ownership, inventory rows, collection membership and order history references. `BACKEND DECISION REQUIRED`: whether historical orders keep the old ID.

### `POST /admin/products/{id}/duplicate` · `POST /admin/products/bulk`
- Sources: `duplicateProduct()`, `bulkUpdate()`. Activities `PRODUCT_DUPLICATED`, `PRODUCT_BULK_UPDATED`.

### `GET /admin/products/availability?sku=&slug=`
- Sources: `skuTaken()`, `slugTaken()`, `suggestSlug()`.
- **RESPONSE** — `{ skuTaken: boolean, slugTaken: boolean, suggestedSlug?: string }`

### `GET /admin/products/metrics` · `GET /admin/workflow/metrics`
- Sources: `catalogMetrics()`, `getWorkflowMetrics()`. Counts by status, review state, unassigned, blocked.

### `POST /admin/products/{id}/review-flags/clear`
- **BODY** — `{ flags: string[] }`. Source: `clearReviewFlags()` / `flagsSatisfiedByProduct()`. Activity `PRODUCT_REVIEW_FLAGS_CLEARED`.

---

# MEDIA

### `GET /admin/media`
- **AUTHORIZATION** — `media.view`.
- **QUERY** — `scope` (PRODUCT|MARKETING|UNASSIGNED), `status` (DRAFT|PENDING_REVIEW|ACTIVE|REJECTED|ARCHIVED), `type` (IMAGE|VIDEO), `productId`, `categoryId`, `mappingStatus`, `q`.
- Source: `mediaRepository.getAll()`.

### `GET /admin/media/{mediaId}` · `PATCH /admin/media/{mediaId}` · `DELETE /admin/media/{mediaId}`
- `PATCH` (source `mediaRepository.update()`) — **immutable fields:** `id`, `scope`, `productId`, `placement`, `createdAt`. Ownership changes go through the assignment endpoints only.
- **RULE** — Promoting `role` to `COVER` automatically demotes the incumbent cover of the same product.
- `DELETE` requires `media.delete`.

### `POST /admin/media/upload`
- **AUTHORIZATION** — `media.upload`.
- **BODY** — multipart. Rules from `UPLOAD_RULES`: images `.jpg .jpeg .png .webp`, MIME `image/jpeg|png|webp`, ≤ **10 MB**; videos `.mp4 .webm`, MIME `video/mp4|webm`, ≤ **100 MB**.
- **NOTE** — Today nothing is uploaded anywhere; object storage, CDN URLs, thumbnail/poster generation, checksum computation and EXIF handling are `BACKEND DECISION REQUIRED`. The record already carries `url`, `thumbnail`, `poster`, `width`, `height`, `checksum`.
- Activity `MEDIA_UPLOADED`.

### `POST /admin/media/{mediaId}/assign`
- **BODY** — `{ productId, role?: PRODUCT_MEDIA_ROLE, confirmReassign?: boolean }`
- **AUTHORIZATION** — `media.assign`.
- **RULE** — If the media already belongs to a different product and `confirmReassign !== true`, **reject**. Source: `assignToProduct()` + `validateMediaAssignment()`.
- **ERROR** — `{ ok: false, error: "MEDIA_ALREADY_ASSIGNED", ownerProductId, ownerProductName, ownerProductStatus }` — this is the one machine-readable error code in the codebase.
- Activity `MEDIA_ASSIGNED` / `PRODUCT_MEDIA_ASSIGNED`.

### `POST /admin/media/{mediaId}/transfer`
- **BODY** — `{ targetProductId, confirm: boolean }`. Source: `transferMediaOwnership()`.
- **EFFECT** — moves ownership, strips the previous owner's stale authored references, logs `PRODUCT_MEDIA_TRANSFERRED`. Never silent.

### `POST /admin/media/{mediaId}/unassign`
- Source: `unassignProductMedia()`. Activity `PRODUCT_MEDIA_UNASSIGNED`.

### `POST /admin/products/{id}/media/primary`
- **BODY** — `{ mediaId }`. Source: `setPrimaryMedia()` → `mediaRepository.setCover()`. Demotes the incumbent to `GALLERY`. Activity `MEDIA_COVER_CHANGED`.

### `POST /admin/products/{id}/media/reorder`
- **BODY** — `{ mediaIds: string[] }` → rewrites `sortOrder`. Activity `MEDIA_REORDERED`.

### `POST /admin/media/{mediaId}/view-label`
- **BODY** — `{ view: "front"|"back"|"side"|"left-side"|"right-side"|"detail"|"close-up"|… }`. Source: `updateMediaViewLabel()`.

### `POST /admin/media/{mediaId}/status`
- **BODY** — `{ status: MEDIA_STATUS, rejectionReason? }` — reason picked from the 5 canned `REJECTION_REASONS`. Sources: `setStatus()`, media review desk. Activities `MEDIA_SUBMITTED_FOR_REVIEW`, `MEDIA_APPROVED`, `MEDIA_REJECTED`.

### `GET /products/{id}/media-set`
- **PURPOSE** — The single most-used media read. Source: `getProductMediaSet()`.
- **AUTHORIZATION** — Public for `PUBLISHED` products; staff for others.
- **RESPONSE**
  ```json
  { "productId": "pf-001", "primary": {…}, "front": {…}, "side": null, "back": null,
    "detail": null, "gallery": [ … ], "hover": {…}, "hasAlternate": true,
    "groupKey": "house-heritage-textile", "source": "…", "match": "…",
    "status": "OK|NO_ALTERNATE|NEEDS_REVIEW|CROSS_PRODUCT_REFERENCE",
    "ownershipConflicts": [] }
  ```
- **RULE** — Only media owned by this product. Authored plates are a fallback used **only** when the register owns nothing.

### `GET /admin/media/groups` · `POST /admin/media/groups` · `PATCH /admin/media/groups/{groupId}`
- Source: `src/services/media/productMediaGroups.js`. Fields `decision ∈ {SAME_PRODUCT, SEPARATE_PRODUCTS, REVIEW_LATER}`, `status ∈ {PENDING, CONFIRMED, SPLIT, ARCHIVED}`, `source ∈ {FILENAME, MANUAL, REVIEW_FLAG}`.

### `POST /admin/media/groups/{groupId}/decision`
- **BODY** — `{ decision, actor, productId? }`. Source: `setGroupDecision()` / `decideProductGroup()`. Activity `PRODUCT_GROUP_DECIDED`.
- **RULE** — This is the **only** way two filename groups become one product. Automatic merging is forbidden.

### `POST /admin/media/groups/{groupId}/merge` · `/split`
- Sources: `mergeGroups()`, `splitGroup()`. Activities `PRODUCT_GROUP_MERGED`, `PRODUCT_GROUP_SPLIT`. Human-initiated only.

### `GET /admin/media/inbox` · `GET /admin/media/discovery` · `GET /admin/media/potential-groups`
- Sources: `getMediaInbox()`, `getMediaProductDiscovery()`, `getPotentialProductGroups()`, `uncoveredProductGroups()`. Read-only analysis used by the product-mapping desk.

### `GET /admin/media/marketing`
- **QUERY** — `placement` ∈ `MARKETING_PLACEMENTS`. Activities `MARKETING_MEDIA_ACTIVATED` / `_ARCHIVED`.

---

# CATEGORIES

### `GET /categories`
- **AUTHORIZATION** — Public.
- **QUERY** — `status=ACTIVE` (public default), `featured`.
- Sources: `taxonomyRepository.categories()` / `activeCategories()` / `categoryOptions()`.
- **RESPONSE** — `[{ id, name, slug, eyebrow, description, image, bannerMediaId, status, sortOrder, featured, seoTitle, seoDescription, productCount }]` — verbatim shape, see `data/taxonomy.json`.
- **SORTING** — `sortOrder` ascending, then name.

### `GET /categories/{idOrSlug}` · `GET /categories/{id}/products`
- Sources: `findCategory()`, `CategoryPage.jsx` → `queryCatalogue({ category })`. Same facets/sort/pagination as `GET /products`.

### `POST /admin/categories` (`categories.create`) · `PATCH /admin/categories/{id}` (`categories.edit`) · `POST /admin/categories/{id}/archive` · `/restore` (`categories.archive`)
- Sources: `createCategory`, `updateCategory`, `archiveCategory`, `restoreCategory`.
- **STATUS** — `DRAFT | ACTIVE | ARCHIVED`.
- **CRITICAL** — Archiving a category removes **all** its products from every customer surface (the visibility gate reads category status). This must be surfaced to the operator.
- Activities `CATEGORY_CREATED|UPDATED|ARCHIVED|RESTORED`.

---

# SUBCATEGORIES

### `GET /categories/{categoryId}/subcategories`
- Sources: `subcategories()`, `activeSubcategories()`, `subcategoryOptionsFor()`.
- **RESPONSE** — `[{ id, categoryId, name, slug, description, image, status, sortOrder, productCount }]`
- **ID convention** — `"<categoryId>-<slug>"`, e.g. `sarees-pato-saree`. Slugs are unique **within** a category.

### `POST /admin/categories/{categoryId}/subcategories` · `PATCH /admin/subcategories/{id}` · `POST /admin/subcategories/{id}/archive` · `/restore`
- Activities `SUBCATEGORY_CREATED|UPDATED|ARCHIVED`.

---

# COLLECTIONS

### `GET /collections` · `GET /collections/{idOrSlug}` · `GET /collections/{id}/products`
- Sources: `collections()`, `activeCollections()`, `findCollection()`, `collectionRoutes`.
- **RESPONSE** — `{ id, name, slug, eyebrow, description, image, heroMediaId, thumbnailMediaId, type, status, displayStatus, featured, sortOrder, startDate, endDate, rule, explicitProductIds[], resolvedProductCount }`
- **STATUS** — `DRAFT | SCHEDULED | ACTIVE | PAUSED | EXPIRED | ARCHIVED`; `displayStatus` is **derived from the dates** and must be recomputed server-side, not stored blindly.
- **TYPE** — `MANUAL` (explicit `productIds`) or `RULE_BASED` (`rule: { flag | occasion | fabricIncludes }`).
- **MEMBERSHIP** (exact, from `taxonomyRepository`):
  `explicit productIds` ∪ `product.collection` / `product.collections[]` label match ∪ rule match.
  A published product may belong to several collections.

### `POST /admin/collections` (`collections.create`) · `PATCH /admin/collections/{id}` (`collections.edit`)
### `POST /admin/collections/{id}/activate|pause|archive|restore`
### `PUT /admin/collections/{id}/products` (`collections.assign`)
- **BODY** — `{ productIds: string[] }` (replace) — sources `assignProductsToCollection`, `addProductsToCollection`, `removeProductsFromCollection`.
- Activities `COLLECTION_CREATED|UPDATED|ACTIVATED|PAUSED|ARCHIVED|PRODUCTS_UPDATED`.

### `GET /admin/taxonomy/metrics` · `GET /admin/taxonomy/product-counts`
- Sources: `metrics()`, `productCounts()`, `collectionsForProduct()`, `isProductInCollection()`.

---

# SEARCH

### `GET /search`
- **PURPOSE** — `/search` page. Source: `matchesSearch()` inside `queryCatalogue()` over `normaliseSearchText()`.
- **QUERY** — `q` plus the full facet/sort/pagination vocabulary of `GET /products`.
- **MATCHING** — case/diacritic-normalised substring across: name, brand, category label, subcategory, fabric, material, colors, occasion, tags, collection, sku. Reproduce exactly or search results shift.
- **RESPONSE** — `{ items, total, facets, suggestions }` — `suggestions` are static today (`searchSuggestions` in `src/config/navigationConfig.js`); a server-side suggest endpoint is `BACKEND DECISION REQUIRED`.

---

# EXPLORE

### `GET /explore`
- **PURPOSE** — The infinite/paged explore stream. Source: `getExploreProducts()`, `queryExplore()`, `paginateExplore()`, `buildExploreStream()`.
- **QUERY** — facets + `sort` + `page` + `pageSize` (default **20**).
- **RESPONSE** — `{ items, total, page, pageSize, hasMore, stream: [{ kind: "product"|"promo"|"editorial", … }] }`
  Interleaving constants: `EXPLORE_PROMO_AFTER`, `EXPLORE_EDITORIAL_AFTER`.
- **This is the only paginated surface in the application.**

### `GET /explore/offers`
- Source: `getExploreOffers()` — the offer strip inside the stream.

### `GET /home`
- **PURPOSE** — One call for the homepage (`AtelierDesign.jsx`), which today assembles: hero slides, new arrivals, shop-by-category, saree edit, bride/groom edit, celebration edit, sale banner.
- Sources: `resolveHomepageHeroMedia`, `resolveHeroSlideImages`, `resolveHeroImageIds`, `selectNewArrivalProducts`, `selectSareeEditProducts`, `selectBrideGroomLooks`, `resolveEditorialFrame`, `resolveSaleBackdrop`, `resolveCategoryCover`, `resolveCollectionCover`.
- **RULE** — Hero plates are **reserved first**; the editorial, category and sale seams then exclude those media ids so no plate appears twice on one page. `BACKEND DECISION REQUIRED`: composed endpoint vs several endpoints — reservation ordering must be preserved either way.

### `GET /ai/mirror/products` · `POST /ai/mirror/try-on` · `GET|POST /ai/mirror/history`
- Sources: `getVirtualTryOnProducts`, `hasVirtualTryOnUsableMedia`, `getVirtualTryOnProductImage`, `getRecentTryOns`, `recordRecentTryOn`, `virtualTryOnService`.
- **RULE** — Eligible categories: `sarees, lehengas, bridal-couture, kurtis-and-suits, menswear, kidswear`. Excluded: `jewellery, bangles, dupattas, innerwear`. Only `isAiMirrorSafeMedia()` plates qualify.
- History cap `AI_MIRROR_HISTORY_LIMIT`, key `pratikshya_ai_mirror_recent_<customerId>`.
- **NOTE** — Try-on is a **mock**; no image is generated. A real provider contract is `BACKEND DECISION REQUIRED`.

### `POST /ai/shopping`
- **BODY** — `{ message, sessionId? }`. Sources: `askShoppingAssistant()`, `aiSessionStore`, `aiResponseBuilder`.
- **RESPONSE** — `{ reply, products: StorefrontProduct[], chips: [] }` — recommended products obey the visibility gate.
- Activities `AI_SHOPPING_SESSION_STARTED`, `AI_SHOPPING_QUERY`.
- **NOTE** — `isMockAiProvider === true`. Provider, model, key handling, cost and rate limits: `BACKEND DECISION REQUIRED`.

### `POST /admin/ai/business`
- Source: `askBusinessAssistant()`. Activities `AI_BUSINESS_QUERY`, `AI_BUSINESS_INSIGHT_VIEWED`, `AI_BUSINESS_ACTION_OPENED`. Requires an authenticated admin/employee context.

---

# CART

The cart is **client-side state** today (`CartContext` + `pratikshya_cart`), persisting only `{ lines: [{ id, productId, color, size, quantity, addedAt }], coupon }`. Product data is re-resolved on every read. A server cart is optional; if it is built, keep these semantics.

### `GET /cart`
- **RESPONSE** — `{ items: [{ id, productId, product, color, size, quantity, addedAt, lineTotal }], count, totals, coupon }`
- **RESTORE RULES** (`restoreCart()`) — drop lines whose product no longer resolves; clamp quantity to available stock; merge duplicate `(productId, color, size)`; keep the coupon only if it still resolves to a live offer.

### `POST /cart/items`
- **BODY** — `{ productId, color?, size?, quantity }`
- **LINE IDENTITY** — `cartLineId(productId, { color, size })`. Same triple ⇒ same line, quantities add.
- **VALIDATION** — `inventoryRepository.validateCartItems()` / `getCustomerAvailability()` clamp against real stock.

### `PATCH /cart/items/{lineId}` · `DELETE /cart/items/{lineId}` · `DELETE /cart`
- Sources: `updateCartQuantity`, `removeFromCart`, `clearCart`. Quantity `< 1` removes the line.

### `POST /cart/coupon` · `DELETE /cart/coupon`
- **BODY** — `{ code }`. Source: `applyCoupon()` → `offerRepository.validateOffer()` — the single checkout gate.
- **RESPONSE** — `{ ok: true, coupon, message: "<CODE> is now part of your order." }` or `{ ok: false, error }`.
- **RULE** — Validation considers minimum order value, dates, usage limit, per-customer limit, customer eligibility, product/category/collection eligibility, exclusions, stackability. A previously valid coupon that lapses sets `couponLapsed` and is surfaced to the shopper.

### `GET /cart/totals`
- **RESPONSE** — `{ subtotal, productDiscount, couponDiscount, couponCode, offerId, shipping, codFee, total, saved }`
- **CONSTANTS** — `FREE_SHIPPING_THRESHOLD = 5000`, `FLAT_SHIPPING_FEE = 99`, express fee `199` (never free), `COD_FEE = 49`. Money is computed by `src/utils/pricing.js` — **the backend must be the authority and the frontend numbers must match to the rupee.**

---

# WISHLIST

### `GET /wishlist` · `POST /wishlist/{productId}` · `DELETE /wishlist/{productId}` · `POST /wishlist/{productId}/toggle`
- Source: `WishlistContext` + `pratikshya_wishlist` (a `Set` of product ids).
- **RESPONSE** — `{ items: [productId], products: StorefrontProduct[], count }`
- **RULE** — Unique per product; `count` = number of distinct products (drives the header badge).
- **NOTE** — Guest wishlist merge on sign-in is `NOT DEFINED / BACKEND DECISION REQUIRED` (recently-viewed has a merge path; wishlist does not).

---

# ORDERS

### `POST /orders`
- **PURPOSE** — Place an order. Sources: `OrderContext.createOrder()` → `buildOrderRecord()` → `normaliseOrder()`.
- **AUTHORIZATION** — Customer session **or guest** (guest orders are claimable later via `claimGuestOrders`).
- **BODY** — `{ items[], customer{}, address{}, deliveryMethod: "standard"|"express", paymentMethod: "upi"|"card"|"netbanking"|"cod", couponCode?, customerNote?, inventoryReservationId? }`
- **RESPONSE** — the full order record (see `DATABASE_SCHEMA.md` → Order).
- **INITIAL STATE** — `status = ORDER_CONFIRMED`; `paymentStatus = PENDING` for COD, `PAID` otherwise; `statusHistory` seeded with `PENDING_PAYMENT → PAYMENT_CONFIRMED → ORDER_CONFIRMED`; `timeline` seeded with `ORDER_CREATED`, `PAYMENT_CONFIRMED`, `ORDER_CONFIRMED`; tracking id + carrier + invoice number generated; `fulfillment.status = PENDING`.
- **RULE** — Must consume the inventory reservation (`confirmReservationSale`).

### `GET /orders` · `GET /orders/{orderId}`
- Customer scope. Sources: `getOrders`, `getCustomerOrders`, `getOrderById`.

### `GET /orders/{orderId}/tracking`
- Source: `trackingService.getTracking()`. Carrier list `MOCK_CARRIERS` (9); origin fixed at `"Bhubaneswar, Odisha"`.
- **NOTE** — No carrier integration exists. Real tracking is `BACKEND DECISION REQUIRED`.

### `POST /orders/{orderId}/cancel`
- **AUTHORIZATION** — Customer, own order.
- **PRECONDITION** — `status ∈ CANCELLABLE_STATUSES` = `PENDING_PAYMENT, PLACED, PAYMENT_CONFIRMED, ORDER_CONFIRMED, CONFIRMED, PROCESSING, ALLOCATED, PICKING`.

### `POST /orders/{orderId}/returns`
- **PRECONDITION** — `status === DELIVERED` only (`RETURNABLE_STATUSES`). Window from settings `returns.returnWindowDays` (default 7).
- **BODY** — `{ items: [{ lineId, quantity, reason }], pickupMethod }`
- Sources: `createReturn()`, `validateReturnRequest()`, `returnableItems()`, `isReturnEligible()`.

### `GET /orders/{orderId}/returns/{returnId}`
- Source: `getReturn()`, `getReturnTimeline()`.

### `POST /orders/claim-guest`
- Source: `claimGuestOrders()` — attaches guest orders to the account after sign-in, matched by email.

### Admin / employee order operations
All require the matching permission and are logged in the shared activity diary.

| Endpoint | Source | Permission | Effect |
| --- | --- | --- | --- |
| `GET /admin/orders` | `getAllOrders`, `getBusinessOrders` | `orders.view` | full list |
| `GET /admin/orders/{id}` | `getOrderByIdAdmin` | `orders.view` | full record incl. internal notes |
| `POST /admin/orders/{id}/allocate` | `allocateOrder` | `orders.fulfill` | → `ALLOCATED` |
| `POST /admin/orders/{id}/fulfillment` | `assignFulfillment` | `orders.fulfill` | assigns location/handler |
| `POST /admin/orders/{id}/pick/start` | `startPicking` | `orders.pick` | → `PICKING` |
| `POST /admin/orders/{id}/pick/item` | `markItemPicked` | `orders.pick` | per-line |
| `POST /admin/orders/{id}/pack` | `markPacked` | `orders.pack` | → `PACKED` |
| `POST /admin/orders/{id}/ready` | `markReadyToDispatch` | `orders.pack` | → `READY_TO_DISPATCH` |
| `POST /admin/orders/{id}/dispatch` | `dispatchOrder` | `orders.dispatch` | → `SHIPPED` |
| `POST /admin/orders/{id}/out-for-delivery` | `markOutForDelivery` | `orders.dispatch` | → `OUT_FOR_DELIVERY` |
| `POST /admin/orders/{id}/deliver` | `markDelivered` | `orders.dispatch` | → `DELIVERED` |
| `POST /admin/orders/{id}/cancel` | `cancelOrderAdmin` | `orders.cancel` | `ADMIN_CANCELLABLE_STATUSES` adds `PACKED`, `READY_TO_DISPATCH` |
| `POST /admin/orders/{id}/notes` | `addInternalNote` | `orders.manage` | `notes.internal[]`, activity `NOTE_ADDED` |
| `POST /admin/orders/{id}/status` | `applyStatusAdmin` | `orders.manage` | validated by `ORDER_TRANSITIONS` |
| `POST /admin/orders/{id}/force-status` | `forceTransition` | `orders.manage` | **bypasses** the adjacency map — must be audited |
| `GET /admin/orders/{id}/invoice` | `AdminOrderInvoice` | `orders.view` | `invoice.number`, `issuedAt` |

- **TRANSITIONS** — `ORDER_TRANSITIONS` (`src/config/orderConfig.js`) is the authoritative adjacency map; `canTransition(current, next)` / `isValidTransition` must be enforced server-side. Legacy `PLACED` / `CONFIRMED` resolve through `ORDER_STATUSES[x].mapsTo`.

### Returns desk
`GET /admin/returns` · `GET /admin/returns/{id}` · `POST …/approve` · `/reject` · `/schedule-pickup` · `/receive` · `/inspect` · `/refund/initiate` · `/refund/complete`
- Permissions `returns.view` / `returns.manage`; guards `canApproveReturn`, `canRejectReturn`, `canSchedulePickup`, `canReceiveReturn`, `canInspectReturn`, `canInitiateRefund`, `canCompleteRefund`.
- Vocabularies: `REJECTION_REASONS`, `PICKUP_METHODS`, `PACKAGE_CONDITIONS`, `INSPECTION_CONDITIONS`; `customerFacingRejection()` maps an internal reason to customer copy.
- Activities `RETURN_REQUESTED|APPROVED|REJECTED|PICKUP_SCHEDULED|RECEIVED|INSPECTED|REFUND_REQUESTED|REFUNDED`.

---

# PAYMENTS

The entire payment layer is a **deterministic mock** (`src/services/payment/paymentService.js`, `getPaymentService()`).

### `POST /payments/session`
- **BODY** — `{ orderDraft, paymentMethod, demoScenario? }`
- **RESPONSE** — `{ sessionId, status }` where `status ∈ PAYMENT_STATUS`.
- Sources: `CheckoutContext.startPayment()`, `retryPayment()`, `cancelActivePayment()`, `resetPayment()`.

### `GET /payments/session/{sessionId}` · `POST /payments/session/{sessionId}/cancel`
- Demo scenarios drive the outcome: `success | failure | cancelled | pending` (`DEMO_SCENARIOS`).

### `POST /payments/webhook`
- `NOT DEFINED / BACKEND DECISION REQUIRED` — no gateway, no webhook, no signature verification, no idempotency key, no capture/authorize split, no refund API exists in the frontend.

**Payment methods offered** (`PAYMENT_METHODS`): `upi` (apps: Google Pay, PhonePe, Paytm, BHIM), `card` (Visa/Mastercard/RuPay), `netbanking` (8 named banks), `cod` (+₹49).
**Order-side payment status** (`ORDER_PAYMENT_STATUS`, 9): `PENDING, AUTHORIZED, PAID, FAILED, CANCELLED, NOT_CAPTURED, REFUND_INITIATED, REFUND_PENDING, REFUNDED`.
**Refund status** (`REFUND_STATUS`, 6): `NOT_REQUESTED, REQUESTED, APPROVED, PROCESSING, REFUNDED, FAILED`. Refund policy text from settings `payments`: method "Original payment method", SLA "5–7 business days", `partialRefundEnabled: true`.

---

# REVIEWS

**No review entity exists in the repository.**

- `product.rating` (number) and `product.reviewCount` (integer) are **authored catalogue fields**. `ProductDetail.jsx` renders `"From {reviewCount} considered reviews"` and a star rating; `rating` is a filter facet and a sort option.
- There is **no** review list, no review submission form, no moderation UI, no review record anywhere.

`NOT DEFINED / BACKEND DECISION REQUIRED` — the entire Review feature:
- `GET /products/{id}/reviews` (list, pagination, sorting) — no frontend consumer exists.
- `POST /products/{id}/reviews` — no frontend producer exists.
- Moderation states, verified-purchase rules, one-review-per-customer-per-product, rating recomputation, media in reviews, helpful votes.

**Interim contract:** the backend must keep serving `rating` and `reviewCount` as product fields so the existing UI and the `rating` facet keep working. If a Review entity is added later, `product.rating`/`reviewCount` become derived aggregates.

---

# OFFERS

### `GET /offers`
- **AUTHORIZATION** — Public for active offers; `offers.view` for the full register.
- Source: `offerRepository`. Statuses derived from dates — recompute `displayStatus` server-side.

### `POST /offers/validate`
- **BODY** — `{ code, cartItems[], customerId?, customerEmail? }`
- **RESPONSE** — `{ ok: true, coupon, discount }` or `{ ok: false, error }`.
- **THIS IS THE SINGLE CHECKOUT GATE** — `validateOffer()`. No other code path may grant a discount.

### `POST /admin/offers` (`offers.create`) · `PATCH /admin/offers/{id}` (`offers.edit`) · `POST /admin/offers/{id}/activate|pause|archive`
- **BODY** — `{ code, name, description, type: PERCENTAGE|FIXED_AMOUNT, discountValue, minimumOrderValue, maximumDiscount, startDate, endDate, usageLimit, perCustomerLimit, customerEligibility, specificCustomerIds[], productEligibility, includedProducts[], includedCategories[], includedCollections[], excludedProducts[], excludedCategories[], excludedCollections[], stackable, priority }`
- **VALIDATION** — code letters/digits/hyphen, 2–24 chars, **unique**, upper-cased.
- Defaults from settings `offers`: `defaultDurationDays 7`, `maximumCouponDiscount 10000`, `defaultCustomerUsageLimit 1`, `allowStacking false`.
- Activities `OFFER_CREATED|UPDATED|ACTIVATED|PAUSED|ARCHIVED|REDEEMED`.
- **MIGRATED COUPONS** — `WELCOME10`, `FESTIVE15`, `BRIDAL20` now live in the offer register; `src/data/shopping/coupons.js` is an adapter and its `coupons` export is deprecated/empty.

### `GET /admin/offers/{id}/performance`
- Source: `analyticsService.getOfferPerformance()`; `redeemedOrderIds[]` and `usageCount` are the ledger.

---

# ADMIN

### Inventory
| Endpoint | Source | Permission |
| --- | --- | --- |
| `GET /admin/inventory` | `inventoryRepository` list | `inventory.view` |
| `GET /admin/inventory/low-stock` · `/out-of-stock` | derived from `STOCK_STATUS` | `inventory.view` |
| `POST /admin/inventory/receive` | `receiveStock` | `inventory.receive` |
| `POST /admin/inventory/adjust` | `adjustStock` | `inventory.adjust` |
| `POST /admin/inventory/damage` | `markDamaged` | `inventory.adjust` |
| `POST /admin/inventory/return` | `returnStock`, `inspectReturnedStock` | `inventory.adjust` |
| `PATCH /admin/inventory/{id}/threshold` | `updateThreshold` | `inventory.manage` |
| `GET|POST /admin/inventory/locations` | `addLocation` | `inventory.manage` |
| `GET|POST /admin/inventory/transfers` | transfer ops | `inventory.transfer` |
| `GET /admin/inventory/movements` | movement ledger | `inventory.view` |
| `POST /inventory/reserve` | `reserveCart` — **15-minute expiry** | customer/checkout |
| `POST /inventory/reservations/{id}/confirm` | `confirmReservationSale` | order placement |
| `POST /inventory/reservations/release-expired` | `releaseExpiredReservations` | scheduled job |
| `GET /inventory/availability?productId=&variantId=` | `getCustomerAvailability` | public |
| `POST /inventory/validate-cart` | `validateCartItems` | public |

- **Caps in the current implementation:** movements 1000, transfers 300, reservations 300 (ring buffers). Server-side these become unbounded tables — retention is `BACKEND DECISION REQUIRED`.
- Every write emits an `inventory_movement` row and activity `INVENTORY_MOVEMENT`.

### Analytics (`analytics.*` permissions)
`GET /admin/analytics/snapshot | sales | orders | customers | products | categories | inventory | returns | offers | employees | attendance | fulfillment`
- Sources: the matching `analyticsService.get*()` functions.
- **QUERY** — date range via `src/services/analytics/dateRange.js`; status filters from `ANALYTICS_STATUS_FILTERS`.
- **REVENUE RULES** — `isRevenueEligible()` excludes failed payments; `orderRevenue = orderGross − completedRefundAmount`. `HIGH_VALUE_THRESHOLD` and `CUSTOMER_SEGMENTS` drive segmentation. **Reproduce these formulas exactly** or admin numbers will disagree with the storefront.
- Activity `ANALYTICS_EXPORT` on export.

### Activity log
`GET /admin/activity` — `activityForEmployee`, `activityForProduct`, `activityForOffer`.
- **ONE shared diary**, ~96 `ACTIVITY_ACTIONS` across employees, media, products, inventory, returns, offers, analytics, workforce, AI and taxonomy. **Never create a second log.**
- Record shape: `{ id, at, actorEmployeeId, actorName, targetEmployeeId, targetProductId, targetOfferId, targetCategoryId, targetCollectionId, action, summary }`.
- The client keeps the **latest 200** entries; server-side retention/pagination is `BACKEND DECISION REQUIRED`.

### Settings
`GET /admin/settings` · `GET /admin/settings/{section}` · `PATCH /admin/settings/{section}` · `POST /admin/settings/{section}/reset` · `POST /admin/settings/reset`
- 19 sections: `business, store, locations, hours, attendance, holidays, tax, shipping, payments, orders, returns, inventory, employees, notifications, customer, offers, media`.
- Unknown section ⇒ `"Unknown settings section"`. Deep-merged against `SETTINGS_DEFAULTS`. Activities `SETTINGS_UPDATED`, `SETTINGS_RESET`.
- **These settings are business rules, not cosmetics** — shipping fees, return window, low-stock thresholds, password policy and tax mode all read from here.

### Roles
`GET /admin/roles` · `GET /admin/roles/{roleId}` — the 8 roles with their default permission sets (`data/roles-permissions.json`).

---

# EMPLOYEE

### `GET /admin/employees` · `GET /admin/employees/{employeeId}`
- **AUTHORIZATION** — `employees.view`.
- **RESPONSE** — `PublicEmployee` — **never** a password or fingerprint (`toPublicEmployee()` strips them, and `normaliseEmployees()` discards leaked credential fields from corrupt storage). Preserve this guarantee.

### `POST /admin/employees` (`employees.create`)
- **BODY** — `{ firstName, lastName, email, phone, role, department, section?, store, joiningDate, shift?, permissionMode?, permissions? }`
- **VALIDATION** (`validateEmployeeDraft`) — first name, last name, email (format **and** uniqueness), phone (10 digits), role, department, store, joining date all required.
- **ID** — server-generated `PF-<ROLEPREFIX>-#####`; prefixes `ADM, MGR, SLS, INV, WHS, CS, STY`.
- Activity `EMPLOYEE_CREATED`.

### `PATCH /admin/employees/{id}` (`employees.edit`)
- Activities `EMPLOYEE_UPDATED`, `ROLE_CHANGED`, `DEPARTMENT_CHANGED`.

### `POST /admin/employees/{id}/status` (`employees.suspend`)
- **BODY** — `{ status: ACTIVE|PENDING|ON_LEAVE|SUSPENDED|INACTIVE }`
- **RULE** — `SUSPENDED` and `INACTIVE` cannot sign in and `hasPermission()` denies everything for them.
- Activities `STATUS_CHANGED`, `EMPLOYEE_SUSPENDED|ACTIVATED|DEACTIVATED`.

### `POST /admin/employees/{id}/reset-password` (`employees.resetPassword`)
- Sets `mustChangePassword = true`. Activity `PASSWORD_RESET`.

### `PUT /admin/employees/{id}/permissions` (`employees.managePermissions`)
- **BODY** — `{ permissionMode: "role"|"custom", permissions: string[] }`
- **RULE** — `SUPER_ADMIN` always resolves to the full default set regardless of stored overrides. Activity `PERMISSIONS_CHANGED`.

### Employee self-service
`GET /employee/me` · `GET /employee/me/assigned-products` (`employeeAssignedProducts`) · `GET /employee/me/workflow` (`getProductWorkflowView`) · `GET /employee/desk` (`operationsService.defaultDashboardMetrics`).

### Attendance (`attendance.*`)
`GET /employee/attendance` · `POST /employee/attendance/check-in` · `POST /employee/attendance/check-out` · `POST /admin/attendance/{employeeId}/correct` (`attendance.correct`) · `GET /admin/attendance` · `GET /admin/attendance/report`
- Record: `{ attendanceId, employeeId, employeeNameSnapshot, date (YYYY-MM-DD), checkIn, checkOut, status, workMinutes, lateMinutes, earlyLeaveMinutes, locationId, notes, corrections[], createdAt, updatedAt }`
- Rules from settings `attendance`: start 09:30, end 18:30, `lateThresholdMinutes 10`, `minimumHalfDayMinutes 240`, `fullDayMinutes 540`.
- **UNIQUE** `(employeeId, date)`. Corrections are append-only with actor + reason + before/after.
- Activities `ATTENDANCE_CHECKED_IN|CHECKED_OUT|CORRECTED`.

### Leave (`leave.*`)
`POST /employee/leave` (`leave.create`) · `GET /employee/leave` · `GET /admin/leave` (`leave.view`) · `POST /admin/leave/{id}/approve` (`leave.approve`) · `/reject` (`leave.reject`) · `POST /employee/leave/{id}/cancel`
- Record: `{ leaveId, employeeId, employeeNameSnapshot, leaveType, startDate, endDate, days, reason, status, requestedAt, reviewedAt, reviewedBy, reviewNote }`
- **RULE** — overlapping leave is detected (`overlappingLeave`); approved leave writes through to attendance (`applyLeaveToAttendance`) and cancellation reverses it (`clearLeaveFromAttendance`).
- Activities `LEAVE_REQUESTED|APPROVED|REJECTED`.

### Performance (`performance.*`)
`GET /employee/performance` · `GET /admin/performance` · `GET /admin/performance/{employeeId}` · `POST /admin/performance/{id}/review` (`performance.review`)
- Record: `{ performanceId, employeeId, employeeNameSnapshot, period, periodType, department, role, targets[], achievements[], review, score, scoreBreakdown, status, createdAt, updatedAt }`
- **UNIQUE** `(employeeId, period)`. Activity `PERFORMANCE_REVIEWED`.

### Operations desks
`GET /employee/support/cases` · `/support/returns` · `/support/feedback` · `/styling/requests` · `/styling/appointments` · `/styling/recommendations` · `/warehouse/incoming` · `/warehouse/outgoing` · `/warehouse/pick-pack` · `/warehouse/transfers` · `/warehouse/damaged` · `/orders/assisted` · `/team` · `/reports`
- All sourced from `operationsService` (`getSupportCases`, `getFeedback`, `getStylingRequests`, `getAppointments`, `getWarehouseTasks`, `getAssistedOrders`, `getFollowUps`, `getStockMovements`, `getTransfers`, `getCatalogueStock`, `searchProducts`, `getPerformance`).
- **CRITICAL** — support cases, feedback, styling requests, appointments, warehouse tasks and follow-ups are **derived demo projections over orders/products today; they have no persisted entity.** Making them real entities is `BACKEND DECISION REQUIRED` (see `DATABASE_SCHEMA.md` §Deferred).

---

# NOTIFICATIONS

**No notification entity exists.** What exists:

- `settingsRepository` section `notifications`: `{ order: ["IN_APP"], returns: ["IN_APP"], employee: ["IN_APP"], lowStock: ["IN_APP"], offers: ["IN_APP"], marketing: [] }` — channel preferences edited in Admin Settings.
- Customer `preferences`: `emailNotifications, smsNotifications, promotionalUpdates, orderUpdates, stylingInvitations` (booleans on the account).
- No inbox, no bell, no unread count, no delivery record, no template.

`NOT DEFINED / BACKEND DECISION REQUIRED` — the whole notification subsystem:
- `GET /notifications`, `POST /notifications/{id}/read`, unread counts — **no frontend consumer exists; do not build them speculatively.**
- Channels beyond `IN_APP`, templates, transactional email/SMS providers, digest scheduling, per-event triggers.

**The only implementable contract today** is: `GET|PATCH /admin/settings/notifications` and `PATCH /customers/me/preferences`, both already listed above.

---

## Endpoint census

| Group | Endpoints |
| --- | --- |
| AUTH | 11 |
| USERS | 10 |
| PRODUCTS | 18 |
| MEDIA | 17 |
| CATEGORIES | 6 |
| SUBCATEGORIES | 4 |
| COLLECTIONS | 9 |
| SEARCH | 1 |
| EXPLORE (incl. home + AI) | 8 |
| CART | 8 |
| WISHLIST | 4 |
| ORDERS | 24 |
| PAYMENTS | 3 (+1 undefined webhook) |
| REVIEWS | 0 implementable (2 undefined) |
| OFFERS | 7 |
| ADMIN (inventory/analytics/activity/settings/roles) | 31 |
| EMPLOYEE | 27 |
| NOTIFICATIONS | 2 implementable |
| **Total implementable** | **190** |

Counts are of documented endpoints; several share a path with different methods.
