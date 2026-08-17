import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ImageOff,
  Images,
  IndianRupee,
  PackageX,
  RotateCcw,
  ShoppingBag,
  Timer,
  Users,
} from "lucide-react";
import { AtelierButton } from "../../design-system";
import AdminPage from "../../components/admin/AdminPage";
import AdminPanel from "../../components/admin/AdminPanel";
import AdminMetricCard from "../../components/admin/AdminMetricCard";
import SalesOverviewChart from "../../components/admin/SalesOverviewChart";
import CategorySalesBars from "../../components/admin/CategorySalesBars";
import DataTable from "../../components/employee/DataTable";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useOrder } from "../../context/OrderContext";
import { useMediaMetrics } from "../../hooks/useMedia";
import { useInventory } from "../../context/InventoryContext";
import {
  getBusinessMetrics,
  getDepartmentPerformance,
  getMetricTrends,
  getRecentOrders,
  getSalesByCategory,
  getSalesSeries,
  getSalesSummary,
} from "../../services/admin/adminDashboardService";
import { adminFirstName, formatAdminNumber, formatCompactINR, greetingForAdmin } from "../../utils/admin";
import { formatINR } from "../../utils/shopping";

/**
 * BUSINESS OVERVIEW — the Admin Portal's front page.
 *
 * Every figure is either read from live shared state (orders, inventory,
 * media) or from the centralised admin mock data. Nothing randomises per
 * render. Employee administration lives in the Employee Portal only —
 * this desk is business administration.
 */
