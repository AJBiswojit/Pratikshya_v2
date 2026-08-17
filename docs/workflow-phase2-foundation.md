# Workflow Phase 2 — Safe Product Workflow Foundation

> **Phase:** 2 — foundation (compatibility-first refactor)
> **Date:** 2026-08-16
> **Architecture plan:** `docs/workflow-refactor-plan.md` (Phase 1)
> **Change boundary:** no product/media/Kids/taxonomy/storefront data changed; no UI redesign; no legacy system deleted; no IDs regenerated.

---

## 1. What was implemented

The first part of the approved Product & Media Workflow Refactor Plan: a
**single canonical workflow foundation** layered on top of the existing
runtime, without rewriting the workflow or touching data.

- **A.** Canonical workflow projection — `src/services/workflow/productWorkflowState.js`
- **B.** Universal publish validator — `src/services/workflow/productPublishValidator.js`
- **C.** Kids category validator — `src/services/workflow/kidsValidator.js`
- **D.** Universal authorized lifecycle commands — `src/services/workflow/productWorkflowCommands.js`
- **E.** Media ownership command — `src/services/media/mediaOwnershipService.js`
- **F.** Regression tests + `audit:workflow-foundation` + golden-data baseline

Compatibility wrappers keep every existing caller working: `catalogRepository`,
`productWorkflow`, and `kidsProductFinalization` still export the same names,
but every publish/approve/return/archive path now delegates to the universal
commands.

## 2. Canonical lifecycle

One projection derives the canonical stage from the existing persisted fields
(`product.status`, `product.review.state`, `product.assignedEmployeeId`):

```
DRAFT → ASSIGNED → IN_EMPLOYEE_REVIEW → SUBMITTED → IN_ADMIN_REVIEW
      → APPROVED → PUBLISHED → ARCHIVED
```

`RETURNED` is a **presentation/result**, not a stage: a returned product maps
back to the editable operational stage (`DRAFT` or `IN_EMPLOYEE_REVIEW`) with
the rejection reason preserved.

Mapping precedence (see `getProductWorkflowState`):

| Persisted state | Canonical stage |
| --- | --- |
| `status = ARCHIVED` | `ARCHIVED` |
| `status = PUBLISHED` | `PUBLISHED` (grandfathered — never demoted) |
| `review.state = APPROVED` | `APPROVED` (approved, not published) |
| pending + `review.adminReviewStartedAt` | `IN_ADMIN_REVIEW` |
| pending + `review.state = PENDING` | `SUBMITTED` |
| pending (legacy, no state) | `SUBMITTED` |
| `review.state = REJECTED` | returned → `DRAFT` / `IN_EMPLOYEE_REVIEW` |
| `assignedEmployeeId` + employee edit marker | `IN_EMPLOYEE_REVIEW` |
| `assignedEmployeeId` | `ASSIGNED` |
| otherwise | `DRAFT` |

The projection never mutates records. Two optional **additive** markers may be
written by commands (they survive normalisation because they live on the
top-level `workflow` object, which the normaliser preserves):
`workflow.employeeReviewStartedAt`, `workflow.adminReviewStartedAt`,
`workflow.approvedAt`.

## 3. Universal validation

`validateProductForPublish(product, context)` returns:

```js
{
  ok: boolean,
  issues: [{ code, section, message, severity, blocksPublish, source }],
  blocking, warnings, stage, category
}
```

Coverage (data truth, not flag copies):

- **identity** — `IDENTITY_REQUIRED`, `IDENTITY_INVALID`
- **name** — `NAME_REQUIRED`, `NAME_PLACEHOLDER`
- **product** — `SKU_REQUIRED`, `DESCRIPTION_REQUIRED`
- **price** — `PRICE_MISSING`, `PRICING_ENGINE_ERROR` (from the shared pricing engine)
- **taxonomy** — `CATEGORY_REQUIRED`, `CATEGORY_INVALID`, `CATEGORY_INACTIVE`
  (warning: publish allowed, product stays hidden), `SUBCATEGORY_REQUIRED`
