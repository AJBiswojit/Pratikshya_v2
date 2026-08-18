import { useEffect, useMemo, useState } from "react";
import { resolveMediaUrl } from "../services/media/mediaPaths";

/**
 * Shared product-media renderer. It never invents or requests a fallback
 * image: absent and failed media stays a quiet Atelier empty plate.
 */
const sourceOf = (image) => {
  if (typeof image === "string") return resolveMediaUrl(image);
  return resolveMediaUrl(image?.src || image?.url || "");
};

function EmptyMedia({ className, label = "Product media coming soon" }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex h-full w-full items-center justify-center bg-[#eee9e1] text-center font-ui text-[9px] uppercase tracking-[0.22em] text-taupe/80 ${className}`}
    >
      <span className="border border-taupe/25 px-3 py-2">PRATIKSHYA FASHON</span>
    </div>
  );
}

function SafeImage({ image, alt, className, loading = "lazy", fetchPriority = "auto", decoding = "async", sizes, srcSet, width, height, objectPosition }) {
  const src = useMemo(() => sourceOf(image), [image]);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => setCurrentSrc(src), [src]);

  if (!currentSrc) return <EmptyMedia className={className} label={alt || undefined} />;

  return (
    <img
      src={currentSrc}
      alt={alt || image?.alt || "Product image"}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      sizes={sizes}
      srcSet={srcSet || image?.srcSet}
      width={width || image?.width}
      height={height || image?.height}
      onError={() => setCurrentSrc("")}
      style={{ objectPosition: objectPosition || image?.objectPosition || "center" }}
    />
  );
}

export default function PratikshyaImage({ hoverImage, className = "", ...props }) {
  if (!hoverImage || !sourceOf(hoverImage)) return <SafeImage {...props} className={className} />;

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      <SafeImage {...props} className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-0" />
      <SafeImage {...props} image={hoverImage} className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </span>
  );
}
