import { NavLink } from "react-router-dom";
import { cn } from "../../utils/cn";
import { PERMISSIONS } from "../../config/employeePermissions";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { ROLES } from "../../config/employeeRoles";

export default function InventoryNav({ portal = "admin" }) {
  const { employee, hasPermission } = useEmployeeAuth();
  const availabilityOnly = [ROLES.SALES_EXECUTIVE, ROLES.FASHION_STYLIST, ROLES.CUSTOMER_SUPPORT].includes(employee?.role);
  const root = portal === "admin" ? "/admin/inventory" : "/employee/inventory";
  const items = [
    { label: "Inventory", to: root, end: true, permission: PERMISSIONS.INVENTORY_VIEW },
    { label: "Receive", to: `${root}/receive`, permission: PERMISSIONS.INVENTORY_RECEIVE },
    { label: "Adjust", to: `${root}/adjust`, permission: PERMISSIONS.INVENTORY_ADJUST },
    { label: "Transfers", to: `${root}/transfers`, permission: PERMISSIONS.INVENTORY_TRANSFER },
    { label: "Movements", to: `${root}/movements`, permission: PERMISSIONS.INVENTORY_AUDIT },
    { label: "Low stock", to: `${root}/low-stock`, permission: PERMISSIONS.INVENTORY_VIEW },
  ].filter((item) => (portal === "admin" || hasPermission(item.permission)) && !(availabilityOnly && item.label === "Low stock"));

  return (
    <nav aria-label="Inventory sections" className="mb-7 overflow-x-auto border-b border-mist/80">
      <div className="flex min-w-max gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn(
              "border-b-2 px-3 py-3 font-ui text-[10px] uppercase tracking-[.16em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent focus-visible:outline-offset-[-2px]",
              isActive
                ? "border-accent font-medium text-ink"
                : "border-transparent text-taupe hover:text-ink"
            )}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
