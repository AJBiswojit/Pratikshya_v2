import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import inventoryRepository, {
  INVENTORY_CHANGED_EVENT,
} from "../services/inventory/inventoryRepository";
import { PRODUCTS_CHANGED_EVENT } from "../services/catalogRepository";

const InventoryContext = createContext(null);

/**
 * Reactive read model over the single inventory repository. Mutations still
 * live in the service; this provider only refreshes admin, employee and
 * customer consumers after a repository event.
 */
export function InventoryProvider({ children }) {
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    window.addEventListener(INVENTORY_CHANGED_EVENT, refresh);
    window.addEventListener(PRODUCTS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(INVENTORY_CHANGED_EVENT, refresh);
      window.removeEventListener(PRODUCTS_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  useEffect(() => {
    inventoryRepository.releaseExpiredReservations();
  }, []);

  const snapshot = useMemo(() => {
    const records = inventoryRepository.query();
    return {
      records,
      locations: inventoryRepository.loadLocations(),
      movements: inventoryRepository.loadMovements().map(inventoryRepository.resolveMovement),
      transfers: inventoryRepository.loadTransfers().map(inventoryRepository.resolveTransfer),
      metrics: inventoryRepository.metrics(records),
      reports: inventoryRepository.reports(records),
    };
  }, [revision]);

  const run = useCallback((method, payload, ...rest) => {
    const result = inventoryRepository[method](payload, ...rest);
    /* The service announces successful writes. Refresh is a safe fallback
       for memory-mode rendering and rejected mutations with new feedback. */
    if (result?.ok) refresh();
    return result;
  }, [refresh]);

  const value = useMemo(() => ({
    ...snapshot,
    revision,
    refresh,
    query: (filters) => inventoryRepository.query(filters),
    getAvailability: (product, selection) => inventoryRepository.getCustomerAvailability(product, selection),
    receiveStock: (payload) => run("receiveStock", payload),
    adjustStock: (payload) => run("adjustStock", payload),
    markDamaged: (payload) => run("markDamaged", payload),
    returnStock: (payload) => run("returnStock", payload),
    inspectReturnedStock: (payload) => run("inspectReturnedStock", payload),
    updateThreshold: (payload) => run("updateThreshold", payload),
    addLocation: (payload) => run("addLocation", payload),
    createTransfer: (payload) => run("createTransfer", payload),
    transitionTransfer: (id, status, actor) => {
      const result = inventoryRepository.transitionTransfer(id, status, actor);
      if (result.ok) refresh();
      return result;
    },
  }), [snapshot, revision, refresh, run]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

const inert = {
  records: [],
  locations: [],
  movements: [],
  transfers: [],
  metrics: {},
  reports: { byLocation: [], byCategory: [] },
  revision: 0,
  refresh: () => {},
  query: () => [],
  getAvailability: () => ({ tracked: false, available: 0, status: "IN_STOCK" }),
};

export const useInventory = () => useContext(InventoryContext) ?? inert;

export default InventoryContext;
