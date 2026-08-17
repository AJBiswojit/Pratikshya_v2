import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "../../design-system";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { sanitizeEmployeeReturnUrl } from "../../config/employeeNavigation";

export default function EmployeeProtectedRoute() {
  const { isAuthenticated, isLoading, mustChangePassword } = useEmployeeAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingState label="Opening the team portal" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const intended = sanitizeEmployeeReturnUrl(location.pathname + location.search);
    return (
      <Navigate
        to={`/employee/login?returnTo=${encodeURIComponent(intended)}`}
        replace
      />
    );
  }

  if (mustChangePassword && location.pathname !== "/employee/change-password") {
    return <Navigate to="/employee/change-password" replace />;
  }

  return <Outlet />;
}
