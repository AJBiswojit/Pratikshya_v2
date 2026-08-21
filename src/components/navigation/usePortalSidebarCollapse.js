import { useCallback, useEffect, useState } from "react";

/**
 * Desktop rail collapse preference for the shared portal sidebar.
 *
 * Admin and Employee keep separate keys so collapsing one portal cannot
 * rewrite the other. This is a UI chrome preference — it does not live in
 * the business settings repository.
 */
export const SIDEBAR_COLLAPSE_KEYS = {
  admin: "pratikshya_admin_sidebar_collapsed",
  employee: "pratikshya_employee_sidebar_collapsed",
};

export function readSidebarCollapsed(key) {
  if (!key || typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(key, collapsed) {
  if (!key || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, collapsed ? "true" : "false");
  } catch {
    /* storage unavailable — preference simply is not remembered */
  }
}

export default function usePortalSidebarCollapse(portal) {
  const key = SIDEBAR_COLLAPSE_KEYS[portal] ?? SIDEBAR_COLLAPSE_KEYS.admin;
  const [collapsed, setCollapsed] = useState(() => readSidebarCollapsed(key));

  useEffect(() => {
    writeSidebarCollapsed(key, collapsed);
  }, [key, collapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => !current);
  }, []);

  return { collapsed, setCollapsed, toggleCollapsed };
}
