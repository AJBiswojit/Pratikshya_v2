import { useMemo, useState } from "react";
import AdminPage from "../../../components/admin/AdminPage";
import AnalyticsWorkspace from "../../../components/analytics/AnalyticsWorkspace";
import { ANALYTICS_TABS } from "../../../components/analytics/AnalyticsNav";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useOrder } from "../../../context/OrderContext";
import { useInventory } from "../../../context/InventoryContext";
import { useWorkforce } from "../../../context/WorkforceContext";
import { ANALYTICS_PRESETS } from "../../../services/analytics/dateRange";
import { getAnalyticsSnapshot } from "../../../services/analytics/analyticsService";

/* Workforce analytics belong to the Employee Portal reports desk —
   the Admin Portal reads business sections only. */
const ADMIN_ANALYTICS_TABS = ANALYTICS_TABS.filter((tab) => tab.section !== "employees");

export default function AdminAnalytics() {
  const { admin } = useAdminAuth();
  const { allOrders } = useOrder();
  const inventory = useInventory();
  const { revision } = useWorkforce();
  const [periodInput, setPeriodInput] = useState({
    preset: ANALYTICS_PRESETS.LAST_30,
    start: "",
    end: "",
  });
  const [filters, setFilters] = useState({});

  const snapshot = useMemo(
    () =>
      getAnalyticsSnapshot({
        orders: allOrders,
        period: periodInput,
        filters,
      }),
    [allOrders, periodInput, filters, inventory.revision, revision]
  );

  return (
    <AdminPage
      eyebrow="Business intelligence"
      title={
        <>
          House <span className="italic text-accent">analytics.</span>
        </>
      }
      description="A read-model over the existing orders, catalogue, customers, inventory, returns, offers and workforce. Same sources, same date range, same numbers."
    >
      <AnalyticsWorkspace
        snapshot={snapshot}
        periodInput={periodInput}
        onPeriodChange={(next) => setPeriodInput((current) => ({ ...current, ...next }))}
        filters={filters}
        onFiltersChange={setFilters}
        portal="admin"
        allowedTabs={ADMIN_ANALYTICS_TABS}
        actor={admin}
      />
    </AdminPage>
  );
}
