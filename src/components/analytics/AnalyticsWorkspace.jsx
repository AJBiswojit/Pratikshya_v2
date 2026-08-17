import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AtelierButton } from "../../design-system";
import AdminPanel from "../admin/AdminPanel";
import DataTable from "../employee/DataTable";
import { formatAdminNumber, formatCompactINR } from "../../utils/admin";
import { formatINR } from "../../utils/shopping";
import { formatPercent } from "../workforce/format";
import { exportAnalyticsCsv } from "../../services/analytics/analyticsExport";
import { CUSTOMER_SEGMENT_LABELS } from "../../services/analytics/analyticsService";
import AnalyticsNav, { ANALYTICS_TABS } from "./AnalyticsNav";
import AnalyticsFilters from "./AnalyticsFilters";
import AnalyticsMetric from "./AnalyticsMetric";
import AnalyticsTrendChart from "./AnalyticsTrendChart";
import AnalyticsBarList from "./AnalyticsBarList";
import AnalyticsEmpty from "./AnalyticsEmpty";

const viewFromPath = (pathname) => {
  if (pathname.includes("/sales")) return "sales";
  if (pathname.includes("/products")) return "products";
  if (pathname.includes("/customers")) return "customers";
  if (pathname.includes("/inventory")) return "inventory";
  if (pathname.includes("/returns")) return "returns";
  if (pathname.includes("/offers")) return "offers";
  if (pathname.includes("/employees")) return "employees";
  return "overview";
};

const money = (value) => formatINR(value || 0);

export default function AnalyticsWorkspace({
  snapshot,
  periodInput,
  onPeriodChange,
  filters,
  onFiltersChange,
  portal = "admin",
  allowedTabs = ANALYTICS_TABS,
  actor = null,
}) {
  const { pathname } = useLocation();
  const view = viewFromPath(pathname);
  const [trendMetric, setTrendMetric] = useState("revenue");
  const [productRank, setProductRank] = useState("revenue");

  const comparisonLabel = snapshot.period.comparison?.label || "vs previous period";
  const locations = snapshot.inventory.locations || [];

  const productRows = useMemo(() => {
    if (productRank === "units") return snapshot.products.topByUnits;
    if (productRank === "orders") return snapshot.products.topByOrders;
    return snapshot.products.topByRevenue;
  }, [productRank, snapshot.products]);

  const exportView = () => exportAnalyticsCsv(snapshot, view, actor);

  return (
    <div>
      <AnalyticsNav portal={portal} tabs={allowedTabs} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-ui text-[11px] text-taupe">
          Demo read-model · not audited financial reporting · not real-time warehouse BI
        </p>
        <AtelierButton type="button" variant="outline" size="chip" onClick={exportView}>
          Export CSV
        </AtelierButton>
      </div>

      <AnalyticsFilters
        view={view}
        period={{ ...snapshot.period, ...periodInput }}
        onPeriodChange={onPeriodChange}
        filters={filters}
        onFiltersChange={onFiltersChange}
        locations={locations}
      />

      {view === "overview" ? (
        <OverviewSection
          snapshot={snapshot}
          comparisonLabel={comparisonLabel}
          trendMetric={trendMetric}
          setTrendMetric={setTrendMetric}
          portal={portal}
        />
      ) : null}
      {view === "sales" ? (
        <SalesSection
          snapshot={snapshot}
          comparisonLabel={comparisonLabel}
          trendMetric={trendMetric}
          setTrendMetric={setTrendMetric}
        />
      ) : null}
      {view === "products" ? (
        <ProductsSection
          snapshot={snapshot}
          productRank={productRank}
          setProductRank={setProductRank}
          productRows={productRows}
          portal={portal}
        />
      ) : null}
      {view === "customers" ? <CustomersSection snapshot={snapshot} portal={portal} /> : null}
      {view === "inventory" ? <InventorySection snapshot={snapshot} filters={filters} portal={portal} /> : null}
      {view === "returns" ? <ReturnsSection snapshot={snapshot} /> : null}
      {view === "offers" ? <OffersSection snapshot={snapshot} portal={portal} /> : null}
      {view === "employees" ? <EmployeesSection snapshot={snapshot} /> : null}
    </div>
  );
}

