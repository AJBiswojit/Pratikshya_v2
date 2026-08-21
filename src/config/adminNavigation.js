/**
 * PRATIKSHYA FASHON — Admin Portal navigation.
 *
 * One catalogue of business modules grouped the way the house is run. All
 * modules listed here are implemented and routed (see App.jsx). The single
 * Admin role (SUPER_ADMIN) may access every module, so the sidebar does not
 * filter by permission — authorization is enforced by AdminProtectedRoute.
 *
 * This is the ONE centralized Admin navigation definition used by the
 * sidebar; there is no second Admin nav elsewhere.
 */

export const ADMIN_BRAND = {
  name: "PRATIKSHYA FASHON",
  portal: "Admin Portal",
  subtitle: "Business Management & Operations",
  home: "/admin",
  login: "/admin/login",
};

/**
 * Grouped Admin navigation. Operational sub-routes are kept as `children`
 * inside their parent section so the sidebar stays clean while every
 * existing destination remains reachable.
 */
export const ADMIN_NAV_GROUPS = [
  {
    id: "overview",
    label: "Overview",
    icon: "layout",
    items: [
      { id: "dashboard", label: "Dashboard", to: "/admin", icon: "layout", exact: true },
      { id: "analytics", label: "Analytics", to: "/admin/analytics", icon: "chartNoAxes" },
      { id: "ai-assistant", label: "AI Assistant", to: "/admin/ai-assistant", icon: "sparkles" },
    ],
  },
  {
    id: "catalogue",
    label: "Catalogue & Content",
    icon: "package",
    items: [
      {
        id: "products",
        label: "Products",
        to: "/admin/products",
        icon: "package",
        children: [
          { id: "product-review", label: "Product Review", to: "/admin/products/review", icon: "check" },
        ],
      },
      { id: "categories", label: "Categories", to: "/admin/categories", icon: "tags" },
      { id: "collections", label: "Collections", to: "/admin/collections", icon: "layers" },
      { id: "offers", label: "Offers", to: "/admin/offers", icon: "tag" },
      {
        id: "media",
        label: "Media Management",
        to: "/admin/media",
        icon: "image",
        children: [
          { id: "media-review", label: "Review Queue", to: "/admin/media/review", icon: "check" },
          { id: "marketing-media", label: "Marketing Media", to: "/admin/media/marketing", icon: "imagePlay" },
          { id: "media-product-mapping", label: "Product Mapping", to: "/admin/media/product-mapping", icon: "layers" },
        ],
      },
    ],
  },
  {
    id: "people",
    label: "People / Organization",
    icon: "usersRound",
    items: [
      { id: "employees", label: "Employees", to: "/admin/employees", icon: "badge" },
    ],
  },
  {
    id: "orders",
    label: "Orders & Customers",
    icon: "bag",
    items: [
      { id: "orders", label: "Orders", to: "/admin/orders", icon: "bag" },
      { id: "customers", label: "Customers", to: "/admin/customers", icon: "users" },
      { id: "returns", label: "Returns", to: "/admin/returns", icon: "undo" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory & Operations",
    icon: "boxes",
    items: [
      {
        id: "inventory",
        label: "Inventory",
        to: "/admin/inventory",
        icon: "boxes",
        children: [
          { id: "receive", label: "Receive", to: "/admin/inventory/receive", icon: "inbox" },
          { id: "adjust", label: "Adjust", to: "/admin/inventory/adjust", icon: "sliders" },
          { id: "transfers", label: "Transfers", to: "/admin/inventory/transfers", icon: "swap" },
          { id: "movements", label: "Movements", to: "/admin/inventory/movements", icon: "list" },
          { id: "low-stock", label: "Low Stock", to: "/admin/inventory/low-stock", icon: "alert" },
        ],
      },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: "sliders",
    items: [
      { id: "activity", label: "Activity", to: "/admin/activity", icon: "list" },
      { id: "settings", label: "Settings", to: "/admin/settings", icon: "sliders" },
    ],
  },
];

/** Every Admin link (parents + children) for active-route resolution. */
export const flattenAdminNavLinks = (groups = ADMIN_NAV_GROUPS) => {
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
 * Resolve which Admin link owns a pathname using longest-prefix matching.
 * Returns the item id, or null when nothing matches.
 */
export const resolveActiveNavId = (pathname, groups = ADMIN_NAV_GROUPS) => {
  if (!pathname) return null;
  const cleaned = pathname.split("?")[0];
  let best = null;
  for (const link of flattenAdminNavLinks(groups)) {
    const matches = link.exact
      ? cleaned === link.to
      : cleaned === link.to || cleaned.startsWith(`${link.to}/`);
    if (matches && (!best || link.to.length > best.to.length)) best = link;
  }
  return best ? best.id : null;
};

/** Flat list of every Admin nav item (parents + children) — compatibility. */
export const ADMIN_NAV_ITEMS = flattenAdminNavLinks(ADMIN_NAV_GROUPS);

/**
 * The nav item a path belongs to (longest-prefix). Most-specific wins so a
 * nested destination such as `/admin/media/marketing` resolves to itself.
 */
export const findAdminNavItem = (pathname) => {
  if (!pathname || typeof pathname !== "string") return null;
  const cleaned = pathname.split("?")[0];
  return (
    ADMIN_NAV_ITEMS.filter((item) =>
      item.exact ? cleaned === item.to : cleaned === item.to || cleaned.startsWith(`${item.to}/`)
    ).sort((a, b) => b.to.length - a.to.length)[0] ?? null
  );
};

/**
 * Only same-origin `/admin` destinations may be used as a return URL.
 * Anything else falls back to the dashboard.
 */
export const sanitizeAdminReturnUrl = (url, fallback = "/admin") => {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    !trimmed.startsWith("/admin")
  ) {
    return fallback;
  }
  if (trimmed.startsWith("/admin/login")) return fallback;
  return trimmed;
};

export default {
  ADMIN_BRAND,
  ADMIN_NAV_GROUPS,
  flattenAdminNavLinks,
  resolveActiveNavId,
  ADMIN_NAV_ITEMS,
  findAdminNavItem,
  sanitizeAdminReturnUrl,
};
