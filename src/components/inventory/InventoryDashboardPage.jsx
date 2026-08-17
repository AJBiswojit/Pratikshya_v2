import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  PackageCheck,
  PackageX,
  RotateCcw,
  ShieldAlert,
  Store,
  Warehouse,
} from "lucide-react";
import AdminPage from "../admin/AdminPage";
import AdminPanel from "../admin/AdminPanel";
import EmployeePage from "../employee/EmployeePage";
import DataTable from "../employee/DataTable";
import { AtelierButton } from "../../design-system";
import { useInventory } from "../../context/InventoryContext";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { PERMISSIONS } from "../../config/employeePermissions";
import { ROLES } from "../../config/employeeRoles";
import { categoryLabels } from "../../data/products/taxonomy";
import { formatINR } from "../../utils/shopping";
import { formatEmployeeDateTime } from "../../utils/employee";
import InventoryNav from "./InventoryNav";
import InventoryStatusBadge from "./InventoryStatusBadge";
import { LOCATION_TYPES, STOCK_STATUS } from "../../services/inventory/inventoryRepository";

const inputClass = "h-10 w-full border border-mist bg-canvas px-3 font-ui text-xs text-ink outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/20";

function Metric({ label, value, hint, Icon, alert = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="border border-mist/80 bg-surface/45 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">{label}</p>
          <p className={`mt-2 font-display text-2xl font-light sm:text-3xl ${alert ? "text-accent" : "text-ink"}`}>
            {value}
          </p>
          {hint ? <p className="mt-1 font-ui text-[10px] text-taupe">{hint}</p> : null}
        </div>
        <Icon size={17} strokeWidth={1.3} className={alert ? "text-accent" : "text-brass"} aria-hidden="true" />
      </div>
    </motion.div>
  );
}

