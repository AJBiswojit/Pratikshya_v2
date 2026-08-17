import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import EmployeePage from "../../components/employee/EmployeePage";
import AnalyticsWorkspace from "../../components/analytics/AnalyticsWorkspace";
import { ANALYTICS_TABS } from "../../components/analytics/AnalyticsNav";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { useOrder } from "../../context/OrderContext";
import { useInventory } from "../../context/InventoryContext";
import { useWorkforce } from "../../context/WorkforceContext";
import { PERMISSIONS } from "../../config/employeePermissions";
import { ANALYTICS_PRESETS } from "../../services/analytics/dateRange";
import { getAnalyticsSnapshot } from "../../services/analytics/analyticsService";

const SECTION_PERMISSION = {
  overview: PERMISSIONS.ANALYTICS_VIEW,
  sales: PERMISSIONS.ANALYTICS_SALES,
  products: PERMISSIONS.ANALYTICS_PRODUCTS,
  customers: PERMISSIONS.ANALYTICS_CUSTOMERS,
  inventory: PERMISSIONS.ANALYTICS_INVENTORY,
  returns: PERMISSIONS.ANALYTICS_RETURNS,
  offers: PERMISSIONS.ANALYTICS_OFFERS,
  employees: PERMISSIONS.ANALYTICS_EMPLOYEES,
};

export default function EmployeeReports() {
  const { employee, hasPermission } = useEmployeeAuth();
  const { allOrders } = useOrder();
  const inventory = useInventory();
  const { revision } = useWorkforce();
  const [periodInput, setPeriodInput] = useState({
    preset: ANALYTICS_PRESETS.LAST_30,
    start: "",
    end: "",
  });
  const [filters, setFilters] = useState({});

  const allowed = hasPermission(PERMISSIONS.ANALYTICS_VIEW);
  const tabs = ANALYTICS_TABS.filter((tab) => {
    const required = SECTION_PERMISSION[tab.section];
    if (tab.section === "overview") return true;
    return hasPermission(required);
  });

  const snapshot = useMemo(
    () =>
      getAnalyticsSnapshot({
        orders: allOrders,
        period: periodInput,
        filters,
      }),
    [allOrders, periodInput, filters, inventory.revision, revision]
  );

  if (!allowed) {
    return <Navigate to="/employee/access-denied" replace />;
  }

  return (
    <EmployeePage
      eyebrow="Reports"
      title={
        <>
          Store <span className="italic text-accent">reports.</span>
        </>
      }
      description="The same analytics read-model as the Admin Portal, limited to the sections your role may see. Customers never see this desk."
    >
      <AnalyticsWorkspace
        snapshot={snapshot}
        periodInput={periodInput}
        onPeriodChange={(next) => setPeriodInput((current) => ({ ...current, ...next }))}
        filters={filters}
        onFiltersChange={setFilters}
        portal="employee"
        allowedTabs={tabs}
        actor={employee}
      />
    </EmployeePage>
  );
}
