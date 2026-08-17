# PRATIKSHYA FASHON — Database Schema

Derived from the record shapes the frontend actually persists and reads. Every field below exists in the repository. Where the frontend has no opinion (index strategy, cascade behaviour, retention), the entry is marked `BACKEND DECISION REQUIRED` rather than guessed.

**Conventions used here**
- `TEXT` = variable-length string. `SLUG` = lowercase, hyphenated, URL-safe.
- Money: whole rupees. `INTEGER` is safe today (no paise anywhere in the codebase). `BACKEND DECISION REQUIRED`: whether to move to minor units / `DECIMAL(12,2)` before real payments.
- `TIMESTAMPTZ` = ISO-8601 UTC.
- `JSONB` marks a field the frontend stores as a nested object/array. Each is flagged **normalisable** where a real table is the better shape.
- "Required" means the frontend cannot function without it, not that a NOT NULL exists today.

**Entities investigated and their verdict**

| Requested entity | Verdict |
| --- | --- |
| User (Customer), Address | Required — §1, §2 |
| Employee, Admin, Role, Permission | Required — §3–§6 |
| Product, ProductVariant, ProductPriceHistory, ProductHistory, ProductReviewFlag | Required — §7–§11 |
| Media, ProductMediaGroup | Required — §12, §13 |
| Category, Subcategory, Collection, CollectionProduct | Required — §14–§17 |
| Inventory, InventoryLocation, InventoryMovement, InventoryTransfer, InventoryReservation | Required — §18–§22 |
| Offer | Required — §23 |
| Cart, CartItem | Required only if a server cart is built — §24, §25 |
| Wishlist | Required — §26 |
| Order, OrderItem, OrderStatusHistory, OrderTimeline, Return, ReturnItem, Refund, Shipment/Fulfillment, Payment | Required — §27–§35 |
| Activity (audit log) | Required — §36 |
| Attendance, LeaveRequest, PerformanceReview, PerformanceTarget | Required — §37–§40 |
| Setting | Required — §41 |
| RecentlyViewed, AiMirrorHistory | Required — §42, §43 |
| **Review (product review)** | **NOT REQUIRED YET — no entity exists.** See §44. |
| **Notification** | **NOT REQUIRED YET — no entity exists.** See §45. |
| **EmployeeAssignment** | **Not a separate table.** It is one column: `product.assigned_employee_id`. See §7. |
| **Shipment** | Partially present as `order.fulfillment` + `order.shipment` (nullable). See §34. |

---

## 1. `customer`

Sources: `AuthContext` (`pratikshya_customers_registry`), `src/data/mockCustomers.js`.

| Field | Type | Req | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | TEXT **PK** | ✔ | — | `cust-01` style today. |
| `first_name` | TEXT | ✔ | — | |
| `last_name` | TEXT | ✖ | `''` | |
| `email` | TEXT | ✔ | — | **UNIQUE**, lowercased. |
| `phone` | TEXT | ✖ | `''` | `^(?:\+91\|0)?[6-9]\d{9}$`. **UNIQUE** if present (frontend matches sign-in by phone). |
| `password_hash` | TEXT | ✔ | — | `BACKEND DECISION REQUIRED` — the frontend has no hashing. Must live in a **separate credential table**, mirroring the employee/admin split. |
| `date_of_birth` | DATE | ✖ | `null` | |
| `avatar` | TEXT | ✖ | `null` | URL or media id. |
| `member_since` | TEXT | ✖ | — | Display string (`"October 2024"`), derived from `created_at`. |
| `created_at` | TIMESTAMPTZ | ✔ | `now()` | |
| `updated_at` | TIMESTAMPTZ | ✔ | `now()` | |
| `status` | TEXT | ✖ | `'ACTIVE'` | Admin UI renders `ACTIVE` as a literal. **No customer status enum exists** — `BACKEND DECISION REQUIRED`. |

Indexes: `email` (unique), `phone` (unique, partial), `created_at`.

---

## 2. `address`

| Field | Type | Req | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | TEXT **PK** | ✔ | — | `addr-01`. |
| `customer_id` | TEXT **FK → customer.id** | ✔ | — | `ON DELETE CASCADE`. |
| `full_name` | TEXT | ✔ | — | |
| `phone` | TEXT | ✔ | — | validated |
| `address_line` | TEXT | ✔ | — | |
| `landmark` | TEXT | ✖ | `''` | |
| `city` | TEXT | ✔ | — | |
| `state` | TEXT | ✔ | — | |
| `pincode` | TEXT | ✔ | — | `^[1-9][0-9]{5}$` |
| `type` | TEXT | ✖ | `'Home'` | Free text; UI offers `Home` / `Work`. Not an enum. |
| `is_default` | BOOLEAN | ✔ | `false` | **At most one `true` per customer** — enforce with a partial unique index. |

Index: `(customer_id, is_default)`.

---

## 3. `employee`

Source: `toPublicEmployee()` (`src/services/employees/employeeService.js`).

