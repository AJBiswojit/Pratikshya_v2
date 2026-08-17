/**
 * PRATIKSHYA FASHON — Product register subscription (Phase 13).
 *
 * The admin and employee workspaces re-read the shared catalogue
 * repository whenever it announces a write. One repository, one event —
 * no page keeps its own product list.
 */

import { useCallback, useEffect, useState } from "react";
import catalogRepository, { PRODUCTS_CHANGED_EVENT } from "../services/catalogRepository";
import { ACTIVITY_CHANGED_EVENT, loadActivity } from "../services/employees/activityService";

/** Every product in the shared register, re-read on each change. */
export const useProducts = () => {
  const read = useCallback(() => catalogRepository.all(), []);
  const [items, setItems] = useState(read);

  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(PRODUCTS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PRODUCTS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [read]);

  return items;
};

/** One product from the shared register, kept live. */
export const useProduct = (productId) => {
  const read = useCallback(
    () => (productId ? catalogRepository.find(productId) : null),
    [productId]
  );
  const [product, setProduct] = useState(read);

  useEffect(() => {
    const sync = () => setProduct(read());
    sync();
    window.addEventListener(PRODUCTS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PRODUCTS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [read]);

  return product;
};

/** The shared activity diary, re-read when it changes. */
export const useActivityLog = () => {
  const [entries, setEntries] = useState(() => loadActivity());

  useEffect(() => {
    const sync = () => setEntries(loadActivity());
    sync();
    window.addEventListener(ACTIVITY_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACTIVITY_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return entries;
};

export default useProducts;
