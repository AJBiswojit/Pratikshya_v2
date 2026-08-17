# Application media library

The single canonical commercial media root (Phases 21.4 / 21.6 / 21.11).

- Customer surfaces never read `public/images` or `public/media`.
- Filenames follow the Phase 21.6 convention and are deterministic.
- House fallback plates live here as `house-*.jpg`. They are not products.
- Application code resolves addresses through `mediaResolver` / `productMediaSet` / `imageRef`.