| Field | Type | Req | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | TEXT **PK** | ✔ | — | mirrors `employee_id` |
| `employee_id` | TEXT | ✔ | — | **UNIQUE**, `PF-<ROLEPREFIX>-#####`, upper-cased |
| `first_name` | TEXT | ✔ | — | |
| `last_name` | TEXT | ✔ | — | |
| `email` | TEXT | ✔ | — | **UNIQUE**, lowercased |
| `phone` | TEXT | ✔ | — | 10 digits |
| `avatar` | TEXT | ✖ | `null` | |
| `role` | TEXT **FK → role.id** | ✔ | — | one of 8 |
| `department` | TEXT | ✔ | — | `DEPARTMENTS` (13) |
| `section` | TEXT | ✖ | `''` | from `DEPARTMENT_DEFINITIONS[dept].sections` |
| `store` | TEXT | ✔ | — | location label |
| `joining_date` | DATE | ✔ | — | |
| `status` | TEXT | ✔ | `'PENDING'` | `ACTIVE, PENDING, ON_LEAVE, SUSPENDED, INACTIVE` |
| `permission_mode` | TEXT | ✔ | `'role'` | `role \| custom` |
| `must_change_password` | BOOLEAN | ✔ | `false` | |
| `last_login` | TIMESTAMPTZ | ✖ | `null` | |
| `shift` | TEXT | ✖ | `'Morning · 10:00 – 19:00'` | |
| `created_at` | TIMESTAMPTZ | ✔ | `now()` | |

**Guarantee to preserve:** the employee profile must **never** carry a password or fingerprint. Credentials live in a separate table; `normaliseEmployees()` actively discards leaked credential fields.

`employee_credential`: `employee_id` **PK/FK**, `password_hash`, `must_change_password`, `updated_at`.
`employee_permission`: `(employee_id, permission_key)` **PK** — only rows when `permission_mode = 'custom'`. `SUPER_ADMIN` ignores overrides and always resolves to the full default set.

Indexes: `employee_id` (unique), `email` (unique), `(role, status)`, `department`.

---

## 4. `admin`

Source: `toPublicAdmin()`.

| Field | Type | Req | Default |
| --- | --- | --- | --- |
| `id` | TEXT **PK** | ✔ | — |
| `admin_id` | TEXT UNIQUE | ✔ | — (upper-cased) |
| `name` | TEXT | ✔ | `'Administrator'` |
| `email` | TEXT UNIQUE | ✔ | lowercased |
| `phone` | TEXT | ✖ | `''` |
| `avatar` | TEXT | ✖ | `null` |
| `role` | TEXT | ✔ | `'SUPER_ADMIN'` (only value) |
| `status` | TEXT | ✔ | `'ACTIVE'` — `ACTIVE \| SUSPENDED` |
| `title` | TEXT | ✖ | `'Business Operations'` |
| `last_login` | TIMESTAMPTZ | ✖ | `null` |
| `created_at` | TIMESTAMPTZ | ✔ | `now()` |

Separate `admin_credential` table, same rule as employees.

---

## 5. `role` (reference data — 8 rows)

| `id` | `label` | `id_prefix` | default permissions |
| --- | --- | --- | --- |
| `SUPER_ADMIN` | Super Admin | ADM | 75 (allow-all at runtime) |
| `STORE_MANAGER` | Store Manager | MGR | 68 |
| `INVENTORY_MANAGER` | Inventory Manager | INV | 26 |
| `CUSTOMER_SUPPORT` | Customer Support | CS | 26 |
| `WAREHOUSE_STAFF` | Warehouse Staff | WHS | 24 |
| `FASHION_STYLIST` | Fashion Stylist | STY | 19 |
| `SALES_EXECUTIVE` | Sales Executive | SLS | 17 |
| `INVENTORY_STAFF` | Inventory Staff | INV | 17 |

`role_permission`: `(role_id, permission_key)` **PK**. Full data in `data/roles-permissions.json`.

## 6. `permission` (reference data — 82 rows)

`key` **PK** (`products.manage`), `constant` (`PRODUCTS_MANAGE`), `label`, `group` (7 UI groups).

**Implication rules** — enforce in code, not data: `offers.manage` ⇒ all `offers.*`; `attendance.manage` ⇒ all `attendance.*`; `leave.manage` ⇒ all `leave.*`; `performance.manage` ⇒ all `performance.*`. `SUPER_ADMIN` ⇒ everything. An employee whose `status` cannot sign in ⇒ **nothing**.

---

## 7. `product`

Source: `normaliseProductRecord()` (`src/services/catalogRepository.js`). 168 rows in `data/product-catalogue.json`.

### Identity
| Field | Type | Req | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | TEXT **PK** | ✔ | — | `pf-001`…`pf-099`, `KID-001`…, `MEN-001`… **Permanent.** Changed only via the audited change-id path, pattern `^[A-Z0-9][A-Z0-9-]{1,14}$`. |
| `product_id` | TEXT | ✔ | = `id` | Mirror kept for the UI; never diverges. |
| `name` | TEXT | ✔ | `''` | Required and non-placeholder to publish. |
| `slug` | SLUG | ✔ | slugify(name) | **UNIQUE among non-archived.** |
| `sku` | TEXT | ✔ | `PF-#####` | **UNIQUE.** |
| `brand` | TEXT | ✔ | `'Pratikshya Fashon'` | |
| `product_type` | TEXT | ✔ | `'fashion'` | |
| `product_code` | TEXT | ✖ | `''` | |
| `barcode` | TEXT | ✖ | `''` | |
| `internal_reference` | TEXT | ✖ | `''` | |

### Placement
| Field | Type | Req | Default | Notes |
| --- | --- | --- | --- | --- |
| `category` | TEXT **FK → category.id** | ✔ | `''` | Required to publish. |
| `subcategory` | TEXT | ✖ | `''` | **Stored as a label today** (`"Girls Dress"`), not `subcategory.id`. `BACKEND DECISION REQUIRED`: migrate to an FK. Migrating changes stored data — out of scope here. |
| `gender` | TEXT | ✔ | `'Women'` | `Women, Men, Kids, Unisex` (vocabulary from `taxonomy.genders`). |

