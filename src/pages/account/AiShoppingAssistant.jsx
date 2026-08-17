import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Camera, RotateCcw, Sparkles, X } from "lucide-react";
import AccountShell from "../../components/account/AccountShell";
import AiComposer from "../../components/aiAssistants/AiComposer";
import AiConversationLog, { AiUserBubble } from "../../components/aiAssistants/AiConversationLog";
import AiQuickPrompts from "../../components/aiAssistants/AiQuickPrompts";
import AiShoppingMessage from "../../components/aiAssistants/AiShoppingMessage";
import AiThinkingIndicator from "../../components/aiAssistants/AiThinkingIndicator";
import PratikshyaImage from "../../components/PratikshyaImage";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useOrder } from "../../context/OrderContext";
import { useWishlist } from "../../context/WishlistContext";
import { AtelierButton, Rule } from "../../design-system";
import {
  getProductById,
  getProductByIdentifier,
  getLiveStorefrontProducts,
} from "../../data/products";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed";
import aiService, { AI_PROVIDER_LABEL, isMockAiProvider } from "../../services/ai/aiService";
import { AI_SESSION_SCOPES, clearAiSession, loadAiSession, saveAiSession } from "../../services/ai/aiSessionStore";
import { buildShoppingResponse } from "../../services/ai/shared/aiResponseBuilder";
import {
  AI_SHOPPING_BRAND,
  AI_SHOPPING_GREETING,
  AI_SHOPPING_PRODUCT_PROMPTS,
  AI_SHOPPING_QUICK_PROMPTS,
} from "../../services/ai/shopping/aiShoppingMockData";
import { PRODUCTS_CHANGED_EVENT } from "../../services/catalogRepository";
import { MEDIA_CHANGED_EVENT } from "../../services/media/mediaRepository";
import { TAXONOMY_CHANGED_EVENT } from "../../services/taxonomyRepository";
import { getStylePreferences } from "../../services/customer/stylePreferences";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../../services/employees/activityService";

const timeLabel = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

/** Restores persisted product references from the live catalogue. */
const rehydrateProducts = (ids) =>
  (ids ?? []).map((id) => getProductById(id)).filter(Boolean);

const rehydrateMessage = (message) => {
  const next = { ...message };
  if (message.productIds?.length) {
    next.products = rehydrateProducts(message.productIds).map((product) => ({ product, reason: "" }));
  }
  if (message.outfitMainId) {
    const main = getProductById(message.outfitMainId);
    if (main) next.outfit = { main, pieces: rehydrateProducts(message.outfitPieceIds) };
  }
  if (message.singleProductId) {
    const single = getProductById(message.singleProductId);
    if (single) next.product = single;
  }
  if (message.comparisonIds?.length) {
    const compared = rehydrateProducts(message.comparisonIds);
    if (compared.length >= 2) {
      next.comparison = next.comparison ?? { products: compared, rows: [], verdict: "" };
      next.comparison.products = compared;
    }
  }
  return next;
};

