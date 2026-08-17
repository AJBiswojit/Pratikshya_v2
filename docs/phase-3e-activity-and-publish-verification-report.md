# Phase 3E — Activity Consolidation + Publish Visibility End-to-End Verification

**Date:** 2026-08-16
**Baseline:** Phase 3D complete (434 tests passing, unified Admin Product Review workspace, all audits green)
**Result:** REPRODUCED BUG → root cause identified → FIXED at the canonical layer → verified in a real browser, twice (dev server and production build). Plus: duplicate activity events fixed, two new test suites, two new audits.

---

## 1. Publish visibility investigation

### 1.1 Method

Before touching any code, the complete publish path was traced in the actual source
(never only in tests), then exercised at three levels:

1. **Service-level probes** (Node, real modules, scratch products) — every command,
   persistence read, cache counter and storefront query.
2. **Real browser end-to-end** — a headless Chromium driven against the running
   Vite dev server (`npm run dev`): real Admin login form, real product editor,
   real unified review workspace buttons, real storefront routes, real
   `localStorage`, real page reloads.
3. **Production build verification** — the same browser script against
   `npm run build` + `vite preview`.

### 1.2 The exact publish call graph (verified in source and at runtime)

```
Admin UI (ProductReviewDetail — "Publish" button)
  → productWorkflow.publishProduct (service boundary wrapper)
    → productWorkflowCommands.publishProduct        [CANONICAL COMMAND]
      → resolvePrincipal / requireAdmin              (register-backed authorization)
      → getProductWorkflowState                      (must be APPROVED)
      → validateProductForPublish(product, publish)  [FULL fresh revalidation:
          identity, name, SKU, price, taxonomy, media ownership,
          grouping, review flags, category plug-in (Kids)]
      → catalogRepository.updateProduct(id, { status: PUBLISHED })
        → writeProduct → save()
          → localStorage.setItem("pratikshya_products", JSON)   [PERSISTENCE]
          → productVersion += 1                                  [VERSION COUNTER]
          → readCache / normalizedCache invalidated
          → window.dispatchEvent(PRODUCTS_CHANGED_EVENT)         [REACT REFRESH]
      → recordActivity(PRODUCT_PUBLISHED)                        [ONE EVENT]

Storefront read path:
  productsRegisterRaw() (raw string fingerprint)
  → getLiveStorefrontProducts()   [memoised against the raw string —
                                   any save() writes a new string → rebuild]
  → queryCatalogue() (category / explore / search scope + PUBLISHED-only filter)
  → ProductCard / PDP
```

Cache invalidation is fingerprint-driven: `save()` writes a new register string;
`getLiveStorefrontProducts()` memoises against that exact string, so a publish
automatically invalidates the storefront list without a full rebuild of anything
else. React surfaces resubscribe through `useProducts` /
`PRODUCTS_CHANGED_EVENT` + the `storage` event (cross-tab).

---

## 2. Was the previously reported bug reproduced?

**YES — REPRODUCED**, with a precise, provable root cause. And it is exactly the
shape the report described ("fill everything, resolve all flags, click Publish,
publish appears to execute, nothing changes").

### The reproduction (real browser, before the fix)

1. Log in as Super Admin. Directly load `/admin/products` (full page load, e.g.
   after a browser refresh, a bookmark, or a first visit).
2. Click the row's **Publish** action (or open `/admin/products/:id` and use
   Publish/Unpublish there, or use the editor's publish action).
3. The command returns
   `"The workflow command layer is not loaded — publishProduct cannot run."`
   The product stays `PENDING_REVIEW`. Nothing appears on the storefront.

Captured verbatim from the pre-fix browser run:

```
registry on /admin/products full load: {"loaded": false}
registry on /admin/products/review:    {"loaded": true}
status after quick publish: PENDING_REVIEW
NOTICE: Could not publish "…": The workflow command layer is not loaded — publishProduct cannot run.
```

### Root cause

`catalogRepository`'s workflow adapters (`publishProduct`, `approveProduct`,
`archiveProduct`, `unpublishProduct`, …) late-bind to the universal command
service through `workflowCommandRegistry` (a deliberate Phase 2 design that
avoids an ESM circular-evaluation hazard). The command service registers itself
**when its module is imported** — but in the browser, only routes whose lazy
chunk happened to import `productWorkflow` (essentially the unified review
workspace, `/admin/products/review`) ever loaded it. Any admin surface that
called the repository adapters directly — `/admin/products` (list + bulk +
quick publish), `/admin/products/:id` (publish/unpublish/archive/restore/
approve/reject), the product editor, the employee products list — failed every
lifecycle action on a fresh page load of that route.

