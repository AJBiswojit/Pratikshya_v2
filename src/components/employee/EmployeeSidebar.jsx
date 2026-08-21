import { navigationForRole, resolveActiveNavId } from "../../config/employeeNavigation";
import { getRole } from "../../config/employeeRoles";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { employeeFullName, employeeInitials } from "../../utils/employee";
import PortalSidebar from "../navigation/PortalSidebar";
import { navIcon } from "./navIcons";
import { useEmployeeNavBadges } from "./useEmployeeNavBadges";

const STORAGE_KEY = "pf_employee_nav_groups";

/**
 * The Employee Portal navigation — a daily operational workspace.
 *
 * Renders the shared PortalSidebar with role-filtered navigation. Visibility
 * comes from the existing employee permission catalogue (authorization.js),
 * and route guards in EmployeeLayout continue to enforce access.
 */
export default function EmployeeSidebar({ onNavigate, collapsed = false, onToggleCollapsed }) {
  const { employee, hasPermission, signOut } = useEmployeeAuth();
  const groups = navigationForRole(employee?.role, hasPermission);
  const badges = useEmployeeNavBadges(employee);
  const role = getRole(employee?.role);

  return (
    <PortalSidebar
      navId="employee-navigation"
      ariaLabel="Employee portal"
      groups={groups}
      resolveActiveId={resolveActiveNavId}
      badges={badges}
      iconResolver={navIcon}
      storageKey={STORAGE_KEY}
      identity={{
        name: employeeFullName(employee),
        roleLabel: role.label,
        avatar: employee?.avatar,
        initials: employeeInitials(employee),
      }}
      footerLinks={[{ id: "profile", label: "Profile", to: "/employee/profile", icon: "user" }]}
      signOut={signOut}
      onNavigate={onNavigate}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
    />
  );
}
