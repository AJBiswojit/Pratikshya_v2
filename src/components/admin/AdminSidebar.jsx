import { ADMIN_NAV_GROUPS, resolveActiveNavId } from "../../config/adminNavigation";
import { getAdminRoleLabel } from "../../config/adminAccess";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminInitials } from "../../utils/admin";
import PortalSidebar from "../navigation/PortalSidebar";
import { adminNavIcon } from "./adminNavIcons";

const STORAGE_KEY = "pf_admin_nav_groups";

/**
 * The Admin Portal navigation — a management control centre.
 *
 * Renders the shared PortalSidebar with the Admin navigation configuration.
 * Authorization is enforced upstream by AdminProtectedRoute; the single
 * SUPER_ADMIN role sees every module, so no per-item filtering is applied.
 */
export default function AdminSidebar({ onNavigate, collapsed = false, onToggleCollapsed }) {
  const { admin, signOut } = useAdminAuth();

  return (
    <PortalSidebar
      navId="admin-navigation"
      ariaLabel="Admin portal"
      groups={ADMIN_NAV_GROUPS}
      resolveActiveId={resolveActiveNavId}
      iconResolver={adminNavIcon}
      storageKey={STORAGE_KEY}
      identity={{
        name: admin?.name || "Administrator",
        roleLabel: getAdminRoleLabel(admin?.role),
        avatar: admin?.avatar,
        initials: adminInitials(admin),
      }}
      footerLinks={[{ id: "profile", label: "Profile", to: "/admin/profile", icon: "user" }]}
      signOut={signOut}
      onNavigate={onNavigate}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
    />
  );
}