### Content
`short_description` TEXT · `description` TEXT · `highlights` JSONB[] · `specifications` JSONB{} · `care_instructions` JSONB[] · `delivery_info` TEXT · `return_info` TEXT · `return_policy` JSONB `{eligibility, window, notes}`.
**Publish rule:** `description` OR `short_description` must be non-empty.

### Attributes
`fabric`, `material`, `primary_color`, `secondary_color` TEXT; `colors`, `patterns`, `work`, `occasion`, `sizes`, `unavailable_colors`, `unavailable_sizes` JSONB arrays; `season`, `fit`, `length` TEXT. **All are storefront facets** — normalising them into lookup tables is optional but the facet vocabularies must stay identical.

### Merchandising
`collection` TEXT (primary label) · `collections` JSONB[] (labels) · `tags` JSONB[] · `badges` JSONB[] · `is_featured`, `is_bestseller`, `is_new`, `is_limited_edition`, `is_trending` BOOLEAN (mirrored into `flags` JSONB as `featured/bestseller/newArrival/limitedEdition/trending`).
**Note:** collection membership is by **label match** today, plus the explicit `collection_product` table. Both paths must keep working — see §17.

### Pricing
| Field | Type | Req | Default | Notes |
| --- | --- | --- | --- | --- |
| `price` | INTEGER | ✔ | `pricing.finalPrice` | The customer-facing price. Must be > 0 to publish. |
| `original_price` | INTEGER | ✖ | `null` | Only set when `mrp > finalPrice`. |
| `compare_at_price` | INTEGER | ✖ | `null` | Draft-editor mirror of `original_price`. |
| `currency` | TEXT | ✔ | `'INR'` | Only value in use. |
| `pricing` | JSONB | ✔ | — | `{ mrp, sellingPrice, discountType, discountValue, taxMode, taxRate, customTaxRate }` — **normalisable** into columns. |

`discountType` ∈ `none \| percentage \| fixed`; `taxMode` ∈ `INCLUSIVE \| EXCLUSIVE`.
**Pricing engine (`computePricing`, `src/utils/pricing.js`) — reimplement exactly:**
```
discountAmount = percentage ? sellingPrice*value/100 : fixed ? value : 0
finalPrice     = max(0, roundINR(sellingPrice - discountAmount))
savings        = mrp > 0 ? max(0, mrp - finalPrice) : 0
effectiveDiscountPercent = round((savings/mrp)*100, 2)
```
Errors: MRP ≤ 0 · selling ≤ 0 · selling > MRP (`ALLOW_SELLING_ABOVE_MRP = false`) · percentage outside 0–100 · negative fixed · fixed > selling · tax rate outside 0–100 · negative final price. **These errors block publication.**

### Inventory snapshot on the product
`stock` INTEGER default 0 · `availability` TEXT default `'in-stock'` · `inventory_tracked` BOOLEAN default false · `low_stock_threshold` INTEGER default 5.
**This is the catalogue's opening quantity, not the stock ledger.** The ledger is §18.

### Ratings (authored, not derived)
`rating` NUMERIC · `review_count` INTEGER. See §44.

### SEO
`seo` JSONB `{ title, description }`.

### Publishing & review
| Field | Type | Req | Default | Notes |
| --- | --- | --- | --- | --- |
| `status` | TEXT | ✔ | `'DRAFT'` | **ENUM `DRAFT, PENDING_REVIEW, PUBLISHED, ARCHIVED`** |
| `published` | BOOLEAN | ✔ | derived | strictly `status === 'PUBLISHED'`; kept because the visibility gate reads it |
| `review` | JSONB | ✔ | see below | `{ state, submittedBy, submittedAt, reviewedBy, reviewedAt, rejectionReason }` — **normalisable** |
| `review.state` | TEXT | ✔ | `'NONE'` | **ENUM `NONE, PENDING, APPROVED, REJECTED`** |
| `assigned_employee_id` | TEXT **FK → employee.employee_id** | ✖ | `null` | **This single column is the entire "EmployeeAssignment" concept.** |
| `review_flags` | JSONB[] | ✔ | `[]` | see §11 |

### Media claims
`media_ids` JSONB[] · `primary_media_id` TEXT · `gallery_media_ids` JSONB[] · plus legacy authored `image`, `hover_image`, `additional_images`.
**Ownership truth is `media.product_id`, never these.** A claim that contradicts the register is reported as an ownership conflict and blocks publication.

### Audit
`created_by`, `created_at`, `updated_by`, `updated_at`, `published_by`, `published_at`; `history` JSONB[] (client cap **60**), `price_history` JSONB[] (client cap **24**). Both **normalisable** — §9, §10.

**Indexes:** `slug` (unique, non-archived), `sku` (unique), `status`, `category`, `(category, status)`, `assigned_employee_id`, `updated_at`, full-text over the search fields listed in `API_CONTRACT.md → SEARCH`.

---

## 8. `product_variant`

| Field | Type | Req | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | TEXT **PK** | ✔ | `${productId}-var-01` | zero-padded 2 digits |
| `product_id` | TEXT **FK → product.id** | ✔ | — | `ON DELETE CASCADE` |
| `sku` | TEXT | ✖ | `''` | unique when present |
| `color` | TEXT | ✖ | `''` | |
| `size` | TEXT | ✖ | `''` | |
| `price_override` | INTEGER | ✖ | `null` | |
| `stock` | INTEGER | ✔ | `0` | |
| `barcode` | TEXT | ✖ | `''` | |
| `status` | TEXT | ✔ | `'ACTIVE'` | `ACTIVE \| INACTIVE` |
| `created_at` | TIMESTAMPTZ | ✔ | `now()` | |

