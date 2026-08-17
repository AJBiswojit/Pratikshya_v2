import { NavLink } from "react-router-dom";
import { cn } from "../../utils/cn";

export const ANALYTICS_TABS = [
  { id: "overview", label: "Overview", to: "/admin/analytics", employeeTo: "/employee/reports", section: "overview" },
  { id: "sales", label: "Sales", to: "/admin/analytics/sales", employeeTo: "/employee/reports/sales", section: "sales" },
  { id: "products", label: "Products", to: "/admin/analytics/products", employeeTo: "/employee/reports/products", section: "products" },
  { id: "customers", label: "Customers", to: "/admin/analytics/customers", employeeTo: "/employee/reports/customers", section: "customers" },
  { id: "inventory", label: "Inventory", to: "/admin/analytics/inventory", employeeTo: "/employee/reports/inventory", section: "inventory" },
  { id: "returns", label: "Returns", to: "/admin/analytics/returns", employeeTo: "/employee/reports/returns", section: "returns" },
  { id: "offers", label: "Offers", to: "/admin/analytics/offers", employeeTo: "/employee/reports/offers", section: "offers" },
  { id: "employees", label: "Employees", to: "/admin/analytics/employees", employeeTo: "/employee/reports/employees", section: "employees" },
];

export default function AnalyticsNav({ portal = "admin", tabs = ANALYTICS_TABS }) {
  return (
    <nav aria-label="Analytics sections" className="-mx-1 mb-6 overflow-x-auto">
      <ul className="flex min-w-max gap-1 border-b border-mist/80 px-1">
        {tabs.map((tab) => {
          const to = portal === "employee" ? tab.employeeTo : tab.to;
          return (
            <li key={tab.id}>
              <NavLink
                to={to}
                end={tab.id === "overview"}
                className={({ isActive }) =>
                  cn(
                    "inline-flex px-3 py-2.5 font-ui text-[11px] uppercase tracking-[.14em] transition-colors",
                    isActive
                      ? "border-b-2 border-ink text-ink"
                      : "border-b-2 border-transparent text-taupe hover:text-ink"
                  )
                }
              >
                {tab.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
