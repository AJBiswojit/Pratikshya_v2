# Brand asset slot

This directory is the canonical slot for the PRATIKSHYA FASHON brand logo.

## Canonical path

```
src/assets/pratikshya_logo.webp
```

The supplied logo asset must live at this exact path. The reusable `<Brand />`
component (see `src/design-system/components/Brand.jsx`) resolves it through
Vite's `import.meta.glob` so the build succeeds whether or not the file is
present yet.

## Fallback behaviour

* When the file is present, every surface that renders `<Brand />` with the
  `lockup` variant (the storefront header/footer and every portal default)
  displays the supplied mark at its native aspect ratio (no stretch, no
  crop) with the typographic wordmark `PRATIKSHYA FASHON` beside it as one
  brand lockup. The image's transparency is preserved.
* Until the file is dropped in, the mark slot stays empty and the wordmark
  still renders so the brand name stays legible. The typographic wordmark
  accompanies the supplied mark — it never pretends to *be* the logo.

## Supported extensions

The component resolves the first match in this order:

1. `pratikshya_logo.webp`
2. `pratikshya_logo.png`
3. `pratikshya_logo.jpg` / `.jpeg`
4. `pratikshya_logo.svg`