Unique: `(product_id, color, size)` — `BACKEND DECISION REQUIRED`, the frontend does not enforce it but the cart's line identity `(productId, color, size)` assumes it.

## 9. `product_price_history`
`id` PK · `product_id` FK · `at` TIMESTAMPTZ · `actor` TEXT · `from_price` INTEGER · `to_price` INTEGER. Written on every price change; client keeps the last 24.

## 10. `product_history`
`id` PK · `product_id` FK · `at` · `actor` · `field` · `from` · `to`. Field-level audit; client keeps the last 60. **Distinct from the activity diary (§36):** this is per-field, the diary is per-action.

## 11. `product_review_flag`
`(product_id, flag)` **PK**. Vocabulary (`src/services/productReviewFlags.js`):

**Blocking (9)** — `NAME_REVIEW_REQUIRED`, `PRICE_REVIEW_REQUIRED`, `TAXONOMY_REVIEW_REQUIRED`, `GROUP_REVIEW_REQUIRED`, `VARIANT_REVIEW_REQUIRED`, `NEEDS_MEDIA`, `MEDIA_OWNERSHIP_REVIEW`, `CONFLICT_UNRESOLVED`, `KIDS_MIGRATION_REVIEW`.
**Informational (3)** — `CONFLICT_REVIEW_LATER`, `MEDIA_OWNERSHIP_MOVED`, `MEDIA_UNASSIGNED`.

---

## 12. `media`

Source: `mediaRepository` / `normaliseMedia()`. 205 rows in `data/media-product-mapping.json`.

| Field | Type | Req | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | TEXT **PK** | ✔ | — | `pm-seed-001`, `pm-ing-<hex>`. **Immutable.** |
| `type` | TEXT | ✔ | `'IMAGE'` | `IMAGE \| VIDEO` |
| `file_name` | TEXT | ✔ | — | drives grouping |
| `url` | TEXT | ✔ | — | ephemeral blob URLs are rejected on update |
| `thumbnail` | TEXT | ✖ | `''` | |
| `poster` | TEXT | ✖ | `''` | video only |
| `title`, `alt`, `caption` | TEXT | ✖ | `''` | `alt` matters for a11y |
| `tags` | JSONB[] | ✖ | `[]` | includes `group:<groupKey>` |
| `scope` | TEXT | ✔ | `'UNASSIGNED'` | **ENUM `PRODUCT, MARKETING, UNASSIGNED`. Immutable after create.** |
| `status` | TEXT | ✔ | `'DRAFT'` | **ENUM `DRAFT, PENDING_REVIEW, ACTIVE, REJECTED, ARCHIVED`** |
| `product_id` | TEXT **FK → product.id** | ✖ | `null` | **THE ONLY OWNERSHIP TRUTH. Immutable except via assign/transfer/unassign.** |
| `role` | TEXT | ✖ | `null` | **ENUM `COVER, GALLERY, DETAIL, LIFESTYLE, MODEL, CLOSEUP, PRODUCT_VIDEO, SHOWCASE, DETAIL_VIDEO, LIFESTYLE_VIDEO`** |
| `sort_order` | INTEGER | ✔ | `99` | gallery order |
| `group_key` | TEXT | ✖ | `null` | filename base minus view suffix |
| `view` | TEXT | ✖ | `null` | `front, back, side, left-side, right-side, left, right, detail, close, close-up, closeup, front-close, front-detail, left-side-detail, right-side-detail, multiple, multiple-front` |
| `is_standalone` | BOOLEAN | ✔ | — | true when its group has one file |
| `category_id` | TEXT FK | ✖ | `null` | **never implies ownership** |
| `subcategory_id`, `collection_id`, `variant_id` | TEXT FK | ✖ | `null` | |
| `usage_roles` | JSONB[] | ✔ | `[]` | `HERO, EDITORIAL, LOOKBOOK, CATEGORY_COVER, COLLECTION_COVER, SALE, CAMPAIGN, …` |
| `mapping_status` | TEXT | ✖ | `null` | `MAPPED \| UNMAPPED \| NEEDS_REVIEW` |
| `mapping_method` | TEXT | ✖ | `null` | `FOLDER, FILENAME, MANUAL, …` |
| `mapping_note` | TEXT | ✖ | `''` | |
| `duplicate_status` | TEXT | ✖ | `'UNIQUE'` | `UNIQUE \| DUPLICATE \| POSSIBLE_DUPLICATE` |
| `duplicate_of` | TEXT FK → media.id | ✖ | `null` | |
| `placement` | TEXT | ✖ | `null` | `MARKETING_PLACEMENTS`; **immutable after create** |
| `campaign` | TEXT | ✖ | `null` | |
| `width`, `height` | INTEGER | ✖ | `null` | |
| `checksum` | TEXT | ✖ | `null` | sha-256; the natural dedupe key |
| `ingested`, `broken`, `low_resolution` | BOOLEAN | ✔ | `false` | |
| `source` | TEXT | ✖ | `null` | |
| `uploaded_by`, `uploaded_by_employee_id`, `uploaded_by_type` | TEXT | ✖ | — | `uploaded_by_type ∈ ADMIN \| EMPLOYEE` |
| `review_status` | TEXT | ✖ | `null` | `APPROVED, PENDING, REJECTED` — legacy of the review desk |
| `created_at`, `updated_at` | TIMESTAMPTZ | ✔ | `now()` | |

**Constraints**
1. At most one `role = 'COVER'` per `product_id` (partial unique index). Promotion demotes the incumbent to `GALLERY` in the same transaction.
2. `product_id` may only be changed through assign/transfer/unassign, with a `confirmReassign`/`confirm` flag when contested.
3. Unique `checksum` — `BACKEND DECISION REQUIRED` (duplicates are currently *flagged*, not rejected).

