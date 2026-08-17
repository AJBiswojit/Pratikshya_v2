/**
 * PRATIKSHYA FASHON — Admin authentication context.
 *
 * The third and final authentication boundary. It shares no state with
 * AuthContext (customer) or EmployeeAuthContext (employee): an employee
 * session never satisfies /admin, and signing out of the Admin Portal
 * leaves the other two sessions untouched.
 *
 *   AdminAuthContext → adminAuthService → pratikshya_admin_auth
 *
 * DEMO / FRONTEND ONLY. A real backend must replace the service later.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ADMIN_ROLES, hasAdminPermission } from "../config/adminAccess";
import {
  refreshAdminSession,
  restoreAdminSession,
  signInAdmin,
  signOutAdmin,
  updateAdminProfile,
} from "../services/admin/adminAuthService";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(() => restoreAdminSession());
  const [isLoading, setIsLoading] = useState(false);

  const admin = session.admin;
  const isAuthenticated = Boolean(session.isAuthenticated && admin);

  const signIn = useCallback(async ({ adminId, password }) => {
    setIsLoading(true);
    const result = await signInAdmin({ adminId, password });
    setIsLoading(false);
    if (!result.ok) return result;
    setSession({ admin: result.admin, isAuthenticated: true });
    return result;
  }, []);

  const signOut = useCallback(() => {
    signOutAdmin();
    setSession({ admin: null, isAuthenticated: false });
  }, []);

  const refreshSession = useCallback(() => {
    const next = refreshAdminSession();
    setSession(next);
    return next;
  }, []);

  /** Safe profile edits only — admin ID, role and status are not editable. */
  const updateProfile = useCallback(
    (patch) => {
      if (!admin) return { ok: false, error: "You need to sign in first." };
      const result = updateAdminProfile(admin.adminId, patch);
      if (result.ok) {
        setSession({ admin: result.admin, isAuthenticated: true });
      }
      return result;
    },
    [admin]
  );

  const isSuperAdmin = Boolean(admin && admin.role === ADMIN_ROLES.SUPER_ADMIN);
  const hasPermission = useCallback(
    (permission) => hasAdminPermission(admin, permission),
    [admin]
  );

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated,
      isLoading,
      isSuperAdmin,
      hasPermission,
      signIn,
      signOut,
      refreshSession,
      updateProfile,
    }),
    [admin, isAuthenticated, isLoading, isSuperAdmin, hasPermission, signIn, signOut, refreshSession, updateProfile]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

/** Rendered outside the provider, the portal reads as signed-out, never crashes. */
const inertAdminAuth = {
  admin: null,
  isAuthenticated: false,
  isLoading: false,
  isSuperAdmin: false,
  hasPermission: () => false,
  signIn: async () => ({ ok: false, error: "" }),
  signOut: () => {},
  refreshSession: () => ({ admin: null, isAuthenticated: false }),
  updateProfile: () => ({ ok: false, error: "" }),
};

export function useAdminAuth() {
  return useContext(AdminAuthContext) ?? inertAdminAuth;
}

export default AdminAuthContext;
