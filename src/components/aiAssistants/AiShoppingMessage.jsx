import { AlertTriangle } from "lucide-react";
import AiProductCard from "./AiProductCard";
import { AiAssistantMark } from "./AiConversationLog";
import { useProductCovers } from "../../hooks/useMedia";
import { formatINR } from "../../utils/shopping";

const timeOf = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

/** Product grid used for recommendations and outfit companions. */
function ProductRow({ products, bag, wishlist, compact = false }) {
  const rows = useProductCovers(products);
  if (!rows.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((product, index) => (
        <AiProductCard
          key={`${product.id}-${index}`}
          product={product}
          reason={product.__reason}
          compact={compact}
          onAddToBag={(item) => bag.addToCart(item, { quantity: 1 })}
          onToggleWishlist={(item) => wishlist.toggle(item)}
          isWishlisted={wishlist.isSaved(product)}
        />
      ))}
    </div>
  );
}

/** Side-by-side comparison table for PRODUCT_COMPARISON envelopes. */
function ComparisonTable({ comparison }) {
  const { products = [], rows = [], verdict = "" } = comparison || {};
  if (!products.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse border border-mist/80 font-ui text-xs">
        <caption className="sr-only">Product comparison</caption>
        <thead>
          <tr>
            <th scope="col" className="border border-mist/80 bg-surface/60 px-3 py-2 text-left font-medium uppercase tracking-[.12em] text-taupe">
              Piece
            </th>
            {products.map((product) => (
              <th key={product.id} scope="col" className="border border-mist/80 bg-surface/60 px-3 py-2 text-left font-display text-sm font-normal normal-case tracking-normal text-ink">
                {product.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="border border-mist/80 px-3 py-2 text-left font-medium uppercase tracking-[.12em] text-taupe">
                {row.label}
              </th>
              {row.values.map((value, index) => (
                <td key={`${row.label}-${index}`} className="border border-mist/80 px-3 py-2 text-graphite">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {verdict ? (
        <p className="mt-3 border-l border-gold pl-3 font-display text-base italic text-cocoa">{verdict}</p>
      ) : null}
    </div>
  );
}

/**
 * Renders one shopping assistant envelope according to its type — the UI
 * never reaches past the envelope contract.
 */
export default function AiShoppingMessage({ message, bag, wishlist, onSuggestion }) {
  const at = timeOf(message.createdAt);

  const products = (message.products ?? [])
    .map((entry) => (entry?.product ? { ...entry.product, __reason: entry.reason } : null))
    .filter(Boolean);

  const outfitPieces = message.outfit?.pieces ?? [];

  return (
    <div className="flex flex-col gap-3">
      <AiAssistantMark at={at} />

      <div className="border border-mist/80 bg-surface/40 px-4 py-4 sm:px-5">
        {message.text ? (
          <p className="whitespace-pre-line font-ui text-sm leading-relaxed text-graphite">{message.text}</p>
        ) : null}

        {message.type === "NO_RESULTS" && !products.length ? (
          <p className="mt-2 flex items-center gap-2 font-ui text-[11px] uppercase tracking-[.14em] text-taupe">
            <AlertTriangle size={13} aria-hidden="true" /> Nothing matched every part of the request
          </p>
        ) : null}

        {products.length ? (
          <div className="mt-4">
            <ProductRow products={products} bag={bag} wishlist={wishlist} />
          </div>
        ) : null}

        {message.outfit ? (
          <div className="mt-4 space-y-4">
            {message.outfit.main ? (
              <div>
                <p className="mb-2 font-ui text-[10px] uppercase tracking-[.18em] text-accent">The main piece</p>
                <div className="max-w-sm">
                  <AiProductCard
                    product={message.outfit.main}
                    onAddToBag={(item) => bag.addToCart(item, { quantity: 1 })}
                    onToggleWishlist={(item) => wishlist.toggle(item)}
                    isWishlisted={wishlist.isSaved(message.outfit.main)}
                  />
                </div>
              </div>
            ) : null}
            {outfitPieces.length ? (
              <div>
                <p className="mb-2 font-ui text-[10px] uppercase tracking-[.18em] text-accent">To finish the look</p>
                <ProductRow products={outfitPieces} bag={bag} wishlist={wishlist} compact />
              </div>
            ) : null}
            {message.outfit.note ? (
              <p className="font-ui text-[10px] uppercase tracking-[.12em] text-taupe">{message.outfit.note}</p>
            ) : null}
          </div>
        ) : null}

        {message.comparison ? (
          <div className="mt-4">
            <ComparisonTable comparison={message.comparison} />
          </div>
        ) : null}

        {message.product && !message.outfit && (message.type === "CART_ACTION" || message.type === "WISHLIST_ACTION" || message.type === "PRODUCT_CONTEXT") ? (
          <div className="mt-4 max-w-sm">
            <AiProductCard
              product={message.product}
              onAddToBag={(item) => bag.addToCart(item, { quantity: 1 })}
              onToggleWishlist={(item) => wishlist.toggle(item)}
              isWishlisted={wishlist.isSaved(message.product)}
            />
          </div>
        ) : null}

        {message.type === "CART_ACTION" && message.product ? (
          <p className="mt-3 font-ui text-[11px] text-accent">
            {message.product.name} — {formatINR(message.product.price)} · added to your bag.
          </p>
        ) : null}

        {message.suggestions?.length ? (
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Follow-up suggestions">
            {message.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestion?.(suggestion)}
                className="border border-pearl px-3 py-1 font-ui text-[11px] text-graphite transition-colors hover:border-ink hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {message.source ? (
          <p className="mt-3 font-ui text-[9px] uppercase tracking-[.16em] text-taupe/90">{message.source}</p>
        ) : null}
      </div>
    </div>
  );
}
