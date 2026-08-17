/**
 * PRATIKSHYA FASHON — Offer register subscription (Phase 17).
 *
 * Admin and employee desks re-read the shared offer repository whenever
 * it announces a write. One repository, one event.
 */

import { useCallback, useEffect, useState } from "react";
import offerRepository, { OFFERS_CHANGED_EVENT } from "../services/offers/offerRepository";

export const useOffers = (filters = {}) => {
  const read = useCallback(() => offerRepository.list(filters), [
    filters.query,
    filters.status,
    filters.type,
    filters.category,
    filters.collection,
    filters.usage,
    filters.from,
    filters.to,
  ]);
  const [items, setItems] = useState(read);

  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(OFFERS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(OFFERS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [read]);

  return items;
};

export const useOffer = (offerId) => {
  const read = useCallback(
    () => (offerId ? offerRepository.find(offerId) : null),
    [offerId]
  );
  const [offer, setOffer] = useState(read);

  useEffect(() => {
    const sync = () => setOffer(read());
    sync();
    window.addEventListener(OFFERS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(OFFERS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [read]);

  return offer;
};

export default useOffers;
