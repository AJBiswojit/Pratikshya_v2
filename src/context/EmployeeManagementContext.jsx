/**
 * PRATIKSHYA FASHON — Employee management context.
 *
 * Shared employee repository state. Super Admin account-management actions
 * are thin wrappers around employeeService and carry the signed-in Admin
 * actor into its authorization gate. Employee surfaces receive read-only
 * operational data plus the deliberately narrow own-profile action.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useEmployeeAuth } from "./EmployeeAuthContext";
import { useAdminAuth } from "./AdminAuthContext";
import { canManageEmployeeAccounts } from "../config/adminAccess";
import { getRoleLabel } from "../config/employeeRoles";
import { getDepartmentLabel, getSectionLabel, getStoreLabel } from "../config/employeeDepartments";
import { getStatusLabel } from "../config/employeeStatus";
import { employeeFullName } from "../utils/employee";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_CHANGED_EVENT,
  activityForEmployee,
  describeActor,
  loadActivity,
  recordActivity,
} from "../services/employees/activityService";
import {
  activateEmployee as activateRecord,
  createEmployee as createRecord,
  deactivateEmployee as deactivateRecord,
  ensureSeeded,
  getEmployee as findEmployee,
  getEmployees as filterEmployees,
  resetEmployeePassword as resetRecord,
  suspendEmployee as suspendRecord,
  updateEmployee as updateRecord,
  updateOwnEmployeeProfile as updateOwnProfileRecord,
  updateEmployeeDepartment as updateDepartmentRecord,
  updateEmployeePermissions as updatePermissionsRecord,
  updateEmployeeRole as updateRoleRecord,
} from "../services/employees/employeeService";

const EmployeeManagementContext = createContext(null);

export function EmployeeManagementProvider({ children }) {
  const { employee: employeeActor, refreshSession } = useEmployeeAuth();
  const { admin } = useAdminAuth();
  const [employees, setEmployees] = useState(() => ensureSeeded());
  const [activity, setActivity] = useState(() => loadActivity());
  const [isWorking, setIsWorking] = useState(false);

  /*
   * Phase 13 — the product repository writes product events straight into
   * this same diary. Re-read when it announces a write so both portals'
   * activity views stay live without a second activity system.
   */
  useEffect(() => {
    const sync = () => setActivity(loadActivity());
    window.addEventListener(ACTIVITY_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACTIVITY_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const syncIfCurrent = useCallback(
    (updated) => {
      if (updated && employeeActor && updated.employeeId === employeeActor.employeeId) {
        refreshSession();
      }
    },
    [employeeActor, refreshSession]
  );

  const note = useCallback(
    (action, target, summary) => {
      setActivity((current) =>
        recordActivity(current, {
          ...describeActor(admin),
          targetEmployeeId: target?.employeeId || null,
          action,
          summary,
        })
      );
    },
    [admin]
  );

  /**
   * Records a non-people event — media, for instance — in the same diary.
   * Phase 12 uses this rather than standing up a second activity log.
   *
   * `actorOverride` lets the Admin Portal sign the entry with the signed-in
   * administrator, whose session is separate from the employee one.
   */
  const noteEvent = useCallback(
    (action, summary, actorOverride = null) => {
      setActivity((current) =>
        recordActivity(current, {
          ...describeActor(employeeActor),
          ...(actorOverride ?? {}),
          action,
          summary,
        })
      );
    },
    [employeeActor]
  );

  const getEmployees = useCallback(
    (filters) => filterEmployees(employees, filters),
    [employees]
  );

  const getEmployee = useCallback(
    (id) => findEmployee(employees, id),
    [employees]
  );

  const createEmployee = useCallback(
    async (draft) => {
      setIsWorking(true);
      await new Promise((resolve) => setTimeout(resolve, 280));
      const result = createRecord(employees, draft, admin);
      setIsWorking(false);
      if (!result.ok) return result;
      setEmployees(result.employees);
      note(
        ACTIVITY_ACTIONS.EMPLOYEE_CREATED,
        result.employee,
        `Created employee ${employeeFullName(result.employee)} · ${result.employee.employeeId}`
      );
      return result;
    },
    [employees, admin, note]
  );

  const updateEmployee = useCallback(
    async (employeeId, patch) => {
      setIsWorking(true);
      await new Promise((resolve) => setTimeout(resolve, 220));
      const result = updateRecord(employees, employeeId, patch, admin);
      setIsWorking(false);
      if (!result.ok) return result;
      setEmployees(result.employees);
      syncIfCurrent(result.employee);
      note(
        ACTIVITY_ACTIONS.EMPLOYEE_UPDATED,
        result.employee,
        `Updated ${employeeFullName(result.employee)}`
      );
      return result;
    },
    [employees, admin, note, syncIfCurrent]
  );

  const updateOwnProfile = useCallback(
    async (patch) => {
      if (!employeeActor) {
        return { ok: false, code: "FORBIDDEN", message: "You need to sign in first." };
      }
      setIsWorking(true);
      const result = updateOwnProfileRecord(
        employees,
        employeeActor.employeeId,
        patch,
        employeeActor
      );
      setIsWorking(false);
      if (!result.ok) return result;
      setEmployees(result.employees);
      refreshSession();
      setActivity((current) =>
        recordActivity(current, {
          ...describeActor(employeeActor),
          targetEmployeeId: employeeActor.employeeId,
          action: ACTIVITY_ACTIONS.EMPLOYEE_UPDATED,
          summary: `${employeeFullName(employeeActor)} updated their own contact profile`,
        })
      );
      return result;
    },
    [employees, employeeActor, refreshSession]
  );

  const updateEmployeeRole = useCallback(
    async (employeeId, role, options) => {
      const result = updateRoleRecord(employees, employeeId, role, options, admin);
      if (!result.ok) return result;
      setEmployees(result.employees);
      syncIfCurrent(result.employee);
      note(
        ACTIVITY_ACTIONS.ROLE_CHANGED,
        result.employee,
        `Changed role for ${employeeFullName(result.employee)} to ${getRoleLabel(role)}`
      );
      return result;
    },
    [employees, admin, note, syncIfCurrent]
  );

  const updateEmployeeDepartment = useCallback(
    async (employeeId, assignment) => {
      const result = updateDepartmentRecord(employees, employeeId, assignment, admin);
      if (!result.ok) return result;
      setEmployees(result.employees);
      syncIfCurrent(result.employee);
      note(
        ACTIVITY_ACTIONS.DEPARTMENT_CHANGED,
        result.employee,
        `Moved ${employeeFullName(result.employee)} to ${getDepartmentLabel(result.employee.department)} · ${getSectionLabel(result.employee.department, result.employee.section)} · ${getStoreLabel(result.employee.store)}`
      );
      return result;
    },
    [employees, admin, note, syncIfCurrent]
  );

  const updateEmployeePermissions = useCallback(
    async (employeeId, permissions) => {
      const result = updatePermissionsRecord(employees, employeeId, permissions, admin);
      if (!result.ok) return result;
      setEmployees(result.employees);
      syncIfCurrent(result.employee);
      note(
        ACTIVITY_ACTIONS.PERMISSIONS_CHANGED,
        result.employee,
        `Updated permissions for ${employeeFullName(result.employee)}`
      );
      return result;
    },
    [employees, admin, note, syncIfCurrent]
  );

  const suspendEmployee = useCallback(
    async (employeeId) => {
      const result = suspendRecord(employees, employeeId, admin);
      if (!result.ok) return result;
      setEmployees(result.employees);
      syncIfCurrent(result.employee);
      note(
        ACTIVITY_ACTIONS.EMPLOYEE_SUSPENDED,
        result.employee,
        `Suspended ${employeeFullName(result.employee)}`
      );
      return result;
    },
    [employees, admin, note, syncIfCurrent]
  );

  const activateEmployee = useCallback(
    async (employeeId) => {
      const result = activateRecord(employees, employeeId, admin);
      if (!result.ok) return result;
      setEmployees(result.employees);
      syncIfCurrent(result.employee);
      note(
        ACTIVITY_ACTIONS.EMPLOYEE_ACTIVATED,
        result.employee,
        `Activated ${employeeFullName(result.employee)} · ${getStatusLabel(result.employee.status)}`
      );
      return result;
    },
    [employees, admin, note, syncIfCurrent]
  );

  const deactivateEmployee = useCallback(
    async (employeeId) => {
      const result = deactivateRecord(employees, employeeId, admin);
      if (!result.ok) return result;
      setEmployees(result.employees);
      syncIfCurrent(result.employee);
      note(
        ACTIVITY_ACTIONS.EMPLOYEE_DEACTIVATED,
        result.employee,
        `Deactivated ${employeeFullName(result.employee)}`
      );
      return result;
    },
    [employees, admin, note, syncIfCurrent]
  );

  const resetEmployeePassword = useCallback(
    async (employeeId) => {
      setIsWorking(true);
      await new Promise((resolve) => setTimeout(resolve, 240));
      const result = resetRecord(employees, employeeId, admin);
      setIsWorking(false);
      if (!result.ok) return result;
      setEmployees(result.employees);
      syncIfCurrent(result.employee);
      note(
        ACTIVITY_ACTIONS.PASSWORD_RESET,
        result.employee,
        `Reset password for ${employeeFullName(result.employee)}`
      );
      return result;
    },
    [employees, admin, note, syncIfCurrent]
  );

  const getActivity = useCallback(
    (employeeId = null) =>
      employeeId ? activityForEmployee(activity, employeeId) : activity,
    [activity]
  );

  const canManageEmployees = canManageEmployeeAccounts(admin);

  const value = useMemo(
    () => ({
      employees,
      activity,
      isWorking,
      canManageEmployees,
      getEmployee,
      getEmployees,
      createEmployee,
      updateEmployee,
      updateOwnProfile,
      updateEmployeeRole,
      updateEmployeeDepartment,
      updateEmployeePermissions,
      suspendEmployee,
      activateEmployee,
      deactivateEmployee,
      resetEmployeePassword,
      getActivity,
      noteEvent,
    }),
    [
      employees,
      activity,
      isWorking,
      canManageEmployees,
      getEmployee,
      getEmployees,
      createEmployee,
      updateEmployee,
      updateOwnProfile,
      updateEmployeeRole,
      updateEmployeeDepartment,
      updateEmployeePermissions,
      suspendEmployee,
      activateEmployee,
      deactivateEmployee,
      resetEmployeePassword,
      getActivity,
      noteEvent,
    ]
  );

  return (
    <EmployeeManagementContext.Provider value={value}>
      {children}
    </EmployeeManagementContext.Provider>
  );
}

const inertManagement = {
  employees: [],
  activity: [],
  isWorking: false,
  canManageEmployees: false,
  getEmployee: () => null,
  getEmployees: () => [],
  createEmployee: async () => ({ ok: false }),
  updateEmployee: async () => ({ ok: false }),
  updateOwnProfile: async () => ({ ok: false }),
  updateEmployeeRole: async () => ({ ok: false }),
  updateEmployeeDepartment: async () => ({ ok: false }),
  updateEmployeePermissions: async () => ({ ok: false }),
  suspendEmployee: async () => ({ ok: false }),
  activateEmployee: async () => ({ ok: false }),
  deactivateEmployee: async () => ({ ok: false }),
  resetEmployeePassword: async () => ({ ok: false }),
  getActivity: () => [],
  noteEvent: () => {},
};

export function useEmployeeManagement() {
  return useContext(EmployeeManagementContext) ?? inertManagement;
}

export default EmployeeManagementContext;
