import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import AccountShell from "../../components/account/AccountShell";
import AiMirrorProductSelector from "../../components/aiMirror/AiMirrorProductSelector";
import AiMirrorSelectedLook from "../../components/aiMirror/AiMirrorSelectedLook";
import AiMirrorStage from "../../components/aiMirror/AiMirrorStage";
import PratikshyaImage from "../../components/PratikshyaImage";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { AtelierButton } from "../../design-system";
import { getProductByIdentifier } from "../../data/products";
import { imageRef } from "../../data/mediaPlaceholder";
import { useProductCovers } from "../../hooks/useMedia";
import { PRODUCTS_CHANGED_EVENT } from "../../services/catalogRepository";
import { TAXONOMY_CHANGED_EVENT } from "../../services/taxonomyRepository";
import {
  getRecentTryOns,
  getVirtualTryOnProducts,
  hasVirtualTryOnUsableMedia,
  recordRecentTryOn,
} from "../../services/aiMirror/aiMirrorService";
import { getMockPreviewTemplate } from "../../services/aiMirror/aiMirrorMockData";
import { generateTryOnPreview } from "../../services/aiMirror/virtualTryOnService";
import { defaultSelection } from "../../utils/shopping";

const INITIAL_PRODUCT_COUNT = 8;

const stopTracks = (stream) => {
  try {
    stream?.getTracks?.().forEach((track) => track.stop());
  } catch {
    // A stopped or unavailable track should never interrupt navigation.
  }
};