**Indexes:** `product_id`, `(product_id, role)`, `group_key`, `scope`, `status`, `checksum`, `category_id`, `placement`.

## 13. `product_media_group` — the human decision register

Source: `src/services/media/productMediaGroups.js`. **0 rows in the repository** (operator-written at runtime).

| Field | Type | Req | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | TEXT **PK** | ✔ | — | |
| `group_key` | TEXT | ✔ | — | filename group it concerns |
| `media_ids` | JSONB[] | ✔ | `[]` | **normalisable** → `product_media_group_item` |
| `product_id` | TEXT FK | ✖ | `null` | set when the group resolves to a product |
| `decision` | TEXT | ✖ | `null` | **ENUM `SAME_PRODUCT, SEPARATE_PRODUCTS, REVIEW_LATER`** |
| `status` | TEXT | ✔ | `'PENDING'` | **ENUM `PENDING, CONFIRMED, SPLIT, ARCHIVED`** |
| `source` | TEXT | ✔ | `'FILENAME'` | **ENUM `FILENAME, MANUAL, REVIEW_FLAG`** |
| `decided_by`, `decided_at`, `note` | | ✖ | — | |
| `created_at`, `updated_at` | TIMESTAMPTZ | ✔ | `now()` | |

**Rule:** a group with `decision = null` or `REVIEW_LATER` that touches a product's media is an *unresolved group conflict* and blocks publication (`unresolvedGroupConflictsFor()`).

---

## 14. `category` (10 rows)

`id` **PK** (`sarees`) · `name` · `slug` **UNIQUE** · `eyebrow` · `description` · `image` · `banner_media_id` FK → media · `status` **ENUM `DRAFT, ACTIVE, ARCHIVED`** · `sort_order` INTEGER · `featured` BOOLEAN · `seo_title` · `seo_description` · `created_at` · `updated_at`.
`product_count` is **derived**, never stored.

**Critical:** `status != 'ACTIVE'` hides every product in the category from every customer surface.

## 15. `subcategory` (38 rows)

`id` **PK** (`sarees-pato-saree` = `<categoryId>-<slug>`) · `category_id` **FK** · `name` · `slug` (**UNIQUE within category**) · `description` · `image` · `status` (same enum) · `sort_order`.
Index `(category_id, status, sort_order)`.

## 16. `collection` (11 rows)

| Field | Type | Req | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | TEXT **PK** | ✔ | — | `new-arrivals` |
| `name`, `slug` | TEXT | ✔ | — | slug **UNIQUE** |
| `eyebrow`, `description`, `image` | TEXT | ✖ | `''` | |
| `hero_media_id`, `thumbnail_media_id` | TEXT FK → media | ✖ | `null` | |
| `type` | TEXT | ✔ | `'MANUAL'` | **ENUM `MANUAL, RULE_BASED`** |
| `status` | TEXT | ✔ | `'DRAFT'` | **ENUM `DRAFT, SCHEDULED, ACTIVE, PAUSED, EXPIRED, ARCHIVED`** |
| `featured` | BOOLEAN | ✔ | `false` | |
| `sort_order` | INTEGER | ✔ | `0` | |
| `start_date`, `end_date` | DATE | ✖ | `''` | drive the derived status |
| `rule` | JSONB | ✖ | `null` | `{ flag? , occasion? , fabricIncludes? }` |

`display_status` is **derived** from `status` + dates on every read. Never trust a stored `SCHEDULED`/`EXPIRED`.

## 17. `collection_product`
`(collection_id, product_id)` **PK**, `sort_order`, `added_at`, `added_by`.
**Membership resolution (must match `taxonomyRepository` exactly):**
```
members(collection) = explicit collection_product rows
                    ∪ products whose `collection`/`collections[]` label matches the collection name
                    ∪ (RULE_BASED) products matching rule.flag | rule.occasion | rule.fabricIncludes
```
The label-match arm is why 7 `MANUAL` collections still resolve products without explicit rows. Dropping it silently empties the storefront collections.

---

## 18. `inventory`
`id` **PK** · `product_id` **FK** · `variant_id` FK ✖ · `location_id` **FK** · `placement` JSONB `{department, section, zone, rack, shelf, bin}` · quantities `on_hand`, `reserved`, `available`, `sold`, `returned`, `damaged` INTEGER · `low_stock_threshold` INTEGER default 5 · `maximum_stock` INTEGER ✖ · `active` BOOLEAN default true · `status` derived **ENUM `IN_STOCK, LOW_STOCK, OUT_OF_STOCK, OVERSTOCKED, UNAVAILABLE`** · `review` JSONB ✖ · timestamps.

**Invariants (`normaliseQuantity`):** `reserved ≤ on_hand`; `damaged ≤ on_hand − reserved`; `available = max(0, on_hand − reserved − damaged)`; every quantity ≥ 0 and integral.
Unique `(product_id, variant_id, location_id)`.

## 19. `inventory_location`
`id` PK · `name` · `code` · `type` **ENUM `STORE, WAREHOUSE`** · `status` **ENUM `ACTIVE, INACTIVE`** · address fields · `contact_person` · `contact_phone`.

## 20. `inventory_movement`
`id` PK · `inventory_id` FK · `product_id` · `variant_id` · `location_id` · `type` **ENUM (11) `OPENING_BALANCE, RECEIVE, ADJUST, TRANSFER_OUT, TRANSFER_IN, RESERVE, RELEASE, SALE, RETURN, DAMAGE, RESTOCK`** · `quantity` INTEGER (signed) · `before_quantity` JSONB · `after_quantity` JSONB · `reference` (order/transfer id) · `reason` · `employee_id` · `employee_name` · `at`.
**Append-only.** Client ring-buffers at 1000; server retention is `BACKEND DECISION REQUIRED`.

