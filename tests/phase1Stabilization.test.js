/**
 * PRATIKSHYA FASHON — Phase 1 cleanup regression contracts.
 *
 * Customer registry merge, assisted-order merge, repaired routes,
 * employee desks, collection resolution and single-source shipping rules.
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CUSTOMERS_REGISTRY_KEY,
  LEGACY_CUSTOMERS_KEY,
  loadCustomerRegistry,
  migrateLegacyCustomers,
  saveCustomerRegistry,
  findCustomer,
} from "../src/services/customer/customerRegistry.js";
import { INITIAL_DEMO_CUSTOMERS } from "../src/data/mockCustomers.js";
import {
  ORDERS_STORAGE_KEY,
  LEGACY_ASSISTED_ORDERS_KEY,
  addOrder,
  loadOrders,
  saveOrders,
  migrateAssistedOrders,
  transformAssistedOrder,
  isAssistedOrder,
} from "../src/services/orders/orderService.js";
import { getAssistedOrders } from "../src/services/employees/operationsService.js";
import { COMMERCE_DEFAULTS, readShippingRules, readPaymentRules } from "../src/config/commerceDefaults.js";
import { calculateShipping, FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_FEE } from "../src/utils/shopping.js";
import { calculateDeliveryFee, calculateCheckoutTotals } from "../src/utils/checkout.js";
import { SETTINGS_KEY } from "../src/services/settingsRepository.js";
import { resolveNavigationScope, hasNavigationScope } from "../src/data/products/taxonomy.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { primaryNavigation } from "../src/config/navigationConfig.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { COD_FEE } from "../src/config/checkoutConfig.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = (relative) => readFileSync(join(__dirname, "..", relative), "utf8");

const installStorage = () => {
  const store = new Map();
  const localStorage = {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
  globalThis.localStorage = localStorage;
  globalThis.window = {
    localStorage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
};

const uninstallStorage = () => {
  delete globalThis.localStorage;
  delete globalThis.window;
};

beforeEach(() => {
  installStorage();
});

afterEach(() => {
  uninstallStorage();
});

/* ------------------------------------------------------------------ */
/* Customer consolidation                                              */
/* ------------------------------------------------------------------ */

test("existing customer data remains accessible through the canonical registry", () => {
  saveCustomerRegistry([
    { id: "cust-live", firstName: "Asha", lastName: "Rao", email: "asha@example.com", phone: "9999999999" },
  ]);
  const registry = loadCustomerRegistry();
  assert.ok(registry.some((customer) => customer.id === "cust-live"));
  assert.equal(findCustomer("cust-live")?.email, "asha@example.com");
});

test("legacy pratikshya_customers is merged then no longer authoritative", () => {
  localStorage.setItem(
    LEGACY_CUSTOMERS_KEY,
    JSON.stringify([
      { id: "cust-legacy", firstName: "Leela", lastName: "Sen", email: "leela.legacy@example.com" },
    ])
  );
  localStorage.setItem(
    CUSTOMERS_REGISTRY_KEY,
    JSON.stringify([
      { id: "cust-live", firstName: "Asha", lastName: "Rao", email: "asha@example.com" },
    ])
  );

  const merged = migrateLegacyCustomers();
  assert.ok(merged.some((customer) => customer.id === "cust-live"));
  assert.ok(merged.some((customer) => customer.id === "cust-legacy"));
  assert.equal(localStorage.getItem(LEGACY_CUSTOMERS_KEY), null);

  migrateLegacyCustomers();
  assert.equal(loadCustomerRegistry().filter((customer) => customer.id === "cust-legacy").length, 1);
});

test("an empty legacy store is a no-op and demo customers remain the fallback", () => {
  assert.equal(localStorage.getItem(CUSTOMERS_REGISTRY_KEY), null);
  const registry = loadCustomerRegistry();
  assert.ok(registry.length >= INITIAL_DEMO_CUSTOMERS.length);
  assert.equal(localStorage.getItem(LEGACY_CUSTOMERS_KEY), null);
});

test("admin customer pages read the canonical registry, not the stale key", () => {
  const list = src("src/pages/admin/AdminCustomers.jsx");
  const detail = src("src/pages/admin/AdminCustomerDetail.jsx");
  assert.match(list, /loadCustomerRegistry/);
  assert.match(detail, /findCustomer/);
  assert.doesNotMatch(list, /pratikshya_customers[^\w_]/);
  assert.doesNotMatch(detail, /pratikshya_customers[^\w_]/);
});

