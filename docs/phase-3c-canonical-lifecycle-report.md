# Phase 3C — Canonical Product Lifecycle Enforcement Report

> **Phase:** 3C — ONE PRODUCT LIFECYCLE · ONE AUTHORIZED COMMAND PATH
> **Date:** 2026-08-16
> **Branch:** `arena/01a009fd-pratikshya-fashon`
> **Base:** Phase 3B.2 (`docs/phase-3b2-test-fixture-isolation-report.md`) — 386 passing / 0 failing / 0 skipped
> **Scope:** removal of the remaining direct product-lifecycle write bypasses. No workflow redesign, no second workflow, no storefront UI change, no Kids rule change, no taxonomy change, no media data change, no backend.

---

## 0. Result

**PASS.**

| Measure | Before | After |
|---|---|---|
| Tests | 386 passing / 0 failing / 0 skipped | **410 passing / 0 failing / 0 skipped** |
| Dangerous lifecycle bypasses | 3 (`updateStatus`, `bulkUpdate`, `changeProductId`) | **0** |
| Golden data differences | 0 | **0** (byte-identical snapshot) |
| Production files changed | — | 3 |
| Build | pass | pass |

Changed files:

- `src/services/catalogRepository.js` — `updateStatus` / `bulkUpdate` converted to pure adapters; pure rename validator extracted
- `src/services/productWorkflow.js` — `changeProductId` moved onto the canonical ownership service
- `src/services/media/mediaOwnershipService.js` — added a read-only ownership preflight (no rule changes)
- `scripts/audit-canonical-lifecycle.mjs` — new audit
- `tests/canonicalLifecycle.test.js` — new regression suite (24 tests)
- `package.json` — one script line
- `docs/phase-3c-canonical-lifecycle-report.md` — this report

No UI file, product record, media record, Kids rule, taxonomy entry, validator rule, or golden fixture was modified.

---

## 1. Problem

Phases 2 and 3A/3B established the canonical command layer, made reads pure, and made migration explicit. Three lifecycle **write bypasses** survived, each able to move a product through its lifecycle without the canonical command's authorization, validation, transition and activity event.

### Bypass 1 — `catalogRepository.updateStatus()`

Only `PUBLISHED` and `ARCHIVED` were routed. Every other status fell through to a raw write:

```js
if (status === PUBLISHED) return _workflowCommand("publishProduct", …);
if (status === ARCHIVED)  return _workflowCommand("archiveProduct", …);
const product = writeProduct({ id, status }, actor);   // ← BYPASS
return { ok: true, product };
```

That branch could set `PENDING_REVIEW` (submission without the submit command), set `DRAFT` (an un-publish/return without reason, authorization or activity event), or write an arbitrary unrecognised string into `status` — with **no principal check at all**, so an anonymous or customer actor reached it.

### Bypass 2 — `catalogRepository.bulkUpdate()`

Only `status: "PUBLISHED"` was special-cased. Every other lifecycle status took the merchandising path:

```js
if (patch.status === PUBLISHED) { …canonical publishProduct… ; return; }
writeProduct({ ...patch, id: product.id }, actor, { activity: null });  // ← BYPASS
```

So `bulkUpdate(ids, { status: "ARCHIVED" })` — which the Admin Products bulk **Archive** button actually calls — archived every selected product with no authorization, no validation and no per-product lifecycle event. The same path would accept `PENDING_REVIEW` or `DRAFT`.

### Bypass 3 — `productWorkflow.changeProductId()`

The rename synchronised media by calling the low-level repository directly:

```js
mediaRepository.assignToProduct(media.id, result.product.id, null, { confirmReassign: true });
```

`confirmReassign: true` disables the repository's own single-owner guard, and the canonical ownership service was skipped entirely — so the confirmed Kids plate lock, marketing-scope isolation, contested-ownership confirmation, previous-owner cleanup and the ownership activity event were all absent. The product ID was also written **before** media was checked, so a refusal mid-way left media stranded on a Product ID that no longer existed.

---

## 2. Before

```
UI (bulk Archive)
 └─ catalogRepository.bulkUpdate({ status: "ARCHIVED" })
      └─ writeProduct({ status })            ← no authz, no validation, no event

Legacy caller
 └─ catalogRepository.updateStatus(id, "PENDING_REVIEW" | "DRAFT" | anything)
      └─ writeProduct({ status })            ← no authz, no validation, no event

Admin rename
 └─ productWorkflow.changeProductId()
      ├─ catalogRepository.changeProductId()  ← persists FIRST
      └─ mediaRepository.assignToProduct(confirmReassign: true)
                                              ← skips the ownership service
```

