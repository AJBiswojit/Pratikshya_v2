/**
 * PRATIKSHYA FASHON — Admin route guard.
 *
 * Three outcomes, in order:
 *
 *   no admin session          → /admin/login (with returnTo)
 *   employee session, no admin → /admin/login, and the login page explains
 *                                that employee credentials do not apply
 *   admin session, wrong role  → Admin access denied
 *
 * An employee session is never accepted as admin authentication.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "../../design-system";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { sanitizeAdminReturnUrl } from "../../config/adminNavigation";
import AdminAccessDenied from "../../pages/admin/AdminAccessDenied";

export default function AdminProtectedRoute() {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingState label="Verifying administration access" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const intended = sanitizeAdminReturnUrl(location.pathname + location.search);
    return <Navigate to={`/admin/login?returnTo=${encodeURIComponent(intended)}`} replace />;
  }

  /* Signed in, but not with an administration role. */
  if (!isSuperAdmin) {
    return <AdminAccessDenied />;
  }

  return <Outlet />;
}