- **media** — `PRIMARY_MEDIA_REQUIRED`, `PRIMARY_MEDIA_INVALID` (video),
  `MEDIA_NOT_FOUND`, `MEDIA_MISSING_FILE`, `MEDIA_STATUS_INVALID`,
  `CROSS_PRODUCT_MEDIA`, `MEDIA_OWNERSHIP_CONFLICT`, `DUPLICATE_PRIMARY`,
  `MEDIA_MARKETING_ISOLATION`
- **grouping** — `GROUP_UNRESOLVED`
- **review flags** — `REVIEW_FLAG_BLOCKING` (see §flags below)
- **lifecycle** — `LIFECYCLE_REVIEW_REQUIRED` (when publish-mode)
- **category validators** — Kids and future categories appended to the same list

**Review flags → structured issues without duplicates.** A flag is only
reported when the data does not already prove the problem:

- `PRICE_REVIEW_REQUIRED` + invalid price → the price issue only
- `PRICE_REVIEW_REQUIRED` + valid price → the flag issue
- `NEEDS_MEDIA` + missing primary → `PRIMARY_MEDIA_REQUIRED` only
- `GROUP_REVIEW_REQUIRED` + open group → `GROUP_UNRESOLVED` only
- `MEDIA_OWNERSHIP_REVIEW` / `CONFLICT_UNRESOLVED` + live conflict → conflict only
- `VARIANT_REVIEW_REQUIRED` / `KIDS_MIGRATION_REVIEW` → always reported until cleared

## 4. Kids validator architecture

Kids is **not** a second workflow. `validateKidsProduct(product, context)` is a
category validator registered under `kidswear` and invoked automatically by the
universal validator. Rules preserved:

- KID-001 → `kids-001.webp` … KID-021 → `kids-021.webp` (immutable plate lock)
- no confirmed Kids plate merge (`KIDS_MERGE_REFUSED`)
- no wrong Kids primary (`KIDS_WRONG_PRIMARY`)
- no cross-product ownership (`KIDS_CROSS_PRODUCT_OWNERSHIP`)
- Kids category validation (`KIDS_CATEGORY_MISMATCH`)
- valid Kids subcategory (`KIDS_SUBCATEGORY_REQUIRED/INVALID`)
- name checks (`KIDS_NAME_FOREIGN`)
- inventory / made-to-order rules (`KIDS_INVENTORY_INVALID`)
- confirmed identity decision self-heals like the legacy path
  (`KIDS_IDENTITY_UNCONFIRMED` only on genuine persistence failure)

**The 21-plate lock applies only to the confirmed legacy identities.** Future
non-confirmed Kids products get the Kids category rules but no plate lock.

`approveKidsProduct` / `publishKidsProduct` remain as compatibility wrappers
that delegate to the universal `approveProduct` / `publishProduct` — the Kids
checks run automatically through the category registry.

## 5. Authorization model

Every command resolves the principal first (`resolvePrincipal`):

- **admin** — `adminId` must exist in the admin register with
  `role = SUPER_ADMIN` and `status = ACTIVE` (register lookup, never a label)
- **employee** — `employeeId` must exist in the employee register with a
  login-allowed status; permission/assignment checked per action
- **customer / anonymous** — denied for every mutation

| Action | Admin | Assigned employee (products.manage) |
| --- | --- | --- |
| create product | ✓ | ✓ |
| assign employees | ✓ | ✗ |
| save draft | ✓ | ✓ (assigned, editable stage, whitelist) |
| submit | ✓ | ✓ (assigned) |
| begin admin review | ✓ | ✗ |
| return (reason required) | ✓ | ✗ |
| approve (never publishes) | ✓ | ✗ |
| publish (requires approved) | ✓ | ✗ |
| archive / restore / unpublish | ✓ | ✗ |
| bulk publish | ✓ | ✗ |
| transfer media ownership | ✓ | ✗ |

Employee edits are restricted to the whitelist
(`workflow/employeeEditableFields.js`) and to editable stages — a submitted or
approved product is frozen until returned.