/* ------------------------------------------------------------------ */
/* Order consolidation                                                 */
/* ------------------------------------------------------------------ */

test("legacy assisted orders migrate into the canonical register with metadata", () => {
  const ticket = {
    id: "PF-FLR-00099",
    employeeId: "PF-SLS-00124",
    associate: "Ananya Sharma",
    customer: "Radhika Bose",
    phone: "+91 99001 11223",
    pieces: "Banarasi silk saree",
    amount: 24850,
    status: "Hold — floor ticket",
    createdAt: "2026-08-11T11:20:00.000Z",
    productId: "PF-W-SAR-BAN-0001",
  };
  localStorage.setItem(LEGACY_ASSISTED_ORDERS_KEY, JSON.stringify([ticket]));
  saveOrders([]);

  const orders = loadOrders();
  const migrated = orders.find((order) => order.id === "PF-FLR-00099");
  assert.ok(migrated, "assisted ticket is in the canonical register");
  assert.equal(migrated.channel, "ASSISTED");
  assert.equal(migrated.createdBy, "PF-SLS-00124");
  assert.equal(migrated.customer.fullName, "Radhika Bose");
  assert.equal(migrated.pricing.total, 24850);
  assert.equal(migrated.items[0].productId, "PF-W-SAR-BAN-0001");
  assert.equal(migrated.createdAt, "2026-08-11T11:20:00.000Z");
  assert.equal(localStorage.getItem(LEGACY_ASSISTED_ORDERS_KEY), null);

  const again = loadOrders();
  assert.equal(again.filter((order) => order.id === "PF-FLR-00099").length, 1);
});

test("assisted orders created through orderService stay on the canonical register", () => {
  saveOrders([]);
  const snapshot = transformAssistedOrder({
    id: "PF-FLR-00101",
    employeeId: "PF-SLS-00131",
    associate: "Meera Nair",
    customer: "Aisha Rahman",
    phone: "+91 98877 22001",
    pieces: "Bridal lehenga",
    amount: 186000,
    productId: "PF-BR-LEH-0001",
    createdAt: "2026-08-11T12:40:00.000Z",
  });
  const result = addOrder([], { ...snapshot, source: "employee_assisted" });
  assert.equal(result.ok, true);
  saveOrders(result.orders);

  const loaded = loadOrders();
  assert.ok(isAssistedOrder(loaded[0]));
  const desk = getAssistedOrders("PF-SLS-00131");
  assert.equal(desk.length, 1);
  assert.equal(desk[0].amount, 186000);
  assert.equal(desk[0].customer, "Aisha Rahman");
  assert.equal(desk[0].channel, "ASSISTED");
});

test("getAssistedOrders no longer reads a second order database", () => {
  const source = src("src/services/employees/operationsService.js");
  assert.doesNotMatch(source, /MOCK_ASSISTED_ORDERS/);
  assert.doesNotMatch(source, /EMPLOYEE_STORAGE_KEYS\.ASSISTED_ORDERS/);
  assert.match(source, /isAssistedOrder/);
});

test("employee assisted order page writes through the order register", () => {
  const source = src("src/pages/employee/EmployeeAssistedOrder.jsx");
  assert.match(source, /createOrder/);
  assert.doesNotMatch(source, /EMPLOYEE_STORAGE_KEYS/);
  assert.doesNotMatch(source, /pratikshya_employee_assisted_orders/);
});

/* ------------------------------------------------------------------ */
/* Account preferences                                                 */
/* ------------------------------------------------------------------ */

test("/account/preferences is routed to the existing AccountPreferences page", () => {
  const app = src("src/App.jsx");
  assert.match(app, /AccountPreferences/);
  assert.match(app, /path="\/account\/preferences"/);
});

/* ------------------------------------------------------------------ */
/* Employee reports                                                    */
/* ------------------------------------------------------------------ */

