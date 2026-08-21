import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import AccountShell from "../../components/account/AccountShell";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge";
import { useAccount } from "../../context/AccountContext";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useOrder } from "../../context/OrderContext";
import { useWishlist } from "../../context/WishlistContext";
import {
  AtelierButton,
  EditorialHeading,
  MediaFrame,
  ProductCard,
  Rule,
} from "../../design-system";
import { getProductById, productHref } from "../../data/products";
import { imageRef } from "../../data/mediaPlaceholder";
import { resolveCollectionCover } from "../../services/media/mediaResolver";
import { useProductCovers } from "../../hooks/useMedia";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed";
import { ORDER_STATUS, RETURN_STATUS, getReturnStatus } from "../../config/orderConfig";
import offerRepository, {
  formatOfferDiscount,
  describeEligibility,
} from "../../services/offers/offerRepository";
import taxonomyRepository from "../../services/taxonomyRepository";
import { getStylePreferences, hasStylePreferences } from "../../services/customer/stylePreferences";
import { getPersonalizedProducts } from "../../services/customer/personalization";
import { formatOrderDate, orderItemCount } from "../../utils/orders";
import { formatINR } from "../../utils/shopping";

const ACTIVE_ORDER_RANK = [
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.READY_TO_DISPATCH,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.PICKING,
  ORDER_STATUS.ALLOCATED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.ORDER_CONFIRMED,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PAYMENT_CONFIRMED,
  ORDER_STATUS.PLACED,
  ORDER_STATUS.PENDING_PAYMENT,
];

const CLOSED_RETURNS = new Set([RETURN_STATUS.REFUNDED, RETURN_STATUS.REJECTED]);

const profileCompleteness = (profile) => {
  if (!profile) return 0;
  const fields = [profile.firstName, profile.lastName, profile.email, profile.phone, profile.dateOfBirth];
  const filled = fields.filter((value) => String(value || "").trim()).length;
  return Math.round((filled / fields.length) * 100);
};

const orderThumb = (item) => {
  if (!item) return imageRef("hero-atelier");
  if (item.image && typeof item.image === "object") return item.image;
  const product = item.productId ? getProductById(item.productId) : null;
  return product?.image || imageRef("hero-atelier");
};

function SectionHead({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <EditorialHeading
        as="h2"
        size="subsection"
        eyebrow={eyebrow}
        description={description}
        spacing={{ eyebrow: "mb-2", title: "mb-2", description: "mb-0" }}
      >
        {title}
      </EditorialHeading>
      {action}
    </div>
  );
}

function QuietEmpty({ title, description, to, cta }) {
  return (
    <div className="border border-mist/70 bg-surface/30 px-6 py-8 sm:px-8">
      <p className="font-display text-xl font-light text-ink">{title}</p>
      <p className="mt-2 max-w-md font-ui text-sm leading-relaxed text-taupe">{description}</p>
      {to ? (
        <div className="mt-5">
          <AtelierButton as={Link} to={to} variant="outline" size="chip">
            {cta}
          </AtelierButton>
        </div>
      ) : null}
    </div>
  );
}

function ProductRail({ products, wishlist }) {
  const rows = useProductCovers(products);
  if (!rows.length) return null;
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 scrollbar-none sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
      {rows.map((product) => (
        <div key={product.id} className="w-[68vw] max-w-[220px] shrink-0 sm:w-auto sm:max-w-none">
          <ProductCard
            product={product}
            as={Link}
            to={productHref(product)}
            showCategory
            showBadge
            showDiscount
            showAvailability
            onWishlist={wishlist.toggle}
            isWishlisted={wishlist.isSaved(product)}
            wishlistIcon={Heart}
          />
        </div>
      ))}
    </div>
  );
}