---

## 3. After

```
                         UI
                          │
                          ▼
                 CANONICAL COMMAND
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
       AUTHORIZATION             VALIDATION
   (principal register)   (universal + category)
              │                       │
              └───────────┬───────────┘
                          ▼
                     TRANSITION
                          │
                          ▼
                    PERSISTENCE
                          │
                          ▼
                      ACTIVITY

Media ownership:
   WORKFLOW → mediaOwnershipService → ownership validation → media repository
```

Compatibility adapters are now *naming* layers only:

```
catalogRepository.updateStatus(id, status)
        └─ LEGACY_STATUS_COMMANDS[status] → _workflowCommand(name)  → canonical command

catalogRepository.bulkUpdate(ids, { status: PUBLISHED })
        └─ _workflowCommand("bulkPublish") → canonical publishProduct per product

productWorkflow.changeProductId()
        └─ validate → ownership preflight → persist → ownership transfer → activity
```

---

## 4. `updateStatus`

**Retained as a compatibility adapter, with its workflow implementation removed.**

It was not deleted: it has legitimate legacy callers by contract, and Phase 3C's mandate is the smallest safe change. It now owns **zero** workflow rules — it only maps a requested status to the canonical command that already implements it:

```js
const LEGACY_STATUS_COMMANDS = {
  [PRODUCT_STATUS.PUBLISHED]:      "publishProduct",
  [PRODUCT_STATUS.ARCHIVED]:       "archiveProduct",
  [PRODUCT_STATUS.PENDING_REVIEW]: "submitProduct",
};
```

Consequences:

- the `writeProduct({ id, status })` branch is **gone** — there is no residual raw status write
- an unmappable or unknown status is **refused**, never written blindly
- `updateStatus("RETURNED")` and `updateStatus("APPROVED")` are refused: neither is a raw status, both require their canonical command
- authorization, validation, transition rules and the activity event are inherited from the command, so the adapter cannot reach a different outcome

**`DRAFT` is deliberately unmapped.** Reaching `DRAFT` is not one transition but three separately authorized commands — `restoreProduct` (from the archive), `unpublishProduct` (from the storefront) and `returnProduct` (with a mandatory reason). Mapping them to one silent status write is exactly the bypass being removed, so a legacy caller must now name the transition it means.

---

## 5. `bulkUpdate`

**Retained; every lifecycle status now runs canonical commands.**

1. The lifecycle key is **stripped** from the patch (`const { status: _lifecycleStatus, ...merchandising }`), so no lifecycle status can ride along in a merchandising write.
2. `status: "PUBLISHED"` delegates to the existing canonical **`bulkPublish`** command — no second bulk workflow was created. `bulkPublish` authorizes once and then runs the canonical `publishProduct` (lifecycle check + full fresh validation) per product.
3. Any other mappable lifecycle status (e.g. `ARCHIVED`, used by the Admin bulk Archive button) runs its canonical command per product.
4. An unmappable lifecycle status is refused for the whole batch rather than written.
5. Merchandising-only patches (featured / bestseller / new arrival) keep the ordinary writer — they are not lifecycle transitions.

**Bulk safety.** Each product is validated by its own command *before* anything about it is written, and a product whose command fails is left byte-identical and reported as a structured error. One invalid product therefore cannot cause another to transition, and no product is partially mutated before validation. Bulk publishing is intentionally not "optimised" by skipping validation.

---

## 6. `changeProductId`

Migrated to the canonical ownership service, in a safe order:

```
1. validate the new Product ID          catalogRepository.validateProductIdChange()   ← pure, no write
2. preflight EVERY owned asset          mediaOwnershipService.validateMediaOwnershipTransfer()
   └─ any refusal aborts before a single byte is written
3. persist the new Product ID           catalogRepository.changeProductId()
4. transfer each asset                  mediaOwnershipService.transferMediaOwnership()
5. activity event                       PRODUCT_RENAMED_ID
```

