/**
 * PRATIKSHYA FASHON — Employee navigation & route authorization.
 *
 * Navigation is organised around WORK, grouped into collapsible sections.
 * Items are filtered by the existing permission catalogue (employeePermissions),
 * so the sidebar always reflects what the signed-in employee may actually do.
 * Route authorization uses the same permission map — hiding a link is never
 * the only protection, and the route guards in EmployeeLayout remain intact.
 *
 * This file is the SINGLE employee navigation definition:
 *   one grouped catalogue (EMPLOYEE_NAV_GROUPS)
 *   + the existing permission catalogue
 *   + the existing routing (App.jsx)
 */

import { PERMISSIONS as P } from "./employeePermissions";

export const EMPLOYEE_BRAND = {
  name: "PRATIKSHYA FASHON",
  portal: "Employee Portal",
  subtitle: "Retail Operations",
  home: "/employee",
  login: "/employee/login",
};

/**
 * Longest-prefix route rules. `/employee` is exact-only so it does not
 * swallow every nested path.
 */
export const EMPLOYEE_ROUTE_RULES = [
  { path: "/employee/management", permission: P.PROFILE_VIEW, prefix: true },
  { path: "/employee/team", permission: P.TEAM_VIEW, prefix: true },
  { path: "/employee/reports", permission: P.ANALYTICS_VIEW, prefix: true },
  { path: "/employee/sales", permission: P.ANALYTICS_VIEW, prefix: true },
  { path: "/employee/media/upload", permission: P.MEDIA_UPLOAD, prefix: true },
  { path: "/employee/media", permission: P.MEDIA_VIEW, prefix: true },
  { path: "/employee/products", permission: P.PRODUCTS_VIEW, prefix: true },
  { path: "/employee/customers", permission: P.CUSTOMERS_VIEW, prefix: true },
  { path: "/employee/orders/assisted", permission: P.ORDERS_CREATE, prefix: true },
  { path: "/employee/orders", permission: P.ORDERS_VIEW, prefix: true },
  { path: "/employee/offers/new", permission: P.OFFERS_CREATE, prefix: true },
  { path: "/employee/offers", permission: P.OFFERS_VIEW, prefix: true },
  /* Inventory child routes are checked before the broad view rule so a
     read-only employee cannot reach an operation by typing its URL. */
  { path: "/employee/inventory/receive", permission: P.INVENTORY_RECEIVE, prefix: true },
  { path: "/employee/inventory/adjust", permission: P.INVENTORY_ADJUST, prefix: true },
  { path: "/employee/inventory/transfers", permission: P.INVENTORY_TRANSFER, prefix: true },
  { path: "/employee/inventory/movements", permission: P.INVENTORY_AUDIT, prefix: true },
  { path: "/employee/inventory", permission: P.INVENTORY_VIEW, prefix: true },
  { path: "/employee/warehouse", permission: P.WAREHOUSE_VIEW, prefix: true },
  { path: "/employee/returns", permission: P.RETURNS_VIEW, prefix: true },
  { path: "/employee/support", permission: P.SUPPORT_VIEW, prefix: true },
  { path: "/employee/styling", permission: P.STYLING_VIEW, prefix: true },
  { path: "/employee/attendance/leave", permission: P.LEAVE_VIEW, prefix: true },
  { path: "/employee/attendance", permission: P.ATTENDANCE_VIEW, prefix: true },
  { path: "/employee/performance", permission: P.PERFORMANCE_VIEW, prefix: true },
  { path: "/employee/profile", permission: P.PROFILE_VIEW, prefix: true },
  { path: "/employee/access-denied", permission: null, prefix: true },
  { path: "/employee", permission: P.DASHBOARD_VIEW, prefix: false },
];

