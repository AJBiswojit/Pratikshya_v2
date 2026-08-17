/**
 * PRATIKSHYA FASHON — Employee permission catalogue.
 *
 * The single source of truth for every authorization key the employee
 * portal understands. Pages and navigation never invent permission
 * strings — they import them from here.
 *
 * This is a frontend authorization model for the current mock stage.
 * A real backend must enforce the same keys later. UI hiding is never
 * the only control.
 */

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  PRODUCTS_VIEW: "products.view",
  PRODUCTS_MANAGE: "products.manage",

  CATEGORIES_VIEW: "categories.view",
  CATEGORIES_CREATE: "categories.create",
  CATEGORIES_EDIT: "categories.edit",
  CATEGORIES_ARCHIVE: "categories.archive",

  COLLECTIONS_VIEW: "collections.view",
  COLLECTIONS_CREATE: "collections.create",
  COLLECTIONS_EDIT: "collections.edit",
  COLLECTIONS_ASSIGN: "collections.assign",
  COLLECTIONS_ARCHIVE: "collections.archive",

  ORDERS_VIEW: "orders.view",
  ORDERS_CREATE: "orders.create",
  ORDERS_MANAGE: "orders.manage",
  ORDERS_FULFILL: "orders.fulfill",
  ORDERS_PICK: "orders.pick",
  ORDERS_PACK: "orders.pack",
  ORDERS_DISPATCH: "orders.dispatch",
  ORDERS_CANCEL: "orders.cancel",
  ORDERS_RETURN: "orders.return",
  ORDERS_REFUND: "orders.refund",

  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",

  INVENTORY_VIEW: "inventory.view",
  INVENTORY_RECEIVE: "inventory.receive",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_TRANSFER: "inventory.transfer",
  INVENTORY_MANAGE: "inventory.manage",
  INVENTORY_AUDIT: "inventory.audit",

  WAREHOUSE_VIEW: "warehouse.view",
  WAREHOUSE_PICK: "warehouse.pick",

  RETURNS_VIEW: "returns.view",
  RETURNS_MANAGE: "returns.manage",

  OFFERS_VIEW: "offers.view",
  OFFERS_CREATE: "offers.create",
  OFFERS_EDIT: "offers.edit",
  OFFERS_ACTIVATE: "offers.activate",
  OFFERS_PAUSE: "offers.pause",
  OFFERS_ARCHIVE: "offers.archive",
  OFFERS_MANAGE: "offers.manage",

  MEDIA_VIEW: "media.view",
  MEDIA_UPLOAD: "media.upload",
  MEDIA_EDIT: "media.edit",
  MEDIA_DELETE: "media.delete",
  MEDIA_ASSIGN: "media.assign",
  MEDIA_MANAGE: "media.manage",

  EMPLOYEES_VIEW: "employees.view",
  EMPLOYEES_CREATE: "employees.create",
  EMPLOYEES_EDIT: "employees.edit",
  EMPLOYEES_SUSPEND: "employees.suspend",
  EMPLOYEES_RESET_PASSWORD: "employees.resetPassword",
  EMPLOYEES_MANAGE_PERMISSIONS: "employees.managePermissions",
  EMPLOYEES_MANAGE: "employees.manage",

  ANALYTICS_VIEW: "analytics.view",
  ANALYTICS_SALES: "analytics.sales",
  ANALYTICS_PRODUCTS: "analytics.products",
  ANALYTICS_CUSTOMERS: "analytics.customers",
  ANALYTICS_INVENTORY: "analytics.inventory",
  ANALYTICS_RETURNS: "analytics.returns",
  ANALYTICS_OFFERS: "analytics.offers",
  ANALYTICS_EMPLOYEES: "analytics.employees",

  PROFILE_VIEW: "profile.view",
  PROFILE_EDIT: "profile.edit",

  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_CHECKIN: "attendance.checkin",
  ATTENDANCE_CHECKOUT: "attendance.checkout",
  ATTENDANCE_MANAGE: "attendance.manage",
  ATTENDANCE_CORRECT: "attendance.correct",

  LEAVE_CREATE: "leave.create",
  LEAVE_VIEW: "leave.view",
  LEAVE_APPROVE: "leave.approve",
  LEAVE_REJECT: "leave.reject",
  LEAVE_MANAGE: "leave.manage",

  PERFORMANCE_VIEW: "performance.view",
  PERFORMANCE_MANAGE: "performance.manage",
  PERFORMANCE_REVIEW: "performance.review",
  TEAM_VIEW: "team.view",

  SUPPORT_VIEW: "support.view",
  SUPPORT_MANAGE: "support.manage",

  STYLING_VIEW: "styling.view",
  STYLING_MANAGE: "styling.manage",
};