- `mediaRepository.assignToProduct` is **no longer called** from the workflow.
- The rename now inherits every ownership rule: confirmed Kids plate lock, marketing-scope isolation, contested-reassignment confirmation, previous-owner cleanup, ownership activity events, and admin-only authorization.
- **Product ID safety:** the transfer target is the renamed record itself, so old-ID media can never be silently attached to an unrelated product. If any asset refuses to follow, the rename is **rolled back** (ID restored, already-moved assets returned) rather than leaving media stranded on a Product ID that no longer exists.
- Preserved and asserted by test: media ownership, product identity, slug behaviour, workflow state, review flags, taxonomy, metadata.

A read-only preflight (`validateMediaOwnershipTransfer`) was added to the ownership service. It **reuses `validateOwnershipChange`** — the same rule set the transfer command runs — so there is one ownership rule set, not a second copy for preflight. No ownership rule was changed.

---

## 7. Kids

Kids remains fully inside the universal lifecycle; no separate Kids lifecycle exists or was created.

| Check | Result |
|---|---|
| `approveKidsProduct` → `workflowCommands.approveProduct` | delegates ✓ |
| `publishKidsProduct` → `workflowCommands.publishProduct` | delegates ✓ |
| `returnKidsProductToDraft` → `workflowCommands.returnProduct` | delegates ✓ |
| Kids lifecycle functions writing the register directly | none ✓ |
| Kids category validator invoked by the universal validator | via `CATEGORY_VALIDATORS` ✓ |
| KID-001 … KID-021 identities / plate mapping | unchanged ✓ |
| 21-plate lock, no silent merge, no cross-KID ownership, no foreign media | preserved ✓ |
| Kids render QA | **35/35 PASS** ✓ |

Verified at runtime, not just statically: `validateProductForPublish(KID-001)` returns `KIDS_INVENTORY_INVALID` and `KIDS_PRIMARY_MISSING` with `source: "KIDS"` — the Kids validator genuinely runs inside the universal publish validation, and the Kids adapters return the same outcome as the universal commands for the same input.

```
universal publish command → Kids category validator → Kids-specific validation → publish
```

---

## 8. Authorization

Unchanged policy — now enforced on every path that was previously bypassing it. Every lifecycle mutation resolves a real principal through `resolvePrincipal()`, which looks the actor up in the admin/employee register; caller-supplied labels like `"admin"` are never trusted.

| Principal | approve | publish | archive | assign | transfer ownership |
|---|:--:|:--:|:--:|:--:|:--:|
| ADMIN (SUPER_ADMIN + ACTIVE) | ✓ | ✓ | ✓ | ✓ | ✓ |
| EMPLOYEE | ✗ | ✗ | ✗ | ✗ | ✗ |
| CUSTOMER / ANONYMOUS | ✗ | ✗ | ✗ | ✗ | ✗ |

Employees keep their existing rights: editing assigned products and submitting them for review. Verified that unknown IDs (`PF-ADM-NOPE`, `PF-NOT-REAL`) are also refused, and that `updateStatus` / `bulkUpdate` now enforce the same boundary they previously skipped. **No authorization policy was changed** — the closed bypasses simply now reach the existing rules.

---

## 9. Direct Mutation Audit

**Dangerous lifecycle bypasses: 0**

`npm run audit:canonical-lifecycle` — 73 checks, 0 bypasses.

Classification of every ownership and lifecycle write site:

| Site | Classification |
|---|---|
| `catalogRepository.writeProduct` | **SAFE** — repository-internal single writer, not exported |
| `productWorkflowCommands.*` | **SAFE** — canonical command internals |
| `mediaRepository.assignToProduct` (in `mediaRepository.js`) | **SAFE** — canonical internal implementation |
| `mediaRepository.assignToProduct` (in `mediaOwnershipService.js`) | **SAFE** — canonical ownership service |
| `mediaRepository.assignToProduct` (in `catalogueReconciliation.js`) | **SAFE** — legacy migration writer; unreachable from production (explicit migration uses `mediaOwnershipService`) |
| `mediaRepository.assignToProduct` (in `useMediaActions.js`) | **SAFE** — media-library mapping, not a workflow lifecycle path |
| `persistCatalogueState` | **SAFE** — explicit migration + test fixtures only |
| UI direct workflow writes | **0** — none found |
| Service bypassing a canonical command | **0** — none remain |
| Status mutation without validation | **0** — none remain |
| Publish without approval | **0** — refused by command, adapter and bulk path |

`writeProduct(` appears in exactly one file (`catalogRepository.js`) and is not exported. No workflow or Kids service mutates media ownership directly.

