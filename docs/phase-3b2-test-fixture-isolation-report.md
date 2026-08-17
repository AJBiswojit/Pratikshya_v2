# Phase 3B.2 — Final Workflow Test Fixture Isolation Report

> Date: 2026-08-16  
> Scope: test fixtures, audit fixtures, scratch cleanup, migration-state selection, and cache isolation  
> Production source changes: **0**

## 1. Initial State

The required clean baseline was run before making changes:

```text
npm test
335 passing
44 failing
0 skipped
```

The fresh baseline did **not** match the Phase 3B.1 classification. None of the 44 failures was in `workflowFoundation.test.js`, and no initial failure was caused by an accumulated `FND-*` scratch record. The real baseline was:

- 43 tests required persisted **MIGRATED** state but started from the 99-product **BASE** state after read-side migration was removed.
- 1 performance test measured a cold derived-media cache while asserting the optimized cached-path budget.

## 2. Failure Classification

Legend: `✓` identifies the root-cause column; `—` means the category was investigated but was not causal for that failure.

| # | Test | Failure observed | Fixture | Cache | Migration | Scratch State | Other |
|---:|---|---|:---:|:---:|:---:|:---:|---|
| 1 | multi-view groups resolve one product with same-product hover, never several | Reconciliation draft existed only as a template; persisted product lookup returned null | ✓ | — | ✓ | — | — |
| 2 | the 21 confirmed Kids products are never re-migrated or regrouped | Expected 21 KID drafts, received 0 | ✓ | — | ✓ | — | — |
| 3 | safe names and review flags keep new drafts from publishing | Persisted reconciliation products were missing | ✓ | — | ✓ | — | — |
| 4 | the reconciliation sync is idempotent and additive | BASE had 99 rows; applying reconciliation produced 147 instead of being a no-op | ✓ | — | ✓ | — | — |
| 5 | Product Review assignment still accepts active legitimate employees | `KID-001` did not exist, so assignment returned false | ✓ | — | ✓ | — | — |
| 6 | Kids published products remain intact and KID drafts stay separate | `KID-001` identity was absent | ✓ | — | ✓ | — | — |
| 7 | KID-001 … KID-021 exist as separate product records | First KID lookup returned null | ✓ | — | ✓ | — | — |
| 8 | a confirmed Kids plate cannot be transferred to another KID product | Target KID product was absent; expected confirmed owner metadata was unavailable | ✓ | — | ✓ | — | — |
| 9 | each KID claims its own media; cross-product media is detected and reported | Finalization rows represented missing records | ✓ | — | ✓ | — | — |
| 10 | standalone Kids images have no hover replacement | Null KID product caused media-set access failure | ✓ | — | ✓ | — | — |
| 11 | Kids names are never carried over from another department | Finalization row product was null | ✓ | — | ✓ | — | — |
| 12 | every KID product carries the editable product information fields | `KID-001` was null | ✓ | — | ✓ | — | — |
| 13 | Kids products use the existing Kids Wear taxonomy, never a duplicate | Finalization row product was null | ✓ | — | ✓ | — | — |
| 14 | the admin checklist reports 9 explicit conditions for every product | Missing-record rows had 0 checklist items instead of 9 | ✓ | — | ✓ | — | — |
| 15 | no storefront surface can reach an unpublished Kids product | Missing KID product metadata caused a null name read | ✓ | — | ✓ | — | — |
| 16 | a real KID product walks the whole path: conflict → edit → approve → publish | `KID-002` was absent | ✓ | — | ✓ | — | — |
| 17 | the confirmed identity decision self-heals after the register is reset | Blocker check had no persisted KID record to heal against | ✓ | — | ✓ | — | — |
| 18 | kids reconciliation rows expose the full review state | Expected 21 rows, received 0 | ✓ | — | ✓ | — | — |
| 19 | hydrated metadata comes from the owning published product — never a guess | KID draft lookup returned null | ✓ | — | ✓ | — | — |
| 20 | kids workflow metrics match the reconciled reality | Expected 21 KID drafts, received 0 | ✓ | — | ✓ | — | — |
| 21 | every product-media group is connected to a catalogue record | Uncovered groups remained because reconciliation drafts were not persisted | ✓ | — | ✓ | — | — |
| 22 | the library holds 9 bangle groups, all with Product IDs | 8 of 9 groups resolved | ✓ | — | ✓ | — | — |
| 23 | the library holds 14 earring groups, all with Product IDs | 2 of 14 groups resolved | ✓ | — | ✓ | — | — |
| 24 | the library holds 19 innerwear groups, all with Product IDs | 3 of 19 groups resolved | ✓ | — | ✓ | — | — |
| 25 | front / side / back of one product is ONE product, never three | Multi-view group had no persisted Product ID | ✓ | — | ✓ | — | — |
| 26 | every earring file is its own product — similar images are never merged | Only 3 distinct values were seen because draft IDs were absent | ✓ | — | ✓ | — | — |
| 27 | the filename-derived report explains every group's identity and action | Expected existing Product ID was absent | ✓ | — | ✓ | — | — |
| 28 | discovery never renumbers an established Product ID | Resolved Product ID was not in the BASE catalogue | ✓ | — | ✓ | — | — |
| 29 | getProductMediaSet for all products is fast (<20ms) | Cold cache construction took 32.82 ms | ✓ | ✓ | — | — | Cold-cache timing |
| 30 | the 21 kids media assets become 21 DRAFT product records | Expected 21 KID drafts, received 0 | ✓ | — | ✓ | — | — |
| 31 | each kids draft has a stable Product ID matching its media | `KID-001` draft missing | ✓ | — | ✓ | — | — |
| 32 | Product ID never changes when the editable name changes | Update failed because `KID-001` was missing | ✓ | — | ✓ | — | — |
| 33 | the kids draft migration is idempotent and additive | BASE had 99 rows; applying Kids migration produced 120 | ✓ | — | ✓ | — | — |
| 34 | no kids media asset is claimed by two drafts | Expected 21 claims, received 0 | ✓ | — | ✓ | — | — |
| 35 | the media inbox includes kids drafts' claims and identifies owners | No persisted KID claim appeared in the inbox | ✓ | — | ✓ | — | — |
| 36 | admin can assign a draft to an employee, who alone may edit it | Assignment failed because the KID draft was absent | ✓ | — | ✓ | — | — |
| 37 | an employee cannot edit protected fields through the workflow | Setup assignment failed because the KID draft was absent | ✓ | — | ✓ | — | — |
| 38 | incomplete drafts cannot publish — clear validation errors | Missing KID draft could not expose the expected ownership blocker | ✓ | — | ✓ | — | — |
| 39 | workflow metrics are internally consistent | Expected 21 KID drafts, received 0 | ✓ | — | ✓ | — | — |
| 40 | published bangles render their own canonical library photograph | BASE returned `house-bridal-bangles.jpg` | ✓ | — | ✓ | — | — |
| 41 | published innerwear and jewellery earrings render canonical media | BASE returned an authored fallback image | ✓ | — | ✓ | — | — |
| 42 | canonical media never coexists with an authored house plate in gallery/hover | Canonical ownership assignment had not run | ✓ | — | ✓ | — | — |
| 43 | a reconciled draft is DRAFT and invisible until published | Persisted draft lookup returned null | ✓ | — | ✓ | — | — |
| 44 | a filled + published reconciled product flows the whole storefront pipeline | Update/publish validation returned “Product not found” | ✓ | — | ✓ | — | — |