export default function InventoryDashboardPage({ portal = "admin" }) {
  const inventory = useInventory();
  const { employee, hasPermission } = useEmployeeAuth();
  const { admin } = useAdminAuth();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: "",
    subcategory: "",
    productType: "",
    locationId: "",
    status: "",
    locationType: searchParams.get("locationType") || "",
    department: "",
    hasAvailable: false,
    hasReserved: false,
    hasDamaged: false,
    hasReturned: false,
  });
  const [locationDraft, setLocationDraft] = useState({ name: "", type: LOCATION_TYPES.STORE, address: "", area: "" });
  const [locationNotice, setLocationNotice] = useState("");
  const employeeWarehouseOnly = portal === "employee" && employee?.role === ROLES.WAREHOUSE_STAFF;
  const availabilityOnly = portal === "employee" && [
    ROLES.SALES_EXECUTIVE,
    ROLES.FASHION_STYLIST,
    ROLES.CUSTOMER_SUPPORT,
  ].includes(employee?.role);
  const root = portal === "admin" ? "/admin/inventory" : "/employee/inventory";
  const Page = portal === "admin" ? AdminPage : EmployeePage;

  const rows = useMemo(() => inventory.query({
    ...filters,
    ...(availabilityOnly ? {
      search: "",
      locationId: "",
      locationType: "",
      department: "",
      status: "",
      hasAvailable: false,
      hasReserved: false,
      hasDamaged: false,
      hasReturned: false,
    } : {}),
    locationType: employeeWarehouseOnly ? LOCATION_TYPES.WAREHOUSE : availabilityOnly ? "" : filters.locationType || "",
  }), [inventory, filters, employeeWarehouseOnly, availabilityOnly]);
  const availabilityRows = useMemo(() => {
    if (!availabilityOnly) return rows;
    const unique = new Map();
    rows.forEach((row) => {
      const key = `${row.productId}::${row.variantId || "base"}`;
      if (unique.has(key)) return;
      const availability = inventory.getAvailability(row.product, { variantId: row.variantId });
      unique.set(key, { ...row, customerAvailability: availability });
    });
    const term = filters.search.trim().toLowerCase();
    return [...unique.values()].filter((row) => {
      const safeSearch = [row.productName, row.sku, row.variantLabel, row.category, row.subcategory, row.productType]
        .join(" ")
        .toLowerCase();
      return (!term || safeSearch.includes(term)) &&
        (!filters.status || row.customerAvailability.status === filters.status);
    });
  }, [availabilityOnly, rows, inventory, filters.search, filters.status]);
  const metrics = useMemo(() => {
    if (!employeeWarehouseOnly) return inventory.metrics;
    return {
      ...inventory.metrics,
      totalUnits: rows.reduce((sum, row) => sum + row.quantity.onHand, 0),
      availableUnits: rows.reduce((sum, row) => sum + row.quantity.available, 0),
      reservedUnits: rows.reduce((sum, row) => sum + row.quantity.reserved, 0),
      damagedUnits: rows.reduce((sum, row) => sum + row.quantity.damaged, 0),
      returnedUnits: rows.reduce((sum, row) => sum + row.quantity.returned, 0),
      estimatedValue: rows.reduce((sum, row) => sum + row.estimatedValue, 0),
      storeStock: 0,
      warehouseStock: rows.reduce((sum, row) => sum + row.quantity.onHand, 0),
      totalProducts: new Set(rows.map((row) => row.productId)).size,
      totalVariants: new Set(rows.map((row) => row.variantId).filter(Boolean)).size,
      lowStock: rows.filter((row) => row.status === STOCK_STATUS.LOW_STOCK).length,
      outOfStock: rows.filter((row) => row.status === STOCK_STATUS.OUT_OF_STOCK).length,
    };
  }, [inventory.metrics, rows, employeeWarehouseOnly]);

  const can = (permission) => portal === "admin" || hasPermission(permission);
  const filterSourceRows = employeeWarehouseOnly
    ? inventory.records.filter((row) => row.location?.type === LOCATION_TYPES.WAREHOUSE)
    : inventory.records;
  const categories = [...new Set(filterSourceRows.map((row) => row.category).filter(Boolean))].sort();
  const subcategories = [...new Set(filterSourceRows.map((row) => row.subcategory).filter(Boolean))].sort();
  const productTypes = [...new Set(filterSourceRows.map((row) => row.productType).filter(Boolean))].sort();
  const departments = [...new Set(filterSourceRows.map((row) => row.placement.department).filter(Boolean))].sort();
  const visibleLocations = inventory.locations.filter((location) =>
    !employeeWarehouseOnly || location.type === LOCATION_TYPES.WAREHOUSE
  );
  const reports = useMemo(() => {
    const byLocation = inventory.reports.byLocation;
    const byCategory = inventory.reports.byCategory.map((item) => ({
      ...item,
      label: categoryLabels[item.label] || item.label,
    }));
    return { byLocation, byCategory };
  }, [inventory.reports]);

  const addLocation = (event) => {
    event.preventDefault();
    const result = inventory.addLocation({
      ...locationDraft,
      actor: { adminId: admin?.adminId, name: admin?.name || "Administrator" },
    });
    setLocationNotice(result.ok ? `${result.location.name} added.` : result.error);
    if (result.ok) setLocationDraft({ name: "", type: LOCATION_TYPES.STORE, address: "", area: "" });
  };

  const tiles = availabilityOnly
    ? [
        ["Catalogue pieces", availabilityRows.length, "Availability access only", Boxes],
        ["Available", availabilityRows.filter((row) => row.customerAvailability.available > 0).length, "In stock", PackageCheck],
        ["Only a few left", availabilityRows.filter((row) => row.customerAvailability.status === STOCK_STATUS.LOW_STOCK).length, "Customer-safe status", AlertTriangle, true],
        ["Unavailable", availabilityRows.filter((row) => row.customerAvailability.available <= 0).length, "Ask inventory team", PackageX, true],
      ]
    : employeeWarehouseOnly
      ? [
          ["Warehouse units", metrics.totalUnits || 0, "On hand", Warehouse],
          ["Available", metrics.availableUnits || 0, "Ready for allocation", PackageCheck],
          ["Reserved", metrics.reservedUnits || 0, "Held at checkout", RotateCcw],
          ["Damaged", metrics.damagedUnits || 0, "Unavailable for sale", ShieldAlert],
          ["Returned", metrics.returnedUnits || 0, "Awaiting inspection", RotateCcw],
          ["Low stock", metrics.lowStock || 0, "At or below threshold", AlertTriangle, true],
          ["Out of stock", metrics.outOfStock || 0, "Needs replenishment", PackageX, true],
        ]
      : [
        ["Total units", metrics.totalUnits || 0, "On hand across visible locations", Boxes],
        ["Available", metrics.availableUnits || 0, "Ready for sale", PackageCheck],
        ["Reserved", metrics.reservedUnits || 0, "Held at checkout", RotateCcw],
        ["Low stock", metrics.lowStock || 0, "At or below threshold", AlertTriangle, true],
        ["Out of stock", metrics.outOfStock || 0, "Needs receiving or transfer", PackageX, true],
        ["Estimated inventory value", formatINR(metrics.estimatedValue || 0), "Available units × selling price", CircleDollarSign],
        ["Damaged", metrics.damagedUnits || 0, "Unavailable for sale", ShieldAlert],
        ["Returned", metrics.returnedUnits || 0, "Awaiting inspection", RotateCcw],
        ["Store stock", metrics.storeStock || 0, "On hand", Store],
        ["Warehouse stock", metrics.warehouseStock || 0, "On hand", Warehouse],
      ];

  return (
    <Page
      eyebrow={portal === "admin" ? "Business / Inventory" : "Retail operations / Inventory"}
      title="Inventory Dashboard"
      description={employeeWarehouseOnly
        ? "Warehouse stock, receiving and transfer handling. Store-only details remain outside this work queue."
        : availabilityOnly
          ? "Customer-safe product availability for assisted selling and styling. Internal quantities, reservations and locations remain restricted."
          : "One stock ledger across the Main Store and Main Warehouse, connected to the existing catalogue and variants."}
      actions={
        <>
          {can(PERMISSIONS.INVENTORY_RECEIVE) ? (
            <AtelierButton as={Link} to={`${root}/receive`} size="chip">Receive stock</AtelierButton>
          ) : null}
          {can(PERMISSIONS.INVENTORY_ADJUST) ? (
            <AtelierButton as={Link} to={`${root}/adjust`} variant="outline" size="chip">Adjust stock</AtelierButton>
          ) : null}
          {can(PERMISSIONS.INVENTORY_TRANSFER) ? (
            <AtelierButton as={Link} to={`${root}/transfers`} variant="outline" size="chip">Transfer stock</AtelierButton>
          ) : null}
        </>
      }
    >
      <InventoryNav portal={portal} />

      <p className="mb-4 border-l-2 border-brass bg-surface/50 px-4 py-3 font-ui text-[11px] leading-relaxed text-taupe">
        Frontend demo inventory. Local browser writes are not concurrency-safe; production will replace this repository with transactional backend operations.
      </p>

      <section aria-label="Inventory metrics" className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map(([label, value, hint, Icon, alert], index) => (
          <motion.div key={label} transition={{ delay: index * 0.025 }}>
            <Metric label={label} value={value} hint={hint} Icon={Icon} alert={alert} />
          </motion.div>
        ))}
      </section>

      <AdminPanel eyebrow="Stock summary" title="Catalogue inventory" bodyClassName="px-0 py-0 sm:px-0">
        <form
          className="grid gap-3 border-b border-mist/70 bg-canvas/60 p-4 sm:grid-cols-2 xl:grid-cols-4"
          onSubmit={(event) => event.preventDefault()}
          aria-label="Inventory filters"
        >
          <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
            Search
            <input
              type="search"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder={availabilityOnly ? "Product, SKU or category" : "Product, SKU, category, rack or bin"}
              className={`${inputClass} mt-2 normal-case tracking-normal`}
            />
          </label>
          <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
            Category
            <select className={`${inputClass} mt-2 normal-case tracking-normal`} value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{categoryLabels[category] || category}</option>)}
            </select>
          </label>
          <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
            Subcategory
            <select className={`${inputClass} mt-2 normal-case tracking-normal`} value={filters.subcategory} onChange={(event) => setFilters((current) => ({ ...current, subcategory: event.target.value }))}>
              <option value="">All subcategories</option>
              {subcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}
            </select>
          </label>
          <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
            Product type
            <select className={`${inputClass} mt-2 normal-case tracking-normal`} value={filters.productType} onChange={(event) => setFilters((current) => ({ ...current, productType: event.target.value }))}>
              <option value="">All product types</option>
              {productTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          {!availabilityOnly ? (
            <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
              Location
              <select className={`${inputClass} mt-2 normal-case tracking-normal`} value={filters.locationId} onChange={(event) => setFilters((current) => ({ ...current, locationId: event.target.value }))}>
                <option value="">All locations</option>
                {inventory.locations.filter((location) => !employeeWarehouseOnly || location.type === LOCATION_TYPES.WAREHOUSE).map((location) => (
                  <option key={location.id} value={location.id}>{location.name} · {location.type === "STORE" ? "Store" : "Warehouse"}</option>
                ))}
              </select>
            </label>
          ) : null}
          {!availabilityOnly ? (
            <>
              <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
                Location type
                <select className={`${inputClass} mt-2 normal-case tracking-normal`} value={filters.locationType} onChange={(event) => setFilters((current) => ({ ...current, locationType: event.target.value }))}>
                  <option value="">Store & warehouse</option>
                  <option value={LOCATION_TYPES.STORE}>Store</option>
                  <option value={LOCATION_TYPES.WAREHOUSE}>Warehouse</option>
                </select>
              </label>
              <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
                Department
                <select className={`${inputClass} mt-2 normal-case tracking-normal`} value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}>
                  <option value="">All departments</option>
                  {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              </label>
            </>
          ) : null}
          <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
            Stock status
            <select className={`${inputClass} mt-2 normal-case tracking-normal`} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              <option value={STOCK_STATUS.IN_STOCK}>In stock</option>
              <option value={STOCK_STATUS.LOW_STOCK}>Low stock</option>
              <option value={STOCK_STATUS.OUT_OF_STOCK}>Out of stock</option>
              <option value={STOCK_STATUS.OVERSTOCKED}>Overstocked</option>
              <option value={STOCK_STATUS.UNAVAILABLE}>Unavailable</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4">
            {[
              ["Low stock", STOCK_STATUS.LOW_STOCK],
              ["Out of stock", STOCK_STATUS.OUT_OF_STOCK],
              ["In stock", STOCK_STATUS.IN_STOCK],
            ].map(([label, status]) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilters((current) => ({ ...current, status: current.status === status ? "" : status }))}
                aria-pressed={filters.status === status}
                className={`border px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.13em] focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${filters.status === status ? "border-ink bg-ink text-ivory" : "border-mist text-taupe hover:border-ink hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
            {!availabilityOnly ? [
              ["Available", "hasAvailable"],
              ["Reserved", "hasReserved"],
              ["Damaged", "hasDamaged"],
              ["Returned", "hasReturned"],
            ].map(([label, key]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filters[key]}
                onClick={() => setFilters((current) => ({ ...current, [key]: !current[key] }))}
                className={`border px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.13em] focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${filters[key] ? "border-ink bg-ink text-ivory" : "border-mist text-taupe hover:border-ink hover:text-ink"}`}
              >
                {label}
              </button>
            )) : null}
            <button type="button" onClick={() => setFilters({ search: "", category: "", subcategory: "", productType: "", locationId: "", status: "", locationType: "", department: "", hasAvailable: false, hasReserved: false, hasDamaged: false, hasReturned: false })} className="px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.13em] text-accent hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">
              Clear filters
            </button>
          </div>
        </form>

        {availabilityOnly ? (
          <DataTable
            className="border-0"
            rows={availabilityRows}
            empty="No products match these filters."
            columns={[
              { id: "product", label: "Product", render: (row) => <div><p className="font-medium">{row.productName}</p><p className="mt-1 font-mono text-[10px] text-taupe">{row.sku} · {row.variantLabel}</p></div> },
              { id: "category", label: "Category", render: (row) => categoryLabels[row.category] || row.category },
              { id: "status", label: "Availability", render: (row) => <InventoryStatusBadge status={row.customerAvailability.status} /> },
              { id: "guidance", label: "Customer guidance", render: (row) => row.customerAvailability.available <= 0 ? "Currently unavailable" : row.customerAvailability.status === STOCK_STATUS.LOW_STOCK ? "Only a few left" : "In stock" },
            ]}
          />
        ) : (
        <DataTable
          className="border-0"
          rows={rows}
          empty="No inventory rows match these filters."
          columns={[
            {
              id: "product",
              label: "Product",
              render: (row) => (
                <div className="min-w-44">
                  <p className="font-medium text-ink">{row.productName}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-taupe">{row.sku}</p>
                  <p className="mt-0.5 text-[10px] text-taupe">{categoryLabels[row.category] || row.category} · {row.variantLabel}</p>
                </div>
              ),
            },
            { id: "location", label: "Location", render: (row) => <div><p>{row.location?.name || "—"}</p><p className="mt-0.5 max-w-48 text-[10px] text-taupe">{row.placementLabel || "Placement not assigned"}</p></div> },
            { id: "onHand", label: "On hand", render: (row) => row.quantity.onHand },
            { id: "available", label: "Available", render: (row) => <strong>{row.quantity.available}</strong> },
            { id: "reserved", label: "Reserved", render: (row) => row.quantity.reserved },
            { id: "sold", label: "Sold", render: (row) => row.quantity.sold },
            { id: "returned", label: "Returned", render: (row) => row.quantity.returned },
            { id: "damaged", label: "Damaged", render: (row) => row.quantity.damaged },
            { id: "threshold", label: "Threshold", render: (row) => row.lowStockThreshold },
            { id: "status", label: "Status", render: (row) => <InventoryStatusBadge status={row.status} /> },
            { id: "updated", label: "Last updated", render: (row) => <span className="whitespace-nowrap text-[11px] text-taupe">{formatEmployeeDateTime(row.updatedAt)}</span> },
            {
              id: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex flex-col items-end gap-1 sm:items-start">
                  {can(PERMISSIONS.INVENTORY_RECEIVE) ? <Link className="text-[11px] text-brass hover:text-accent" to={`${root}/receive?productId=${encodeURIComponent(row.productId)}&locationId=${encodeURIComponent(row.locationId)}`}>Receive</Link> : null}
                  {can(PERMISSIONS.INVENTORY_ADJUST) ? <Link className="text-[11px] text-brass hover:text-accent" to={`${root}/adjust?inventoryId=${encodeURIComponent(row.id)}`}>Adjust</Link> : null}
                  {can(PERMISSIONS.INVENTORY_TRANSFER) ? <Link className="text-[11px] text-brass hover:text-accent" to={`${root}/transfers?inventoryId=${encodeURIComponent(row.id)}`}>Transfer</Link> : null}
                </div>
              ),
            },
          ]}
        />
        )}
        <p className="border-t border-mist/60 px-5 py-3 font-ui text-[10px] text-taupe">
          {availabilityOnly
            ? `Showing ${availabilityRows.length} customer-safe availability status${availabilityRows.length === 1 ? "" : "es"}. Internal counts and locations are restricted.`
            : `Showing ${rows.length} inventory row${rows.length === 1 ? "" : "s"} · ${metrics.totalProducts || 0} catalogue products · ${metrics.totalVariants || 0} explicit variants`}
        </p>
      </AdminPanel>

      {!employeeWarehouseOnly && !availabilityOnly ? (
        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          <AdminPanel eyebrow="Report" title="Stock by location">
            <DataTable
              className="border-0"
              rows={reports.byLocation}
              columns={[
                { id: "label", label: "Location" },
                { id: "units", label: "Units" },
                { id: "value", label: "Value", render: (row) => formatINR(row.value) },
                { id: "lowStock", label: "Low" },
                { id: "outOfStock", label: "Out" },
              ]}
            />
          </AdminPanel>
          <AdminPanel eyebrow="Report" title="Stock by category">
            <DataTable
              className="border-0"
              rows={reports.byCategory.slice(0, 8)}
              columns={[
                { id: "label", label: "Category" },
                { id: "units", label: "Units" },
                { id: "available", label: "Available" },
                { id: "value", label: "Value", render: (row) => formatINR(row.value) },
              ]}
            />
          </AdminPanel>
        </div>
      ) : null}

      {!availabilityOnly ? (
      <AdminPanel eyebrow="Physical network" title="Locations" className="mt-7">
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleLocations.map((location) => (
            <article key={location.id} className="border border-mist/70 bg-canvas/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl text-ink">{location.name}</p>
                  <p className="mt-1 font-ui text-[10px] uppercase tracking-[.15em] text-brass">{location.type}</p>
                </div>
                <span className="font-ui text-[9px] uppercase tracking-[.14em] text-cocoa">{location.status}</span>
              </div>
              <p className="mt-3 font-ui text-xs text-taupe">{location.address}</p>
              <p className="mt-1 font-ui text-[10px] text-taupe">{location.area}</p>
            </article>
          ))}
        </div>
        {portal === "admin" ? (
          <form onSubmit={addLocation} className="mt-5 grid gap-3 border-t border-mist/70 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
              Location name
              <input required className={`${inputClass} mt-2 normal-case tracking-normal`} value={locationDraft.name} onChange={(event) => setLocationDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Future store or warehouse" />
            </label>
            <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
              Type
              <select className={`${inputClass} mt-2 normal-case tracking-normal`} value={locationDraft.type} onChange={(event) => setLocationDraft((current) => ({ ...current, type: event.target.value }))}>
                <option value={LOCATION_TYPES.STORE}>Store</option>
                <option value={LOCATION_TYPES.WAREHOUSE}>Warehouse</option>
              </select>
            </label>
            <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
              Address / area
              <input className={`${inputClass} mt-2 normal-case tracking-normal`} value={locationDraft.address} onChange={(event) => setLocationDraft((current) => ({ ...current, address: event.target.value }))} placeholder="Physical address" />
            </label>
            <div className="flex items-end gap-3">
              <AtelierButton type="submit" size="chip">Add location</AtelierButton>
              {locationNotice ? <span role="status" className="font-ui text-[10px] text-taupe">{locationNotice}</span> : null}
            </div>
          </form>
        ) : null}
      </AdminPanel>
      ) : null}
    </Page>
  );
}