Why it looked intermittent: if the admin had visited the review workspace first
in the same SPA session, the chunk was loaded, the registry was populated, and
everything worked. After a refresh directly onto another admin route, it broke.
This matches "observed before, sometimes" perfectly.

Why no test caught it: every Node test imports `productWorkflowCommands`
directly, so the registry is always loaded in the test process. Only a real
browser with real route-level code splitting exhibits the failure.

### The fix (minimum, canonical layer)

One import added to the application entry, `src/main.jsx`:

```js
import "./services/workflow/productWorkflowCommands";
```

Placed after the App import so `catalogRepository` and the taxonomy data
modules are already evaluated (the exact hazard the registry was built to
avoid). The production bundle is a single file (`vite-plugin-singlefile`), so
this costs nothing. No duplicate catalogue state, no fake refresh, no
`window.location.reload()`, no second publish path — the canonical layer is
simply guaranteed to be registered on **every** route.

A static regression guard now lives in `tests/publishVisibility.test.js` and
`scripts/audit-publish-visibility.mjs`: `src/main.jsx` **must** import the
command service.

> Note: the Publish button inside the **unified review workspace** itself was
> NOT broken after Phase 3D (that route imports the workflow service). The
> broken surfaces were every *other* admin lifecycle control. Since the
> original report predates Phase 3D and named the general publish flow, this
> is treated as the reported bug: REPRODUCED and FIXED, not "could not
> reproduce".

---

## 3. Browser end-to-end verification (after the fix)

Executed against the dev server **and** against the production build
(`vite preview`). 23/23 checks in both runs:

```
# 1  PASS admin login lands in the portal
# 2  PASS editor saved a draft and navigated to its edit route
     PASS draft persisted to localStorage register — status=DRAFT
     PASS draft starts non-published
# 3  PASS DRAFT not on /explore
# 4  PASS submitted — confirmation notice appears
     PASS APPROVED persisted as PENDING_REVIEW + review.state=APPROVED
     PASS approval did NOT publish
     PASS APPROVED not on /explore (storefront invisible until publish)
# 5  PASS repository row persisted status=PUBLISHED
     PASS publishedAt recorded
     PASS Admin review UI shows the product as live
# 6  PASS published product on /explore (via Explore search)
     PASS published product on /category/sarees (real Load More pagination)
     PASS published product in /search results
     PASS PDP resolves the published product
# 7  PASS PDP still shows the product after refresh
     PASS localStorage still PUBLISHED after refresh
     PASS navigate away and return — still visible
     PASS fresh tab cold load shows the product
# 8  PASS PDP renders imagery
# 9  PASS scratch product retired (ARCHIVED)   [unpublish → archive, canonical]
     PASS archived scratch no longer visible on the storefront
     register back to 99 published
```

The scratch product was created through the real editor UI, published through
the real Publish button, and fully retired afterwards. No real catalogue
product was modified.

### 3.1 Both failure classes ruled out

- *"Persisted but stale UI"*: after the fix, publish → storefront lists update
  in the same session (fingerprint invalidation + `PRODUCTS_CHANGED_EVENT`),
  and checks #6 pass without any reload.
- *"UI updates but refresh loses it"*: checks #7 prove a hard reload, a
  navigate-away-and-return and a fresh tab all still show the product; the raw
  `localStorage` string alone carries `status=PUBLISHED`.

---

## 4. Persistence verification

