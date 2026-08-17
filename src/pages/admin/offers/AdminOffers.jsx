/**
 * PRATIKSHYA FASHON — Admin Offers (Phase 17)
 *
 * Premium promotion desk: metrics, search, filters and the offer register.
 * Reads the single offer repository — no second coupon dataset.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, Pause, Play, Plus, Search, X } from "lucide-react";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import AdminMetricCard from "../../../components/admin/AdminMetricCard";
import OfferStatusBadge from "../../../components/offers/OfferStatusBadge";
import { AtelierButton } from "../../../design-system";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import offerRepository, {
  OFFER_STATUS,
  OFFER_STATUS_OPTIONS,
  OFFER_TYPES,
  OFFER_TYPE_OPTIONS,
  describeEligibility,
  effectiveUsageCount,
  formatOfferDiscount,
} from "../../../services/offers/offerRepository";
import { useOffers } from "../../../hooks/useOffers";
import { formatINR } from "../../../utils/shopping";
import { employeeInputClass } from "../../../components/employee/EmployeeField";
import { cn } from "../../../utils/cn";

const usageLabel = (offer) => {
  const used = effectiveUsageCount(offer);
  if (offer.usageLimit > 0) return `${used} / ${offer.usageLimit}`;
  return `${used} / ∞`;
};

const formatShortDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

export default function AdminOffers() {
  const { admin } = useAdminAuth();
  const actor = admin ? { adminId: admin.adminId, name: admin.name || "Administrator" } : null;

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [collection, setCollection] = useState("ALL");
  const [usage, setUsage] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const filters = useMemo(
    () => ({ query, status, type, category, collection, usage, from, to }),
    [query, status, type, category, collection, usage, from, to]
  );
  const offers = useOffers(filters);
  const metrics = offerRepository.metrics();
  const activeFilterCount = [status, type, category, collection, usage]
    .filter((value) => value !== "ALL")
    .length + (from ? 1 : 0) + (to ? 1 : 0);

  const clearFilters = () => {
    setStatus("ALL");
    setType("ALL");
    setCategory("ALL");
    setCollection("ALL");
    setUsage("ALL");
    setFrom("");
    setTo("");
  };

  const runAction = (offer, action) => {
    const result =
      action === "activate"
        ? offerRepository.activate(offer.id, actor)
        : action === "pause"
          ? offerRepository.pause(offer.id, actor)
          : offerRepository.archive(offer.id, actor);
    setNotice(result.ok ? `${offer.code} updated.` : result.error || "Could not update offer.");
  };

  const filterFields = (
    <>
      <label className="block">
        <span className="mb-1.5 block font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Status</span>
        <select className={employeeInputClass()} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">All statuses</option>
          {OFFER_STATUS_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Type</span>
        <select className={employeeInputClass()} value={type} onChange={(event) => setType(event.target.value)}>
          <option value="ALL">All types</option>
          {OFFER_TYPE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Category</span>
        <select className={employeeInputClass()} value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="ALL">All categories</option>
          {offerRepository.categories.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Collection</span>
        <select className={employeeInputClass()} value={collection} onChange={(event) => setCollection(event.target.value)}>
          <option value="ALL">All collections</option>
          {offerRepository.collections.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Usage</span>
        <select className={employeeInputClass()} value={usage} onChange={(event) => setUsage(event.target.value)}>
          <option value="ALL">Any usage</option>
          <option value="LIMITED">Limited</option>
          <option value="UNLIMITED">Unlimited</option>
          <option value="EXHAUSTED">Exhausted</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block font-ui text-[10px] uppercase tracking-[.16em] text-taupe">From</span>
        <input type="date" className={employeeInputClass()} value={from} onChange={(event) => setFrom(event.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-ui text-[10px] uppercase tracking-[.16em] text-taupe">To</span>
        <input type="date" className={employeeInputClass()} value={to} onChange={(event) => setTo(event.target.value)} />
      </label>
    </>
  );

  return (
    <AdminPage
      eyebrow="Business / Offers"
      title={
        <>
          Offers <span className="italic text-accent">& promotions.</span>
        </>
      }
      description="One register for coupons and house promotions. Eligibility, validity and usage are decided here; checkout remains the pricing source of truth."
      actions={
        <AtelierButton as={Link} to="/admin/offers/new" size="chip">
          <Plus size={13} aria-hidden="true" /> Create offer
        </AtelierButton>
      }
    >
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <AdminMetricCard label="Total Offers" value={metrics.total} hint="Every record" />
        <AdminMetricCard label="Active" value={metrics.active} hint="Live for customers" />
        <AdminMetricCard label="Scheduled" value={metrics.scheduled} hint="Not yet open" />
        <AdminMetricCard label="Draft" value={metrics.draft} hint="In composition" />
        <AdminMetricCard label="Expired" value={metrics.expired} hint="Past validity" />
        <AdminMetricCard label="Paused" value={metrics.paused} hint="Held by the house" tone={metrics.paused ? "alert" : "default"} />
        <AdminMetricCard label="Usage Today" value={metrics.usageToday} hint="Orders placed today" />
        <AdminMetricCard label="Total Redemptions" value={metrics.totalRedemptions} hint="Lifetime uses" />
      </div>

      {notice ? (
        <p aria-live="polite" className="mb-5 border border-mist/80 bg-canvas px-4 py-3 font-ui text-sm text-ink">
          {notice}
        </p>
      ) : null}

      <AdminPanel
        eyebrow="Register"
        title="Offers"
        action={
          <span className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
            {offers.length} offer{offers.length === 1 ? "" : "s"}
          </span>
        }
      >
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="relative flex-1">
            <span className="sr-only">Search offers</span>
            <Search className="absolute left-3 top-3 text-taupe" size={15} aria-hidden="true" />
            <input
              className={cn(employeeInputClass(), "pl-9")}
              placeholder="Search code, name or description"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="inline-flex items-center gap-2 border border-mist px-3 py-2.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe lg:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <Filter size={13} aria-hidden="true" />
            Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </button>
        </div>

        <div className="mb-6 hidden grid-cols-2 gap-3 lg:grid xl:grid-cols-7">{filterFields}</div>

        {activeFilterCount ? (
          <div className="mb-5">
            <button
              type="button"
              onClick={clearFilters}
              className="font-ui text-[10px] uppercase tracking-[.14em] text-accent underline-offset-4 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : null}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-mist font-ui text-[10px] uppercase tracking-widest text-taupe">
                {["Offer Code", "Name", "Type", "Discount", "Eligibility", "Start", "End", "Usage", "Status", "Actions"].map(
                  (heading) => (
                    <th key={heading} className="px-3 py-3" scope="col">
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id} className="border-b border-mist/60 font-ui text-sm">
                  <td className="px-3 py-4 font-medium">
                    <Link to={`/admin/offers/${offer.id}`} className="underline-offset-4 hover:text-accent hover:underline">
                      {offer.code}
                    </Link>
                  </td>
                  <td className="px-3 py-4">{offer.name}</td>
                  <td className="px-3 py-4 text-taupe">
                    {offer.type === OFFER_TYPES.FIXED_AMOUNT ? "Fixed" : "Percent"}
                  </td>
                  <td className="px-3 py-4">{formatOfferDiscount(offer)}</td>
                  <td className="px-3 py-4 text-taupe">
                    {describeEligibility(offer)}
                    {offer.minimumOrderValue > 0 ? (
                      <span className="block text-[11px]">{formatINR(offer.minimumOrderValue)} minimum</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-4 text-taupe">{formatShortDate(offer.startDate)}</td>
                  <td className="px-3 py-4 text-taupe">{formatShortDate(offer.endDate)}</td>
                  <td className="px-3 py-4">{usageLabel(offer)}</td>
                  <td className="px-3 py-4">
                    <OfferStatusBadge status={offer.displayStatus} />
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/admin/offers/${offer.id}/edit`}
                        className="font-ui text-[10px] uppercase tracking-[.14em] text-brass hover:text-accent"
                      >
                        Edit
                      </Link>
                      {offer.displayStatus === OFFER_STATUS.PAUSED || offer.displayStatus === OFFER_STATUS.DRAFT ? (
                        <button
                          type="button"
                          onClick={() => runAction(offer, "activate")}
                          className="inline-flex items-center gap-1 font-ui text-[10px] uppercase tracking-[.14em] text-ink"
                        >
                          <Play size={11} aria-hidden="true" /> Activate
                        </button>
                      ) : null}
                      {offer.displayStatus === OFFER_STATUS.ACTIVE ? (
                        <button
                          type="button"
                          onClick={() => runAction(offer, "pause")}
                          className="inline-flex items-center gap-1 font-ui text-[10px] uppercase tracking-[.14em] text-taupe"
                        >
                          <Pause size={11} aria-hidden="true" /> Pause
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {offers.map((offer) => (
            <Link
              key={offer.id}
              to={`/admin/offers/${offer.id}`}
              className="block border border-mist/80 bg-canvas p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-ui text-xs font-medium text-ink">{offer.code}</p>
                  <p className="mt-1 font-display text-lg font-light">{offer.name}</p>
                </div>
                <OfferStatusBadge status={offer.displayStatus} />
              </div>
              <p className="mt-3 font-ui text-xs text-taupe">
                {formatOfferDiscount(offer)} · {describeEligibility(offer)}
              </p>
              <p className="mt-1 font-ui text-[11px] text-taupe">
                {formatShortDate(offer.startDate)} – {formatShortDate(offer.endDate)} · {usageLabel(offer)}
              </p>
            </Link>
          ))}
        </div>

        {!offers.length ? (
          <p className="py-12 text-center font-ui text-sm text-taupe">No offers match the current filters.</p>
        ) : null}
      </AdminPanel>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Offer filters"
            className="absolute inset-y-0 left-0 flex w-full max-w-sm flex-col bg-canvas"
          >
            <div className="flex h-16 items-center justify-between border-b border-mist/70 px-5">
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-ink">Filters</p>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">{filterFields}</div>
            <div className="flex gap-3 border-t border-mist/70 px-5 py-4">
              <AtelierButton variant="outline" size="chip" className="flex-1 justify-center" onClick={clearFilters}>
                Clear
              </AtelierButton>
              <AtelierButton size="chip" className="flex-1 justify-center" onClick={() => setDrawerOpen(false)}>
                Show {offers.length}
              </AtelierButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
