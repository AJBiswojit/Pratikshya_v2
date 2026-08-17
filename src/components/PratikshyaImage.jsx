import { useEffect, useMemo, useState } from "react";
import { categoryFallbacks, getImage } from "../data/pratikshyaImageManifest";
import { resolveLegacyMediaUrl } from "../services/media/mediaPaths";

const resolveImage = (image, category) => {
  if (typeof image === "string") {
    const manifestImage = getImage(image);
    return {
      ...manifestImage,
      fallback: manifestImage.fallback || categoryFallbacks[category || manifestImage.category || "default"],
    };
  }

  const fallbackCategory = category || image.category || "default";
  return {
    ...image,
    src: resolveLegacyMediaUrl(image.src) || categoryFallbacks[fallbackCategory] || categoryFallbacks.default,
    fallback: resolveLegacyMediaUrl(image.fallback) || categoryFallbacks[fallbackCategory] || categoryFallbacks.default,
  };
};

function SafeImage({ image, category, alt, className, loading = "lazy", fetchPriority = "auto", decoding = "async", sizes, srcSet, width, height, objectPosition }) {
  const resolved = useMemo(() => resolveImage(image, category), [image, category]);
  const [currentSrc, setCurrentSrc] = useState(resolved.src || categoryFallbacks.default);

  useEffect(() => {
    setCurrentSrc(resolved.src || categoryFallbacks.default);
  }, [resolved.src]);

  const handleError = () => {
    const fallback = resolved.fallback || categoryFallbacks[resolved.category || "default"] || categoryFallbacks.default;
    setCurrentSrc((current) => (current === fallback ? categoryFallbacks.default : fallback));
  };

  return (
    <img
      src={currentSrc}
      alt={alt ?? resolved.alt ?? "PRATIKSHYA FASHON premium fashion imagery"}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      sizes={sizes}
      srcSet={srcSet || resolved.srcSet}
      width={width || resolved.width}
      height={height || resolved.height}
      onError={handleError}
      style={{ objectPosition: objectPosition || resolved.objectPosition || "center" }}
    />
  );
}

export default function PratikshyaImage({ hoverImage, className = "", ...props }) {
  if (!hoverImage) {
    return <SafeImage {...props} className={className} />;
  }

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      <SafeImage {...props} className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-0" />
      <SafeImage
        {...props}
        image={hoverImage}
        className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
    </span>
  );
}
