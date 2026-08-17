/**
 * PRATIKSHYA FASHON — Employee authentication context.
 *
 * Isolated from customer AuthContext. Customer sessions never grant
 * employee routes, and employee sessions never grant /account.
 *
 * DEMO / FRONTEND ONLY. A real backend must replace this service later.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { canAccessPath, hasPermission as permit } from "../services/employees/authorization";
import {
  changeEmployeePassword,
  refreshEmployeeSession,
  restoreEmployeeSession,
  signInEmployee,
  signOutEmployee,
} from "../services/employees/employeeAuthService";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../services/employees/activityService";
import { EMPLOYEES_CHANGED_EVENT } from "../services/employees/employeeService";
import {
  checkIn as punchIn,
  checkOut as punchOut,
  getTodayAttendance,
} from "../services/workforce/attendanceService";

const EmployeeAuthContext = createContext(null);

export function EmployeeAuthProvider({ children }) {
  const [session, setSession] = useState(() => restoreEmployeeSession());
  const [isLoading, setIsLoading] = useState(false);

  const employee = session.employee;
  const isAuthenticated = Boolean(session.isAuthenticated && employee);

  /* Account status changes made by Super Admin invalidate an Employee
     session immediately in this frontend seam, including another tab. */
  useEffect(() => {
    const refreshForAccountChange = () => setSession(refreshEmployeeSession());
    window.addEventListener(EMPLOYEES_CHANGED_EVENT, refreshForAccountChange);
    window.addEventListener("storage", refreshForAccountChange);
    return () => {
      window.removeEventListener(EMPLOYEES_CHANGED_EVENT, refreshForAccountChange);
      window.removeEventListener("storage", refreshForAccountChange);
    };
  }, []);

  const refreshSession = useCallback(() => {
    const next = refreshEmployeeSession();
    setSession(next);
    return next;
  }, []);

  const signIn = useCallback(async ({ employeeId, password }) => {
    setIsLoading(true);
    const result = await signInEmployee({ employeeId, password });
    setIsLoading(false);
    if (!result.ok) {
      return result;
    }
    setSession({ employee: result.employee, isAuthenticated: true });
    recordActivity(loadActivity(), {
      ...describeActor(result.employee),
      targetEmployeeId: result.employee.employeeId,
      action: ACTIVITY_ACTIONS.LOGIN,
      summary: `${result.employee.firstName} ${result.employee.lastName} signed in`,
    });
    return result;
  }, []);

  const signOut = useCallback(() => {
    signOutEmployee();
    setSession({ employee: null, isAuthenticated: false });
  }, []);

  const changePassword = useCallback(
    async ({ currentPassword, newPassword, confirmPassword }) => {
      if (!employee) {
        return { ok: false, error: "You need to sign in first." };
      }
      setIsLoading(true);
      const result = await changeEmployeePassword({
        employeeId: employee.employeeId,
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setIsLoading(false);
      if (!result.ok) return result;
      setSession({ employee: result.employee, isAuthenticated: true });
      recordActivity(loadActivity(), {
        ...describeActor(result.employee),
        targetEmployeeId: result.employee.employeeId,
        action: ACTIVITY_ACTIONS.PASSWORD_CHANGED,
        summary: `${result.employee.firstName} ${result.employee.lastName} changed their password`,
      });
      return result;
    },
    [employee]
  );

  const hasPermission = useCallback(
    (permission) => permit(employee, permission),
    [employee]
  );

  const canAccess = useCallback(
    (pathname) => canAccessPath(employee, pathname),
    [employee]
  );

  const getAttendance = useCallback(() => {
    if (!employee) return null;
    const record = getTodayAttendance(employee.employeeId);
    if (!record) return null;
    return {
      ...record,
      checkedInAt: record.checkIn,
      checkedOutAt: record.checkOut,
    };
  }, [employee]);

  const checkIn = useCallback(() => {
    if (!employee) return { ok: false };
    return punchIn({ employeeId: employee.employeeId, actor: employee });
  }, [employee]);

  const checkOut = useCallback(() => {
    if (!employee) return { ok: false };
    return punchOut({ employeeId: employee.employeeId, actor: employee });
  }, [employee]);

  const value = useMemo(
    () => ({
      employee,
      isAuthenticated,
      isLoading,
      mustChangePassword: Boolean(employee?.mustChangePassword),
      signIn,
      signOut,
      changePassword,
      refreshSession,
      hasPermission,
      canAccess,
      getAttendance,
      checkIn,
      checkOut,
    }),
    [
      employee,
      isAuthenticated,
      isLoading,
      signIn,
      signOut,
      changePassword,
      refreshSession,
      hasPermission,
      canAccess,
      getAttendance,
      checkIn,
      checkOut,
    ]
  );

  return (
    <EmployeeAuthContext.Provider value={value}>{children}</EmployeeAuthContext.Provider>
  );
}

const inertEmployeeAuth = {
  employee: null,
  isAuthenticated: false,
  isLoading: false,
  mustChangePassword: false,
  signIn: async () => ({ ok: false, error: "" }),
  signOut: () => {},
  changePassword: async () => ({ ok: false, error: "" }),
  refreshSession: () => ({ employee: null, isAuthenticated: false }),
  hasPermission: () => false,
  canAccess: () => false,
  getAttendance: () => null,
  checkIn: () => ({ ok: false }),
  checkOut: () => ({ ok: false }),
};

export function useEmployeeAuth() {
  return useContext(EmployeeAuthContext) ?? inertEmployeeAuth;
}

export default EmployeeAuthContext;