export const requiredPermissionForPath = (pathname) => {
  if (!pathname || typeof pathname !== "string") return P.DASHBOARD_VIEW;
  const cleaned = pathname.split("?")[0];
  if (/^\/employee\/offers\/[^/]+\/edit$/.test(cleaned)) return P.OFFERS_EDIT;
  const match = EMPLOYEE_ROUTE_RULES.find((rule) =>
    rule.prefix ? cleaned === rule.path || cleaned.startsWith(`${rule.path}/`) : cleaned === rule.path
  );
  return match ? match.permission : P.DASHBOARD_VIEW;
};

/**
 * Grouped navigation catalogue. `children` are operational sub-routes kept
 * inside their parent section so the sidebar stays clean while every existing
 * employee destination remains reachable. Items the signed-in employee cannot
 * access are omitted — never rendered and then hidden.
 *
 * Order matters: groups and items read top-to-bottom as a working day.
 */
export const EMPLOYEE_NAV_GROUPS = [
  {
    id: "overview",
    label: "Overview",
    icon: "layout",
    items: [
      { id: "dashboard", label: "Dashboard", to: "/employee", icon: "layout", permission: P.DASHBOARD_VIEW, exact: true },
    ],
  },
  {
    id: "sales",
    label: "Sales & Orders",
    icon: "bag",
    items: [
      { id: "orders", label: "Orders", to: "/employee/orders", icon: "bag", permission: P.ORDERS_VIEW },
      { id: "assisted", label: "Assisted Orders", to: "/employee/orders/assisted", icon: "userPlus", permission: P.ORDERS_CREATE },
      { id: "offers", label: "Offers", to: "/employee/offers", icon: "tag", permission: P.OFFERS_VIEW },
      {
        id: "products",
        label: "Products",
        to: "/employee/products",
        icon: "sparkles",
        permission: P.PRODUCTS_VIEW,
        children: [
          { id: "products-review", label: "My Product Review", to: "/employee/products/review", icon: "badge", permission: P.PRODUCTS_VIEW },
        ],
      },
      { id: "customers", label: "Customers", to: "/employee/customers", icon: "users", permission: P.CUSTOMERS_VIEW },
    ],
  },
  {
    id: "operations",
    label: "Inventory & Operations",
    icon: "boxes",
    items: [
      {
        id: "inventory",
        label: "Inventory",
        to: "/employee/inventory",
        icon: "boxes",
        permission: P.INVENTORY_VIEW,
        children: [
          { id: "movements", label: "Stock movements", to: "/employee/inventory/movements", icon: "swap", permission: P.INVENTORY_AUDIT },
          { id: "transfers", label: "Transfers", to: "/employee/inventory/transfers", icon: "truck", permission: P.INVENTORY_TRANSFER },
          { id: "low-stock", label: "Low stock", to: "/employee/inventory/low-stock", icon: "alert", permission: P.INVENTORY_VIEW },
          { id: "receive", label: "Receive stock", to: "/employee/inventory/receive", icon: "inbox", permission: P.INVENTORY_RECEIVE },
          { id: "adjust", label: "Adjust stock", to: "/employee/inventory/adjust", icon: "sliders", permission: P.INVENTORY_ADJUST },
        ],
      },
      {
        id: "warehouse",
        label: "Warehouse",
        to: "/employee/warehouse",
        icon: "warehouse",
        permission: P.WAREHOUSE_VIEW,
        children: [
          { id: "pick-pack", label: "Pick & pack", to: "/employee/warehouse/pick-pack", icon: "package", permission: P.WAREHOUSE_PICK },
        ],
      },
      { id: "returns", label: "Returns", to: "/employee/returns", icon: "undo", permission: P.RETURNS_VIEW },
      { id: "support", label: "Support", to: "/employee/support", icon: "headset", permission: P.SUPPORT_VIEW },
    ],
  },
  {
    id: "media",
    label: "Media & Styling",
    icon: "image",
    items: [
      { id: "media", label: "Media Management", to: "/employee/media", icon: "image", permission: P.MEDIA_VIEW },
      {
        id: "styling",
        label: "Styling",
        to: "/employee/styling",
        icon: "wand",
        permission: P.STYLING_VIEW,
        children: [
          { id: "appointments", label: "Appointments", to: "/employee/styling/appointments", icon: "calendar", permission: P.STYLING_VIEW },
          { id: "bridal", label: "Bridal desk", to: "/employee/styling/bridal", icon: "gem", permission: P.STYLING_VIEW },
        ],
      },
    ],
  },
  {
    id: "workforce",
    label: "Workforce",
    icon: "clock",
    items: [
      { id: "attendance", label: "Attendance", to: "/employee/attendance", icon: "clock", permission: P.ATTENDANCE_VIEW },
      { id: "leave", label: "Leave", to: "/employee/attendance/leave", icon: "calendarDays", permission: P.LEAVE_VIEW },
      { id: "performance", label: "Performance", to: "/employee/performance", icon: "target", permission: P.PERFORMANCE_VIEW },
      { id: "team", label: "Team", to: "/employee/team", icon: "team", permission: P.TEAM_VIEW },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "fileBarChart",
    items: [
      { id: "reports", label: "Reports", to: "/employee/reports", icon: "fileBarChart", permission: P.ANALYTICS_VIEW },
      { id: "sales", label: "Sales", to: "/employee/sales", icon: "trend", permission: P.ANALYTICS_VIEW },
    ],
  },
];

/** Flatten every nav link (parents + children) for active-route resolution. */
export const flattenEmployeeNavLinks = (groups = EMPLOYEE_NAV_GROUPS) => {
  const links = [];
  for (const group of groups) {
    for (const item of group.items) {
      links.push({ id: item.id, to: item.to, exact: Boolean(item.exact) });
      if (Array.isArray(item.children)) {
        for (const child of item.children) {
          links.push({ id: child.id, to: child.to, exact: Boolean(child.exact) });
        }
      }
    }
  }
  return links;
};

/**
 * Resolve which nav link owns a pathname using longest-prefix matching.
 * Returns the item id, or null when nothing matches.
 */
export const resolveActiveNavId = (pathname, groups = EMPLOYEE_NAV_GROUPS) => {
  if (!pathname) return null;
  const cleaned = pathname.split("?")[0];
  let best = null;
  for (const link of flattenEmployeeNavLinks(groups)) {
    const matches = link.exact
      ? cleaned === link.to
      : cleaned === link.to || cleaned.startsWith(`${link.to}/`);
    if (matches && (!best || link.to.length > best.to.length)) best = link;
  }
  return best ? best.id : null;
};

/**
 * The full navigation filtered to what this employee may see. Groups with no
 * visible items are dropped entirely. Each returned group keeps only the
 * items (and children) the employee can access.
 */
export const navigationForRole = (roleId, hasPermission) => {
  const allowed = (item) => !item.permission || hasPermission(item.permission);
  return EMPLOYEE_NAV_GROUPS.map((group) => {
    const items = group.items
      .map((item) => {
        if (!allowed(item)) return null;
        const children = Array.isArray(item.children)
          ? item.children.filter(allowed)
          : undefined;
        return {
          ...item,
          children: children && children.length ? children : undefined,
        };
      })
      .filter(Boolean);
    return { ...group, items };
  }).filter((group) => group.items.length > 0);
};

export const sanitizeEmployeeReturnUrl = (url, fallback = "/employee") => {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    !trimmed.startsWith("/employee")
  ) {
    return fallback;
  }
  if (
    trimmed.startsWith("/employee/login") ||
    trimmed.startsWith("/employee/forgot-password")
  ) {
    return fallback;
  }
  return trimmed;
};

export default {
  EMPLOYEE_BRAND,
  EMPLOYEE_ROUTE_RULES,
  requiredPermissionForPath,
  EMPLOYEE_NAV_GROUPS,
  flattenEmployeeNavLinks,
  resolveActiveNavId,
  navigationForRole,
  sanitizeEmployeeReturnUrl,
};
