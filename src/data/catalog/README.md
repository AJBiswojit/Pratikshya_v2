# Canonical Product Catalog

This directory contains the authored frontend catalogue data used by the shared repository/store boundary.

## Ownership chain

```text
Canonical Product Catalog
  → Department
  → Category
  → Subcategory
  → Product
  → Product Media
  → Workflow
  → Storefront
```

- `products.js` is the sole authored Product Catalog. Every record has a stable Product ID, canonical taxonomy references, commercial information, and explicit Product Media associations.
- `taxonomy.js` is the shared Department → Category → Subcategory hierarchy and route vocabulary for every department.
- `hero.js` contains editorial slide copy and optional baseline imagery. Published managed placements come from the shared marketing-media repository.
- `collections.js` contains editorial collection metadata and optional plates. Collection records are not Product records.

## Runtime boundaries

- `catalogRepository` merges persisted Admin Product Management edits with the authored catalogue by stable Product ID.
- Generic queries in `src/data/products/` provide search, department/category/subcategory filtering, routes, and storefront projections.
- Product Card, Grid, Rail, and Product Detail surfaces resolve media from canonical Product records and managed Product-ID ownership.
- DRAFT, SUBMITTED, and APPROVED records remain hidden. Only records that complete `DRAFT → SUBMITTED → APPROVED → PUBLISHED` enter storefront queries.
- Marketing placements may reference canonical Product IDs; they do not embed duplicate Product objects.

Product identity and taxonomy are never inferred from media filenames or filesystem discovery. New and edited records belong in Admin Product Management and the canonical repository path.