- Storage key: `pratikshya_products` (one register).
- Writer: `catalogRepository.writeProduct → save()` — the ONLY persistence path;
  every canonical command funnels through it.
- Serialization: plain JSON; `healRead` restores/heals on parse.
- Version update: `productVersion` counter + raw-string fingerprint.
- Subsequent read: `read()` (string-keyed parse cache) → `getNormalizedSnapshot()`
  (id/slug indexes) → `catalogRepository.find/all`.
- A cold re-parse of the raw string (the browser-refresh equivalent) shows
  `PUBLISHED` — verified in the browser, in `tests/publishVisibility.test.js`
  (test 10) and in the audit (§6).

## 5. Cache invalidation verification

Publish advances `getCatalogVersion()`, changes `getCatalogFingerprint()`, and
rebuilds the memoised `getLiveStorefrontProducts()` list (referential
inequality asserted). No full catalogue rebuild happens on unrelated reads —
the memoisation stays keyed to the raw register string exactly as the Phase 2
performance work designed. Verified in test 11 and audit §4.

## 6. Approve ≠ Publish

Verified at all three levels: approval records `review.state=APPROVED`, the
canonical projection reports stage APPROVED, `status` stays `PENDING_REVIEW`,
and the product is invisible on every storefront surface until the explicit
publish command. Publish re-runs the full validation and never reuses the
approval result (test 13 proves a re-flagged approved product is refused).

## 7. Review flag verification

For each of `NAME_REVIEW_REQUIRED`, `PRICE_REVIEW_REQUIRED`,
`TAXONOMY_REVIEW_REQUIRED`, `GROUP_REVIEW_REQUIRED`
(`tests/publishVisibility.test.js`, test group 12):

1. flag present → validator emits a blocking issue,
2. approval AND publish are refused (the lifecycle stops at the first
   validation gate),
3. the admin resolves the flag through the existing canonical surfaces
   (`flagsSatisfiedByProduct` + `clearReviewFlags` — the same functions
   `ProductDraftReviewPanel` calls),
4. the validator returns no blocking issue for the section,
5. approve then publish succeed,
6. the storefront reflects the product.

No validation was weakened.

## 8. Kids publish verification

`approveKidsProduct` / `publishKidsProduct` remain compatibility wrappers over
the universal commands; a scratch Kids product (KID-871, outside the confirmed
21) travelled DRAFT → SUBMITTED → APPROVED → PUBLISHED → storefront →
kidswear category query, persisted, then was archived. KID-001…KID-021, their
media mapping and the 21-plate lock are untouched (test 16 asserts the kids
plate ownership map is byte-identical after a full publish cycle;
`audit:kids-products` passes unchanged).

## 9. Media after publish

Test 14 + audit §7: primary, gallery and register ownership are identical
before and after publication; zero ownership conflicts appear. The browser run
confirms the PDP renders its imagery. No media was reassigned in this phase.

---

## 10. Activity event inventory (Part N)

Producers found (source-wide search, `recordActivity`/`note`/`noteProduct`):

| Producer | Lifecycle events produced |
|---|---|
| `productWorkflowCommands` | SUBMITTED_FOR_REVIEW, APPROVED, REJECTED (return), PUBLISHED, UNPUBLISHED, ARCHIVED, RESTORED, BULK_UPDATED |
| `productWorkflow` | RENAMED_ID, GROUP_DECIDED, CONFLICT_RESOLVED, REVIEW_FLAGS_CLEARED, MEDIA_COVER_CHANGED, MEDIA_EDITED |
| `mediaOwnershipService` | MEDIA_TRANSFERRED, MEDIA_UNASSIGNED |
| `catalogRepository` (writer) | CREATED / DRAFT_CREATED / EDITED / UPDATED / ASSIGNED / DUPLICATED + field facts (PRICE_CHANGED, VARIANT_*) |
| `kidsProductFinalization` | reuses the same actions (KIDS_* is a vocabulary map, not a second log) |
| UI (pages/components) | **none** for product lifecycle (only settings/AI/session events) |

