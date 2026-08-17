/**
 * PRATIKSHYA FASHON — The bag.
 *
 * The one cart implementation in the application. Phase 5's lightweight
 * session state grew into this provider; the product detail panel, the
 * mini-cart drawer, the cart page and the shell count all read from here.
 *
 * A cart line stores only identity — product id, colour, size, quantity,
 * when it was added. The product itself is resolved from the catalogue at
 * read time, so prices and stock can never drift from the mock data, and a
 * retired product simply drops out on initialisation instead of crashing.
 *
 * Persistence is localStorage under a namespaced key. Corrupted storage is
 * discarded silently and the bag starts clean.
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
import { getCoupon, validateCoupon } from "../data/shopping/coupons";
import { useAuth } from "./AuthContext";
import inventoryRepository, { INVENTORY_CHANGED_EVENT } from "../services/inventory/inventoryRepository";
import { PRODUCTS_CHANGED_EVENT } from "../services/catalogRepository";
import { OFFERS_CHANGED_EVENT } from "../services/offers/offerRepository";
import {
  calculateCartTotals,
  cartLineId,
  CART_STORAGE_KEY,
  getMaxQuantity,
  readStorage,
  writeStorage,
} from "../utils/shopping";

const CartContext = createContext(null);

/** Inventory-tracked pieces use the central ledger; untracked and
 * made-to-order pieces preserve the Phase 6 catalogue rule. */
const maximumFor = (product, selection = {}) => {
  const availability = inventoryRepository.getCustomerAvailability(product, selection);
  if (availability.tracked) return availability.available;
  return availability.status === "UNAVAILABLE" ? 0 : getMaxQuantity(product);
};

const clampFor = (product, selection, quantity) => {
  const maximum = maximumFor(product, selection);
  if (maximum <= 0) return 0;
  return Math.min(maximum, Math.max(1, Math.floor(Number(quantity) || 1)));
};

/* ------------------------------------------------------------------ */
/* Initialisation                                                      */
/* ------------------------------------------------------------------ */

/**
 * Rebuilds a safe cart from whatever storage held: invalid records and
 * retired products are removed, quantities are clamped to the mock stock,
 * duplicate identities are merged and the stored coupon is only kept if it
 * still resolves to a live offer.
 */