export default function AccountDashboard() {
  const { user } = useAuth();
  const { profile, addresses, defaultAddress } = useAccount();
  const { orders } = useOrder();
  const wishlist = useWishlist();
  const cart = useCart();
  const recently = useRecentlyViewed(4);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "My PRATIKSHYA — PRATIKSHYA FASHON";
    const robots = document.querySelector('meta[name="robots"]');
    const created = !robots;
    const node = robots || document.createElement("meta");
    node.setAttribute("name", "robots");
    node.setAttribute("content", "noindex, nofollow");
    if (created) document.head.appendChild(node);
    return () => {
      document.title = prevTitle;
      if (created && node.parentNode) node.parentNode.removeChild(node);
    };
  }, []);

  const firstName = profile?.firstName || user?.firstName || "there";

  const activeOrder = useMemo(() => {
    const ranked = orders
      .map((order) => ({ order, rank: ACTIVE_ORDER_RANK.indexOf(order.status) }))
      .filter((entry) => entry.rank >= 0)
      .sort((a, b) => a.rank - b.rank || new Date(b.order.createdAt) - new Date(a.order.createdAt));
    return ranked[0]?.order ?? null;
  }, [orders]);

  const recentOrders = orders.slice(0, 3);

  const activeReturns = useMemo(() => {
    const list = [];
    orders.forEach((order) => {
      (order.returns ?? []).forEach((record) => {
        if (!CLOSED_RETURNS.has(record.status)) {
          list.push({ order, record });
        }
      });
    });
    return list;
  }, [orders]);

  const offers = useMemo(
    () =>
      offerRepository.listCustomerVisible({
        customerId: user?.id,
        customerEmail: user?.email || profile?.email,
      }),
    [user?.id, user?.email, profile?.email]
  );

  const collections = useMemo(
    () =>
      taxonomyRepository
        .activeCollections()
        .filter((entry) => entry.featured || ["new-arrivals", "bridal-trousseau", "festive-edit", "silk", "wedding"].includes(entry.id))
        .slice(0, 5),
    []
  );

  const preferences = useMemo(() => getStylePreferences(user?.id), [user?.id]);

  const personal = useMemo(
    () =>
      getPersonalizedProducts({
        wishlistProducts: wishlist.products,
        recentlyViewed: recently.products,
        orders,
        preferences,
        limit: 4,
      }),
    [wishlist.products, recently.products, orders, preferences]
  );

  const style = personal.signals;
  const complete = profileCompleteness(profile);
  const wishlistPreview = wishlist.products.slice(-4).reverse();

  const shortcuts = [
    { label: "Orders", value: `${orders.length} ${orders.length === 1 ? "order" : "orders"}`, to: "/account/orders" },
    { label: "Wishlist", value: `${wishlist.count} saved`, to: "/account/wishlist" },
    {
      label: "Returns",
      value: activeReturns.length ? `${activeReturns.length} active` : "All clear",
      to: activeReturns[0] ? `/account/orders/${activeReturns[0].order.id}/return` : "/account/orders",
    },
    { label: "Offers", value: offers.length ? `${offers.length} available` : "None just now", to: "/shop" },
    { label: "Addresses", value: `${addresses.length} saved`, to: "/account/addresses" },
    { label: "Profile", value: `${complete}% complete`, to: "/account/profile" },
  ];

  return (
    <AccountShell breadcrumbItems={[{ label: "My PRATIKSHYA" }]}>
      <div className="space-y-16 md:space-y-20">
        <section aria-label="Shopping shortcuts">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {shortcuts.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="border border-mist/70 bg-surface/40 px-4 py-4 transition-colors hover:border-ink/40"
              >
                <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">{item.label}</p>
                <p className="mt-2 font-display text-lg font-light text-ink">{item.value}</p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="ai-mirror-dashboard-heading" className="relative isolate overflow-hidden border border-ink/15 bg-ink text-ivory">
          <MediaFrame
            image={imageRef("saree-ivory-silk")}
            alt="PRATIKSHYA AI Mirror curated preview scene"
            aspect="landscape"
            className="absolute inset-0 z-0 h-full w-full opacity-25 mix-blend-luminosity"
            imageClassName="object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 z-[1] bg-gradient-to-r from-ink via-ink/90 to-ink/45" />
          <div className="relative z-10 grid gap-6 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-12 lg:px-10">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.24em] text-gold">
                <Sparkles size={14} aria-hidden="true" /> PRATIKSHYA AI MIRROR
              </p>
              <h2 id="ai-mirror-dashboard-heading" className="mt-4 font-display text-4xl font-light leading-[.92] sm:text-5xl">
                Your digital <span className="italic text-gold">fitting room.</span>
              </h2>
              <p className="mt-4 max-w-xl font-ui text-sm leading-relaxed text-ash">
                Explore your next look with AI Mirror. Step into a live camera view or enjoy the curated preview experience — no photos are stored.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <AtelierButton as={Link} to="/account/ai-mirror" variant="inverse" size="md">
                Open AI Mirror <ArrowRight size={15} aria-hidden="true" />
              </AtelierButton>
              <p className="font-ui text-[9px] uppercase tracking-[.16em] text-ash">Demo preview · Apparel edit</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="ai-shopping-dashboard-heading">
          <div className="grid gap-6 border border-accent/30 bg-surface/40 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-12 lg:px-10">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.24em] text-accent">
                <Sparkles size={14} aria-hidden="true" /> PRATIKSHYA AI · SHOPPING
              </p>
              <h2 id="ai-shopping-dashboard-heading" className="mt-4 font-display text-4xl font-light leading-[.92] text-ink sm:text-5xl">
                Your personal fashion <span className="italic text-accent">companion.</span>
              </h2>
              <p className="mt-4 max-w-xl font-ui text-sm leading-relaxed text-taupe">
                Tell the assistant the occasion, the colour or the budget — it walks you through the current atelier edit, grounded in the live catalogue.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <AtelierButton as={Link} to="/account/ai-shopping" variant="primary" size="md">
                Ask the Assistant <ArrowRight size={15} aria-hidden="true" />
              </AtelierButton>
              <p className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe">Demo assistant · deterministic</p>
            </div>
          </div>
        </section>

        <section aria-label="Your bag">
          <div className="flex flex-wrap items-center justify-between gap-4 border border-mist/70 bg-surface/30 px-5 py-4 sm:px-6">
            <div>
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">Your bag</p>
              <p className="mt-1 font-ui text-sm text-ink">
                {cart.count
                  ? `${cart.count} ${cart.count === 1 ? "piece" : "pieces"} · ${formatINR(cart.totals.subtotal)}`
                  : "Your bag is waiting for a piece."}
              </p>
            </div>
            <AtelierButton as={Link} to="/cart" variant="outline" size="chip">
              View Bag
            </AtelierButton>
          </div>
        </section>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <section aria-labelledby="active-order-heading">
            <SectionHead
              eyebrow="On its way"
              title={<>Active <span className="italic text-accent">order</span></>}
            />
            {activeOrder ? (
              <div className="border border-mist/70 bg-surface/30 p-5 sm:p-6">
                <div className="flex gap-4">
                  <MediaFrame
                    image={orderThumb(activeOrder.items[0])}
                    alt={activeOrder.items[0]?.name || ""}
                    aspect="portrait"
                    className="h-24 w-[4.5rem] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p id="active-order-heading" className="font-ui text-xs text-ink">
                      {activeOrder.id}
                    </p>
                    <p className="mt-1 truncate font-ui text-sm text-graphite">
                      {activeOrder.items[0]?.name}
                    </p>
                    <div className="mt-2">
                      <OrderStatusBadge status={activeOrder.status} kind="order" />
                    </div>
                    {activeOrder.estimatedDelivery ? (
                      <p className="mt-2 font-ui text-[11px] text-taupe">
                        Estimated {activeOrder.estimatedDelivery}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-5">
                  <AtelierButton as={Link} to={`/account/orders/${activeOrder.id}/track`} variant="primary" size="chip">
                    Track Order
                  </AtelierButton>
                </div>
              </div>
            ) : (
              <QuietEmpty
                title="Nothing on its way yet."
                description="Discover something beautiful for your next occasion."
                to="/shop"
                cta="Start Shopping"
              />
            )}
          </section>

          <section aria-labelledby="continue-heading">
            <SectionHead
              eyebrow="Continue exploring"
              title={<>You were looking at <span className="italic text-accent">these</span></>}
            />
            {recently.products.length ? (
              <>
                <h2 id="continue-heading" className="sr-only">Recently viewed</h2>
                <ProductRail products={recently.products} wishlist={wishlist} />
              </>
            ) : (
              <QuietEmpty
                title="Your next favourite piece is waiting."
                description="Your next discovery starts here."
                to="/collections/new-arrivals"
                cta="Explore New Arrivals"
              />
            )}
          </section>
        </div>

        <section aria-label="Recent orders">
          <SectionHead
            eyebrow="Order history"
            title={<>Recent <span className="italic text-accent">purchases</span></>}
            action={
              <AtelierButton as={Link} to="/account/orders" variant="outline" size="chip">
                View All Orders
              </AtelierButton>
            }
          />
          {recentOrders.length ? (
            <ul className="divide-y divide-mist/70 border border-mist/70">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                  <div>
                    <Link to={`/account/orders/${order.id}`} className="font-ui text-xs text-ink hover:text-accent">
                      {order.id}
                    </Link>
                    <p className="mt-1 font-ui text-[11px] text-taupe">
                      {formatOrderDate(order.createdAt)} · {orderItemCount(order)}{" "}
                      {orderItemCount(order) === 1 ? "piece" : "pieces"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-ui text-xs text-ink">{formatINR(order.pricing.total)}</p>
                    <OrderStatusBadge status={order.status} kind="order" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <QuietEmpty
              title="Your next favourite piece is waiting."
              description="When you place an order, it will live here."
              to="/shop"
              cta="Start Shopping"
            />
          )}
        </section>

        {activeReturns.length ? (
          <section aria-label="Returns">
            <SectionHead eyebrow="Returns" title={<>Return in <span className="italic text-accent">progress</span></>} />
            <div className="grid gap-4 md:grid-cols-2">
              {activeReturns.slice(0, 2).map(({ order, record }) => (
                <div key={record.id} className="border border-mist/70 bg-surface/30 p-5">
                  <p className="font-ui text-[10px] uppercase tracking-[.18em] text-accent">Return in progress</p>
                  <p className="mt-2 font-ui text-xs text-ink">{record.id}</p>
                  <p className="mt-1 truncate font-ui text-sm text-graphite">{record.items[0]?.name}</p>
                  <p className="mt-2 font-ui text-[11px] text-taupe">{getReturnStatus(record.status).label}</p>
                  <div className="mt-4">
                    <AtelierButton as={Link} to={`/account/orders/${order.id}/return`} variant="outline" size="chip">
                      View Return
                    </AtelierButton>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section aria-label="Returns">
            <QuietEmpty
              title="You're all clear."
              description="When a return is in progress, you will find it here."
              to="/account/orders"
              cta="View Orders"
            />
          </section>
        )}

        <section aria-label="Wishlist">
          <SectionHead
            eyebrow="Saved"
            title={<>Your <span className="italic text-accent">wishlist</span></>}
            action={
              <AtelierButton as={Link} to="/account/wishlist" variant="outline" size="chip">
                View Wishlist
              </AtelierButton>
            }
          />
          {wishlistPreview.length ? (
            <ProductRail products={wishlistPreview} wishlist={wishlist} />
          ) : (
            <QuietEmpty
              title="Nothing saved yet."
              description="Save pieces you love and find them here later."
              to="/shop"
              cta="Explore Collection"
            />
          )}
        </section>

        <section aria-label="Just for you">
          <SectionHead
            eyebrow="Just for you"
            title={<>Pieces selected around what you <span className="italic text-accent">explore</span></>}
            description={style.reason}
          />
          {personal.products.length ? (
            <ProductRail products={personal.products} wishlist={wishlist} />
          ) : (
            <QuietEmpty
              title="Your next discovery starts here."
              description="Explore a few pieces and this edit will begin to take shape."
              to="/collections/new-arrivals"
              cta="Explore New Arrivals"
            />
          )}
        </section>

        <section aria-label="Offers">
          <SectionHead eyebrow="Atelier offers" title={<>For <span className="italic text-accent">you</span></>} />
          {offers.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {offers.slice(0, 3).map((offer) => (
                <article key={offer.id} className="flex flex-col justify-between border border-mist/70 bg-surface/30 p-5">
                  <div>
                    <p className="font-ui text-[10px] uppercase tracking-[.22em] text-accent">{offer.code}</p>
                    <p className="mt-2 font-display text-xl font-light text-ink">{formatOfferDiscount(offer)}</p>
                    <p className="mt-2 font-ui text-xs leading-relaxed text-taupe">
                      {describeEligibility(offer)}
                      {offer.minimumOrderValue > 0 ? ` · Min ${formatINR(offer.minimumOrderValue)}` : ""}
                    </p>
                    {offer.endDate ? (
                      <p className="mt-2 font-ui text-[11px] text-taupe">Until {offer.endDate}</p>
                    ) : null}
                  </div>
                  <div className="mt-5">
                    <AtelierButton as={Link} to="/shop" variant="outline" size="chip">
                      Shop Collection
                    </AtelierButton>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <QuietEmpty
              title="New offers will appear here when they're available."
              description="The atelier will share seasonal invitations in this space."
              to="/shop"
              cta="Continue Shopping"
            />
          )}
        </section>

        <section aria-label="Featured collections">
          <SectionHead eyebrow="The house" title={<>Featured <span className="italic text-accent">collections</span></>} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                to={`/collections/${collection.slug}`}
                className="group block overflow-hidden border border-mist/70"
              >
                <MediaFrame
                  image={resolveCollectionCover(collection)}
                  alt=""
                  aspect="landscape"
                  overlay="imageBottom"
                  zoom="strong"
                />
                <div className="px-5 py-5">
                  <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
                    {collection.eyebrow || "Collection"}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-light text-ink">{collection.name}</h3>
                  <p className="mt-2 font-ui text-sm leading-relaxed text-taupe">
                    {collection.shortDescription || collection.description}
                  </p>
                  <p className="mt-4 font-ui text-[11px] uppercase tracking-[.16em] text-ink group-hover:text-accent">
                    Explore Collection →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="Your style">
          <SectionHead
            eyebrow="Your style"
            title={<>Taste, as it <span className="italic text-accent">unfolds</span></>}
            action={
              <AtelierButton as={Link} to="/account/preferences" variant="outline" size="chip">
                Style Preferences
              </AtelierButton>
            }
          />
          {style.sufficient || hasStylePreferences(preferences) ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[
                { label: "Favourite categories", items: style.favouriteCategories },
                { label: "Favourite collections", items: style.favouriteCollections },
                { label: "Frequently viewed fabrics", items: style.favouriteFabrics },
                { label: "Occasions you explore", items: style.favouriteOccasions },
              ].map((group) =>
                group.items.length ? (
                  <div key={group.label}>
                    <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">{group.label}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <span
                          key={item.id}
                          className="border border-pearl px-3 py-1.5 font-ui text-[11px] uppercase tracking-[.12em] text-ink"
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          ) : (
            <QuietEmpty
              title="Your style is still unfolding."
              description="Explore a few pieces and your space will begin to reflect your taste."
              to="/category/sarees"
              cta="Explore Sarees"
            />
          )}
        </section>

        <section aria-label="Account management" className="grid gap-5 md:grid-cols-3">
          <div className="border border-mist/70 bg-surface/30 p-6">
            <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Personal details</p>
            <Rule width="w-8" tone="accent" className="my-3" />
            <p className="font-ui text-sm text-ink">{[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || firstName}</p>
            <p className="mt-1 truncate font-ui text-xs text-taupe">{profile?.email}</p>
            <p className="mt-1 font-ui text-xs text-taupe">{profile?.phone || "No phone added"}</p>
            <div className="mt-5">
              <AtelierButton as={Link} to="/account/profile" variant="outline" size="chip">
                Manage Profile
              </AtelierButton>
            </div>
          </div>

          <div className="border border-mist/70 bg-surface/30 p-6">
            <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Address book</p>
            <Rule width="w-8" tone="accent" className="my-3" />
            {defaultAddress ? (
              <>
                <p className="font-ui text-sm text-ink">{defaultAddress.type || "Home"}</p>
                <p className="mt-1 font-ui text-xs text-taupe">
                  {defaultAddress.city}
                  {defaultAddress.state ? `, ${defaultAddress.state}` : ""}
                </p>
              </>
            ) : (
              <p className="font-ui text-sm text-taupe">No saved address yet.</p>
            )}
            <div className="mt-5">
              <AtelierButton as={Link} to="/account/addresses" variant="outline" size="chip">
                Manage Addresses
              </AtelierButton>
            </div>
          </div>

          <div className="border border-mist/70 bg-surface/30 p-6">
            <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Account security</p>
            <Rule width="w-8" tone="accent" className="my-3" />
            <p className="font-ui text-xs text-taupe">Email · {profile?.email ? "on file" : "not set"}</p>
            <p className="mt-1 font-ui text-xs text-taupe">Phone · {profile?.phone ? "on file" : "not set"}</p>
            <p className="mt-1 font-ui text-xs text-taupe">Password · protected</p>
            <div className="mt-5">
              <AtelierButton as={Link} to="/account/security" variant="outline" size="chip">
                Account Security
              </AtelierButton>
            </div>
          </div>
        </section>
      </div>
    </AccountShell>
  );
}
