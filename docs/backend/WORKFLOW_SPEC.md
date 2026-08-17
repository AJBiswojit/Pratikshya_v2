# PRATIKSHYA FASHON — Product Workflow Specification

Sources: `src/services/productWorkflow.js`, `src/services/catalogRepository.js`, `src/services/kidsProductFinalization.js`, `src/services/productReviewFlags.js`, `src/services/media/productMediaGroups.js`, `src/services/employees/activityService.js`.

---

## 1. The pipeline

```
   MEDIA (register)
        │  createProductDraftFromMedia()  ·  assign ownership  ·  nextStableProductId()
        ▼
   PRODUCT DRAFT ─────────────► EMPLOYEE ASSIGNMENT ─────────► EMPLOYEE REVIEW
   status=DRAFT                 assignedEmployeeId set          employee edits (30 fields)
        ▲                                                            │
        │                                                            │ submitForReview()
        │ rejectProduct(reason)                                      ▼
        │                                                        SUBMITTED
        │                                                    status=PENDING_REVIEW
        │                                                    review.state=PENDING
        │                                                            │
        └──────────────── ADMIN REVIEW ◄─────────────────────────────┘
                              │
                approveProduct() ── blocked by getPublishIssues()
                              ▼
                          APPROVED  →  PUBLISHED         ARCHIVED
                     review.state=APPROVED   status=PUBLISHED   status=ARCHIVED
                                                  │                  ▲
                                    unpublish → DRAFT          archiveProduct()
                                                                     │
                                              restoreProduct() → DRAFT
```

---

## 2. States — persisted vs derived

**Persisted (`PRODUCT_STATUS`, 4):** `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `ARCHIVED`
**Persisted (`REVIEW_STATE`, 4):** `NONE`, `PENDING`, `APPROVED`, `REJECTED`
**Persisted marker:** `assignedEmployeeId` (nullable)

**Derived 6-stage view (`KIDS_STAGES`)** — exactly the vocabulary the brief asks for, computed by `kidsStageOf()`:

```js
kidsStageOf(product):
  status === PUBLISHED                 → PUBLISHED
  status === ARCHIVED                  → ARCHIVED
  review.state === APPROVED            → APPROVED
  status === PENDING_REVIEW            → SUBMITTED
  assignedEmployeeId                   → EMPLOYEE_REVIEW
  otherwise                            → DRAFT