### Root-cause totals

| Root cause | Failures |
|---|---:|
| Test expected MIGRATED state but did not explicitly establish it | 43 |
| Performance test timed cold cache construction instead of the optimized cache path named by the test | 1 |
| Scratch product/media leak directly causing an initial failure | 0 |
| Production business defect | 0 |

During isolation, a separate order dependency was exposed: the Kids lifecycle activity test assumed an earlier test had recorded the confirmed identity decision. The test now calls `confirmKidsProductIdentities(ADMIN)` itself before asserting that event.

## 3. Fixes

### Shared fixture helper

Added `tests/helpers/workflowTestState.js` with two explicit states:

- `setupBaseState()`
- `setupMigratedState()`

The helper restores products, seeded media, activity, group decisions, migration markers, and dependent cache versions. Tests no longer rely on a previous test or an ordinary read to prepare workflow data.

### Test hooks

Migration-dependent suites now use a fresh migrated fixture in `beforeEach` and restore BASE in `afterEach`. This includes catalogue reconciliation, employee assignment, Explore, Kids reconciliation/finalization, product workflow, storefront image reconciliation, storefront visibility, product performance, and workflow foundation tests.

`mediaProductDiscovery.test.js` explicitly establishes one immutable migrated report snapshot before constructing its module-level discovery constants and restores BASE after the file.

`readOnlyWorkflow.test.js` explicitly starts from BASE, proving read purity without benefiting from prior migration.

### Workflow foundation cleanup

Removed the incomplete Phase 3B.1 hooks, including two hook registrations accidentally embedded inside the final test body. Replaced them with one real `beforeEach(setupMigratedState)` / `afterEach(setupBaseState)` pair.

Fixture ownership setup now uses `mediaOwnershipService.assignMediaToProduct`. Direct low-level repository calls remain only where a test intentionally exercises the repository boundary or constructs an invalid ownership condition for a validator.