---

## 10. Tests

```
Before:  386 passing / 0 failing / 0 skipped
After:   410 passing / 0 failing / 0 skipped   (386 existing + 24 new)
```

No test was weakened, deleted or skipped. `tests/canonicalLifecycle.test.js` covers all 20 required scenarios plus adapter-equivalence:

| # | Scenario | Test |
|---:|---|---|
| 1 | approve does not publish | ✓ |
| 2 | publish requires approval | ✓ |
| 3 | publish requires complete validation (revalidates after approval) | ✓ |
| 4 | `updateStatus` cannot bypass validation | ✓ |
| 5 | `updateStatus` cannot publish an unapproved product | ✓ |
| 6 | `bulkUpdate` cannot publish an unapproved product | ✓ |
| 7 | bulk publish uses canonical validation; one invalid never publishes another | ✓ |
| 8 | RETURNED requires a valid transition (reason required, no raw mutation) | ✓ |
| 9 | archive uses the canonical transition (non-destructive) | ✓ |
| 10 | unauthorized user cannot publish | ✓ |
| 11 | employee cannot approve / publish / archive / assign | ✓ |
| 12 | authorized admin can publish | ✓ |
| 13 | `changeProductId` preserves media ownership | ✓ |
| 14 | `changeProductId` uses the canonical ownership service | ✓ |
| 15 | Kids product uses the universal lifecycle | ✓ |
| 16 | Kids-specific validator still runs | ✓ |
| 17 | confirmed Kids plate cannot be transferred | ✓ |
| 18 | no direct lifecycle write from the UI | ✓ |
| 19 | canonical command records the correct workflow state (+ one event) | ✓ |
| 20 | storefront visibility changes only after a successful publish | ✓ |
| 22 | legacy adapters produce the same behaviour as the canonical command | ✓ (3 tests) |

**Adapter equivalence (§22)** is proved by construction, not by inspection: two identical scratch products are published — one through `commands.publishProduct`, one through `catalogRepository.updateStatus` — and the outcome, transition, canonical workflow state and persisted storefront flag are asserted equal. The same is done for `bulkUpdate` vs `bulkPublish`, and for the Kids adapters vs the universal commands.

---

## 11. Audits

| Command | Result |
|---|---|
| `npm run audit:canonical-lifecycle` | **PASS** — 73 checks, 0 bypasses |
| `npm run audit:workflow-foundation` | PASS |
| `npm run audit:read-only-workflow` | PASS — 6 checks, 0 failures |
| `npm run audit:explicit-migrations` | PASS — 7/7 |
| `npm run audit:media` | PASS |
| `npm run audit:media-products` | PASS |
| `npm run audit:product-media` | PASS |
| `npm run audit:catalog-completeness` | PASS |
| `npm run audit:storefront-coverage` | PASS |
| `npm run audit:product-repetition` | PASS |
| `npm run audit:rendered-product-media` | PASS |
| `npm run audit:storefront-images` | PASS |
| `npm run audit:explore` | PASS |
| `npm run audit:kids-products` | PASS |
| `npm run audit:media-product-discovery` | PASS |
| `npm run audit:hero-runtime` | PASS |
| `npm run audit:employee-management` | PASS |
| `npm run audit-product-performance` | PASS — 0 failures, 0 warnings |
| `npm run qa:render` (Kids render QA) | **PASS — 35/35** |
| `npm test` | **410 / 0 / 0** |
| `npm run build` | PASS — 2637 modules, built in 7.68s |
| `git diff --check` | PASS |

---

## 12. Golden Data

A full golden snapshot was captured **before** any change and re-captured **after**, using the same `scripts/lib/goldenData.js` lens as the baseline fixture. The two files are **byte-identical**, and both show **0 differences** against `tests/fixtures/workflow-golden-baseline.json`:

```
counts {"products":168,"media":205,"published":99,"storefront":99,"marketingMedia":10,"kidsProducts":21}
diffs 0 []
GOLDEN: IDENTICAL TO PRE-CHANGE SNAPSHOT
```

Covered and unchanged: product count, media count, published/draft/archived counts, product IDs, media IDs, ownership, primary media, hover media, gallery, taxonomy, workflow state, review flags, Kids identities, Kids media mapping, group decisions, storefront-visible product IDs.