/**
 * Employee-account administration keys are retained as contract constants so
 * the Admin role can use the existing permission vocabulary. They are
 * reserved to the Admin identity domain and are never valid employee grants.
 */
export const EMPLOYEE_ACCOUNT_PERMISSION_KEYS = Object.freeze([
  PERMISSIONS.EMPLOYEES_VIEW,
  PERMISSIONS.EMPLOYEES_CREATE,
  PERMISSIONS.EMPLOYEES_EDIT,
  PERMISSIONS.EMPLOYEES_SUSPEND,
  PERMISSIONS.EMPLOYEES_RESET_PASSWORD,
  PERMISSIONS.EMPLOYEES_MANAGE_PERMISSIONS,
  PERMISSIONS.EMPLOYEES_MANAGE,
]);

const EMPLOYEE_ACCOUNT_PERMISSION_SET = new Set(EMPLOYEE_ACCOUNT_PERMISSION_KEYS);

export const isEmployeeAccountPermission = (permission) =>
  EMPLOYEE_ACCOUNT_PERMISSION_SET.has(permission);

export const sanitizeEmployeePermissions = (permissions = []) =>
  [...new Set(Array.isArray(permissions) ? permissions : [])].filter(
    (permission) => !isEmployeeAccountPermission(permission)
  );