## 11. Duplicate events found (runtime-proven, pre-fix)

| Action | Events recorded (before) |
|---|---|
| rename (`changeProductId`) | **PRODUCT_RENAMED_ID × 2** (repository primitive + workflow command) |
| submit | PRODUCT_SUBMITTED_FOR_REVIEW **+ PRODUCT_EDITED** |
| approve | PRODUCT_APPROVED **+ PRODUCT_EDITED** |
| return | PRODUCT_REJECTED **+ PRODUCT_EDITED** |
| publish | PRODUCT_PUBLISHED **+ PRODUCT_EDITED** |
| unpublish | PRODUCT_UNPUBLISHED **+ PRODUCT_EDITED** |
| archive | PRODUCT_ARCHIVED **+ PRODUCT_EDITED** |
| restore | PRODUCT_RESTORED **+ PRODUCT_EDITED** |
| media transfer (with strip) | PRODUCT_MEDIA_TRANSFERRED **+ PRODUCT_EDITED** (on the stripped previous owner) |
| media unassign (with strip) | PRODUCT_MEDIA_UNASSIGNED **+ PRODUCT_EDITED** |
| assign / create / media assign | already clean (one event) |

## 12. Duplicate events fixed

Minimal canonical-layer change — the writer's default event is now suppressible:

- `catalogRepository.writeProduct` distinguishes `activity: null` (the calling
  canonical command owns and records the lifecycle event → no generic
  `PRODUCT_EDITED`) from `activity` omitted (default created/edited event,
  unchanged) and `activity: {…}` (explicit event, unchanged).
- `catalogRepository.updateProduct` forwards an options bag.
- The seven lifecycle commands in `productWorkflowCommands` pass
  `{ activity: null }` — each already records its own canonical event.
- `catalogRepository.changeProductId` no longer records `PRODUCT_RENAMED_ID`;
  the canonical workflow command (`productWorkflow.changeProductId`) is the
  single producer. (This also removes the spurious rename event the rollback
  path used to write.) The field-level `history` entry is untouched.
- `mediaOwnershipService`'s previous-owner strip writes pass
  `{ activity: null }` — the transfer/unassign event is the record of the ONE
  user action.

Field-level facts (`PRODUCT_PRICE_CHANGED`, variant events) still fire — they
describe the data, not the action, and existing tests depend on them.
`PRODUCT_UPDATED`/`PRODUCT_EDITED` still fire for genuine edit actions
(`updateDraft`, `updateProduct` called directly, editor saves).

**History preservation:** nothing rewrites or deletes old diary entries; the
fixes change only what NEW actions record. Verified by test and audit.

## 13. Tests before / after

| | Before | After |
|---|---|---|
| `npm test` | 434 pass / 0 fail / 0 skipped | **459 pass / 0 fail / 0 skipped** |
| New: `tests/publishVisibility.test.js` | — | 14 tests (parts 1–16 of the Part R matrix) |
| New: `tests/activityEvents.test.js` | — | 11 tests (rename/approve/return/publish/archive/assign/submit/transfer × one-event + history preservation) |

No existing test was modified, weakened or deleted.

## 14. Audit results (Part W)

| Audit | Result |
|---|---|
| `npm test` | 459/459 pass |
| `npm run build` | pass (single-file bundle) |
| `git diff --check` | clean |
| **`audit:publish-visibility`** (new) | PASS — 38/38 |
| **`audit:activity-events`** (new) | PASS — 29/29 |
| `audit:unified-review` | PASS |
| `audit:canonical-lifecycle` | PASS |
| `audit:workflow-foundation` | PASS |
| `audit:read-only-workflow` | PASS |
| `audit:explicit-migrations` | PASS |
| `audit:media` | PASS |
| `audit:media-products` | PASS |
| `audit:product-media` | PASS |
| `audit:catalog-completeness` | PASS |
| `audit:storefront-coverage` | PASS |
| `audit:product-repetition` | PASS |
| `audit:rendered-product-media` | PASS |
| `audit:storefront-images` | PASS |
| `audit:explore` | PASS (99 == 99) |
| `audit:kids-products` | PASS (21 confirmed) |
| `audit:media-product-discovery` | PASS |
| `audit:hero-runtime` | PASS (5/5) |
| `audit:employee-management` | PASS |
| `audit-product-performance` | PASS |
| `qa:render` (incl. Kids render QA) | PASS — 52/52 |
| Browser E2E (dev server) | PASS — 23/23 |
| Browser E2E (production build) | PASS — 23/23 |

