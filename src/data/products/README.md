# Product media contract

The catalogue intentionally contains no image URL, image import, gallery fixture, or fallback asset.

`services/media/mediaRepository` is the single product-media source of truth. Assign an uploaded media record to a product with one `COVER` image and optional ordered gallery images. The storefront resolves that assignment for cards, product detail, cart, wishlist, search, and recommendations.

All normalized products expose the stable empty-ready contract:

```js
images: {
  primary: null,
  gallery: [],
  thumbnail: null,
}
```

The UI requires no code change when real media is later uploaded and assigned. Missing or failed media renders the shared branded empty plate rather than a stock image or broken request.