### Audit fixtures

Migration-dependent audit scripts now explicitly initialize MIGRATED state. The read-only and explicit-migration audits were corrected to inspect the actual `read()` body and persisted behavior instead of treating imports, comments, or mutation-command definitions elsewhere in a file as read-side mutations.

Added the existing `scripts/audit-product-performance.mjs` to package scripts as `audit-product-performance` so the required command is runnable.

## 4. BASE vs MIGRATED

### BASE

```text
original authored product register (99 products)
+ seeded media register
+ seeded activity register
+ empty product-group decision register
+ cleared migration markers
```

BASE has no automatic reconciliation and no implicit migration. `KID-001`…`KID-021` draft records are not present until explicit migration.

### MIGRATED

```text
setupBaseState()
  ↓
runExplicitMigrations()
  ↓
168 persisted products
13 canonical media assignments
21 KID draft records
```

Every call to `setupMigratedState()` starts from BASE first. A previous migration therefore cannot contaminate a later BASE test, and scratch records can never be incorporated into a later migration run.

## 5. Cache Isolation

Fixture reset preserves production caching and invalidates it only at the test boundary:

- Replacing the persisted product register changes `productsRegisterRaw()`, invalidating repository normalization and live-storefront fingerprint caches.
- `mediaRepository.resetMedia()` clears repository indexes.
- A temporary create/remove cache-buster advances the media version while leaving no record behind. This invalidates `productMediaSet`, workflow inbox, Kids reconciliation/finalization, and metrics caches that key off media version.
- `resetGroups()` clears group state used by workflow and validation caches.
- Activity is restored from its captured baseline.

The cache regression test populates migrated catalogue/media caches, restores BASE, and proves that neither the KID catalogue record nor canonical bangle media remains visible.

The performance test now warms `getProductMediaSet` before measuring the cached list-render path. Its `<20ms` assertion was not weakened.

## 6. Scratch Data

Scratch isolation is deterministic and whole-register based:

- Product reset removes `FND-*`, `SAR-9*`, `KID-7*`, `KID-8*`, `KID-9*`, temporary workflow products, and generated product IDs regardless of whether a test reached manual cleanup.
- Media reset removes generated and named scratch media, ownership indexes, and media-set cache entries.
- Group reset removes temporary group IDs and decisions.
- Employee-management tests retain their established `memory.clear()` setup, while product/media/activity state is independently reset.
- `afterEach(setupBaseState)` executes even when a test assertion fails.

New regression coverage verifies BASE isolation, MIGRATED isolation, migration-to-BASE restoration, scratch product cleanup, scratch media cleanup through the canonical ownership service, cache reset, and full-state migration idempotency.

## 7. Production Changes

**Production changes: 0**

No file under `src/` changed. In particular:

- `catalogRepository.read()` was not modified.
- No production cache was removed or weakened.
- No product ID, media ID, Kids identity, ownership rule, validator, taxonomy rule, or storefront behavior changed.
- `tests/fixtures/workflow-golden-baseline.json` was not changed.

All changes are test fixtures, tests, audit/QA fixture initialization, documentation, and one package-script registration.

## 8. Final Tests

```text
npm test
386 passing
0 failing
0 skipped
```

Result: **ALL TESTS PASS — 0 FAILURES**.

Representative tests from each former failure family were also run independently with `--test-name-pattern` and passed: catalogue multi-view reconciliation, the real KID lifecycle, media-product discovery coverage, employee assignment, and reconciled storefront publication.

The Node runner has no randomized-order option configured. Order independence was instead verified by fresh per-test state hooks, independent former-failure probes, the migration→BASE regression, and repeated full-suite execution.

## 9. Audits

Final audit results:

| Command | Result |
|---|---|
| `npm run audit:workflow-foundation` | PASS |
| `npm run audit:read-only-workflow` | PASS |
| `npm run audit:explicit-migrations` | PASS |
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
| `npm run audit-product-performance` | PASS |
| `npm run qa:render` (Kids render QA) | PASS — 35/35 |
| `npm run build` | PASS |
| `git diff --check` | PASS |

Golden comparison: 168 products, 205 media, 99 published, 99 storefront-visible, 21 KID draft identities, 10 marketing media, and **0 differences** from `workflow-golden-baseline.json` in explicit MIGRATED state.

## 10. Remaining Phase 3 Work

Not implemented in Phase 3B.2:

- `changeProductId` ownership migration
- `updateStatus` / `bulkUpdate` cleanup
- activity consolidation
- Admin/Kids UI consolidation
- legacy validator removal
- compatibility adapter removal

These remain future Phase 3 work. Phase 3B.2 changes only fixture, test, audit, and QA isolation.
