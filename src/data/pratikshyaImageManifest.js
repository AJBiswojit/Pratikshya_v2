/**
 * Legacy manifest compatibility boundary.
 *
 * The former demo/stock-image manifest was intentionally removed. Product
 * photography is now owned by the media repository and is attached to a
 * product by its media records. These exports remain only so non-product
 * surfaces can render their designed empty state without requesting a file.
 */
export const categoryFallbacks = Object.freeze({ default: null });
export const pratikshyaImages = Object.freeze({});

export const getImage = (id) => ({
  id: id || "empty-media",
  src: null,
  fallback: null,
  alt: "",
  category: "default",
});

export const imageRef = getImage;