const cameraErrorState = (error) => {
  const name = String(error?.name || "");
  return ["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(name)
    ? "denied"
    : "unavailable";
};

const readyProducts = () => getVirtualTryOnProducts();

function RecentTryOns({ products, onSelect }) {
  if (!products.length) return null;

  return (
    <section aria-labelledby="recent-try-ons-heading" className="border-t border-mist/80 pt-10 sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-ui text-[10px] uppercase tracking-[.22em] text-accent">Your edit</p>
          <h2 id="recent-try-ons-heading" className="mt-1 font-display text-3xl font-light text-ink sm:text-4xl">
            Recently <span className="italic text-accent">tried</span>
          </h2>
        </div>
        <p className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">Demo history · up to 8 looks</p>
      </div>
      <div className="-mx-5 mt-6 flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none sm:mx-0 sm:px-0">
        {products.map(({ product, triedAt }) => (
          <button
            key={product.id}
            type="button"
            onClick={() => onSelect(product)}
            className="group w-36 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-40"
          >
            <div className="relative aspect-[3/4] overflow-hidden border border-mist/80 bg-surface">
              <PratikshyaImage
                image={product.image}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                loading="lazy"
                sizes="160px"
              />
              <span className="absolute left-2 top-2 bg-ink/75 px-2 py-1 font-ui text-[8px] uppercase tracking-[.16em] text-ivory">Demo</span>
            </div>
            <p className="mt-3 line-clamp-2 font-display text-xl leading-[.92] text-ink">{product.name}</p>
            <p className="mt-2 font-ui text-[9px] uppercase tracking-[.14em] text-taupe">
              {new Date(triedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function AiMirror() {
  const { user } = useAuth();
  const cart = useCart();
  const wishlist = useWishlist();
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalogueRevision, setCatalogueRevision] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_PRODUCT_COUNT);
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraStream, setCameraStream] = useState(null);
  const [result, setResult] = useState(null);
  const [comparison, setComparison] = useState("original");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingState, setProcessingState] = useState(null);
  const [feedback, setFeedback] = useState({ message: "", kind: "success" });
  const [routeNotice, setRouteNotice] = useState("");
  const [recentRecords, setRecentRecords] = useState(() => getRecentTryOns(user?.id));

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraRequestRef = useRef(0);
  const tryOnRequestRef = useRef(0);
  const tryOnAbortRef = useRef(null);
  const selectorRef = useRef(null);

  const catalogueProducts = useMemo(() => readyProducts(), [catalogueRevision]);
  const products = useProductCovers(catalogueProducts);
  const productKey = products.map((product) => product.id).join("|");
  const requestedProductId = searchParams.get("product");

  const cancelTryOn = useCallback(() => {
    tryOnRequestRef.current += 1;
    tryOnAbortRef.current?.abort();
    tryOnAbortRef.current = null;
  }, []);

  /** Catalogue and taxonomy updates flow into the mirror without a second data store. */
  useEffect(() => {
    const refresh = () => setCatalogueRevision((revision) => revision + 1);
    window.addEventListener(PRODUCTS_CHANGED_EVENT, refresh);
    window.addEventListener(TAXONOMY_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(PRODUCTS_CHANGED_EVENT, refresh);
      window.removeEventListener(TAXONOMY_CHANGED_EVENT, refresh);
    };
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "PRATIKSHYA AI Mirror — PRATIKSHYA FASHON";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  /** Camera tracks and mock requests always stop when the page is left. */
  useEffect(() => () => {
    cameraRequestRef.current += 1;
    cancelTryOn();
    stopTracks(streamRef.current);
    streamRef.current = null;
  }, [cancelTryOn]);

  useEffect(() => {
    setRecentRecords(getRecentTryOns(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!feedback.message) return undefined;
    const timer = window.setTimeout(() => setFeedback({ message: "", kind: "success" }), 4800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  /** Attach the stream only after the live video element has rendered. */
  useEffect(() => {
    if (cameraStatus !== "active" || !cameraStream || !videoRef.current) return undefined;
    const video = videoRef.current;
    video.srcObject = cameraStream;
    video.play?.().catch(() => {
      // The stream remains attached; a browser can still begin playback after an interaction.
    });
    return () => {
      if (video.srcObject === cameraStream) video.srcObject = null;
    };
  }, [cameraStatus, cameraStream]);

  /** Honor a product-detail deep link, while giving an invalid link a graceful next step. */
  useEffect(() => {
    if (!products.length) {
      setSelectedId(null);
      return;
    }

    const requested = requestedProductId
      ? products.find((product) => String(product.id) === String(requestedProductId) || product.slug === requestedProductId)
      : null;

    if (requested) {
      if (requested.id !== selectedId) {
        cancelTryOn();
        setSelectedId(requested.id);
        setResult(null);
        setComparison("original");
        setIsProcessing(false);
        setProcessingState(null);
      }
      setRouteNotice("");
      return;
    }

    if (requestedProductId) {
      const requestedProduct = getProductByIdentifier(requestedProductId);
      setRouteNotice(
        requestedProduct
          ? !hasVirtualTryOnUsableMedia(requestedProduct)
            ? `${requestedProduct.name} needs a usable active product image before it can be previewed. Choose another apparel look from the edit instead.`
            : `${requestedProduct.name} is not eligible for the AI Mirror. Choose an apparel look from the edit instead.`
          : "The requested product is unavailable. Choose an apparel look from the edit instead."
      );
    }

    if (!selectedId || !products.some((product) => product.id === selectedId)) {
      setSelectedId(products[0].id);
    }
  }, [requestedProductId, productKey, products, selectedId, cancelTryOn]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId]
  );

  const previewTemplate = useMemo(
    () => getMockPreviewTemplate(selectedProduct),
    [selectedProduct]
  );

  const categories = useMemo(() => {
    const byKey = new Map();
    products.forEach((product) => {
      if (!byKey.has(product.mirrorCategoryKey)) {
        byKey.set(product.mirrorCategoryKey, {
          key: product.mirrorCategoryKey,
          label: product.mirrorCategoryLabel,
        });
      }
    });
    return [...byKey.values()];
  }, [products]);

  useEffect(() => {
    if (category !== "all" && !categories.some((entry) => entry.key === category)) setCategory("all");
  }, [category, categories]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== "all" && product.mirrorCategoryKey !== category) return false;
      if (!term) return true;
      return [
        product.name,
        product.mirrorCategoryLabel,
        product.subcategory,
        product.fabric,
        product.material,
        ...(product.colors ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [products, query, category]);

  useEffect(() => {
    setVisibleCount(INITIAL_PRODUCT_COUNT);
  }, [query, category]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );

  const recentProducts = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    return recentRecords
      .map((record) => ({ ...record, product: byId.get(record.productId) }))
      .filter((entry) => entry.product);
  }, [recentRecords, products]);

  const stopCamera = useCallback((nextStatus = "preview") => {
    cameraRequestRef.current += 1;
    stopTracks(streamRef.current);
    streamRef.current = null;
    setCameraStream(null);
    setCameraStatus(nextStatus);
  }, []);

  const enableCamera = useCallback(async () => {
    if (cameraStatus === "requesting" || cameraStatus === "active") return;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unavailable");
      return;
    }

    const requestId = ++cameraRequestRef.current;
    setCameraStatus("requesting");

    try {
      /** Camera only. The mirror never requests microphone permission. */
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (cameraRequestRef.current !== requestId) {
        stopTracks(stream);
        return;
      }
      streamRef.current = stream;
      setCameraStream(stream);
      setCameraStatus("active");
    } catch (error) {
      if (cameraRequestRef.current !== requestId) return;
      setCameraStream(null);
      setCameraStatus(cameraErrorState(error));
    }
  }, [cameraStatus]);

  const selectProduct = useCallback(
    (product) => {
      if (!product?.id) return;
      cancelTryOn();
      setSelectedId(product.id);
      setResult(null);
      setComparison("original");
      setIsProcessing(false);
      setProcessingState(null);
      setFeedback({ message: "", kind: "success" });
      setRouteNotice("");

      const next = new URLSearchParams(searchParams);
      next.set("product", product.id);
      setSearchParams(next, { replace: true });
    },
    [cancelTryOn, searchParams, setSearchParams]
  );

  const createPreview = useCallback(async () => {
    if (!selectedProduct) {
      setFeedback({ message: "Choose an apparel look before creating a preview.", kind: "error" });
      return;
    }

    cancelTryOn();
    const requestId = ++tryOnRequestRef.current;
    const controller = new AbortController();
    tryOnAbortRef.current = controller;

    setIsProcessing(true);
    setProcessingState({
      message: "Preparing your look",
      detail: "Setting up the curated demo preview…",
    });
    setResult(null);
    setComparison("original");
    setFeedback({ message: "", kind: "success" });

    try {
      const preview = await generateTryOnPreview({
        product: selectedProduct,
        signal: controller.signal,
        onProgress: (nextState) => {
          if (tryOnRequestRef.current === requestId) setProcessingState(nextState);
        },
      });

      if (tryOnRequestRef.current !== requestId) return;
      setResult(preview);
      setComparison("try-on");
      const records = recordRecentTryOn(user?.id, selectedProduct.id);
      setRecentRecords(records);
      setFeedback({ message: "Your curated demo preview is ready.", kind: "success" });
    } catch (error) {
      if (error?.name === "AbortError" || tryOnRequestRef.current !== requestId) return;
      const message = error?.code === "PRODUCT_MEDIA_UNAVAILABLE"
        ? "This piece needs a usable product image before it can be previewed. Choose another look."
        : error?.code === "INELIGIBLE_PRODUCT"
          ? "This piece is not available for the AI Mirror preview. Choose another apparel look."
          : error?.code === "MOCK_PREVIEW_UNAVAILABLE"
            ? "A demo preview is unavailable for this piece. Choose another look or try again."
            : "We could not prepare this demo preview. Please try again or choose another look.";
      setFeedback({ message, kind: "error" });
    } finally {
      if (tryOnRequestRef.current === requestId) {
        setIsProcessing(false);
        setProcessingState(null);
        tryOnAbortRef.current = null;
      }
    }
  }, [selectedProduct, cancelTryOn, user?.id]);

  const addToBag = useCallback(() => {
    if (!selectedProduct) return;
    const defaults = defaultSelection(selectedProduct);
    const selection = {
      color: (selectedProduct.colors ?? []).find((colour) => !selectedProduct.unavailableColors?.includes(colour)) ?? defaults.color,
      size: (selectedProduct.sizes ?? []).find((size) => !selectedProduct.unavailableSizes?.includes(size)) ?? defaults.size,
      quantity: 1,
    };
    const added = cart.addToCart(selectedProduct, selection);
    setFeedback({
      message: added.ok
        ? `${added.message}${selection.size && selection.size !== "Free Size" ? ` Size ${selection.size} is selected; you can adjust it in your bag.` : ""}`
        : added.message,
      kind: added.ok ? "success" : "error",
    });
  }, [cart, selectedProduct]);

  const saveLook = useCallback(() => {
    if (!selectedProduct) return;
    const saved = wishlist.isSaved(selectedProduct);
    if (saved) wishlist.remove(selectedProduct);
    else wishlist.add(selectedProduct);
    setFeedback({ message: saved ? "Removed from your wishlist." : "Look saved to your wishlist.", kind: "success" });
  }, [selectedProduct, wishlist]);

  const tryAnother = useCallback(() => {
    cancelTryOn();
    setResult(null);
    setComparison("original");
    setIsProcessing(false);
    setProcessingState(null);
    selectorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [cancelTryOn]);

  return (
    <AccountShell breadcrumbItems={[{ label: "My PRATIKSHYA", to: "/account" }, { label: "AI Mirror" }]}>
      <div className="space-y-10 sm:space-y-12">
        <section className="relative isolate overflow-hidden border border-ink/15 bg-ink px-6 py-8 text-ivory sm:px-9 sm:py-10 lg:px-12 lg:py-12">
          <PratikshyaImage
            image={imageRef("heritage-textile")}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover opacity-20 mix-blend-luminosity"
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
          />
          <div aria-hidden="true" className="absolute inset-0 z-[1] bg-gradient-to-r from-ink via-ink/90 to-ink/50" />
          <div className="relative z-10 max-w-3xl">
            <p className="font-ui text-[10px] uppercase tracking-[.28em] text-gold">PRATIKSHYA AI MIRROR</p>
            <h1 className="mt-4 max-w-2xl font-display text-4xl font-light leading-[.9] tracking-tight text-ivory sm:text-5xl lg:text-6xl">
              See yourself in the look before you make it yours.
            </h1>
            <p className="mt-5 max-w-xl font-ui text-sm leading-relaxed text-ash sm:text-base">
              Choose a look, step into the mirror, and discover how it could feel on you.
            </p>
          </div>
          <div className="relative z-10 mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-5 font-ui text-[10px] text-ash">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-gold" aria-hidden="true" />No photos are stored</span>
            <span className="inline-flex items-center gap-2"><Sparkles size={14} className="text-gold" aria-hidden="true" />Curated demo preview</span>
            <span className="inline-flex items-center gap-2"><Clock size={14} className="text-gold" aria-hidden="true" />Ready in moments</span>
          </div>
        </section>

        {routeNotice ? (
          <div role="status" aria-live="polite" className="flex gap-3 border border-accent/30 bg-blush/25 px-4 py-4 font-ui text-xs leading-relaxed text-graphite">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <p>{routeNotice}</p>
          </div>
        ) : null}

        {!products.length ? (
          <section className="border border-mist/80 bg-surface/30 px-6 py-10 text-center sm:px-10">
            <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Mirror edit</p>
            <h2 className="mt-3 font-display text-4xl font-light text-ink">No apparel looks are available right now.</h2>
            <p className="mx-auto mt-3 max-w-xl font-ui text-sm leading-relaxed text-taupe">The AI Mirror only shows eligible apparel with usable active product media. Explore the current collection while the edit is refreshed.</p>
            <AtelierButton as={Link} to="/shop" variant="primary" size="md" className="mt-6">
              Explore the Collection <ArrowRight size={15} aria-hidden="true" />
            </AtelierButton>
          </section>
        ) : (
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1.32fr)_minmax(22rem,.68fr)] xl:items-start xl:gap-8 2xl:gap-12">
            <AiMirrorStage
              cameraStatus={cameraStatus}
              videoRef={videoRef}
              selectedProduct={selectedProduct}
              previewTemplate={previewTemplate}
              result={result}
              comparison={comparison}
              onComparisonChange={setComparison}
              onEnableCamera={enableCamera}
              onUsePreviewMode={() => stopCamera("preview")}
              onStopCamera={() => stopCamera("preview")}
              isProcessing={isProcessing}
              processingState={processingState}
            />

            <aside className="flex min-w-0 flex-col gap-7 xl:sticky xl:top-24">
              <div className="order-2 xl:order-1" ref={selectorRef}>
                <AiMirrorProductSelector
                  products={visibleProducts}
                  categories={categories}
                  query={query}
                  category={category}
                  selectedId={selectedProduct?.id}
                  onQueryChange={setQuery}
                  onCategoryChange={setCategory}
                  onSelect={selectProduct}
                  canLoadMore={visibleProducts.length < filteredProducts.length}
                  onLoadMore={() => setVisibleCount((count) => count + INITIAL_PRODUCT_COUNT)}
                />
              </div>
              <div className="order-1 xl:order-2">
                <AiMirrorSelectedLook
                  product={selectedProduct}
                  isProcessing={isProcessing}
                  isSaved={wishlist.isSaved(selectedProduct)}
                  onTryLook={createPreview}
                  onAddToBag={addToBag}
                  onSaveLook={saveLook}
                  onTryAnother={tryAnother}
                  feedback={feedback}
                />
              </div>
            </aside>
          </div>
        )}

        <RecentTryOns products={recentProducts} onSelect={selectProduct} />

        <section className="grid gap-px overflow-hidden border border-mist/80 bg-mist/80 sm:grid-cols-3">
          {[
            ["Private by design", "Camera frames stay in your browser and are never saved by this demo."],
            ["Styled for exploration", "The mirror uses existing product media and curated PRATIKSHYA preview scenes."],
            ["Your next step", "View the product, save it to your wishlist or add it to your existing bag."],
          ].map(([title, copy]) => (
            <div key={title} className="bg-canvas p-5 sm:p-6">
              <CheckCircle2 size={17} strokeWidth={1.4} className="text-accent" aria-hidden="true" />
              <h2 className="mt-4 font-display text-2xl font-light text-ink">{title}</h2>
              <p className="mt-2 font-ui text-xs leading-relaxed text-taupe">{copy}</p>
            </div>
          ))}
        </section>
      </div>
    </AccountShell>
  );
}
