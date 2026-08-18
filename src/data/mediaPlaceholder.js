/**
 * Non-product media empty-state references.
 *
 * Editorial surfaces may request an optional image before Marketing Media has
 * an active placement. Product photography never resolves through this file;
 * it remains owned by canonical Product records and explicit Product Media.
 */
export const categoryFallbacks = Object.freeze({ default: null });

export const getImage = (id) => ({
  id: id || "empty-media",
  src: null,
  fallback: null,
  alt: "",
  category: "default",
});

export const imageRef = getImage;