## 21. `inventory_transfer`
`id` PK · `from_location_id` · `to_location_id` · `items` JSONB[] (**normalisable** → `inventory_transfer_item`) · `state` **ENUM `DRAFT, REQUESTED, APPROVED, IN_TRANSIT, RECEIVED, CANCELLED`** · `requested_by` · `approved_by` · `received_by` · timestamps. Client cap 300.

## 22. `inventory_reservation`
`id` PK · `cart_id`/`session_id` · `customer_id` ✖ · `items` JSONB[] · `status` (`ACTIVE, CONFIRMED, RELEASED, EXPIRED`) · `expires_at` = **created + 15 minutes** · `order_id` ✖ · timestamps.
`releaseExpiredReservations()` must become a scheduled job. Client cap 300.

---

## 23. `offer`

`id` PK (`off-<base36>`) · `code` TEXT **UNIQUE** (letters/digits/hyphen, 2–24, upper-cased) · `name` · `description` · `type` **ENUM `PERCENTAGE, FIXED_AMOUNT`** · `discount_value` · `minimum_order_value` · `maximum_discount` · `start_date` · `end_date` · `status` **ENUM `DRAFT, SCHEDULED, ACTIVE, PAUSED, EXPIRED, ARCHIVED`** · `usage_limit` · `usage_count` · `per_customer_limit` · `customer_eligibility` **ENUM `ALL_CUSTOMERS, NEW_CUSTOMERS, RETURNING_CUSTOMERS, SPECIFIC_CUSTOMERS`** · `specific_customer_ids` JSONB[] · `product_eligibility` **ENUM `ALL_PRODUCTS, SPECIFIC_PRODUCTS, CATEGORY, COLLECTION`** · `included_products/categories/collections`, `excluded_products/categories/collections` JSONB[] (**normalisable** → `offer_scope`) · `stackable` BOOLEAN · `priority` INTEGER · `redeemed_order_ids` JSONB[] (**normalisable** → `offer_redemption`) · audit columns.

`display_status` is derived from dates — recompute on read. On persist, `SCHEDULED`/`EXPIRED` are stored as `ACTIVE`.
Suggested `offer_redemption`: `(offer_id, order_id)` PK + `customer_id`, `discount_amount`, `at` — needed for a correct per-customer limit.

---

## 24. `cart` / ## 25. `cart_item` *(only if a server cart is built)*

`cart`: `id` PK · `customer_id` FK ✖ (guest carts exist) · `session_id` ✖ · `coupon_code` ✖ · timestamps.
`cart_item`: `id` PK = `cartLineId(product_id, {color,size})` · `cart_id` FK · `product_id` FK · `variant_id` ✖ · `color` ✖ · `size` ✖ · `quantity` INTEGER ≥ 1 · `added_at`.
Unique `(cart_id, product_id, color, size)` — the frontend merges duplicates on restore.

## 26. `wishlist_item`
`(customer_id, product_id)` **PK** · `added_at`. Guest wishlists are client-only; the merge-on-sign-in policy is `BACKEND DECISION REQUIRED`.

---

## 27. `order`

Source: `normaliseOrder()` (`src/utils/orders.js`) + `buildOrderRecord()`.

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `id` | TEXT **PK** | ✔ | display order number |
| `customer_id` | TEXT FK ✖ | | null for guest orders |
| `inventory_reservation_id` | TEXT FK ✖ | | |
| `customer` | JSONB | ✔ | snapshot `{name, email, phone}` — **snapshots must not be rewritten when the customer edits their profile** |
| `address` | JSONB | ✔ | shipping snapshot |
| `delivery_method` | TEXT | ✔ | `standard \| express` |
| `payment_method` | TEXT | ✔ | `upi \| card \| netbanking \| cod` |
| `payment_status` | TEXT | ✔ | **ENUM (9)** `PENDING, AUTHORIZED, PAID, FAILED, CANCELLED, NOT_CAPTURED, REFUND_INITIATED, REFUND_PENDING, REFUNDED` |
| `status` | TEXT | ✔ | **ENUM (16 live + 2 legacy)** — §28 |
| `pricing` | JSONB | ✔ | `{subtotal, productDiscount, couponDiscount, couponCode, offerId, shipping, codFee, total, saved}` — **normalisable** |
| `tracking` | JSONB | ✔ | `{trackingId, carrier, origin}`; origin `"Bhubaneswar, Odisha"` |
| `invoice` | JSONB | ✔ | `{number, issuedAt}` — invoice number **UNIQUE** |
| `refund` | JSONB ✖ | | §33 |
| `cancellation` | JSONB ✖ | | `{at, by, reason}` |
| `fulfillment` | JSONB | ✔ | §34 |
| `shipment` | JSONB ✖ | | §34 |
| `notes` | JSONB | ✔ | `{customer: string, internal: []}` — **internal notes must never reach a customer endpoint** |
| `created_at`, `updated_at` | TIMESTAMPTZ | ✔ | |

Indexes: `customer_id`, `status`, `created_at`, `customer->>email` (guest claiming), `tracking->>trackingId`, `invoice->>number` (unique).

## 28. Order status enum + transitions

