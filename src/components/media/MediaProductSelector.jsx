import { useMemo, useState } from "react";
import { Check, CheckCircle2, ChevronDown, Package, Search, X } from "lucide-react";
import catalogRepository from "../../services/catalogRepository";
import { AtelierButton } from "../../design-system";
import PratikshyaImage from "../PratikshyaImage";
import { imageRef } from "../../data/mediaPlaceholder";
import { cn } from "../../utils/cn";

export default function MediaProductSelector({
  selectedProductId,
  onSelectProduct,
  disabled = false,
  error = null,
  required = true,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const allProducts = useMemo(() => {
    const items = catalogRepository.all();
    return items.map((p, idx) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || `PF-${String(idx + 1).padStart(5, "0")}`,
      category: p.category,
      subcategory: p.subcategory,
      price: p.price,
      fabric: p.fabric,
      image: typeof p.image === "object" ? p.image : imageRef(p.image),
    }));
  }, []);

  const selectedProduct = useMemo(
    () => allProducts.find((p) => String(p.id) === String(selectedProductId)) ?? null,
    [allProducts, selectedProductId]
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allProducts.slice(0, 15);
    return allProducts
      .filter((p) =>
        [p.name, p.sku, p.category, p.subcategory, p.fabric, p.id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 20);
  }, [allProducts, query]);

  const handleSelect = (productId) => {
    onSelectProduct(productId);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    onSelectProduct(null);
    setIsOpen(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-ui text-[11px] uppercase tracking-[.18em] text-taupe" htmlFor="product-search-input">
          Assigned Product {required ? <span className="text-accent">*</span> : ""}
        </label>
        {selectedProduct ? (
          <span className="inline-flex items-center gap-1 font-ui text-[10px] text-emerald-800">
            <CheckCircle2 size={12} className="text-emerald-700" aria-hidden="true" />
            Product selected
          </span>
        ) : (
          <span className="font-ui text-[10px] text-taupe">Search by name or SKU</span>
        )}
      </div>

      {selectedProduct ? (
        <div className="flex flex-col gap-3 border border-mist bg-surface/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-14 w-12 shrink-0 overflow-hidden bg-canvas-deep border border-mist">
              <PratikshyaImage
                image={selectedProduct.image}
                alt={selectedProduct.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="truncate font-display text-sm font-medium text-ink">
                {selectedProduct.name}
              </p>
              <p className="font-ui text-[11px] text-taupe">
                <span className="font-mono text-[10px] text-cocoa uppercase">{selectedProduct.sku}</span> ·{" "}
                <span className="capitalize">{selectedProduct.category}</span>
                {selectedProduct.subcategory ? ` · ${selectedProduct.subcategory}` : ""}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
            <AtelierButton
              type="button"
              size="chip"
              variant="outline"
              disabled={disabled}
              onClick={handleClear}
              className="text-taupe hover:text-ink"
            >
              Change Product
            </AtelierButton>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-3 text-taupe"
              aria-hidden="true"
            />
            <input
              id="product-search-input"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search product name or SKU…"
              disabled={disabled}
              className={cn(
                "w-full border bg-canvas py-2.5 pl-9 pr-10 font-ui text-sm text-ink outline-none transition-colors focus:border-accent",
                error ? "border-accent" : "border-mist",
                disabled && "opacity-50"
              )}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search query"
                className="absolute right-9 top-3 text-taupe hover:text-ink"
              >
                <X size={14} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label={isOpen ? "Close product list" : "Open product list"}
              className="absolute right-3 top-3 text-taupe hover:text-ink"
            >
              <ChevronDown
                size={16}
                className={cn("transition-transform", isOpen && "rotate-180")}
              />
            </button>
          </div>

          {isOpen ? (
            <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto border border-mist bg-canvas shadow-lg">
              {filteredProducts.length ? (
                <ul className="divide-y divide-mist/60" role="listbox" aria-label="Products">
                  {filteredProducts.map((product) => {
                    const isCurrent = String(product.id) === String(selectedProductId);
                    return (
                      <li
                        key={product.id}
                        role="option"
                        aria-selected={isCurrent}
                        onClick={() => handleSelect(product.id)}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-surface/80",
                          isCurrent && "bg-surface"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-9 shrink-0 overflow-hidden bg-canvas-deep border border-mist/70">
                            <PratikshyaImage
                              image={product.image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-ui text-xs font-medium text-ink">
                              {product.name}
                            </p>
                            <p className="font-ui text-[10px] text-taupe">
                              <span className="font-mono text-cocoa">{product.sku}</span> ·{" "}
                              <span className="capitalize">{product.category}</span>
                              {product.subcategory ? ` · ${product.subcategory}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-ui text-[11px] text-cocoa">
                            ₹{product.price?.toLocaleString("en-IN")}
                          </span>
                          {isCurrent ? (
                            <Check size={14} className="text-accent" aria-hidden="true" />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-4 text-center">
                  <Package size={18} className="mx-auto text-taupe" aria-hidden="true" />
                  <p className="mt-1 font-ui text-xs text-taupe">
                    No products found matching &ldquo;{query}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="font-ui text-[11px] text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
