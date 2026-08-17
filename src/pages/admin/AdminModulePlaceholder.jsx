import { useLocation } from "react-router-dom";
import AdminComingSoon from "../../components/admin/AdminComingSoon";
import {
  ADMIN_NAV_GROUPS,
  ADMIN_PLACEHOLDER_COPY,
  findAdminNavItem,
} from "../../config/adminNavigation";

/**
 * The single route element behind every planned-but-unbuilt module.
 *
 * It resolves its own title, group and copy from the navigation config, so
 * adding a future module means adding one nav entry rather than a new page.
 */
export default function AdminModulePlaceholder() {
  const { pathname } = useLocation();
  const item = findAdminNavItem(pathname);
  const group = ADMIN_NAV_GROUPS.find((entry) =>
    entry.items.some((navItem) => navItem.id === item?.id)
  );

  return (
    <AdminComingSoon
      title={item?.label ?? "This module"}
      group={group?.label}
      description={
        ADMIN_PLACEHOLDER_COPY[item?.id] ??
        "This part of the business console is planned for a later phase."
      }
    />
  );
}