Live (16): `PENDING_PAYMENT, PAYMENT_CONFIRMED, ORDER_CONFIRMED, PROCESSING, ALLOCATED, PICKING, PACKED, READY_TO_DISPATCH, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURN_REQUESTED, RETURNED, REFUND_PENDING, REFUNDED`.
Legacy (2): `PLACED`, `CONFIRMED` — accepted on read, resolved through `ORDER_STATUSES[x].mapsTo`.

```
PENDING_PAYMENT   → PAYMENT_CONFIRMED | CANCELLED
PAYMENT_CONFIRMED → ORDER_CONFIRMED   | CANCELLED
ORDER_CONFIRMED   → PROCESSING        | CANCELLED
PROCESSING        → ALLOCATED         | CANCELLED
ALLOCATED         → PICKING           | CANCELLED
PICKING           → PACKED            | CANCELLED
PACKED            → READY_TO_DISPATCH
READY_TO_DISPATCH → SHIPPED
SHIPPED           → OUT_FOR_DELIVERY
OUT_FOR_DELIVERY  → DELIVERED
DELIVERED         → RETURN_REQUESTED | REFUND_PENDING
RETURN_REQUESTED  → RETURNED | DELIVERED | REFUND_PENDING
RETURNED          → REFUND_PENDING | REFUNDED
REFUND_PENDING    → REFUNDED
REFUNDED          → (terminal)
CANCELLED         → (terminal)
PLACED (legacy)   → PAYMENT_CONFIRMED | ORDER_CONFIRMED | CONFIRMED | CANCELLED
```
Cancellable by customer: `PENDING_PAYMENT … PICKING`. Admin adds `PACKED`, `READY_TO_DISPATCH`. Returnable: `DELIVERED` only.

## 29. `order_item`
`line_id` **PK** · `order_id` FK · `product_id` · `product_slug` · `name` · `image` · `color` · `size` · `quantity` · `price` · `original_price` · `line_total`.
**All product fields are snapshots.** A later product rename or price change must not alter historical orders.

## 30. `order_status_history`
`(order_id, seq)` PK · `status` · `at` · `actor_id` · `actor_name` · `note`. Append-only.

## 31. `order_timeline`
`id` PK · `order_id` FK · `type` **ENUM (17 `ORDER_ACTIVITY_TYPES`)** `ORDER_CREATED, PAYMENT_CONFIRMED, ORDER_CONFIRMED, ORDER_ALLOCATED, ORDER_PICK_STARTED, ORDER_ITEM_PICKED, ORDER_PACKED, ORDER_READY_TO_DISPATCH, ORDER_DISPATCHED, ORDER_OUT_FOR_DELIVERY, ORDER_DELIVERED, ORDER_CANCELLED, RETURN_REQUESTED, REFUND_REQUESTED, REFUND_PROCESSED, NOTE_ADDED, FULFILLMENT_ASSIGNED` · `status` · `at` · `actor_name` · `note`.

## 32. `order_return` / `order_return_item`
`return`: `id` PK · `order_id` FK · `status` **ENUM (10)** `RETURN_REQUESTED, UNDER_REVIEW, APPROVED, PICKUP_SCHEDULED, RECEIVED, ITEM_RECEIVED, INSPECTED, REFUND_INITIATED, REFUNDED, REJECTED` · `reason` · `rejection_reason` · `pickup_method` · `pickup_scheduled_at` · `package_condition` · `inspection_condition` · `inspection_note` · `timeline` JSONB[] · actor/timestamps.
`return_item`: `(return_id, line_id)` PK · `quantity` · `reason` · `condition`.
Guards: `canReviewReturn`, `canApproveReturn`, `canRejectReturn`, `canSchedulePickup`, `canReceiveReturn`, `canInspectReturn`, `canInitiateRefund`, `canCompleteRefund`.

## 33. `refund`
`id` PK · `order_id` FK · `return_id` FK ✖ · `amount` · `status` **ENUM `NOT_REQUESTED, REQUESTED, APPROVED, PROCESSING, REFUNDED, FAILED`** · `method` (settings default "Original payment method") · `initiated_by/at` · `completed_by/at` · `note`.

## 34. `fulfillment` / `shipment`
`fulfillment`: `id` PK · `order_id` FK · `status` **ENUM `PENDING, ALLOCATED, PICKING, PACKED, READY_TO_DISPATCH, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED`** (9, with `stage` 0–8) · `location_id` ✖ · `assigned_employee_id` ✖ · `picked_items` JSONB[] · timestamps.
`shipment`: nullable until dispatch — `id` · `order_id` · `carrier` (from `MOCK_CARRIERS`, 9) · `tracking_id` · `dispatched_at` · `delivered_at` · `origin`.
Note `order.status`, `fulfillment.status` and `shipment` overlap by design; keep them consistent in one transaction.

## 35. `payment`
**Does not exist as an entity today** — payment lives on the order (`payment_method`, `payment_status`) plus a transient mock session.
Minimum viable shape when a real gateway lands (`BACKEND DECISION REQUIRED` in full): `id` PK · `order_id` FK · `provider` · `provider_payment_id` · `method` · `amount` · `currency` · `status` (`PAYMENT_STATUS` from `paymentService`) · `idempotency_key` **UNIQUE** · `raw_payload` JSONB · timestamps.

---

## 36. `activity` — the one shared audit diary

`id` PK · `at` TIMESTAMPTZ · `actor_employee_id` ✖ · `actor_name` (default `'System'`) · `target_employee_id` ✖ · `target_product_id` ✖ · `target_offer_id` ✖ · `target_category_id` ✖ · `target_collection_id` ✖ · `action` (**~96 `ACTIVITY_ACTIONS`**) · `summary` TEXT.

