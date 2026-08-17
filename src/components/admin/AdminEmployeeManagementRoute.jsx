import { Outlet } from "react-router-dom";
import { ADMIN_PERMISSIONS } from "../../config/adminAccess";
import { useAdminAuth } from "../../context/AdminAuthContext";
import AdminAccessDenied from "../../pages/admin/AdminAccessDenied";

/**
 * Focused route guard for /admin/employees. The parent AdminProtectedRoute
 * verifies the Admin session; this guard verifies employee-account authority.
 * Service actions repeat the same check before any write.
 */
export default function AdminEmployeeManagementRoute() {
  const { hasPermission } = useAdminAuth();

  if (!hasPermission(ADMIN_PERMISSIONS.EMPLOYEES_MANAGE)) {
    return <AdminAccessDenied />;
  }

  return <Outlet />;
}
