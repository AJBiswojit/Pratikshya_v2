import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  listRecentlyViewed,
  mergeGuestRecentlyViewed,
  recordRecentlyViewed,
  RECENTLY_VIEWED_CHANGED_EVENT,
  resolveRecentlyViewedProducts,
} from "../services/customer/recentlyViewed";

export function useRecentlyViewed(limit = 8) {
  const { user } = useAuth();
  const customerId = user?.id ?? null;

  const read = useCallback(
    () => resolveRecentlyViewedProducts(customerId, limit),
    [customerId, limit]
  );

  const [products, setProducts] = useState(read);

  useEffect(() => {
    if (customerId) mergeGuestRecentlyViewed(customerId);
    const sync = () => setProducts(read());
    sync();
    window.addEventListener(RECENTLY_VIEWED_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(RECENTLY_VIEWED_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [customerId, read]);

  const record = useCallback(
    (productId) => {
      recordRecentlyViewed(productId, customerId);
    },
    [customerId]
  );

  return { products, ids: listRecentlyViewed(customerId), record };
}

export default useRecentlyViewed;