**Never create a second log.** Every module — employees, media, products, inventory, returns, offers, analytics, workforce, AI, taxonomy — writes here. Client keeps 200; server retention/pagination is `BACKEND DECISION REQUIRED`.
Indexes: `at DESC`, `actor_employee_id`, `target_product_id`, `action`.

---

## 37. `attendance`
`attendance_id` PK (`att-<employeeId>-<date>`) · `employee_id` FK · `employee_name_snapshot` · `date` DATE · `check_in` · `check_out` · `status` **ENUM** (incl. `NOT_CHECKED_IN`, from `ATTENDANCE_STATUS`) · `work_minutes` · `late_minutes` · `early_leave_minutes` · `location_id` ✖ · `notes` · `seeded` BOOLEAN · timestamps.
**UNIQUE `(employee_id, date)`.** Rules from settings `attendance`.

## 38. `attendance_correction`
`id` PK · `attendance_id` FK · `at` · `actor_id` · `actor_name` · `reason` · `previous` JSONB · `next` JSONB. Append-only.

## 39. `leave_request`
`leave_id` PK · `employee_id` FK · `employee_name_snapshot` · `leave_type` **ENUM `LEAVE_TYPE`** (incl. `OTHER`) · `start_date` · `end_date` (auto-ordered) · `days` (inclusive count) · `reason` · `status` **ENUM `LEAVE_STATUS`** (default `PENDING`) · `requested_at` · `reviewed_at` · `reviewed_by` · `review_note` · `seeded`.
Rule: overlap detection per employee; approval writes through to attendance.

## 40. `performance_review` (+ `performance_target`, `performance_achievement`)
`performance_id` PK (`perf-<employeeId>-<period>`) · `employee_id` FK · `employee_name_snapshot` · `period` (`YYYY-MM`) · `period_type` (default `MONTHLY`) · `department` · `role` · `review` JSONB · `score` ✖ · `score_breakdown` JSONB ✖ · `status` **ENUM `PERFORMANCE_STATUS`** (default `NOT_STARTED`) · timestamps.
**UNIQUE `(employee_id, period)`.** Targets and achievements are arrays today — **normalisable**.

---

## 41. `setting`
`section` **PK** · `value` JSONB · `updated_by` · `updated_at`.
19 sections with the exact defaults in `SETTINGS_DEFAULTS` (`src/services/settingsRepository.js`): `business, store, locations, hours, attendance, holidays, tax, shipping, payments, orders, returns, inventory, employees, notifications, customer, offers, media`.
Reads deep-merge against defaults — a missing key must fall back, never break.

## 42. `recently_viewed`
`(customer_id, product_id)` PK · `viewed_at`. Capped at `RECENTLY_VIEWED_LIMIT`; guest history merges on sign-in.

## 43. `ai_mirror_history`
`id` PK · `customer_id` FK · `product_id` FK · `media_id` ✖ · `created_at`. Capped at `AI_MIRROR_HISTORY_LIMIT` per customer.

---

## 44. `review` — NOT DEFINED / BACKEND DECISION REQUIRED

There is **no review entity, no review UI, no review write path** in the repository. Only two authored product fields exist: `product.rating` (number) and `product.review_count` (integer), rendered as `"From N considered reviews"` and used as a filter facet and a sort key.

If a Review entity is introduced, these are open and must be decided by the backend team (none is implied by the frontend): schema, moderation states, verified-purchase requirement, one-per-customer-per-product, rating aggregation and recomputation, review media, helpful votes, replies, pagination.
**Until then the backend must keep `rating` and `review_count` as product columns**, or the product detail page and the `rating` facet break.

## 45. `notification` — NOT DEFINED / BACKEND DECISION REQUIRED

No notification entity, inbox, bell, unread counter, delivery record or template exists. What exists:
- `setting.notifications` — channel preferences per event family, all `["IN_APP"]` except `marketing: []`.
- `customer.preferences` — 5 booleans.

Everything else (event catalogue, channels, templates, delivery/read receipts, digests, provider) is undefined. **Do not build a notification API speculatively — no frontend consumer exists.**

---

## 46. Deferred / not-yet-entities

These power employee screens but are **derived demo projections over orders and products** with no persisted record:
`support_case`, `customer_feedback`, `styling_request`, `styling_appointment`, `warehouse_task`, `follow_up`, `assisted_order` (an order created by an employee — no distinguishing column exists today).
Sources: `src/services/employees/operationsService.js`. Making any of them real is `BACKEND DECISION REQUIRED`; each would need its own schema, permissions and activity actions.

---

## 47. Entity census

**Required now: 43 tables**

Identity & access (8): `customer`, `address`, `employee`, `employee_credential`, `employee_permission`, `admin`, `role`, `permission`
Catalogue (9): `product`, `product_variant`, `product_price_history`, `product_history`, `product_review_flag`, `category`, `subcategory`, `collection`, `collection_product`
Media (3): `media`, `product_media_group`, `product_media_group_item`
Inventory (5): `inventory`, `inventory_location`, `inventory_movement`, `inventory_transfer`, `inventory_reservation`
Commerce (5): `offer`, `offer_redemption`, `cart`, `cart_item`, `wishlist_item`
Orders (9): `order`, `order_item`, `order_status_history`, `order_timeline`, `order_return`, `order_return_item`, `refund`, `fulfillment`, `shipment`
Operations (4): `activity`, `setting`, `recently_viewed`, `ai_mirror_history`
Workforce (4): `attendance`, `attendance_correction`, `leave_request`, `performance_review`

**Undefined (2):** `review`, `notification`.
**Deferred (7):** support/feedback/styling/appointment/warehouse-task/follow-up/assisted-order.