export default function AdminDashboard() {
  const { admin } = useAdminAuth();
  const { getOrders, allOrders } = useOrder();
  /* One line of media health, read from the same register the Media
     Library uses. */
  const media = useMediaMetrics();
  const inventory = useInventory();

  const metrics = useMemo(
    () => getBusinessMetrics([], null, allOrders),
    [allOrders]
  );
  const trends = getMetricTrends();
  const series = getSalesSeries();
  const categories = getSalesByCategory();
  const summary = useMemo(() => getSalesSummary(), []);
  const departments = useMemo(() => getDepartmentPerformance(), []);
  const alerts = inventory.records
    .filter((row) => row.status === "LOW_STOCK" || row.status === "OUT_OF_STOCK")
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      piece: row.productName,
      department: row.placement.department || row.category,
      sku: row.sku,
      level: row.status === "OUT_OF_STOCK" ? "OUT" : "LOW",
      remaining: row.quantity.available,
    }));
  const orders = useMemo(() => getRecentOrders(getOrders()), [getOrders]);
  const ordersAreDemo = orders.some((order) => order.isDemo);

  const tiles = [
    { label: "Today's sales", value: formatINR(metrics.todaysSales), hint: trends.todaysSales, icon: IndianRupee },
    { label: "Total orders", value: formatAdminNumber(metrics.totalOrders), hint: trends.totalOrders, icon: ShoppingBag },
    { label: "Customers", value: formatAdminNumber(metrics.customers), hint: trends.customers, icon: Users },
    { label: "Inventory value", value: formatCompactINR(inventory.metrics.estimatedValue), hint: "Estimated · available × selling price", icon: Boxes },
    { label: "Low stock", value: formatAdminNumber(inventory.metrics.lowStock), hint: "Live inventory ledger", icon: AlertTriangle, tone: "alert" },
    { label: "Out of stock", value: formatAdminNumber(inventory.metrics.outOfStock), hint: "Live inventory ledger", icon: PackageX, tone: "alert" },
    { label: "Pending orders", value: formatAdminNumber(metrics.pendingOrders), hint: trends.pendingOrders, icon: Timer },
    { label: "Returns", value: formatAdminNumber(metrics.returns), hint: trends.returns, icon: RotateCcw },
    {
      label: "Media library",
      value: formatAdminNumber(media.total),
      hint: `${media.images} images · ${media.videos} videos`,
      icon: Images,
    },
    {
      label: "Products needing cover",
      value: formatAdminNumber(media.productsNeedingCover),
      hint:
        media.productsNeedingCover === 0
          ? "Every curated product has a cover"
          : "Set a cover so cards show the right plate",
      icon: ImageOff,
      tone: media.productsNeedingCover ? "alert" : undefined,
    },
  ];

  return (
    <AdminPage
      eyebrow="Business overview"
      title={
        <>
          {greetingForAdmin()}, <span className="italic text-accent">{adminFirstName(admin)}.</span>
        </>
      }
      description="Your PRATIKSHYA FASHON operation at a glance."
      actions={
        <>
          <AtelierButton as={Link} to="/admin/analytics" size="chip">
            View analytics
          </AtelierButton>
          <AtelierButton as={Link} to="/admin/products" size="chip" variant="outline">
            Manage products
          </AtelierButton>
          <AtelierButton as={Link} to="/admin/media/review" variant="outline" size="chip">
            Media review
          </AtelierButton>
        </>
      }
    >
      {/* Headline metrics */}
      <section aria-label="Business metrics" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <AdminMetricCard key={tile.label} {...tile} />
        ))}
      </section>

      {/* Sales */}
      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <AdminPanel
          eyebrow="Last 7 days"
          title="Sales overview"
          action={
            <p className="font-ui text-[11px] text-taupe">
              {formatINR(summary.total)} · {formatAdminNumber(summary.orders)} orders
            </p>
          }
        >
          <SalesOverviewChart series={series} />
          <dl className="mt-6 grid gap-4 border-t border-mist/70 pt-5 sm:grid-cols-3">
            <div>
              <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Daily average</dt>
              <dd className="mt-1 font-display text-xl font-light text-ink">
                {formatINR(summary.average)}
              </dd>
            </div>
            <div>
              <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Average ticket</dt>
              <dd className="mt-1 font-display text-xl font-light text-ink">
                {formatINR(summary.averageTicket)}
              </dd>
            </div>
            <div>
              <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Best day</dt>
              <dd className="mt-1 font-display text-xl font-light text-ink">
                {summary.peak?.date} · {formatCompactINR(summary.peak?.sales)}
              </dd>
            </div>
          </dl>
        </AdminPanel>

        <AdminPanel eyebrow="By category" title="Where it sold">
          <CategorySalesBars categories={categories} />
          <p className="mt-5 font-ui text-[11px] text-taupe">
            Demo figures for the client preview.
          </p>
        </AdminPanel>
      </div>

      {/* Orders + inventory */}
      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <AdminPanel
          eyebrow="Sales"
          title="Recent orders"
          bodyClassName="px-0 py-0 sm:px-0"
          action={
            <AtelierButton as={Link} to="/admin/orders" variant="outline" size="chip">
              All orders
            </AtelierButton>
          }
        >
          <DataTable
            className="border-0"
            rows={orders}
            rowKey="id"
            columns={[
              { id: "id", label: "Order" },
              { id: "customer", label: "Customer" },
              {
                id: "items",
                label: "Items",
                render: (row) => `${row.items} piece${row.items === 1 ? "" : "s"}`,
              },
              { id: "amount", label: "Amount", render: (row) => formatINR(row.amount) },
              {
                id: "status",
                label: "Status",
                render: (row) => <OrderStatusBadge status={row.status} />,
              },
              {
                id: "actions",
                label: "Actions",
                render: (row) =>
                  row.isDemo ? (
                    <span className="font-ui text-[11px] text-taupe">Demo record</span>
                  ) : (
                    <Link
                      to={`/account/orders/${row.id}`}
                      className="font-ui text-brass hover:text-accent"
                    >
                      View order
                    </Link>
                  ),
              },
            ]}
            empty="No orders have been placed in this browser yet."
          />
          <p className="px-5 py-4 font-ui text-[11px] text-taupe sm:px-6">
            {ordersAreDemo
              ? "Showing demo orders — real orders appear here as soon as one is placed through checkout."
              : "Reading the same customer orders the storefront created."}
          </p>
        </AdminPanel>

        <AdminPanel
          eyebrow="Inventory"
          title="Stock alerts"
          action={
            <span className="font-ui text-[11px] text-taupe">
              {inventory.metrics.lowStock} low · {inventory.metrics.outOfStock} out
            </span>
          }
        >
          <ul className="divide-y divide-mist/70">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-ui text-sm text-ink">{alert.piece}</p>
                  <p className="font-ui text-[11px] text-taupe">
                    {alert.department} · {alert.sku}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2 py-1 font-ui text-[9px] uppercase tracking-widest ${
                    alert.level === "OUT"
                      ? "bg-accent text-white"
                      : "border border-accent/30 bg-accent/5 text-accent"
                  }`}
                >
                  {alert.level === "OUT" ? "Out of stock" : `Only ${alert.remaining} left`}
                </span>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>

      {/* Departments */}
      <div className="mb-6 grid gap-6">
        <AdminPanel eyebrow="This month" title="Department performance">
          <ul className="space-y-4">
            {departments.map((department) => (
              <li key={department.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="font-ui text-sm text-ink">{department.label}</p>
                  <p className="font-ui text-[11px] text-taupe">
                    {formatCompactINR(department.sales)} · {department.orders} orders ·{" "}
                    <span className={department.achievement >= 100 ? "text-cocoa" : "text-taupe"}>
                      {department.achievement}%
                    </span>
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 w-full bg-mist/70" aria-hidden="true">
                  <div
                    className={department.achievement >= 100 ? "h-full bg-ink" : "h-full bg-accent/80"}
                    style={{ width: `${Math.min(100, department.achievement)}%` }}
                  />
                </div>
                <span className="sr-only">
                  {department.label}: {formatINR(department.sales)}, {department.orders} orders,{" "}
                  {department.achievement} percent of target.
                </span>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>

      {/* Quick actions */}
      <AdminPanel eyebrow="Shortcuts" title="Quick actions">
        <div className="flex flex-wrap gap-3">
          <AtelierButton as={Link} to="/admin/products/new" size="chip">
            Add product
          </AtelierButton>
          <AtelierButton as={Link} to="/admin/products/review" variant="outline" size="chip">
            Product review <ArrowRight size={12} aria-hidden="true" />
          </AtelierButton>
          <AtelierButton as={Link} to="/admin/media" variant="outline" size="chip">
            Media library <ArrowRight size={12} aria-hidden="true" />
          </AtelierButton>
          {[
            { label: "View orders", to: "/admin/orders", ready: true },
            { label: "View inventory", to: "/admin/inventory", ready: true },
            { label: "Offers", to: "/admin/offers", ready: true },
            { label: "Categories", to: "/admin/categories", ready: true },
            { label: "Collections", to: "/admin/collections", ready: true },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="inline-flex items-center gap-2 border border-mist bg-canvas/60 px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.1em] text-taupe transition-colors hover:border-ink hover:text-ink"
            >
              {action.label}
              {!action.ready && (
                <span className="font-ui text-[8px] uppercase tracking-[.16em] text-brass">
                  Coming soon
                </span>
              )}
            </Link>
          ))}
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
