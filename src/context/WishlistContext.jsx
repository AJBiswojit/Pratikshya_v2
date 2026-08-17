/**
 * PRATIKSHYA FASHON — Wishlist state.
 *
 * The one wishlist implementation in the application. Identity is
 * product-based — a set of catalogue ids — so the same piece can never be
 * saved twice. Persisted in localStorage under a namespaced key; ids that
 * no longer resolve to a catalogue product are dropped on initialisation,
 * and corrupted storage falls back to an empty edit.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getProductById } from "../data/products";
import { readStorage, WISHLIST_STORAGE_KEY, writeStorage } from "../utils/shopping";

const WishlistContext = createContext(null);

/** Restores only ids that still exist in the catalogue. */
const restoreWishlist = () => {
  const stored = readStorage(WISHLIST_STORAGE_KEY, []);
  if (!Array.isArray(stored)) return new Set();
  return new Set(stored.filter((id) => typeof id === "string" && getProductById(id)));
};

export function WishlistProvider({ children }) {
  const [saved, setSaved] = useState(restoreWishlist);

  useEffect(() => {
    writeStorage(WISHLIST_STORAGE_KEY, [...saved]);
  }, [saved]);

  const resolveId = (product) =>
    typeof product === "string" ? product : product?.id ?? null;

  const add = useCallback((product) => {
    const id = resolveId(product);
    if (!id || !getProductById(id)) return;
    setSaved((current) => {
      if (current.has(id)) return current; // No duplicate entries.
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const remove = useCallback((product) => {
    const id = resolveId(product);
    if (!id) return;
    setSaved((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback((product) => {
    const id = resolveId(product);
    if (!id || !getProductById(id)) return;
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** The saved pieces, resolved from the catalogue, newest last. */
  const products = useMemo(
    () => [...saved].map((id) => getProductById(id)).filter(Boolean),
    [saved]
  );

  const value = useMemo(
    () => ({
      saved,
      products,
      /** Unique products — the number the shell badge shows. */
      count: saved.size,
      isSaved: (product) => saved.has(resolveId(product)),
      add,
      remove,
      toggle,
    }),
    [saved, products, add, remove, toggle]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

/**
 * Wishlist accessor. Returns an inert wishlist when no provider is mounted,
 * so a component can be rendered in isolation without crashing.
 */
export function useWishlist() {
  return (
    useContext(WishlistContext) ?? {
      saved: new Set(),
      products: [],
      count: 0,
      isSaved: () => false,
      add: () => {},
      remove: () => {},
      toggle: () => {},
    }
  );
}

export default WishlistContext;