**SECURITY NOTE:** this is a frontend/localStorage demo. The command boundary
provides the interface a backend will reuse; a backend MUST re-authenticate the
principal and re-run every check when it is introduced.

## 6. Media ownership command

`src/services/media/mediaOwnershipService.js` is the one safe ownership door:

1. authenticate/authorize (admin only)
2. validate source/target products
3. apply the confirmed Kids plate lock
4. enforce marketing ↔ product scope isolation
5. require explicit confirmation for contested reassignment
6. update ownership (one owner per asset)
7. clean stale previous-owner authored references
8. record the transfer in the shared activity diary
9. revalidate both products (read-only report)

`productWorkflow.transferMediaOwnership` / `unassignProductMedia` are now thin
wrappers over the service. Lower-level `mediaRepository.assignToProduct` remains
only as a temporary internal compatibility method (explicitly permitted by the
plan; Phase 3 migrates the remaining direct callers).

**No ownership data was changed during this phase.**

## 7. Compatibility wrappers

| Old function | Now |
| --- | --- |
| `catalogRepository.approveProduct` | delegates to `commands.approveProduct` (no longer publishes) |
| `catalogRepository.publishProduct` | delegates to `commands.publishProduct` (requires approved) |
| `catalogRepository.submitForReview` / `rejectProduct` / `archiveProduct` / `restoreProduct` / `unpublishProduct` / `updateStatus` / `bulkUpdate` | delegate to the corresponding command |
| `productWorkflow.approveProduct` / `publishProduct` / `submitProductForReview` / `saveEmployeeDraft` / `assignProductToEmployee` / `archiveProduct` / `transferMediaOwnership` / `unassignProductMedia` | delegate to commands / ownership service |
| `approveKidsProduct` / `publishKidsProduct` / `returnKidsProductToDraft` | delegate to the universal commands (Kids validation auto-invoked) |

`getPublishIssues` (legacy string-array validator) and `getKidsPublishBlockers`
are intentionally unchanged — they remain the runtime-compatible view for the
existing desks; the universal validator is the new authoritative layer.

## 8. Direct publish paths removed/bypassed

- `catalogRepository.approveProduct` no longer publishes (approve ≠ publish).
- `catalogRepository.publishProduct`, `updateStatus(PUBLISHED)`, and the
  `bulkUpdate` PUBLISHED branch all route through `commands.publishProduct`,
  which requires the APPROVED stage and revalidates every time.
- Bulk publish runs the same command per product (`commands.bulkPublish`);
  unapproved products are skipped with their workflow errors — there is no
  second bulk publishing implementation.
- UI call sites (Admin Products quick/bulk publish, Admin Product Review
  approve, Admin Product Detail, Product Editor, Kids panels, Draft Review
  panel) all call the compatibility wrappers that delegate to the commands —
  no UI path can reach the storefront without the canonical lifecycle.
- The audit scans components for direct workflow state writes (`status =
  "PUBLISHED"`, raw `writeProduct`/`writeMedia`): **0 found**.

## 9. Read-side-effect findings

Phase 1 identified read-time mutations in `catalogRepository.read()`:

- `syncProductDraftRecords` — Kids draft migration (versioned, idempotent)
- `syncCatalogueReconciliation` — reconciliation drafts (versioned, idempotent)
- `syncCanonicalMediaAssignment` — canonical media pairing (assigns only
  unassigned media)

Phase 2 keeps these compatibility behaviors (removing them could break existing
browser registers) and adds:

1. **Explicit migration entry point** — `src/services/workflow/explicitMigrations.js`
   (`runExplicitMigrations()`) for deliberate migration mode.
2. **Read-idempotency tests** — repeated ordinary reads (`catalogRepository.all()`,
   `mediaRepository.getAll()`, storefront reads) change no workflow records.
3. Documentation that long-term READ = READ ONLY and MIGRATION = EXPLICIT
   COMMAND (Phase 3 wiring of the read adapter).

## 10. Tests

`tests/workflowFoundation.test.js` (31 tests) + updated legacy tests (342 → 373
total, all passing):

