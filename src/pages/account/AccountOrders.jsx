import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, X } from "lucide-react";
import AccountShell from "../../components/account/AccountShell";
import OrderCard from "../../components/orders/OrderCard";
import { useOrder } from "../../context/OrderContext";
import {
  AtelierButton,
  EditorialHeading,
  EmptyState,
  Rule,
  transition,
} from "../../design-system";
import { ORDER_FILTERS } from "../../config/orderConfig";
import { cn } from "../../utils/cn";

/**
 * Order history — /account/orders.
 *
 * Every order this customer has placed, set as editorial cards rather than
 * a dashboard table. Filtering and searching are frontend-only over the
 * orders already in state; there is no backend query and no full-text
 * search behind this page.
 */
export default function AccountOrders() {
  const { orders, guestOrderCount, claimGuestOrders } = useOrder();
  const [filterId, setFilterId] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "My Orders — PRATIKSHYA FASHON";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  /** Orders matching the chosen status filter and the order-id search. */
  const visibleOrders = useMemo(() => {
    const filter = ORDER_FILTERS.find((entry) => entry.id === filterId);
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      const statusMatch = !filter?.statuses || filter.statuses.includes(order.status);
      const searchMatch = !term || order.id.toLowerCase().includes(term);
      return statusMatch && searchMatch;
    });
  }, [orders, filterId, query]);

  /** How many orders sit behind each filter, so empty filters read honestly. */
  const filterCounts = useMemo(() => {
    const counts = {};
    ORDER_FILTERS.forEach((filter) => {
      counts[filter.id] = filter.statuses
        ? orders.filter((order) => filter.statuses.includes(order.status)).length
        : orders.length;
    });
    return counts;
  }, [orders]);

  const breadcrumbs = [{ label: "Account", to: "/account" }, { label: "Orders" }];

  /* ------------------------- No orders at all ------------------------- */

  if (orders.length === 0) {
    return (
      <AccountShell breadcrumbItems={breadcrumbs}>
        <div className="border border-mist/80 bg-surface/30 px-6 py-4 sm:px-10">
          <EmptyState
            eyebrow="My Orders"
            title="Your journey starts here"
            description="Your purchases will appear here once you've found something you love."
            actions={
              <div className="flex flex-wrap items-center justify-center gap-4">
                <AtelierButton as={Link} to="/shop" variant="primary" size="md">
                  Explore Collection <ArrowRight size={14} aria-hidden="true" />
                </AtelierButton>
                <AtelierButton
                  as={Link}
                  to="/collections/new-arrivals"
                  variant="outline"
                  size="md"
                >
                  New Arrivals
                </AtelierButton>
              </div>
            }
          />
        </div>
        {guestOrderCount > 0 ? (
          <GuestOrderNotice count={guestOrderCount} onClaim={claimGuestOrders} />
        ) : null}
      </AccountShell>
    );
  }

  /* ----------------------------- History ----------------------------- */

  return (
    <AccountShell breadcrumbItems={breadcrumbs}>
      <EditorialHeading
        as="h2"
        size="subsection"
        eyebrow="Order History"
        description="Every purchase, beautifully organized."
        spacing={{ eyebrow: "mb-3", title: "mb-3", description: "mb-0" }}
      >
        My <span className="italic text-accent">orders.</span>
      </EditorialHeading>

      <Rule width="w-14" tone="accent" className="my-7" />

      {guestOrderCount > 0 ? (
        <GuestOrderNotice count={guestOrderCount} onClaim={claimGuestOrders} />
      ) : null}

      {/* ------------------------ Filters + search ------------------------ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Filter orders by status"
          className="-mx-1 flex flex-wrap gap-2 px-1"
        >
          {ORDER_FILTERS.map((filter) => {
            const isActive = filter.id === filterId;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setFilterId(filter.id)}
                aria-pressed={isActive}
                className={cn(
                  "border px-3.5 py-2 font-ui text-[10px] uppercase tracking-[.14em] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  transition.all,
                  isActive
                    ? "border-ink bg-ink text-ivory"
                    : "border-mist bg-canvas text-taupe hover:border-accent hover:text-accent"
                )}
              >
                {filter.label}
                <span className="ml-1.5 text-[9px] opacity-70">
                  {filterCounts[filter.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <label htmlFor="order-search" className="sr-only">
            Search orders by order ID
          </label>
          <Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe"
          />
          <input
            id="order-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by order ID"
            className="w-full border border-mist bg-canvas py-2.5 pl-9 pr-9 font-ui text-xs text-ink placeholder:text-taupe focus:border-accent focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear order search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-taupe transition-colors hover:text-accent"
            >
              <X size={13} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {visibleOrders.length}{" "}
        {visibleOrders.length === 1 ? "order" : "orders"} shown.
      </p>

      {/* ----------------------------- Cards ----------------------------- */}
      {visibleOrders.length === 0 ? (
        <div className="mt-8 border border-mist/80 bg-surface/30 px-6">
          <EmptyState
            eyebrow="No Match"
            title="Nothing under this view"
            description="No orders match this filter or search just yet. Try another status, or clear your search."
            actions={
              <AtelierButton
                type="button"
                variant="outline"
                size="md"
                onClick={() => {
                  setFilterId("all");
                  setQuery("");
                }}
              >
                Show All Orders
              </AtelierButton>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {visibleOrders.map((order, index) => (
            <OrderCard key={order.id} order={order} index={index} />
          ))}
        </div>
      )}

      <p className="mt-10 font-ui text-[10px] uppercase tracking-[.18em] text-taupe">
        Demonstration orders only — no real transactions are recorded.
      </p>
    </AccountShell>
  );
}

/**
 * Guest orders placed in this browser before signing in. Adding them to
 * the account is deliberate and one-way; nothing merges automatically for
 * an existing session.
 */
function GuestOrderNotice({ count, onClaim }) {
  const [claimed, setClaimed] = useState(false);
  if (claimed) return null;

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-accent/30 bg-accent/5 px-5 py-4">
      <p className="font-ui text-[11px] leading-relaxed text-accent">
        {count} {count === 1 ? "order was" : "orders were"} placed as a guest in
        this browser. Add {count === 1 ? "it" : "them"} to your account to keep
        everything in one place.
      </p>
      <button
        type="button"
        onClick={() => {
          onClaim?.();
          setClaimed(true);
        }}
        className="font-ui text-[10px] uppercase tracking-[.16em] text-accent underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
      >
        Add to My Account
      </button>
    </div>
  );
}
