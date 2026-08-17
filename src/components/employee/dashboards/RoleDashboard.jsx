import { useEmployeeAuth } from "../../../context/EmployeeAuthContext";
import { ROLES } from "../../../config/employeeRoles";
import ManagerDashboard from "./ManagerDashboard";
import SalesDashboard from "./SalesDashboard";
import InventoryDashboard from "./InventoryDashboard";
import WarehouseDashboard from "./WarehouseDashboard";
import SupportDashboard from "./SupportDashboard";
import StylistDashboard from "./StylistDashboard";

export default function RoleDashboard() {
  const { employee } = useEmployeeAuth();
  const role = employee?.role;

  if (role === ROLES.STORE_MANAGER) return <ManagerDashboard />;
  if (role === ROLES.SALES_EXECUTIVE) return <SalesDashboard />;
  if (role === ROLES.INVENTORY_MANAGER || role === ROLES.INVENTORY_STAFF) {
    return <InventoryDashboard />;
  }
  if (role === ROLES.WAREHOUSE_STAFF) return <WarehouseDashboard />;
  if (role === ROLES.CUSTOMER_SUPPORT) return <SupportDashboard />;
  if (role === ROLES.FASHION_STYLIST) return <StylistDashboard />;
  return <SalesDashboard />;
}
