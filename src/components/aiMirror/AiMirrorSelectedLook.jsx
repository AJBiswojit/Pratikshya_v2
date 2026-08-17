import { Heart, RotateCcw, ShoppingBag, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import PratikshyaImage from "../PratikshyaImage";
import { AtelierButton } from "../../design-system";
import { productHref } from "../../data/products";
import { formatINR } from "../../utils/shopping";
import { cn } from "../../utils/cn";

const descriptionFor = (product) => {
  const text = product?.shortDescription || product?.description || "A considered piece from the PRATIKSHYA collection.";
  return text.length > 180 ? `${text.slice(0, 177).trim()}…` : text;
};

/** The commerce handoff for the selected mirror garment — no duplicate cart/wishlist state. */
export default function AiMirrorSelectedLook({
  product,
  isProcessing,
  isSaved,
  onTryLook,
  onAddToBag,
  onSaveLook,
  onTryAnother,
  feedback,
}) {
  if (!product) {
    return (
      <section className="border border-mist/80 bg-surface/30 p-6" aria-labelledby="selected-look-heading">
        <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Selected look</p>
        <h2 id="selected-look-heading" className="mt-2 font-display text-3xl font-light text-ink">Find a piece to begin.</h2>
        <p className="mt-3 font-ui text-sm leading-relaxed text-taupe">Choose an eligible apparel piece from the edit to open the preview controls.</p>
      </section>
    );
  }

  const unavailable = product.availability === "unavailable";
  const colour = product.colors?.filter((entry) => !product.unavailableColors?.includes(entry)).slice(0, 2).join(" · ");
  const availableSizes = product.sizes?.filter((entry) => !product.unavailableSizes?.includes(entry)).slice(0, 5).join(" · ");

  return (
    <section className="border border-mist/80 bg-canvas" aria-labelledby="selected-look-heading">
      <div className="flex gap-4 border-b border-mist/80 p-4 sm:p-5">
        <div className="h-28 w-[5.25rem] shrink-0 overflow-hidden bg-surface sm:h-32 sm:w-24">
          <PratikshyaImage image={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" sizes="96px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-ui text-[9px] uppercase tracking-[.18em] text-accent">Selected look</p>
          <h2 id="selected-look-heading" className="mt-2 font-display text-2xl font-light leading-[.95] text-ink sm:text-[1.8rem]">{product.name}</h2>
          <p className="mt-3 font-ui text-sm text-ink">{formatINR(product.price)}</p>
          <p className="mt-1 font-ui text-[10px] uppercase tracking-[.14em] text-taupe">{product.mirrorCategoryLabel} · {product.subcategory}</p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <p className="font-ui text-xs leading-relaxed text-graphite">{descriptionFor(product)}</p>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-mist/80 py-4">
          {[
          ["Category", product.mirrorCategoryLabel],
          ["Fabric", product.fabric],
          ["Craft", product.material],
          ["Colour", colour],
          ["Available sizes", availableSizes],
          ].filter(([, value]) => value).map(([term, value]) => (
            <div key={term}>
              <dt className="font-ui text-[8px] uppercase tracking-[.16em] text-taupe">{term}</dt>
              <dd className="mt-1 font-ui text-[11px] leading-snug text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-center gap-2 font-ui text-[10px] text-taupe">
          <span className={cn("h-1.5 w-1.5 rounded-full", unavailable ? "bg-taupe" : product.availability === "low-stock" ? "bg-accent" : "bg-gold")} aria-hidden="true" />
          {unavailable ? "Currently unavailable" : product.availability === "made-to-order" ? "Available to order · Made for you" : product.availability === "low-stock" ? "Only a few left" : "In stock · Ready to dispatch"}
        </div>

        <AtelierButton
          onClick={onTryLook}
          disabled={isProcessing}
          variant="primary"
          size="md"
          className="mt-6 w-full justify-center disabled:cursor-wait disabled:bg-taupe"
        >
          <Sparkles size={15} aria-hidden="true" />
          {isProcessing ? "Creating Preview" : "Try This Look"}
        </AtelierButton>
        <p className="mt-2 text-center font-ui text-[9px] leading-relaxed text-taupe">Uses a curated demo preview — not a live AI fitting result.</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <AtelierButton as={Link} to={productHref(product)} variant="outline" size="chip" className="justify-center">
            View Product
          </AtelierButton>
          <AtelierButton
            onClick={onAddToBag}
            disabled={unavailable}
            variant="outline"
            size="chip"
            className="justify-center disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingBag size={13} aria-hidden="true" />
            Add to Bag
          </AtelierButton>
          <AtelierButton
            onClick={onSaveLook}
            variant="outline"
            size="chip"
            aria-pressed={isSaved}
            className={cn("justify-center", isSaved && "border-accent text-accent")}
          >
            <Heart size={13} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
            {isSaved ? "Saved" : "Save Look"}
          </AtelierButton>
          <AtelierButton onClick={onTryAnother} variant="outline" size="chip" className="justify-center">
            <RotateCcw size={13} aria-hidden="true" />
            Another Look
          </AtelierButton>
        </div>

        {feedback?.message ? (
          <p
            role={feedback.kind === "error" ? "alert" : "status"}
            aria-live="polite"
            className={cn("mt-4 font-ui text-[11px] leading-relaxed", feedback.kind === "error" ? "text-accent" : "text-cocoa")}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