test("/employee/reports routes to EmployeeReports, not the mock desk", () => {
  const app = src("src/App.jsx");
  assert.match(app, /EmployeeReports/);
  assert.match(app, /path="\/employee\/reports" element=\{<EmployeeReports/);
  assert.doesNotMatch(app, /path="\/employee\/reports" element=\{<EmployeeDesk/);
  const desk = src("src/pages/employee/EmployeeDesk.jsx");
  assert.doesNotMatch(desk, /"\/employee\/reports"/);
});

/* ------------------------------------------------------------------ */
/* Employee returns                                                    */
/* ------------------------------------------------------------------ */

test("employee returns desks do not render hardcoded fake rows", () => {
  const desk = src("src/pages/employee/EmployeeDesk.jsx");
  assert.doesNotMatch(desk, /RET-1041/);
  assert.doesNotMatch(desk, /Priyanka Patel/);
  assert.match(desk, /projectReturns/);
  assert.match(desk, /allOrders/);
});

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

test("valid collection routes resolve from the canonical collection register", () => {
  const silk = taxonomyRepository.findCollection("silk");
  assert.ok(silk);
  assert.equal(silk.displayStatus, "ACTIVE");
  assert.ok(hasNavigationScope("/collections/silk"));
  const scope = resolveNavigationScope("/collections/silk");
  assert.ok(scope?.filters);
});

test("unknown collection routes do not invent products", () => {
  assert.equal(taxonomyRepository.findCollection("not-a-collection"), null);
  assert.equal(hasNavigationScope("/collections/not-a-collection"), false);
  assert.equal(resolveNavigationScope("/collections/not-a-collection"), null);
  const empty = queryCatalogue({ scopeFilters: { collectionId: "not-a-collection" } });
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.results, []);
});

test("collection mega-menu is derived from the collection register", () => {
  const collectionsGroup = primaryNavigation.find((group) => group.id === "collections");
  assert.ok(collectionsGroup);
  const links = collectionsGroup.columns.flatMap((column) => column.links.map((link) => link.to));
  assert.ok(links.includes("/collections/silk"));
  assert.ok(links.includes("/collections/heritage-weaves"));
  assert.equal(links.includes("/collections/cotton"), false);
  assert.equal(links.includes("/collections/linen"), false);
  assert.equal(links.includes("/collections/chiffon"), false);
});

test("fabric listing scopes remain data-driven and do not invent products", () => {
  const cotton = resolveNavigationScope("/collections/cotton");
  assert.deepEqual(cotton.filters, { fabric: "Cotton" });
});

/* ------------------------------------------------------------------ */
/* Settings / shipping authority                                       */
/* ------------------------------------------------------------------ */

test("one authored default and one runtime source for shipping and COD", () => {
  assert.equal(FREE_SHIPPING_THRESHOLD, COMMERCE_DEFAULTS.freeShippingThreshold);
  assert.equal(FLAT_SHIPPING_FEE, COMMERCE_DEFAULTS.defaultShippingFee);
  assert.equal(COD_FEE, COMMERCE_DEFAULTS.codFee);

  const defaults = readShippingRules();
  assert.equal(defaults.freeShippingThreshold, 5000);
  assert.equal(calculateShipping(4999), 99);
  assert.equal(calculateShipping(5000), 0);
  assert.equal(calculateDeliveryFee("standard", 4999), 99);
  assert.equal(calculateDeliveryFee("standard", 5000), 0);

  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      shipping: { enabled: true, freeShippingThreshold: 8000, defaultShippingFee: 149, expressDeliveryFee: 249 },
      payments: { codFee: 79 },
    })
  );
  assert.equal(readShippingRules().freeShippingThreshold, 8000);
  assert.equal(calculateShipping(7999), 149);
  assert.equal(calculateShipping(8000), 0);
  assert.equal(calculateDeliveryFee("standard", 7999), 149);
  assert.equal(calculateDeliveryFee("express", 9000), 249);
  assert.equal(readPaymentRules().codFee, 79);
  const totals = calculateCheckoutTotals(
    { total: 1000, shipping: 0, productDiscount: 0, couponDiscount: 0, subtotal: 1000, saved: 0 },
    "standard",
    "cod"
  );
  assert.equal(totals.codFee, 79);
});

/* ------------------------------------------------------------------ */
/* Dead code                                                           */
/* ------------------------------------------------------------------ */

test("confirmed dead modules are no longer referenced", () => {
  const adminNav = src("src/config/adminNavigation.js");
  assert.doesNotMatch(adminNav, /ADMIN_PLACEHOLDER_COPY/);
  assert.doesNotMatch(adminNav, /MODULE_STATUS/);
  const operations = src("src/services/employees/operationsService.js");
  assert.doesNotMatch(operations, /loadAttendanceMap/);
  const desk = src("src/pages/employee/EmployeeDesk.jsx");
  assert.doesNotMatch(desk, /"\/employee\/inventory"/);
  const demo = src("src/services/orders/demoOrders.js");
  assert.match(demo, /export const generateDemoOrders = \(\) => \[]/);
  assert.doesNotMatch(demo, /Ananya Sharma/);
});