function MetricGrid({ items }) {
  return (
    <section aria-label="Period metrics" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <AnalyticsMetric key={item.label} {...item} />
      ))}
    </section>
  );
}

function OverviewSection({ snapshot, comparisonLabel, trendMetric, setTrendMetric, portal }) {
  const o = snapshot.overview;
  const metrics = [
    {
      label: "Revenue",
      value: money(o.revenue.current),
      change: o.revenue.comparable ? `${o.revenue.changeLabel} ${comparisonLabel}` : null,
      direction: o.revenue.direction,
      comparable: o.revenue.comparable,
      hint: snapshot.orders.hasData ? "Eligible orders, refunds deducted" : "No sales data for this period.",
    },
    {
      label: "Orders",
      value: formatAdminNumber(o.orders.current),
      change: o.orders.comparable ? `${o.orders.changeLabel} ${comparisonLabel}` : null,
      direction: o.orders.direction,
      comparable: o.orders.comparable,
      hint: snapshot.orders.hasData ? `${o.eligibleOrders} revenue-eligible` : "No completed orders yet.",
    },
    {
      label: "Average order value",
      value: snapshot.orders.eligible ? money(o.aov.current) : "—",
      change: o.aov.comparable ? `${o.aov.changeLabel} ${comparisonLabel}` : null,
      direction: o.aov.direction,
      comparable: o.aov.comparable && snapshot.orders.eligible > 0,
      hint: "Eligible revenue ÷ eligible orders",
    },
    {
      label: "Customers",
      value: formatAdminNumber(o.customers.current),
      hint: "Registry plus customers on orders",
    },
    {
      label: "New customers",
      value: formatAdminNumber(o.newCustomers.current),
      change: o.newCustomers.comparable ? `${o.newCustomers.changeLabel} ${comparisonLabel}` : null,
      direction: o.newCustomers.direction,
      comparable: o.newCustomers.comparable,
    },
    {
      label: "Returning customers",
      value: formatAdminNumber(o.returningCustomers.current),
      change: o.returningCustomers.comparable ? `${o.returningCustomers.changeLabel} ${comparisonLabel}` : null,
      direction: o.returningCustomers.direction,
      comparable: o.returningCustomers.comparable,
    },
    {
      label: "Units sold",
      value: formatAdminNumber(o.unitsSold.current),
      change: o.unitsSold.comparable ? `${o.unitsSold.changeLabel} ${comparisonLabel}` : null,
      direction: o.unitsSold.direction,
      comparable: o.unitsSold.comparable,
    },
    {
      label: "Returns",
      value: formatAdminNumber(o.returns.current),
      change: o.returns.comparable ? `${o.returns.changeLabel} ${comparisonLabel}` : null,
      direction: o.returns.direction,
      comparable: o.returns.comparable,
      hint: snapshot.returns.hasData ? "Return requests in this period" : "No return data for this period.",
    },
    {
      label: "Refunds",
      value: money(o.refunds.current),
      change: o.refunds.comparable ? `${o.refunds.changeLabel} ${comparisonLabel}` : null,
      direction: o.refunds.direction,
      comparable: o.refunds.comparable,
      hint: "Completed refunds only",
    },
  ];

  return (
    <>
      <MetricGrid items={metrics} />

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <AdminPanel
          eyebrow={snapshot.period.label}
          title="Sales trend"
          action={<TrendToggle value={trendMetric} onChange={setTrendMetric} />}
        >
          <AnalyticsTrendChart
            series={snapshot.sales.series}
            metric={trendMetric}
            emptyDescription="Place or seed orders in this window to see the trend."
          />
        </AdminPanel>
        <AdminPanel eyebrow="Taxonomy" title="Categories">
          {snapshot.categories.length ? (
            <AnalyticsBarList items={snapshot.categories.slice(0, 6)} />
          ) : (
            <AnalyticsEmpty title="No category sales for this period." />
          )}
        </AdminPanel>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <AdminPanel
          eyebrow="Catalogue"
          title="Top products"
          action={
            <AtelierButton as={Link} to={portal === "admin" ? "/admin/analytics/products" : "/employee/reports/products"} variant="outline" size="chip">
              All products
            </AtelierButton>
          }
        >
          <ProductTable rows={snapshot.products.topByRevenue.slice(0, 5)} portal={portal} empty="No products sold in this period." />
        </AdminPanel>
        <AdminPanel eyebrow="People" title="Customers">
          {snapshot.customers.hasPeriodActivity ? (
            <dl className="grid grid-cols-2 gap-3">
              {[
                ["Active", snapshot.customers.activeCustomers],
                ["High value", snapshot.customers.highValueCustomers],
                ["Average spend", money(snapshot.customers.averageSpend)],
                ["Orders / customer", snapshot.customers.ordersPerCustomer],
              ].map(([label, value]) => (
                <div key={label} className="border border-mist/70 bg-canvas/70 p-3">
                  <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{label}</dt>
                  <dd className="mt-1 font-display text-xl font-light text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <AnalyticsEmpty title="No customer purchases in this period." />
          )}
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminPanel eyebrow="Stock" title="Inventory">
          <dl className="space-y-2 font-ui text-sm text-ink">
            <div className="flex justify-between"><dt className="text-taupe">On hand</dt><dd>{formatAdminNumber(snapshot.inventory.totalOnHand)}</dd></div>
            <div className="flex justify-between"><dt className="text-taupe">Available</dt><dd>{formatAdminNumber(snapshot.inventory.available)}</dd></div>
            <div className="flex justify-between"><dt className="text-taupe">Low stock</dt><dd>{snapshot.inventory.lowStock}</dd></div>
            <div className="flex justify-between"><dt className="text-taupe">Out of stock</dt><dd>{snapshot.inventory.outOfStock}</dd></div>
            <div className="flex justify-between"><dt className="text-taupe">Retail value</dt><dd>{formatCompactINR(snapshot.inventory.retailValue)}</dd></div>
          </dl>
          {!snapshot.inventory.costConfigured ? (
            <p className="mt-4 font-ui text-[11px] text-taupe">
              Inventory valuation unavailable — cost data not configured.
            </p>
          ) : null}
        </AdminPanel>
        <AdminPanel eyebrow="Care" title="Returns">
          {snapshot.returns.hasData ? (
            <AnalyticsBarList items={snapshot.returns.reasons} valueKey="count" currency={false} />
          ) : (
            <AnalyticsEmpty title="No return data for this period." />
          )}
        </AdminPanel>
        <AdminPanel eyebrow="Floor" title="Fulfillment">
          <ul className="space-y-2 font-ui text-sm">
            {snapshot.fulfillment.pipeline.map((stage) => (
              <li key={stage.id} className="flex justify-between gap-3">
                <span className="text-taupe">{stage.label}</span>
                <span>{stage.count}</span>
              </li>
            ))}
          </ul>
          {snapshot.fulfillment.hasDurations ? (
            <dl className="mt-4 space-y-1 font-ui text-[11px] text-taupe">
              <div>Average fulfillment: {snapshot.fulfillment.averageFulfillmentHours ?? "—"} h</div>
              <div>Average dispatch: {snapshot.fulfillment.averageDispatchHours ?? "—"} h</div>
              <div>Average delivery: {snapshot.fulfillment.averageDeliveryHours ?? "—"} h</div>
            </dl>
          ) : (
            <p className="mt-4 font-ui text-[11px] text-taupe">Insufficient fulfillment history</p>
          )}
          {snapshot.fulfillment.bottleneck ? (
            <p className="mt-3 font-ui text-[11px] text-accent">
              Current bottleneck: {snapshot.fulfillment.bottleneck.label} ({snapshot.fulfillment.bottleneck.count})
            </p>
          ) : null}
        </AdminPanel>
      </div>
    </>
  );
}

function SalesSection({ snapshot, comparisonLabel, trendMetric, setTrendMetric }) {
  const o = snapshot.overview;
  return (
    <>
      <MetricGrid
        items={[
          {
            label: "Revenue",
            value: snapshot.orders.hasData ? money(o.revenue.current) : "—",
            change: o.revenue.comparable ? `${o.revenue.changeLabel} ${comparisonLabel}` : null,
            direction: o.revenue.direction,
            comparable: o.revenue.comparable && snapshot.orders.hasData,
            hint: snapshot.orders.hasData ? "Cancelled and failed payments excluded" : "No sales data for this period.",
          },
          {
            label: "Gross sales",
            value: snapshot.orders.hasData ? money(snapshot.orders.gross) : "—",
            hint: "Before completed refunds",
          },
          {
            label: "Discounts",
            value: snapshot.orders.hasData ? money(snapshot.orders.discounts) : "—",
            hint: "Product and offer discounts on eligible orders",
          },
          {
            label: "Refunds",
            value: money(snapshot.orders.refunds),
            hint: "Completed refunds only — not profit",
          },
          {
            label: "AOV",
            value: snapshot.orders.eligible ? money(snapshot.orders.aov) : "—",
            hint: "Eligible revenue ÷ eligible orders",
          },
          {
            label: "Completion rate",
            value: snapshot.orders.hasData ? formatPercent(snapshot.orders.completionRate) : "—",
            hint: "Delivered and post-delivery outcomes",
          },
        ]}
      />

      <AdminPanel
        className="mb-6"
        eyebrow={snapshot.period.granularity.toLowerCase()}
        title="Sales trend"
        action={<TrendToggle value={trendMetric} onChange={setTrendMetric} />}
      >
        <AnalyticsTrendChart series={snapshot.sales.series} metric={trendMetric} />
      </AdminPanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <AdminPanel eyebrow="Lifecycle" title="Order status">
          {snapshot.orders.hasData ? (
            <DataTable
              rows={snapshot.orders.distribution.filter((row) => row.count > 0)}
              rowKey="id"
              empty="No orders in this period."
              columns={[
                { id: "label", label: "Status" },
                { id: "count", label: "Count" },
                {
                  id: "percentage",
                  label: "Share",
                  render: (row) => (row.percentage == null ? "—" : `${row.percentage}%`),
                },
              ]}
            />
          ) : (
            <AnalyticsEmpty title="No completed orders yet." actionTo="/admin/orders" actionLabel="Open orders" />
          )}
        </AdminPanel>
        <AdminPanel eyebrow="Outcomes" title="Conversion">
          {snapshot.orders.hasData ? (
            <dl className="grid grid-cols-2 gap-3">
              {[
                ["Total orders", snapshot.orders.total],
                ["Completed", snapshot.orders.completed],
                ["Cancelled", snapshot.orders.cancelled],
                ["Returned", snapshot.orders.returned],
                ["Refunded", snapshot.orders.refunded],
                ["Cancellation rate", formatPercent(snapshot.orders.cancellationRate)],
                ["Return rate", formatPercent(snapshot.orders.returnRate)],
                ["Refund rate", formatPercent(snapshot.orders.refundRate)],
              ].map(([label, value]) => (
                <div key={label} className="border border-mist/70 bg-canvas/70 p-3">
                  <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{label}</dt>
                  <dd className="mt-1 font-display text-xl font-light text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <AnalyticsEmpty title="No order outcomes for this period." />
          )}
        </AdminPanel>
      </div>

      <p className="mt-6 font-ui text-[11px] text-taupe">{snapshot.tax.message}</p>
    </>
  );
}

function ProductsSection({ snapshot, productRank, setProductRank, productRows, portal }) {
  const productBase = portal === "admin" ? "/admin/products" : "/employee/products";
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="font-ui text-[11px] uppercase tracking-[.16em] text-taupe">Rank by</p>
        {[
          { id: "revenue", label: "Revenue" },
          { id: "units", label: "Units sold" },
          { id: "orders", label: "Orders" },
        ].map((option) => (
          <AtelierButton
            key={option.id}
            type="button"
            size="chip"
            variant={productRank === option.id ? "solid" : "outline"}
            onClick={() => setProductRank(option.id)}
          >
            {option.label}
          </AtelierButton>
        ))}
        <span className="font-ui text-[11px] text-taupe">Margin ranking unavailable — cost data not configured.</span>
      </div>

      {snapshot.products.hasData ? (
        <ProductTable rows={productRows} portal={portal} />
      ) : (
        <AnalyticsEmpty
          title="No products sold in this period."
          actionTo={productBase}
          actionLabel="Open products"
        />
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <AdminPanel eyebrow="Taxonomy" title="Categories">
          {snapshot.categories.length ? (
            <DataTable
              rows={snapshot.categories}
              rowKey="id"
              columns={[
                { id: "label", label: "Category" },
                { id: "revenue", label: "Revenue", render: (row) => money(row.revenue) },
                { id: "unitsSold", label: "Units" },
                { id: "orders", label: "Orders" },
                { id: "productsSold", label: "Products" },
                {
                  id: "returnRate",
                  label: "Return rate",
                  render: (row) => (row.returnRate == null ? "—" : `${row.returnRate}%`),
                },
              ]}
            />
          ) : (
            <AnalyticsEmpty title="No category sales for this period." />
          )}
        </AdminPanel>
        <AdminPanel eyebrow="Editorial" title="Collections">
          {snapshot.collections.length ? (
            <DataTable
              rows={snapshot.collections}
              rowKey="id"
              columns={[
                { id: "label", label: "Collection" },
                { id: "productsSold", label: "Products sold" },
                { id: "revenue", label: "Revenue", render: (row) => money(row.revenue) },
                { id: "unitsSold", label: "Units" },
                { id: "orders", label: "Orders" },
              ]}
            />
          ) : (
            <AnalyticsEmpty title="No collection sales for this period." />
          )}
        </AdminPanel>
      </div>

      {snapshot.products.slowest.length ? (
        <AdminPanel className="mt-6" eyebrow="Movement" title="Slowest products">
          <ProductTable rows={snapshot.products.slowest} portal={portal} />
        </AdminPanel>
      ) : null}
    </>
  );
}

function CustomersSection({ snapshot, portal }) {
  const customerBase = portal === "admin" ? "/admin/customers" : "/employee/customers";
  return (
    <>
      <MetricGrid
        items={[
          { label: "Total customers", value: formatAdminNumber(snapshot.customers.total), hint: "Registry and order identities" },
          { label: "New", value: formatAdminNumber(snapshot.customers.newCustomers) },
          { label: "Returning", value: formatAdminNumber(snapshot.customers.returningCustomers) },
          { label: "Active in period", value: formatAdminNumber(snapshot.customers.activeCustomers) },
          { label: "High value", value: formatAdminNumber(snapshot.customers.highValueCustomers), hint: `Lifetime spend above ${money(40000)}` },
          { label: "Average spend", value: snapshot.customers.hasPeriodActivity ? money(snapshot.customers.averageSpend) : "—" },
        ]}
      />

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <AdminPanel eyebrow="Segments" title="Existing segmentation">
          <DataTable
            rows={snapshot.customers.segments}
            rowKey="id"
            columns={[
              { id: "label", label: "Segment" },
              { id: "customers", label: "Customers" },
              { id: "orders", label: "Orders" },
              { id: "revenue", label: "Revenue", render: (row) => money(row.revenue) },
              { id: "aov", label: "AOV", render: (row) => (row.orders ? money(row.aov) : "—") },
            ]}
          />
        </AdminPanel>
        <AdminPanel eyebrow="Growth" title="Customers over time">
          {snapshot.customers.growth.some((point) => point.newCustomers || point.returningCustomers) ? (
            <AnalyticsBarList
              items={snapshot.customers.growth.map((point) => ({
                id: point.key,
                label: point.label,
                revenue: point.newCustomers + point.returningCustomers,
              }))}
              currency={false}
            />
          ) : (
            <AnalyticsEmpty title="No customer growth in this period." />
          )}
        </AdminPanel>
      </div>

      <AdminPanel eyebrow="Value" title="Top customers">
        {snapshot.customers.top.length ? (
          <DataTable
            rows={snapshot.customers.top}
            rowKey="id"
            columns={[
              {
                id: "name",
                label: "Customer",
                render: (row) =>
                  portal === "admin" && row.registry ? (
                    <Link to={`${customerBase}/${row.id}`} className="underline-offset-4 hover:text-accent hover:underline">
                      {row.name}
                    </Link>
                  ) : (
                    row.name
                  ),
              },
              { id: "orders", label: "Orders", render: (row) => row.periodOrders },
              { id: "revenue", label: "Revenue", render: (row) => money(row.periodSpend) },
              { id: "returns", label: "Returns", render: (row) => row.periodReturns },
              {
                id: "lastOrder",
                label: "Last order",
                render: (row) => (row.lastOrder ? String(row.lastOrder).slice(0, 10) : "—"),
              },
              {
                id: "segment",
                label: "Segment",
                render: (row) => CUSTOMER_SEGMENT_LABELS[row.segment] || row.segment,
              },
            ]}
          />
        ) : (
          <AnalyticsEmpty title="No customer purchases in this period." actionTo={customerBase} actionLabel="Open customers" />
        )}
      </AdminPanel>
    </>
  );
}

function InventorySection({ snapshot, filters, portal }) {
  const inventory = snapshot.inventory;
  const lowRows = filters.location
    ? inventory.lowStockRows.filter((row) => row.locationId === filters.location)
    : inventory.lowStockRows;
  const inventoryBase = portal === "admin" ? "/admin/inventory" : "/employee/inventory";

  return (
    <>
      <MetricGrid
        items={[
          { label: "On hand", value: formatAdminNumber(inventory.totalOnHand) },
          { label: "Available", value: formatAdminNumber(inventory.available) },
          { label: "Reserved", value: formatAdminNumber(inventory.reserved) },
          { label: "Returned", value: formatAdminNumber(inventory.returned) },
          { label: "Damaged", value: formatAdminNumber(inventory.damaged) },
          { label: "Low stock", value: formatAdminNumber(inventory.lowStock), tone: inventory.lowStock ? "alert" : "default" },
          { label: "Out of stock", value: formatAdminNumber(inventory.outOfStock), tone: inventory.outOfStock ? "alert" : "default" },
          { label: "Overstocked", value: formatAdminNumber(inventory.overstocked) },
          { label: "Retail value", value: formatCompactINR(inventory.retailValue), hint: "Available × selling price — not profit" },
        ]}
      />
      {!inventory.costConfigured ? (
        <p className="mb-6 font-ui text-sm text-taupe">
          Inventory valuation unavailable — cost data not configured.
        </p>
      ) : null}

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <AdminPanel eyebrow="Ledger" title="Movement">
          {inventory.movementCount ? (
            <AnalyticsBarList items={inventory.movements} valueKey="quantity" currency={false} />
          ) : (
            <AnalyticsEmpty title="No inventory movement for this period." actionTo={`${inventoryBase}/movements`} actionLabel="Open movements" />
          )}
        </AdminPanel>
        <AdminPanel eyebrow="Locations" title="Store / warehouse">
          <DataTable
            rows={inventory.locations}
            rowKey="id"
            columns={[
              { id: "name", label: "Location" },
              { id: "typeLabel", label: "Type" },
              { id: "available", label: "Stock available" },
              { id: "unitsMoved", label: "Units moved" },
              { id: "ordersFulfilled", label: "Orders fulfilled" },
              { id: "transfers", label: "Transfers" },
            ]}
            empty="No locations configured."
          />
          <p className="mt-4 font-ui text-[11px] text-taupe">
            Fulfilled counts use the order’s fulfillment location. They are not storefront sales by floor.
          </p>
        </AdminPanel>
      </div>

      <AdminPanel eyebrow="Attention" title="Low stock">
        {lowRows.length ? (
          <DataTable
            rows={lowRows}
            rowKey="id"
            columns={[
              {
                id: "product",
                label: "Product",
                render: (row) => (
                  <Link
                    to={portal === "admin" ? `/admin/products/${row.productId}` : `/employee/products/${row.productId}/edit`}
                    className="underline-offset-4 hover:text-accent hover:underline"
                  >
                    {row.product}
                  </Link>
                ),
              },
              { id: "sku", label: "SKU" },
              { id: "available", label: "Available" },
              { id: "threshold", label: "Threshold" },
              { id: "location", label: "Location" },
            ]}
          />
        ) : (
          <AnalyticsEmpty title="No low-stock rows for this filter." actionTo={`${inventoryBase}/low-stock`} actionLabel="Open low stock" />
        )}
      </AdminPanel>
    </>
  );
}

function ReturnsSection({ snapshot }) {
  const returns = snapshot.returns;
  return (
    <>
      <MetricGrid
        items={[
          { label: "Return requests", value: formatAdminNumber(returns.returnRequests) },
          { label: "Approved", value: formatAdminNumber(returns.approved) },
          { label: "Rejected", value: formatAdminNumber(returns.rejected) },
          { label: "Received", value: formatAdminNumber(returns.received) },
          { label: "Inspected", value: formatAdminNumber(returns.inspected) },
          { label: "Refund initiated", value: formatAdminNumber(returns.refundPending) },
          { label: "Refunded", value: formatAdminNumber(returns.refunded) },
          { label: "Return rate", value: returns.returnRate == null ? "—" : `${returns.returnRate}%` },
          { label: "Average return value", value: returns.hasData ? money(returns.averageReturnValue) : "—" },
        ]}
      />
      <AdminPanel eyebrow="Catalogue" title="Return reasons">
        {returns.reasons.length ? (
          <DataTable
            rows={returns.reasons}
            rowKey="id"
            columns={[
              { id: "label", label: "Reason" },
              { id: "count", label: "Count" },
              { id: "percentage", label: "Share", render: (row) => (row.percentage == null ? "—" : `${row.percentage}%`) },
            ]}
          />
        ) : (
          <AnalyticsEmpty title="No return data for this period." actionTo="/admin/returns" actionLabel="Open returns" />
        )}
      </AdminPanel>
    </>
  );
}

function OffersSection({ snapshot, portal }) {
  const offerBase = portal === "admin" ? "/admin/offers" : "/employee/offers";
  return (
    <>
      <p className="mb-4 font-ui text-[11px] text-taupe">
        Revenue influenced by offer — not profit. Discount cost is the coupon amount recorded on the order.
      </p>
      {snapshot.offers.hasData ? (
        <DataTable
          rows={snapshot.offers.rows.filter((row) => row.redemptions > 0 || row.discount > 0)}
          rowKey="id"
          columns={[
            {
              id: "name",
              label: "Offer",
              render: (row) => (
                <Link to={`${offerBase}/${row.id}`} className="underline-offset-4 hover:text-accent hover:underline">
                  {row.name}
                </Link>
              ),
            },
            { id: "code", label: "Code" },
            { id: "status", label: "Status" },
            { id: "redemptions", label: "Redemptions" },
            { id: "revenue", label: "Revenue influenced", render: (row) => money(row.revenue) },
            { id: "discount", label: "Discount given", render: (row) => money(row.discount) },
            { id: "orders", label: "Orders" },
            { id: "averageDiscount", label: "Average discount", render: (row) => money(row.averageDiscount) },
          ]}
        />
      ) : (
        <AnalyticsEmpty title="No offer redemptions in this period." actionTo={offerBase} actionLabel="Open offers" />
      )}
    </>
  );
}

function EmployeesSection({ snapshot }) {
  const people = snapshot.employees;
  /* Workforce analytics are an Employee Portal desk — people links always
     resolve to the Employee Portal performance pages. */
  const performanceBase = "/employee/performance";
  return (
    <>
      <MetricGrid
        items={[
          { label: "Employees", value: formatAdminNumber(people.employees) },
          { label: "Attendance", value: people.attendancePercent == null ? "—" : `${people.attendancePercent}%` },
          { label: "Performance score", value: people.performancePercent == null ? "—" : `${people.performancePercent}%`, hint: "Phase 18 house score" },
          { label: "Target achievement", value: `${people.targetAchievement ?? 0}%` },
          { label: "Orders assisted", value: formatAdminNumber(people.ordersAssisted), hint: "From existing performance metrics" },
          { label: "Customers served", value: formatAdminNumber(people.customersServed) },
        ]}
      />

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <AdminPanel eyebrow="Attendance" title="Period presence">
          {people.hasAttendance ? (
            <dl className="grid grid-cols-2 gap-3">
              {[
                ["Present", people.present],
                ["Late", people.late],
                ["Absent", people.absent],
                ["Leave", people.leave],
                ["Half day", people.halfDay],
                ["Hours", people.hoursLabel],
              ].map(([label, value]) => (
                <div key={label} className="border border-mist/70 bg-canvas/70 p-3">
                  <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{label}</dt>
                  <dd className="mt-1 font-display text-xl font-light text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <AnalyticsEmpty title="No attendance history for this period." />
          )}
        </AdminPanel>
        <AdminPanel eyebrow="Reviews" title="Performance">
          <p className="mb-3 font-ui text-[11px] text-taupe">
            Scores come from the Phase 18 performance module. Roles are not compared across unrelated metrics.
          </p>
          <h3 className="mb-2 font-ui text-[10px] uppercase tracking-[.16em] text-brass">Top performers</h3>
          <PeopleList rows={people.topPerformers} empty="No top performers to show." to={performanceBase} />
          <h3 className="mb-2 mt-5 font-ui text-[10px] uppercase tracking-[.16em] text-brass">Needs attention</h3>
          <PeopleList rows={people.needsAttention} empty="No one currently needs attention." to={performanceBase} />
          <h3 className="mb-2 mt-5 font-ui text-[10px] uppercase tracking-[.16em] text-brass">Review pending</h3>
          <PeopleList rows={people.reviewPending} empty="No reviews waiting." to={performanceBase} />
        </AdminPanel>
      </div>
    </>
  );
}

function PeopleList({ rows, empty, to }) {
  if (!rows?.length) return <p className="font-ui text-sm text-taupe">{empty}</p>;
  return (
    <ul className="divide-y divide-mist/70 border border-mist/70">
      {rows.map((row) => (
        <li key={row.employeeId} className="flex items-center justify-between gap-3 px-3 py-2">
          <Link to={`${to}/${row.employeeId}`} className="font-ui text-sm text-ink underline-offset-4 hover:text-accent hover:underline">
            {row.name}
          </Link>
          <span className="font-ui text-[11px] text-taupe">
            {row.targetPercent != null ? `${row.targetPercent}%` : row.roleLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ProductTable({ rows, portal, empty = "No products to show." }) {
  const hrefFor = (productId) =>
    portal === "admin" ? `/admin/products/${productId}` : `/employee/products/${productId}/edit`;
  return (
    <DataTable
      rows={rows}
      rowKey="productId"
      empty={empty}
      columns={[
        {
          id: "name",
          label: "Product",
          render: (row) => (
            <Link to={hrefFor(row.productId)} className="underline-offset-4 hover:text-accent hover:underline">
              {row.name}
            </Link>
          ),
        },
        { id: "sku", label: "SKU" },
        { id: "category", label: "Category" },
        { id: "unitsSold", label: "Units" },
        { id: "revenue", label: "Revenue", render: (row) => money(row.revenue) },
        { id: "returnUnits", label: "Returns" },
        { id: "available", label: "Stock", render: (row) => (row.available == null ? "—" : row.available) },
      ]}
    />
  );
}

function TrendToggle({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[
        { id: "revenue", label: "Revenue" },
        { id: "orders", label: "Orders" },
      ].map((option) => (
        <AtelierButton
          key={option.id}
          type="button"
          size="chip"
          variant={value === option.id ? "primary" : "outline"}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </AtelierButton>
      ))}
    </div>
  );
}

export { viewFromPath };
