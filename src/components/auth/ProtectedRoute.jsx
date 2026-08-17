/**
 * PRATIKSHYA FASHON — Protected Route Wrapper
 *
 * Enforces customer authentication for private account areas.
 * Preserves the intended destination via `returnTo` search parameter
 * so customers return to where they were upon signing in.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingState } from "../../design-system";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState label="Verifying atelier access..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    const intended = location.pathname + location.search;
    return (
      <Navigate
        to={`/signin?returnTo=${encodeURIComponent(intended)}`}
        replace
      />
    );
  }

  return children ? children : <Outlet />;
}
