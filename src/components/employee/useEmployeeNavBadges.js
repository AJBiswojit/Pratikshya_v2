import { useMemo } from "react";
import { useOrder } from "../../context/OrderContext";
import { useInventory } from "../../context/InventoryContext";
import { pendingLeaveCount } from "../../services/workforce/leaveService";
import { getPendingReview } from "../../services/media/mediaRepository";

/**
 * PRATIKSHYA FASHON — Sidebar badges from REAL data.
 *
 * Every count here comes from an existing lightweight selector, context or
 * service. Nothing is invented and nothing is polled — counts are derived on
 * mount from data the portal already holds, keyed off the live read models.
 */

/** Orders that are still active (not in a terminal / closed state). */
const TERMINAL_ORDER_STATUSES = new Set([
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "RETURNED",
]);

export function useEmployeeNavBadges(employee) {
  const { allOrders } = useOrder();
  const { metrics } = useInventory();

  return useMemo(() => {
    const activeOrders = Array.isArray(allOrders)
      ? allOrders.filter((order) => !TERMINAL_ORDER_STATUSES.has(order?.status)).length
      : 0;

    return {
      orders: activeOrders,
      inventory: Number(metrics?.lowStock) || 0,
      media: getPendingReview().length,
      leave: employee ? pendingLeaveCount(employee) : 0,
    };
  }, [allOrders, metrics, employee]);
}

export default useEmployeeNavBadges;