/** Human labels for the permission matrix. Never expose raw keys in UI. */
export const PERMISSION_CATALOGUE = [
  {
    group: "Workspace",
    items: [
      { key: PERMISSIONS.DASHBOARD_VIEW, label: "View dashboard" },
      { key: PERMISSIONS.PROFILE_VIEW, label: "View profile" },
      { key: PERMISSIONS.PROFILE_EDIT, label: "Edit own profile" },
      { key: PERMISSIONS.ATTENDANCE_VIEW, label: "View attendance" },
      { key: PERMISSIONS.ATTENDANCE_CHECKIN, label: "Check in" },
      { key: PERMISSIONS.ATTENDANCE_CHECKOUT, label: "Check out" },
      { key: PERMISSIONS.LEAVE_VIEW, label: "View leave" },
      { key: PERMISSIONS.LEAVE_CREATE, label: "Request leave" },
      { key: PERMISSIONS.PERFORMANCE_VIEW, label: "View performance" },
    ],
  },
  {
    group: "Selling floor",
    items: [
      { key: PERMISSIONS.PRODUCTS_VIEW, label: "View products" },
      { key: PERMISSIONS.PRODUCTS_MANAGE, label: "Manage products" },
      { key: PERMISSIONS.CATEGORIES_VIEW, label: "View category taxonomy" },
      { key: PERMISSIONS.CATEGORIES_CREATE, label: "Create categories" },
      { key: PERMISSIONS.CATEGORIES_EDIT, label: "Edit categories" },
      { key: PERMISSIONS.CATEGORIES_ARCHIVE, label: "Archive categories" },
      { key: PERMISSIONS.COLLECTIONS_VIEW, label: "View collections" },
      { key: PERMISSIONS.COLLECTIONS_CREATE, label: "Create collections" },
      { key: PERMISSIONS.COLLECTIONS_EDIT, label: "Edit collections" },
      { key: PERMISSIONS.COLLECTIONS_ASSIGN, label: "Assign collection products" },
      { key: PERMISSIONS.COLLECTIONS_ARCHIVE, label: "Archive collections" },
      { key: PERMISSIONS.ORDERS_VIEW, label: "View orders" },
      { key: PERMISSIONS.ORDERS_CREATE, label: "Create assisted orders" },
      { key: PERMISSIONS.ORDERS_MANAGE, label: "Manage orders" },
      { key: PERMISSIONS.ORDERS_FULFILL, label: "Fulfill orders" },
      { key: PERMISSIONS.ORDERS_PICK, label: "Pick orders" },
      { key: PERMISSIONS.ORDERS_PACK, label: "Pack orders" },
      { key: PERMISSIONS.ORDERS_DISPATCH, label: "Dispatch orders" },
      { key: PERMISSIONS.ORDERS_CANCEL, label: "Cancel orders" },
      { key: PERMISSIONS.ORDERS_RETURN, label: "Manage returns" },
      { key: PERMISSIONS.ORDERS_REFUND, label: "Manage refunds" },
      { key: PERMISSIONS.CUSTOMERS_VIEW, label: "View customers" },
      { key: PERMISSIONS.CUSTOMERS_MANAGE, label: "Manage customers" },
      { key: PERMISSIONS.OFFERS_VIEW, label: "View offers" },
      { key: PERMISSIONS.OFFERS_CREATE, label: "Create offers" },
      { key: PERMISSIONS.OFFERS_EDIT, label: "Edit offers" },
      { key: PERMISSIONS.OFFERS_ACTIVATE, label: "Activate offers" },
      { key: PERMISSIONS.OFFERS_PAUSE, label: "Pause offers" },
      { key: PERMISSIONS.OFFERS_ARCHIVE, label: "Archive offers" },
      { key: PERMISSIONS.OFFERS_MANAGE, label: "Manage offers" },
    ],
  },
  {
    group: "Media",
    items: [
      { key: PERMISSIONS.MEDIA_VIEW, label: "View media library" },
      { key: PERMISSIONS.MEDIA_UPLOAD, label: "Add media" },
      { key: PERMISSIONS.MEDIA_EDIT, label: "Edit media details" },
      { key: PERMISSIONS.MEDIA_DELETE, label: "Remove media" },
      { key: PERMISSIONS.MEDIA_ASSIGN, label: "Assign media & set covers" },
      { key: PERMISSIONS.MEDIA_MANAGE, label: "Manage marketing placements" },
    ],
  },
  {
    group: "Inventory & warehouse",
    items: [
      { key: PERMISSIONS.INVENTORY_VIEW, label: "View inventory" },
      { key: PERMISSIONS.INVENTORY_RECEIVE, label: "Receive stock" },
      { key: PERMISSIONS.INVENTORY_ADJUST, label: "Adjust stock" },
      { key: PERMISSIONS.INVENTORY_TRANSFER, label: "Transfer stock" },
      { key: PERMISSIONS.INVENTORY_MANAGE, label: "Manage inventory settings" },
      { key: PERMISSIONS.INVENTORY_AUDIT, label: "Audit stock movements" },
      { key: PERMISSIONS.WAREHOUSE_VIEW, label: "View warehouse" },
      { key: PERMISSIONS.WAREHOUSE_PICK, label: "Pick & pack" },
    ],
  },
  {
    group: "Care & styling",
    items: [
      { key: PERMISSIONS.RETURNS_VIEW, label: "View returns" },
      { key: PERMISSIONS.RETURNS_MANAGE, label: "Manage returns" },
      { key: PERMISSIONS.SUPPORT_VIEW, label: "View support cases" },
      { key: PERMISSIONS.SUPPORT_MANAGE, label: "Manage support cases" },
      { key: PERMISSIONS.STYLING_VIEW, label: "View styling work" },
      { key: PERMISSIONS.STYLING_MANAGE, label: "Manage styling work" },
    ],
  },
  {
    group: "Operations & reports",
    items: [
      { key: PERMISSIONS.TEAM_VIEW, label: "View assigned team" },
      { key: PERMISSIONS.ANALYTICS_VIEW, label: "View store reports" },
      { key: PERMISSIONS.ANALYTICS_SALES, label: "View sales analytics" },
      { key: PERMISSIONS.ANALYTICS_PRODUCTS, label: "View product analytics" },
      { key: PERMISSIONS.ANALYTICS_CUSTOMERS, label: "View customer analytics" },
      { key: PERMISSIONS.ANALYTICS_INVENTORY, label: "View inventory analytics" },
      { key: PERMISSIONS.ANALYTICS_RETURNS, label: "View return analytics" },
      { key: PERMISSIONS.ANALYTICS_OFFERS, label: "View offer analytics" },
      { key: PERMISSIONS.ANALYTICS_EMPLOYEES, label: "View employee analytics" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOGUE.flatMap((group) =>
  group.items.map((item) => item.key)
);

export const getPermissionLabel = (key) => {
  for (const group of PERMISSION_CATALOGUE) {
    const item = group.items.find((entry) => entry.key === key);
    if (item) return item.label;
  }
  return "Restricted action";
};

export default {
  PERMISSIONS,
  PERMISSION_CATALOGUE,
  EMPLOYEE_ACCOUNT_PERMISSION_KEYS,
  isEmployeeAccountPermission,
  sanitizeEmployeePermissions,
  ALL_PERMISSION_KEYS,
  getPermissionLabel,
};
