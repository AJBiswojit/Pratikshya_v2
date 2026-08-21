/**
 * PRATIKSHYA FASHON — Canonical customer registry.
 *
 * ONE authoritative frontend customer list. Sign-up, account updates,
 * the admin customer directory, the employee directory and analytics
 * all read and write this register.
 *
 * Legacy key `pratikshya_customers` is merged once, then removed.
 */

import { INITIAL_DEMO_CUSTOMERS } from "../../data/mockCustomers";
import { readStorage, writeStorage } from "../../utils/shopping";

export const CUSTOMERS_REGISTRY_KEY = "pratikshya_customers_registry";
export const LEGACY_CUSTOMERS_KEY = "pratikshya_customers";

const uniqueCustomers = (lists) => {
  const byId = new Map();
  const byEmail = new Map();
  const result = [];

  const consider = (customer) => {
    if (!customer || typeof customer !== "object") return;
    const id = customer.id ? String(customer.id) : "";
    const email = String(customer.email || "").trim().toLowerCase();
    if (id && byId.has(id)) return;
    if (email && byEmail.has(email)) return;
    if (!id && !email) return;
    if (id) byId.set(id, customer);
    if (email) byEmail.set(email, customer);
    result.push(customer);
  };

  lists.forEach((list) => {
    (Array.isArray(list) ? list : []).forEach(consider);
  });
  return result;
};

const removeKey = (key) => {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
    else if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    /* Persistence is an enhancement only. */
  }
};

/**
 * Idempotent, non-destructive merge of the stale admin list into the
 * canonical registry. Safe to run more than once. When there is nothing
 * to migrate, this is a no-op.
 */
export const migrateLegacyCustomers = () => {
  const legacy = readStorage(LEGACY_CUSTOMERS_KEY, null);
  if (!Array.isArray(legacy) || legacy.length === 0) {
    if (legacy !== null) removeKey(LEGACY_CUSTOMERS_KEY);
    return readStorage(CUSTOMERS_REGISTRY_KEY, null);
  }

  const registry = readStorage(CUSTOMERS_REGISTRY_KEY, null);
  const base = Array.isArray(registry) && registry.length ? registry : INITIAL_DEMO_CUSTOMERS;
  const merged = uniqueCustomers([base, legacy]);
  writeStorage(CUSTOMERS_REGISTRY_KEY, merged);
  removeKey(LEGACY_CUSTOMERS_KEY);
  return merged;
};

export const loadCustomerRegistry = () => {
  migrateLegacyCustomers();
  const stored = readStorage(CUSTOMERS_REGISTRY_KEY, null);
  if (Array.isArray(stored) && stored.length > 0) return stored;
  return INITIAL_DEMO_CUSTOMERS;
};

export const saveCustomerRegistry = (customers) => {
  writeStorage(CUSTOMERS_REGISTRY_KEY, Array.isArray(customers) ? customers : []);
};

export const findCustomer = (customerId) =>
  loadCustomerRegistry().find((customer) => customer.id === customerId) ?? null;

export default {
  CUSTOMERS_REGISTRY_KEY,
  LEGACY_CUSTOMERS_KEY,
  migrateLegacyCustomers,
  loadCustomerRegistry,
  saveCustomerRegistry,
  findCustomer,
};