export default function AiShoppingAssistant() {
  const { user } = useAuth();
  const cart = useCart();
  const wishlist = useWishlist();
  const { orders } = useOrder();
  const recently = useRecentlyViewed(8);
  const [searchParams, setSearchParams] = useSearchParams();

  const [catalogueRevision, setCatalogueRevision] = useState(0);
  const [messages, setMessages] = useState(() => loadAiSession(AI_SESSION_SCOPES.SHOPPING, user?.id).map(rehydrateMessage));
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const logRef = useRef(null);
  const sessionLogged = useRef(false);

  const products = useMemo(() => getLiveStorefrontProducts(), [catalogueRevision]);

  const contextProduct = useMemo(() => {
    const ref = searchParams.get("product");
    if (!ref) return null;
    return getProductByIdentifier(ref) ?? getProductById(ref) ?? null;
  }, [searchParams, catalogueRevision]);

  const preferences = useMemo(() => getStylePreferences(user?.id), [user?.id]);

  const purchasedIds = useMemo(() => {
    const ids = new Set();
    orders.forEach((order) => (order.items ?? []).forEach((item) => item.productId && ids.add(String(item.productId))));
    return [...ids];
  }, [orders]);

  /* Keep the rail honest if the catalogue or taxonomy changes mid-session. */
  useEffect(() => {
    const sync = () => setCatalogueRevision((value) => value + 1);
    window.addEventListener(PRODUCTS_CHANGED_EVENT, sync);
    window.addEventListener(TAXONOMY_CHANGED_EVENT, sync);
    window.addEventListener(MEDIA_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(PRODUCTS_CHANGED_EVENT, sync);
      window.removeEventListener(TAXONOMY_CHANGED_EVENT, sync);
      window.removeEventListener(MEDIA_CHANGED_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = "AI Shopping — My PRATIKSHYA";
    return () => {
      document.title = previous;
    };
  }, []);

  /* Demo persistence — customer-scoped, product ids only. */
  useEffect(() => {
    saveAiSession(AI_SESSION_SCOPES.SHOPPING, user?.id, messages);
  }, [messages, user?.id]);

  /* Session-start diary note, once per mount. */
  useEffect(() => {
    if (sessionLogged.current) return;
    sessionLogged.current = true;
    recordActivity(loadActivity(), {
      ...describeActor({ label: user?.firstName ? `Customer · ${user.firstName}` : "Customer" }),
      action: ACTIVITY_ACTIONS.AI_SHOPPING_SESSION_STARTED,
      summary: "Opened the AI Shopping Assistant",
    });
  }, [user?.firstName]);

  /* Greeting when the conversation is empty. */
  useEffect(() => {
    setMessages((current) => {
      if (current.length) return current;
      return [
        buildShoppingResponse({
          type: "TEXT",
          text: AI_SHOPPING_GREETING(user?.firstName),
          suggestions: ["Find my wedding look", "Show silk sarees", "What's trending?"],
        }),
      ];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* Keep the newest message in view. */
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  const applySideEffects = useCallback(
    (response) => {
      if (response?.type === "CART_ACTION" && response.product) {
        const result = cart.addToCart(response.product, { quantity: 1 });
        if (!result?.ok) {
          return { ...response, type: "TEXT", text: `${response.product.name} could not be added — it may need a size choice on its page.` };
        }
      }
      if (response?.type === "WISHLIST_ACTION" && response.product) {
        wishlist.add(response.product);
      }
      return response;
    },
    [cart, wishlist]
  );

  const send = useCallback(
    async (rawQuestion) => {
      const question = String(rawQuestion || "").trim();
      if (!question || thinking) return;
      setError("");
      setDraft("");
      setMessages((current) => [
        ...current,
        { id: `user-${Date.now().toString(36)}`, role: "user", assistant: "shopping", text: question, createdAt: new Date().toISOString() },
      ]);
      setThinking(true);
      setStage("Understanding your request");

      recordActivity(loadActivity(), {
        ...describeActor({ label: user?.firstName ? `Customer · ${user.firstName}` : "Customer" }),
        action: ACTIVITY_ACTIONS.AI_SHOPPING_QUERY,
        summary: "Asked the AI Shopping Assistant",
      });

      try {
        const response = await aiService.askShoppingAssistant({
          question,
          products,
          productContext: contextProduct,
          wishlistIds: [...wishlist.saved],
          recentIds: recently.ids.map(String),
          purchasedIds,
          preferences,
          customerName: user?.firstName ?? null,
          onStage: (progress) => setStage(progress?.message || ""),
        });
        const finalResponse = applySideEffects(response);
        setMessages((current) => [...current, finalResponse]);
      } catch (progress) {
        if (progress?.name === "AbortError") return;
        setError("The assistant lost its train of thought. Please ask again.");
      } finally {
        setThinking(false);
        setStage("");
      }
    },
    [thinking, products, contextProduct, wishlist.saved, recently.ids, purchasedIds, preferences, user?.firstName, applySideEffects]
  );

  const startNewConversation = useCallback(() => {
    clearAiSession(AI_SESSION_SCOPES.SHOPPING, user?.id);
    setMessages([
      buildShoppingResponse({
        type: "TEXT",
        text: AI_SHOPPING_GREETING(user?.firstName),
        suggestions: ["Find my wedding look", "Show silk sarees", "What's trending?"],
      }),
    ]);
  }, [user?.firstName, user?.id]);

  const clearProductContext = useCallback(() => {
    searchParams.delete("product");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const quickPrompts = contextProduct ? AI_SHOPPING_PRODUCT_PROMPTS : AI_SHOPPING_QUICK_PROMPTS;

  return (
    <AccountShell breadcrumbItems={[{ label: "My PRATIKSHYA", to: "/account" }, { label: "AI Shopping" }]}>
      <section aria-labelledby="ai-shopping-heading">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.24em] text-accent">
              <Sparkles size={13} aria-hidden="true" /> {AI_SHOPPING_BRAND.name}
            </p>
            <h1 id="ai-shopping-heading" className="mt-2 font-display text-4xl font-light tracking-tight text-ink sm:text-5xl">
              Your personal fashion <span className="italic text-accent">companion.</span>
            </h1>
            <p className="mt-3 max-w-xl font-ui text-sm leading-relaxed text-taupe">
              Tell me the occasion, the colour, the cloth or the budget — I will walk you through the current atelier edit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isMockAiProvider() ? (
              <p className="border border-mist/80 bg-surface/40 px-3 py-2 font-ui text-[9px] uppercase tracking-[.16em] text-taupe">
                Demo assistant · deterministic
              </p>
            ) : null}
            <AtelierButton variant="outline" size="chip" onClick={startNewConversation}>
              <RotateCcw size={11} aria-hidden="true" /> New conversation
            </AtelierButton>
          </div>
        </div>

        {contextProduct ? (
          <div className="mb-6 flex items-center gap-4 border border-mist/80 bg-surface/40 p-3 sm:p-4">
            <div className="h-16 w-12 shrink-0 overflow-hidden border border-mist/70">
              <PratikshyaImage image={contextProduct.image} alt={contextProduct.name} className="h-full w-full object-cover" loading="lazy" sizes="48px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-ui text-[9px] uppercase tracking-[.18em] text-accent">Discussing this piece</p>
              <p className="truncate font-display text-lg font-light text-ink">{contextProduct.name}</p>
              <p className="font-ui text-[11px] text-taupe">Ask for similar pieces, pairings or alternatives.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <AtelierButton as={Link} to={`/product/${contextProduct.slug}`} variant="outline" size="chip">
                View
              </AtelierButton>
              <button
                type="button"
                onClick={clearProductContext}
                aria-label="Stop discussing this piece"
                className="border border-mist p-2 text-taupe transition-colors hover:border-ink hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <AiConversationLog ref={logRef} ariaLabel="AI shopping conversation" className="h-[520px] sm:h-[560px]">
              {messages.map((message) =>
                message.role === "user" ? (
                  <AiUserBubble key={message.id} text={message.text} at={timeLabel(message.createdAt)} />
                ) : (
                  <AiShoppingMessage
                    key={message.id}
                    message={message}
                    bag={cart}
                    wishlist={wishlist}
                    onSuggestion={send}
                  />
                )
              )}
              {thinking ? <AiThinkingIndicator stage={stage} label="PRATIKSHYA AI is preparing recommendations" /> : null}
              {error ? (
                <p role="alert" className="border border-accent/40 bg-accent/5 px-4 py-3 font-ui text-sm text-accent">
                  {error}
                </p>
              ) : null}
            </AiConversationLog>

            <div className="mt-4">
              <AiComposer
                value={draft}
                onChange={setDraft}
                onSubmit={send}
                busy={thinking}
                label="Ask PRATIKSHYA AI about a piece, occasion or budget"
                placeholder={contextProduct ? `Ask about ${contextProduct.name}…` : "I need something for my sister's wedding…"}
                hint="Press Enter to send"
              />
              <p className="mt-2 font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
                {AI_PROVIDER_LABEL} · answers from the live catalogue
              </p>
            </div>
          </div>

          <aside className="min-w-0 space-y-6" aria-label="Assistant context">
            <div className="border border-mist/80 bg-surface/30 p-5">
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Suggested</p>
              <h2 className="mt-1 font-display text-2xl font-light text-ink">Begin anywhere</h2>
              <Rule width="w-8" tone="accent" className="my-3" />
              <AiQuickPrompts prompts={quickPrompts} onPick={send} disabled={thinking} ariaLabel="Suggested shopping prompts" />
            </div>

            <div className="border border-mist/80 bg-surface/30 p-5">
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">The house</p>
              <h2 className="mt-1 font-display text-2xl font-light text-ink">Also in your account</h2>
              <Rule width="w-8" tone="accent" className="my-3" />
              <ul className="space-y-3 font-ui text-sm text-graphite">
                <li>
                  <Link to="/account/ai-mirror" className="inline-flex items-center gap-2 transition-colors hover:text-accent">
                    <Camera size={13} aria-hidden="true" /> Try apparel on with AI Mirror
                  </Link>
                </li>
                <li>
                  <Link to="/account/wishlist" className="transition-colors hover:text-accent">
                    Your wishlist · {wishlist.count} saved
                  </Link>
                </li>
                <li>
                  <Link to="/account/preferences" className="transition-colors hover:text-accent">
                    Tune your style profile
                  </Link>
                </li>
              </ul>
            </div>

            <p className="font-ui text-[10px] leading-relaxed tracking-[.02em] text-taupe">
              A demo experience grounded in the live catalogue — deterministic, not a trained model. Conversations stay on this device and never store images.
            </p>
          </aside>
        </div>
      </section>
    </AccountShell>
  );
}
