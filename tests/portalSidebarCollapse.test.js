/**
 * PRATIKSHYA FASHON — Collapsible portal sidebar contracts.
 *
 * Admin and Employee share PortalSidebar / PortalShell. Collapse is a
 * desktop rail (icons remain); mobile stays a drawer. Navigation data,
 * routing and permissions must not be duplicated or rewritten.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SIDEBAR_COLLAPSE_KEYS,
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "../src/components/navigation/usePortalSidebarCollapse.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (relative) => readFileSync(join(ROOT, relative), "utf8");

const installStorage = () => {
  const store = new Map();
  const localStorage = {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
  };
  globalThis.localStorage = localStorage;
};

const uninstallStorage = () => {
  delete globalThis.localStorage;
};

const portal = src("src/components/navigation/PortalSidebar.jsx");
const shell = src("src/components/navigation/PortalShell.jsx");
const tooltip = src("src/components/navigation/RailTooltip.jsx");
const adminLayout = src("src/layouts/AdminLayout.jsx");
const employeeLayout = src("src/layouts/EmployeeLayout.jsx");
const adminSidebar = src("src/components/admin/AdminSidebar.jsx");
const employeeSidebar = src("src/components/employee/EmployeeSidebar.jsx");
const adminHeader = src("src/components/admin/AdminHeader.jsx");
const employeeHeader = src("src/components/employee/EmployeeHeader.jsx");
const adminNav = src("src/config/adminNavigation.js");
const employeeNav = src("src/config/employeeNavigation.js");

test("Admin and Employee persist collapse independently", () => {
  installStorage();
  try {
    assert.equal(SIDEBAR_COLLAPSE_KEYS.admin, "pratikshya_admin_sidebar_collapsed");
    assert.equal(SIDEBAR_COLLAPSE_KEYS.employee, "pratikshya_employee_sidebar_collapsed");
    assert.notEqual(SIDEBAR_COLLAPSE_KEYS.admin, SIDEBAR_COLLAPSE_KEYS.employee);

    assert.equal(readSidebarCollapsed(SIDEBAR_COLLAPSE_KEYS.admin), false);
    writeSidebarCollapsed(SIDEBAR_COLLAPSE_KEYS.admin, true);
    assert.equal(readSidebarCollapsed(SIDEBAR_COLLAPSE_KEYS.admin), true);
    assert.equal(readSidebarCollapsed(SIDEBAR_COLLAPSE_KEYS.employee), false);

    writeSidebarCollapsed(SIDEBAR_COLLAPSE_KEYS.employee, true);
    assert.equal(readSidebarCollapsed(SIDEBAR_COLLAPSE_KEYS.admin), true);
    writeSidebarCollapsed(SIDEBAR_COLLAPSE_KEYS.admin, false);
    assert.equal(readSidebarCollapsed(SIDEBAR_COLLAPSE_KEYS.employee), true);
  } finally {
    uninstallStorage();
  }
});

test("both portals reuse PortalSidebar and PortalShell rather than a second nav tree", () => {
  assert.match(adminSidebar, /<PortalSidebar/);
  assert.match(employeeSidebar, /<PortalSidebar/);
  assert.match(adminSidebar, /groups=\{ADMIN_NAV_GROUPS\}/);
  assert.match(employeeSidebar, /groups=\{groups\}/);
  assert.match(employeeSidebar, /navigationForRole/);
  assert.match(adminLayout, /<PortalShell/);
  assert.match(employeeLayout, /<PortalShell/);
  assert.match(adminLayout, /usePortalSidebarCollapse\("admin"\)/);
  assert.match(employeeLayout, /usePortalSidebarCollapse\("employee"\)/);
  assert.doesNotMatch(portal, /from "\.\.\/config\/adminNavigation"/);
  assert.doesNotMatch(portal, /from "\.\.\/config\/employeeNavigation"/);
});

test("desktop collapse keeps icons, hides labels, and exposes an accessible control", () => {
  assert.match(portal, /PanelLeftClose/);
  assert.match(portal, /PanelLeftOpen/);
  assert.match(portal, /aria-label=\{collapseLabel\}/);
  assert.match(portal, /collapsed \? "Expand sidebar" : "Collapse sidebar"/);
  assert.match(portal, /lg:sr-only/);
  assert.match(portal, /<RailTooltip/);
  assert.match(tooltip, /role="tooltip"/);
  assert.match(tooltip, /createPortal/);
  assert.match(portal, /hidden w-full items-center[\s\S]*lg:flex/);
});

test("collapsed rail preserves active state and does not drop navigation items", () => {
  assert.match(portal, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(portal, /border-accent bg-ink font-medium text-ivory/);
  assert.match(portal, /showItems = open \|\| collapsed/);
  assert.doesNotMatch(portal, /filter\(\(item\) => !collapsed/);
});

test("mobile stays a drawer — collapse is not the small-screen solution", () => {
  assert.match(shell, /lg:hidden/);
  assert.match(shell, /aria-label="Close navigation"/);
  assert.match(shell, /-translate-x-full lg:translate-x-0/);
  assert.match(shell, /w-72/);
  assert.match(adminHeader, /aria-label=\{navOpen \? "Close navigation" : "Open navigation"\}/);
  assert.match(employeeHeader, /aria-label=\{navOpen \? "Close navigation" : "Open navigation"\}/);
  assert.match(adminHeader, /lg:hidden/);
  assert.match(employeeHeader, /lg:hidden/);
  assert.match(src("src/components/navigation/usePortalDrawer.js"), /Escape/);
  assert.match(src("src/components/navigation/usePortalDrawer.js"), /overflow = "hidden"/);
  assert.match(src("src/components/navigation/usePortalDrawer.js"), /triggerRef\.current\?\.focus/);
});

test("collapsed sidebar yields remaining width to main content without 100vw overflow", () => {
  assert.match(shell, /lg:flex lg:min-w-0/);
  assert.match(shell, /flex-1/);
  assert.match(shell, /min-w-0 w-full max-w-full/);
  assert.match(shell, /collapsed \? collapsedWidthClass : expandedWidthClass/);
  assert.match(adminLayout, /collapsedWidthClass="lg:w-\[72px\]"/);
  assert.match(employeeLayout, /collapsedWidthClass="lg:w-\[72px\]"/);
  assert.match(employeeLayout, /expandedWidthClass="lg:w-\[240px\]"/);
  assert.doesNotMatch(shell, /100vw/);
  assert.doesNotMatch(adminLayout, /100vw/);
  assert.doesNotMatch(employeeLayout, /100vw/);
});

test("sidebar collapse does not rewrite portal navigation catalogues", () => {
  assert.match(adminNav, /export const ADMIN_NAV_GROUPS/);
  assert.match(adminNav, /id: "collections"/);
  assert.match(employeeNav, /export const navigationForRole/);
  assert.doesNotMatch(portal, /\/admin\/collections/);
  assert.doesNotMatch(shell, /taxonomyRepository/);
});