## 15. Golden data comparison (Part U)

Captured with the shared `scripts/lib/goldenData.js` lens on the migrated state,
before and after all changes:

```
products: 168 · media: 205 · published: 99 · storefront: 99
marketingMedia: 10 · kidsProducts: 21
```

0 unexplained differences. No product IDs, media IDs, names, prices, taxonomy,
media ownership, Kids mappings or storefront catalogue changed. All scratch
fixtures (PVT-*, AET-*, PVA-*, AEA-*, KID-871, browser E2E scratch) were
archived/removed by their own test/audit/script runs.

## 16. Performance comparison (Part V)

- `audit-product-performance` passes unchanged.
- No new catalogue state, no extra rebuilds: publish still invalidates only the
  register string fingerprint (and the caches keyed to it), exactly as before.
- The `main.jsx` import adds no network cost (single-file bundle) and moves no
  work into render paths; it only guarantees a registration that the review
  route already performed.
- The activity fix *removes* one diary write per lifecycle action.

## 17. Changed files

| File | Change |
|---|---|
| `src/main.jsx` | **The publish-visibility fix** — registers the canonical workflow command layer for every route |
| `src/services/catalogRepository.js` | `writeProduct`/`updateProduct` accept `activity: null` (suppress default event); `changeProductId` primitive no longer logs the rename event |
| `src/services/workflow/productWorkflowCommands.js` | seven lifecycle persistence calls pass `{ activity: null }` |
| `src/services/media/mediaOwnershipService.js` | strip writes pass `{ activity: null }` |
| `package.json` | `audit:publish-visibility`, `audit:activity-events` scripts |
| `tests/publishVisibility.test.js` (new) | Part R tests 1–16 |
| `tests/activityEvents.test.js` (new) | Part R tests 17–24 |
| `scripts/audit-publish-visibility.mjs` (new) | Part S audit |
| `scripts/audit-activity-events.mjs` (new) | Part T audit |
| `docs/phase-3e-activity-and-publish-verification-report.md` (new) | this report |

## 18. Remaining known issues

- The 200-entry activity retention window means very old entries age out; this
  is retention, not deletion, and predates this phase.
- `bulkUpdate` merchandising writes (`isFeatured` etc. alongside a lifecycle
  status) intentionally pass `activity: null` (pre-existing) and are covered by
  the single `PRODUCT_BULK_UPDATED` event — unchanged.
- `duplicateProduct` records `PRODUCT_DUPLICATED` plus variant field facts for
  the copied variants; this reflects real data facts about the new record and
  was left as-is.
- Browser-level verification requires a Chromium; the repository's own audits
  cover the same invariants statically + at the service level, including the
  `main.jsx` registration guard, so CI without a browser still catches a
  regression of the root cause.

---

### Classification summary (as required)

- **REPRODUCED BUG:** publish (and every other lifecycle action) failed with
  "The workflow command layer is not loaded" on any admin route whose chunk
  did not import the workflow service — proven in a real browser, pre-fix.
- **FIXED BUG:** one-line canonical registration in `src/main.jsx`; verified
  end-to-end in a real browser against dev and production builds, 23/23.
- **FIXED BUG (Phase 3E scope):** duplicate lifecycle activity events
  (rename × 2, lifecycle + generic edit) — one action now records one event.
- **NOT REPRODUCED:** no case was found where a *successful* publish command
  left the storefront stale, or where a refresh lost a persisted publication —
  both failure classes were explicitly tested and ruled out.