`tests/fixtures/workflow-golden-baseline.json` was **not** modified. No product IDs were regenerated, no products renamed, no prices changed, no taxonomy changed, no media ownership changed. A leak check confirms zero scratch products and zero scratch media survive the new audit and test suite (168 products / 205 media after both run).

---

## 13. Performance

All Phase 2 optimizations preserved and verified by `audit-product-performance` (0 failures, 0 warnings): catalog indexes, media indexes, `productMediaSet` cache, workflow caches, React memoization, review pagination. `catalogRepository.read()` remains mutation-free.

Bulk publishing is intentionally not faster: each product is fully validated by its own canonical command. Bulk archiving is now slightly slower than the old raw write because each product is authorized and transitioned individually — this is the intended cost of removing the bypass, and it is measured at the same per-product cost as any single archive.

---

## 14. Stop Conditions

None triggered. Explicitly verified:

- product IDs unchanged · media IDs unchanged · media ownership unchanged
- Kids mappings unchanged · storefront product count unchanged (99)
- golden data unchanged · publish behaviour unchanged
- approval still does not publish · unauthorized users still cannot mutate workflow
- employees still cannot approve / publish / archive
- compatibility adapters produce **identical** behaviour to the canonical commands (asserted, not assumed)
- no test weakened, deleted or skipped · no read-side mutation reintroduced
- migration behaviour unchanged · no backend code required

---

## 15. Remaining Work — documented, NOT implemented

| Item | Notes for the later phase |
|---|---|
| **Activity consolidation** | Not performed in this phase, per scope. Findings recorded below. |
| **Admin/Kids UI consolidation** | `AdminKidsFinalizationPanel`, `AdminKidsReviewPanel` and `ProductDraftReviewPanel` still present three review surfaces over one lifecycle. |
| **Legacy validator removal** | `getPublishIssues` still exists alongside `validateProductForPublish`; remove once parity is proven. |
| **Compatibility adapter retirement** | `updateStatus`, `bulkUpdate`, `rejectProduct`, `submitForReview` and the Kids wrappers are now pure delegation and can be retired once callers are migrated. They were **not** deleted here: they still have live callers, so deletion is out of Phase 3C scope. |
| **Backend integration** | Every check in this phase is frontend/localStorage. A backend MUST re-verify the principal and re-run every validation. |

### Duplicate activity-event findings (for the activity-consolidation phase)

Recorded, not fixed:

1. **Rename emits two events.** `catalogRepository.changeProductId` writes `PRODUCT_RENAMED_ID` through `writeProduct`'s activity hook, and `productWorkflow.changeProductId` writes a second `PRODUCT_RENAMED_ID`. This duplication predates Phase 3C and was deliberately preserved as existing compatibility behaviour.
2. **Rename now also emits ownership events.** Routing through `mediaOwnershipService` correctly adds one `PRODUCT_MEDIA_TRANSFERRED` per moved asset. This is new but correct — it is the ownership audit trail that the old direct-repository path silently omitted.
3. **Bulk operations emit a batch event plus per-product events.** `bulkPublish` records one `PRODUCT_BULK_UPDATED` in addition to each `PRODUCT_PUBLISHED`. Intentional and unchanged.
4. **`bulkUpdate` no longer double-logs bulk publish.** The adapter now delegates to `bulkPublish` and adds no batch event of its own, so bulk publication produces exactly one `PRODUCT_BULK_UPDATED` instead of two.

No adapter introduced by Phase 3C creates an independent lifecycle event: each delegates and lets the canonical command own the event.

---

## 16. Final Architectural Rule — verified

```
                PRODUCT LIFECYCLE
                       │
                       ▼
              CANONICAL COMMAND
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        AUTHORIZATION        VALIDATION
             │                   │
             └─────────┬─────────┘
                       ▼
                 TRANSITION
                       │
                       ▼
                  PERSISTENCE
                       │
                       ▼
                  ACTIVITY
```

- **Media ownership:** `WORKFLOW → mediaOwnershipService → ownership validation → media repository`. Never a direct `mediaRepository` mutation from a workflow path.
- **Read:** `READ → READ ONLY → NO MUTATION` (Phase 3A preserved, re-audited).
- **Explicit migration:** `MIGRATION → DISCOVER → VALIDATE → APPLY → PERSIST → IDEMPOTENT` (Phase 3B preserved, re-audited 7/7).

*Report generated 2026-08-16. Phase 3C complete; no future-phase work started.*