```

| Requested stage | Persisted representation |
| --- | --- |
| `DRAFT` | `status = DRAFT`, no assignee |
| `EMPLOYEE_REVIEW` | `status = DRAFT` **+** `assignedEmployeeId != null` |
| `SUBMITTED` | `status = PENDING_REVIEW`, `review.state = PENDING` |
| `APPROVED` | `review.state = APPROVED` (transient — approval publishes immediately today) |
| `PUBLISHED` | `status = PUBLISHED` |
| `ARCHIVED` | `status = ARCHIVED` |

> `BACKEND DECISION REQUIRED` — persist 4 + derive 6 (recommended; zero frontend change, matches the repository) **or** persist all 6 (changes `PRODUCT_STATUS`, every status filter, and the visibility gate). This package documents the former.
>
> Second decision: **`approveProduct()` sets `PUBLISHED` in the same call.** `APPROVED` is therefore never a resting state. If the business wants "approved but scheduled", that is new behaviour — `BACKEND DECISION REQUIRED`.

**Customer visibility:** only `PUBLISHED`. See `BACKEND_HANDOFF_SPEC.md` §6 for all four gate clauses.

---

## 3. Transitions

| From | Action | To | Actor | Function | Activity |
| --- | --- | --- | --- | --- | --- |
| — | create draft | `DRAFT` | Admin / employee with `products.manage` | `createDraftProduct`, `createProductDraftFromMedia` | `PRODUCT_DRAFT_CREATED` |
| — | create product | `DRAFT` | Admin | `createProduct` | `PRODUCT_CREATED` |
| `DRAFT` | assign | `DRAFT` (+assignee) | Admin | `assignToEmployee` | `PRODUCT_ASSIGNED` |
| `DRAFT` | employee edits | `DRAFT` | Assigned employee | `saveEmployeeDraft` | `PRODUCT_EDITED` / `PRODUCT_UPDATED` |
| `DRAFT` | submit | `PENDING_REVIEW` | Assigned employee / admin | `submitForReview` | `PRODUCT_SUBMITTED_FOR_REVIEW` |
| `PENDING_REVIEW` | approve | `PUBLISHED` (+`review.state=APPROVED`) | Admin | `approveProduct` | `PRODUCT_APPROVED` |
| `PENDING_REVIEW` | reject | `DRAFT` (+`review.state=REJECTED`, reason) | Admin | `rejectProduct` | `PRODUCT_REJECTED` |
| `DRAFT` | publish directly | `PUBLISHED` | Admin | `publishProduct` | `PRODUCT_PUBLISHED` |
| `PUBLISHED` | unpublish | `DRAFT` | Admin | `unpublishProduct` | `PRODUCT_UNPUBLISHED` |
| any | archive | `ARCHIVED` | Admin | `archiveProduct` | `PRODUCT_ARCHIVED` |
| `ARCHIVED` | restore | `DRAFT` | Admin | `restoreProduct` | `PRODUCT_RESTORED` |
| any | change ID | unchanged | Admin | `changeProductId` | `PRODUCT_RENAMED_ID` |
| any | duplicate | new `DRAFT` | Admin | `duplicateProduct` | `PRODUCT_DUPLICATED` |

**Guarded transitions:** `approveProduct` and `publishProduct` both call `getPublishIssues()` first and return `{ ok: false, errors: [...] }` when it is non-empty. No other transition is blocked.

**Rejection semantics:** rejection returns the product to `DRAFT` (not to a distinct `REJECTED` status), stamps `review.state = REJECTED`, `reviewedBy`, `reviewedAt` and `rejectionReason`, and **keeps the assignee** so the same employee sees the returned item with its reason.

---

## 4. Actors and required fields per stage

### Stage 1 — MEDIA
**Actor:** `media.upload` / `media.assign`.
**Required:** a media record with a `groupKey`; ownership is decided consciously.
**Blockers:** contested ownership (`MEDIA_ALREADY_ASSIGNED`); an unresolved group decision.
**Rule:** two filename groups become one product only through a recorded `SAME_PRODUCT` decision.

### Stage 2 — PRODUCT DRAFT
**Actor:** `products.manage`.
**Required at creation:** a permanent Product ID (`nextStableProductId` / `preferredProductIdForMedia`) and a category.
**Effects:** `status = DRAFT`, `published = false`, invisible to customers; `PRODUCT_DRAFT_CREATED` logged.

### Stage 3 — EMPLOYEE ASSIGNMENT
**Actor:** Admin only.
**Required:** an employee who can sign in and holds `products.manage`.
**Effect:** `assignedEmployeeId` set (or `null` to unassign); `PRODUCT_ASSIGNED` logged.
**Ownership:** from this moment only that employee (or SUPER_ADMIN) may edit the product.

### Stage 4 — EMPLOYEE REVIEW
**Actor:** the assigned employee.
**Editable:** exactly the 30 `EMPLOYEE_EDITABLE_FIELDS`; everything else is dropped.
**Expected completion:** real name, category, subcategory, price, description, correct media, opening stock.
**Blockers:** not assigned · lacks `products.manage` · cannot sign in.

### Stage 5 — SUBMITTED
**Actor:** the assigned employee (or admin).
**Effect:** `status = PENDING_REVIEW`; `review = { state: PENDING, submittedBy, submittedAt, rejectionReason: "", reviewedBy: null, reviewedAt: null }`.
**Note:** submission itself is **not** blocked by publish issues — an incomplete product can be submitted, and the admin sees why it cannot yet publish. Deliberate: review is where problems surface.

### Stage 6 — ADMIN REVIEW
**Actor:** Admin.
**Decisions:** approve (⇒ publish) or reject (⇒ draft + reason).
**Blockers on approve:** the full `getPublishIssues()` list (§5).

### Stage 7 — APPROVED → PUBLISHED
**Effect:** `status = PUBLISHED`, `published = true`, `review.state = APPROVED`, `reviewedBy/At` stamped, `publishedBy/At` stamped.
**Customer impact:** immediately visible on every storefront surface, provided its category is `ACTIVE`.

### Stage 8 — ARCHIVED
**Actor:** Admin.
**Effect:** removed from every customer surface; retained for history, reporting and order references. **No delete path exists anywhere in the frontend.**

---

## 5. Publish blockers (`getPublishIssues()`)

| # | Condition | Message |
| --- | --- | --- |
| 1 | missing id | `Product ID is required.` |
| 2 | missing name | `Product name is required.` |
| 3 | placeholder name | `Product name must be real product information, not a placeholder.` |
| 4 | missing SKU | `SKU is required.` |
| 5 | missing category | `Category is required.` |
| 6 | price ≤ 0 | `Selling price must be greater than zero.` |
| 7 | no description | `A description is required.` |
| 8 | no cover image | `At least one cover image is required before publishing.` |
| 9 | media ownership conflicts | `Media ownership must be resolved before publishing (N conflicts).` |
| 10 | no owned primary | `A primary image owned by this product is required before publishing.` |
| 11 | blocking review flags | `Review flags must be resolved before publishing: <labels>.` |
| 12 | unresolved group conflicts | `Grouping review must be resolved before publishing (<groupIds>).` |
| 13 | pricing engine errors | see `PRODUCT_CATALOGUE_SPEC.md` §4 |

Blocking review flags (9): `NAME_REVIEW_REQUIRED`, `PRICE_REVIEW_REQUIRED`, `TAXONOMY_REVIEW_REQUIRED`, `GROUP_REVIEW_REQUIRED`, `VARIANT_REVIEW_REQUIRED`, `NEEDS_MEDIA`, `MEDIA_OWNERSHIP_REVIEW`, `CONFLICT_UNRESOLVED`, `KIDS_MIGRATION_REVIEW`.
Informational (3): `CONFLICT_REVIEW_LATER`, `MEDIA_OWNERSHIP_MOVED`, `MEDIA_UNASSIGNED`.

---

## 6. Ownership rules through the workflow

| Object | Owner | Rule |
| --- | --- | --- |
| Product record | the business | edits gated by assignment + permission |
| Product draft | `assignedEmployeeId` | only that employee may edit |
| Media | `media.productId` | exactly one owning product; transfer requires confirm |
| Group decision | the deciding human | recorded with actor and timestamp |
| Publication | Admin | employees can never publish |

---

## 7. The Kids workflow (documented separately, as required)

`src/services/kidsProductIdentity.js` + `src/services/kidsProductFinalization.js`. It runs **through the same architecture** — no second product database, no second permission model, no second activity log, no second status system — and adds identity and grouping rules.

### 7.1 Extra identity rules
- 21 confirmed identities: `kids-001.webp` → `KID-001` … `kids-021.webp` → `KID-021`.
- Every one is `SEPARATE_PRODUCT`. **Merges are refused.**
- `kidsMediaFileForProductId()` ↔ `kidsProductIdForFile()` is a strict bijection; `kidsGroupIdFor()` derives the group.
- `isConfirmedKidsProductId()` / `isKidsProductId()` gate the module.

### 7.2 Extra publish blockers (`getKidsPublishBlockers`, `canPublishKidsProduct`)
On top of the standard 13:
- the primary plate must be **this** product's expected file (`kidsMediaOwnershipIssues`, `kidsFileNameOf`);
- the name must not look foreign to kidswear (`kidsNameLooksForeign`);
- `category === "kidswear"`;
- the subcategory must be a valid kidswear subcategory (`kidsSubcategoryLooksForeign`);
- inventory must be valid (`kidsInventoryValid`);
- hover state must be consistent (`kidsHoverState`).

### 7.3 The 9-item admin checklist (`KIDS_CHECKLIST_ITEMS`)
`media` · `name` · `category` · `subcategory` · `price` · `employeeReviewed` · `adminReviewed` · `readyToPublish` · `published`
Each row reports `{ done, reason }`; `complete` requires all nine.

### 7.4 Stages
`KIDS_STAGES` / `KIDS_STAGE_LABELS` = Draft · Employee review · Submitted · Approved · Published · Archived — derived by `kidsStageOf()` (§2).

### 7.5 Operations
`getKidsFinalizationRows`, `getKidsFinalizationSummary`, `approveKidsProduct`, `publishKidsProduct`, `returnKidsProductToDraft`, `confirmKidsProductIdentities`, `ensureKidsIdentitiesConfirmed`, `kidsIdentityConfirmed`, `KIDS_ACTIVITY_ACTIONS`.
Conflict handling: `getKidsReconciliationRows`, `reconcileKidsConflict`, `KIDS_CONFLICT_ACTIONS` / `KIDS_CONFLICT_ACTION_LABELS`.

### 7.6 The rule that must not be relaxed
> **Nothing here publishes automatically. Ever.**
> Similar-looking photographs must never collapse into one product. 42 kidswear products exist because 42 distinct plates exist; different `groupKey` = different product unless a human says otherwise.

---

## 8. Activity logging

Every transition writes one entry to the **single shared diary** (`recordActivity`), never a second log:

`{ id, at, actorEmployeeId, actorName, targetProductId, action, summary }`

Product actions: `PRODUCT_CREATED`, `PRODUCT_DRAFT_CREATED`, `PRODUCT_EDITED`, `PRODUCT_UPDATED`, `PRODUCT_PRICE_CHANGED`, `PRODUCT_VARIANT_ADDED`, `PRODUCT_VARIANT_UPDATED`, `PRODUCT_ASSIGNED`, `PRODUCT_SUBMITTED`, `PRODUCT_SUBMITTED_FOR_REVIEW`, `PRODUCT_APPROVED`, `PRODUCT_REJECTED`, `PRODUCT_PUBLISHED`, `PRODUCT_UNPUBLISHED`, `PRODUCT_ARCHIVED`, `PRODUCT_RESTORED`, `PRODUCT_DUPLICATED`, `PRODUCT_BULK_UPDATED`, `PRODUCT_RENAMED_ID`, `PRODUCT_MEDIA_ASSIGNED`, `PRODUCT_MEDIA_UNASSIGNED`, `PRODUCT_MEDIA_TRANSFERRED`, `PRODUCT_GROUP_CREATED`, `PRODUCT_GROUP_UPDATED`, `PRODUCT_GROUP_MERGED`, `PRODUCT_GROUP_SPLIT`, `PRODUCT_GROUP_DECIDED`, `PRODUCT_VARIANT_REVIEW_REQUIRED`, `PRODUCT_CONFLICT_RESOLVED`, `PRODUCT_REVIEW_FLAGS_CLEARED`.

Plus the per-field audit on the product itself (`history[]`, ≤ 60) and `priceHistory[]` (≤ 24). Summaries are human sentences, e.g. `"Approved and published Sambalpuri Pato Silk Saree"`.

---

## 9. Metrics

`getWorkflowMetrics()` and `catalogMetrics()` back the dashboards: counts by status and review state, unassigned drafts, blocked products, media inbox size, unresolved groups. `getKidsFinalizationSummary()` adds the 21-product Kids progress.

---

## 10. Not defined — backend decisions required

| Item | Note |
| --- | --- |
| A resting `APPROVED` state / scheduled publishing | approval publishes immediately today |
| Whether an employee may approve their own submission | not prevented anywhere |
| SLA / due dates / escalation on review queues | absent |
| Bulk approve / bulk publish | `bulkUpdate()` exists but no bulk transition |
| Notifications on assign / submit / reject | no notification entity exists |
| Concurrent editing of the same draft | last write wins; no version column |
| Product deletion | no delete path — archive only |
| Versioning / rollback of a published product | only the field-level `history[]` |
| Whether `PENDING_REVIEW` should block employee edits | not blocked today |