const restoreCart = () => {
  const stored = readStorage(CART_STORAGE_KEY, null);
  const rawLines = Array.isArray(stored?.lines) ? stored.lines : [];
  const byId = new Map();

  rawLines.forEach((line) => {
    if (!line || typeof line !== "object") return;
    const product = getProductById(line.productId);
    if (!product) return;

    const color = typeof line.color === "string" ? line.color : null;
    const size = typeof line.size === "string" ? line.size : null;
    const id = cartLineId(product.id, { color, size });
    const quantity = clampFor(
      product,
      { color, size },
      (byId.get(id)?.quantity ?? 0) + (Number(line.quantity) || 0)
    );
    if (quantity < 1) return;

    byId.set(id, {
      id,
      productId: product.id,
      color,
      size,
      quantity,
      addedAt: Number(line.addedAt) || Date.now(),
    });
  });

  const couponCode = typeof stored?.coupon === "string" ? stored.coupon : null;

  return {
    lines: [...byId.values()],
    couponCode: couponCode && getCoupon(couponCode) ? couponCode : null,
  };
};

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [{ lines, couponCode }, setState] = useState(restoreCart);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [inventoryRevision, setInventoryRevision] = useState(0);

  /* A stock or offer change elsewhere immediately revalidates the bag. */
  useEffect(() => {
    const refresh = () => setInventoryRevision((value) => value + 1);
    window.addEventListener(INVENTORY_CHANGED_EVENT, refresh);
    window.addEventListener(PRODUCTS_CHANGED_EVENT, refresh);
    window.addEventListener(OFFERS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(INVENTORY_CHANGED_EVENT, refresh);
      window.removeEventListener(PRODUCTS_CHANGED_EVENT, refresh);
      window.removeEventListener(OFFERS_CHANGED_EVENT, refresh);
    };
  }, []);

  /* Persist identity only — never the product record, never anything sensitive. */
  useEffect(() => {
    writeStorage(CART_STORAGE_KEY, { lines, coupon: couponCode });
  }, [lines, couponCode]);

  /* ---------------------------------------------------------------- */
  /* Derived state                                                     */
  /* ---------------------------------------------------------------- */

  /** Cart lines with their live catalogue product attached. */
  const items = useMemo(
    () =>
      lines
        .map((line) => {
          const product = getProductById(line.productId);
          if (!product) return null;
          return {
            ...line,
            product,
            maximum: maximumFor(product, line),
            lineTotal: product.price * line.quantity,
          };
        })
        .filter(Boolean),
    [lines, inventoryRevision]
  );

  const coupon = useMemo(() => (couponCode ? getCoupon(couponCode) : null), [couponCode]);

  /** Coupon status against the current bag — an offer can lapse gracefully. */
  const couponState = useMemo(() => {
    if (!coupon) return { active: false, lapsed: false };
    const result = validateCoupon(coupon.code, items, {
      customerId: user?.id,
      customerEmail: user?.email,
    });
    return { active: result.ok, lapsed: !result.ok };
  }, [coupon, items, user?.id, user?.email]);

  const totals = useMemo(
    () => calculateCartTotals(items, couponState.active ? coupon : null),
    [items, coupon, couponState]
  );

  /** Total item quantity — the number the shell badge shows. */
  const count = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );

  /* ---------------------------------------------------------------- */
  /* Actions                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Adds a product + variant to the bag, merging with an existing line of
   * the same identity and honouring the mock stock across repeated
   * additions. Returns a result the caller can turn into feedback.
   */
  const addToCart = useCallback(
    (product, selection = {}) => {
      if (!product?.id || !getProductById(product.id)) {
        return { ok: false, message: "This piece is currently unavailable." };
      }

      const maximum = maximumFor(product, selection);
      if (maximum === 0) {
        return { ok: false, message: "This piece is currently unavailable." };
      }

      const requested = Math.max(1, Math.floor(Number(selection.quantity) || 1));
      const id = cartLineId(product.id, selection);
      const existing = lines.find((line) => line.id === id);
      const held = existing?.quantity ?? 0;

      if (held >= maximum) {
        return {
          ok: false,
          message: "Your bag already holds the maximum quantity currently available.",
        };
      }

      const quantity = Math.min(maximum, held + requested);
      const capped = quantity < held + requested;

      setState((current) => {
        const line = current.lines.find((entry) => entry.id === id);
        if (line) {
          return {
            ...current,
            lines: current.lines.map((entry) =>
              entry.id === id ? { ...entry, quantity } : entry
            ),
          };
        }
        return {
          ...current,
          lines: [
            ...current.lines,
            {
              id,
              productId: product.id,
              color: selection.color ?? null,
              size: selection.size ?? null,
              quantity,
              addedAt: Date.now(),
            },
          ],
        };
      });

      return capped
        ? {
            ok: true,
            message: "The requested quantity exceeds current availability — your bag was adjusted.",
          }
        : { ok: true, message: "Added to your collection." };
    },
    [lines]
  );

  const removeFromCart = useCallback((lineId) => {
    setState((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.id !== lineId),
    }));
  }, []);

  /** Sets a line's quantity, clamped to [1, stock]. Zero removes the line. */
  const updateCartQuantity = useCallback((lineId, quantity) => {
    setState((current) => {
      if (Number(quantity) < 1) {
        return { ...current, lines: current.lines.filter((line) => line.id !== lineId) };
      }
      return {
        ...current,
        lines: current.lines.map((line) => {
          if (line.id !== lineId) return line;
          const product = getProductById(line.productId);
          const next = product ? clampFor(product, line, quantity) : 0;
          return next > 0 ? { ...line, quantity: next } : line;
        }),
      };
    });
  }, []);

  const clearCart = useCallback(() => {
    setState({ lines: [], couponCode: null });
  }, []);

  /** Quantity already held — for one line when a selection is given, else the product. */
  const getCartItemQuantity = useCallback(
    (product, selection = null) => {
      const productId = typeof product === "string" ? product : product?.id;
      if (!productId) return 0;
      if (selection) {
        const id = cartLineId(productId, selection);
        return items.find((item) => item.id === id)?.quantity ?? 0;
      }
      return items
        .filter((item) => item.productId === productId)
        .reduce((total, item) => total + item.quantity, 0);
    },
    [items]
  );

  const applyCoupon = useCallback(
    (code) => {
      const result = validateCoupon(code, items, {
        appliedCode: couponCode,
        customerId: user?.id,
        customerEmail: user?.email,
      });
      if (!result.ok) return result;
      setState((current) => ({ ...current, couponCode: result.coupon.code }));
      return {
        ok: true,
        coupon: result.coupon,
        message: `${result.coupon.code} is now part of your order.`,
      };
    },
    [items, couponCode, user?.id, user?.email]
  );

  const removeCoupon = useCallback(() => {
    setState((current) => ({ ...current, couponCode: null }));
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  /* ---------------------------------------------------------------- */

  const value = useMemo(
    () => ({
      items,
      count,
      totals,
      coupon,
      couponLapsed: couponState.lapsed,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      getCartItemQuantity,
      applyCoupon,
      removeCoupon,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [
      items,
      count,
      totals,
      coupon,
      couponState,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      getCartItemQuantity,
      applyCoupon,
      removeCoupon,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Bag accessor. Returns an inert bag when no provider is mounted, so a
 * component can render in isolation without crashing.
 */
export function useCart() {
  return (
    useContext(CartContext) ?? {
      items: [],
      count: 0,
      totals: calculateCartTotals([]),
      coupon: null,
      couponLapsed: false,
      addToCart: () => ({ ok: false, message: "" }),
      removeFromCart: () => {},
      updateCartQuantity: () => {},
      clearCart: () => {},
      getCartItemQuantity: () => 0,
      applyCoupon: () => ({ ok: false, message: "" }),
      removeCoupon: () => {},
      isDrawerOpen: false,
      openDrawer: () => {},
      closeDrawer: () => {},
    }
  );
}

export default CartContext;