- **State projection** — every status × review × assignment × Kids combination
- **Lifecycle** — DRAFT → ASSIGNED → IN_EMPLOYEE_REVIEW → SUBMITTED →
  IN_ADMIN_REVIEW → APPROVED → PUBLISHED; RETURN (reason required, admin only);
  ARCHIVE; RESTORE
- **Invalid transitions** — DRAFT → PUBLISHED = FAIL; SUBMITTED → PUBLISHED =
  FAIL; APPROVED → employee edit = FAIL; EMPLOYEE → APPROVE/PUBLISH = FAIL;
  CUSTOMER → any mutation = FAIL
- **Publish** — approve ≠ publish; publish requires APPROVED + fresh
  validation (approve, break price, publish → refused)
- **Kids** — all 21 identities; KID-001 cannot use kids-002; KID-001 cannot
  merge; same approve/publish lifecycle; future non-confirmed Kids products do
  not inherit the 21-plate lock
- **Media** — one media = one owner; cross-product rejected; marketing cannot
  become product media; ownership transfer requires authorization +
  confirmation; duplicate primary rejected; video cannot become primary
- **Storefront** — DRAFT/SUBMITTED/APPROVED/ARCHIVED invisible; PUBLISHED
  visible; PUBLISHED + inactive category invisible
- **Golden data** — the pre-implementation snapshot is asserted unchanged
- **Read side effects** — ordinary reads do not mutate workflow records;
  explicit migration is idempotent

Legacy tests updated only where the new canonical lifecycle intentionally
changed behavior (direct publish no longer bypasses approval; ADMIN fixtures
use the resolvable `PF-ADM-00001` principal).

## 11. Audits

New `npm run audit:workflow-foundation` verifies: commands exist and are
registered; approve does not publish; publish requires approved; Kids uses the
universal commands; no direct publish bypass remains (static + behavioral);
ownership command is centralized; marketing media stays isolated; golden data
unchanged.

All pre-existing audits pass: media, product-media, media-product-discovery,
media-products, catalogue-completeness, storefront-coverage, storefront-images,
rendered-product-media, kids-products, explore, homepage, hero-runtime,
product-repetition, employee-management. `npm run qa:render` passes 35/35.
`git diff --check` passes.

## 12. Before / after behavior

| Concern | Before | After |
| --- | --- | --- |
| General approval | approves AND publishes | approves only (APPROVED stage) |
| Kids approval | separate wrapper | same universal command |
| Publish gate | content validation only | APPROVED stage + full fresh validation |
| Direct/quick/bulk publish | could bypass review | blocked without approval |
| Employee approval/publish | blocked by UI only | blocked at the command boundary |
| Media ownership | multiple doors | one authorized service + compat wrappers |
| Read side effects | migrations inside reads | kept for compatibility; explicit migration entry point + proof of idempotency |
| Storefront eligibility | unchanged | unchanged (published + active category) |

## 13. Remaining work for Phase 3

- Unify the Admin workspace and retire the old Kids panels/desks.
- Remove legacy flags/claims/adapters after measured parity.
- Remove compatibility routes and old workflow services.
- Route every remaining direct `mediaRepository.assignToProduct` caller
  through the ownership service.
- Make ordinary reads fully side-effect free (read adapter behind the explicit
  migration marker).
- Single-event activity policy for commands (currently a transition may record
  one generic "edited" diary entry plus the specific event).
- Backend integration (see below).

## 14. Backend integration requirements

When a backend is introduced:

- Re-authenticate the principal server-side; never trust client identity.
- Re-run `resolvePrincipal` against the server session, not the admin/employee
  localStorage registers.
- Execute each command transactionally with optimistic versioning
  (publish/ownership transitions must be atomic).
- Replace the shared activity diary with append-only, tamper-resistant audit
  events.
- Enforce file scanning, MIME/size/dimension checks, durable object storage and
  checksum uniqueness server-side.
- Public APIs return only PUBLISHED + active-category projections; drafts and
  internal issues must never leak.
