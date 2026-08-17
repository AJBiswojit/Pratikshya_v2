/**
 * PRATIKSHYA FASHON — Order state (Phase 15)
 *
 * The single source of truth for placed demo orders + operational fulfillment.
 * Every order page reads this context; nothing in UI touches localStorage directly.
 *
 *   OrderContext
 *     └── services/orders/orderService (persistence + fulfillment operations)
 *         ├── services/orders/trackingService
 *         ├── services/orders/fulfillmentService
 *         ├── services/orders/orderTimelineService
 *         └── services/orders/returnService
 *
 * Phase 15 adds operational methods while keeping customer API compatible.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { ORDER_STATUS, RETURN_STATUS, nextJourneyStatus } from "../config/orderConfig";
import * as orderService from "../services/orders/orderService";
import { getTracking as buildTracking } from "../services/orders/trackingService";
import {
  advanceReturnRecord,
  approveReturnRecord,
  completeRefundRecord,
  createReturnRecord,
  initiateRefundRecord,
  inspectReturnRecord,
  receiveReturnRecord,
  rejectReturnRecord,
  schedulePickupRecord,
} from "../services/orders/returnService";
import { latestReturn } from "../utils/orders";
import inventoryRepository from "../services/inventory/inventoryRepository";

export const ORDERS_STORAGE_KEY = orderService.ORDERS_STORAGE_KEY;
export const CURRENT_ORDER_KEY = orderService.CURRENT_ORDER_KEY;

const OrderContext = createContext(null);

export function OrderProvider({ children }) {
  const { user } = useAuth();
  const customerId = user?.id ?? null;

  const [orders, setOrders] = useState(() => orderService.loadOrders());
  const [currentOrderId, setCurrentOrderId] = useState(() =>
    orderService.loadCurrentOrderId()
  );

  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  useEffect(() => {
    orderService.saveOrders(orders);
  }, [orders]);

  useEffect(() => {
    orderService.saveCurrentOrderId(currentOrderId);
  }, [currentOrderId]);

  /* ---------------------------------------------------------------- */
  /* Reads                                                             */
  /* ---------------------------------------------------------------- */

  const customerOrders = useMemo(
    () => orderService.ordersForCustomer(orders, customerId),
    [orders, customerId]
  );

  const guestOrderCount = useMemo(
    () => (customerId ? orders.filter((order) => !order.customerId).length : 0),
    [orders, customerId]
  );

  const getOrders = useCallback(() => ordersRef.current, []);

  const getAllOrders = useCallback(() => ordersRef.current, []);

  const getOrderById = useCallback(
    (orderId) =>
      orderService.findOwnedOrder(ordersRef.current, orderId, customerId),
    [customerId]
  );

  /** Admin / employee view — no ownership filter */
  const getOrderByIdAdmin = useCallback(
    (orderId) => orderService.findOrder(ordersRef.current, orderId),
    []
  );

  const getCustomerOrders = useCallback(
    (id = customerId) => orderService.ordersForCustomer(ordersRef.current, id),
    [customerId]
  );

  const currentOrder = useMemo(
    () => (currentOrderId ? orderService.findOrder(orders, currentOrderId) : null),
    [orders, currentOrderId]
  );

  const getTracking = useCallback(
    (orderId) => {
      const order = orderService.findOwnedOrder(
        ordersRef.current,
        orderId,
        customerId
      );
      return order ? buildTracking(order, { customerView: true }) : null;
    },
    [customerId]
  );

  const getTrackingAdmin = useCallback((orderId) => {
    const order = orderService.findOrder(ordersRef.current, orderId);
    return order ? buildTracking(order, { customerView: false }) : null;
  }, []);

  const getReturn = useCallback(
    (orderId, returnId = null) => {
      const order = orderService.findOwnedOrder(
        ordersRef.current,
        orderId,
        customerId
      );
      if (!order) return null;
      if (returnId) {
        return order.returns.find((record) => record.id === returnId) ?? null;
      }
      return latestReturn(order);
    },
    [customerId]
  );

  /* ---------------------------------------------------------------- */
  /* Internal helper to apply a service result to state                */
  /* ---------------------------------------------------------------- */

  const applyResult = useCallback((result) => {
    if (!result?.ok) return result;
    ordersRef.current = result.orders;
    setOrders(result.orders);
    return result;
  }, []);

  /* ---------------------------------------------------------------- */
  /* Writes — customer facing                                          */
  /* ---------------------------------------------------------------- */

  const createOrder = useCallback((snapshot) => {
    const result = orderService.addOrder(ordersRef.current, snapshot);
    if (!result.ok || !result.order) return { ok: false, order: null, message: "" };
    ordersRef.current = result.orders;
    setOrders(result.orders);
    setCurrentOrderId(result.order.id);
    return { ok: true, order: result.order, message: result.message };
  }, []);

  const clearCurrentOrder = useCallback(() => setCurrentOrderId(null), []);

  const updateMockOrderStatus = useCallback(
    (orderId, nextStatus = null) => {
      const order = orderService.findOwnedOrder(
        ordersRef.current,
        orderId,
        customerId
      );
      if (!order) return { ok: false, message: "Order not found." };

      const target = nextStatus ?? nextJourneyStatus(order.status);
      if (!target) {
        return { ok: false, message: "This order has completed its journey." };
      }

      const result = orderService.applyStatus(ordersRef.current, orderId, target);
      if (!result.ok) return { ok: false, message: result.message };
      return applyResult(result);
    },
    [customerId, applyResult]
  );

  const cancelOrder = useCallback(
    (orderId, options = {}) => {
      const order = orderService.findOwnedOrder(
        ordersRef.current,
        orderId,
        customerId
      );
      if (!order) return { ok: false, message: "Order not found." };

      const result = orderService.cancelOrder(ordersRef.current, orderId, {
        reason: options.reason || "customer_request",
        note: options.note || "Cancelled by the customer.",
        actor: options.actor || { name: order.customer?.fullName || "Customer" },
      });
      if (!result.ok) {
        return {
          ok: false,
          message:
            result.message ||
            "This order can no longer be cancelled. Please contact the atelier.",
        };
      }

      if (result.order.inventoryReservationId) {
        const restock = inventoryRepository.restockCancelledOrder(result.order, {
          label: result.order.customer?.fullName || "Customer",
        });
        if (!restock.ok) {
          return {
            ok: false,
            message: restock.error || "Inventory could not be restored, so the order was not cancelled.",
          };
        }
      }

      return applyResult(result);
    },
    [customerId, applyResult]
  );

  const createReturn = useCallback(
    ({ orderId, lineIds, reason, resolution, note }) => {
      const order = orderService.findOwnedOrder(
        ordersRef.current,
        orderId,
        customerId
      );
      if (!order) {
        return { ok: false, errors: {}, message: "Order not found." };
      }

      const built = createReturnRecord({
        order,
        lineIds,
        reason,
        resolution,
        note,
      });
      if (!built.ok) return built;

      const attached = orderService.attachReturn(
        ordersRef.current,
        orderId,
        built.record,
        built.orderStatus
      );
      if (!attached.ok) {
        return { ok: false, errors: {}, message: "Return could not be created." };
      }
      applyResult(attached);
      return { ok: true, record: built.record, errors: {}, message: built.message };
    },
    [customerId, applyResult]
  );

  const updateMockReturnStatus = useCallback(
    (orderId, returnId, nextStatus) => {
      const order = orderService.findOwnedOrder(
        ordersRef.current,
        orderId,
        customerId
      );
      const record = order?.returns.find((entry) => entry.id === returnId) ?? null;
      if (!record) return { ok: false, message: "Return not found." };

      const advanced = advanceReturnRecord(record, nextStatus);
      if (!advanced.ok) return { ok: false, message: advanced.message };

      const updated = orderService.updateReturn(
        ordersRef.current,
        orderId,
        advanced.record
      );
      if (!updated.ok) return { ok: false, message: "Return could not be updated." };
      applyResult(updated);
      if (nextStatus === RETURN_STATUS.RECEIVED || nextStatus === "RECEIVED") {
        inventoryRepository.recordOrderReturn(advanced.record);
      }
      return { ok: true, record: advanced.record, message: "" };
    },
    [customerId, applyResult]
  );

  /* ---------------------------------------------------------------- */
  /* Return operational mutations — admin / employee                   */
  /* ---------------------------------------------------------------- */

  const applyReturnMutation = useCallback(
    (returnId, mutationFn, options = {}) => {
      const orders = ordersRef.current;
      let foundOrder = null;
      let foundRecord = null;
      for (const order of orders) {
        const record = (order.returns || []).find((entry) => entry.id === returnId);
        if (record) {
          foundOrder = order;
          foundRecord = record;
          break;
        }
      }
      if (!foundRecord) return { ok: false, message: "Return not found." };

      const result = mutationFn(foundRecord, options);
      if (!result.ok) return result;

      const updated = orderService.updateReturn(
        orders,
        foundOrder.id,
        result.record
      );
      if (!updated.ok) {
        return { ok: false, message: "Return could not be updated." };
      }
      applyResult(updated);
      return { ok: true, record: result.record, message: result.message };
    },
    [applyResult]
  );

  const approveReturn = useCallback(
    (returnId, options = {}) => applyReturnMutation(returnId, approveReturnRecord, options),
    [applyReturnMutation]
  );

  const rejectReturn = useCallback(
    (returnId, options = {}) => applyReturnMutation(returnId, rejectReturnRecord, options),
    [applyReturnMutation]
  );

  const scheduleReturnPickup = useCallback(
    (returnId, options = {}) => applyReturnMutation(returnId, schedulePickupRecord, options),
    [applyReturnMutation]
  );

  const receiveReturn = useCallback(
    (returnId, options = {}) => {
      const orders = ordersRef.current;
      let foundOrder = null;
      let foundRecord = null;
      for (const order of orders) {
        const record = (order.returns || []).find((entry) => entry.id === returnId);
        if (record) {
          foundOrder = order;
          foundRecord = record;
          break;
        }
      }
      if (!foundRecord) return { ok: false, message: "Return not found." };

      const result = receiveReturnRecord(foundRecord, options);
      if (!result.ok) return result;

      const updated = orderService.updateReturn(
        orders,
        foundOrder.id,
        result.record
      );
      if (!updated.ok) {
        return { ok: false, message: "Return could not be updated." };
      }
      applyResult(updated);

      /* Record return into inventory quarantine. */
      inventoryRepository.recordOrderReturn(result.record, options.actor);

      return { ok: true, record: result.record, message: result.message };
    },
    [applyResult]
  );

  const inspectReturn = useCallback(
    (returnId, options = {}) => {
      const orders = ordersRef.current;
      let foundOrder = null;
      let foundRecord = null;
      for (const order of orders) {
        const record = (order.returns || []).find((entry) => entry.id === returnId);
        if (record) {
          foundOrder = order;
          foundRecord = record;
          break;
        }
      }
      if (!foundRecord) return { ok: false, message: "Return not found." };

      const result = inspectReturnRecord(foundRecord, options);
      if (!result.ok) return result;

      const updated = orderService.updateReturn(
        orders,
        foundOrder.id,
        result.record
      );
      if (!updated.ok) {
        return { ok: false, message: "Return could not be updated." };
      }
      applyResult(updated);

      /* Apply inspection results to inventory. */
      const inspections = options.inspections || [];
      inspections.forEach((inspection) => {
        const item = foundRecord.items.find((entry) => entry.lineId === inspection.lineId);
        if (!item) return;
        inventoryRepository.inspectReturnedStock({
          productId: item.productId,
          variantId: item.variantId || null,
          locationId: "loc-main-warehouse",
          quantity: item.quantity,
          condition: inspection.condition || "SELLABLE",
          reason: `Return inspection — ${inspection.condition || "SELLABLE"}`,
          notes: inspection.notes || "",
          reference: `${returnId}:${item.lineId}`,
          actor: options.actor,
        });
      });

      return { ok: true, record: result.record, message: result.message };
    },
    [applyResult]
  );

  const initiateReturnRefund = useCallback(
    (returnId, options = {}) => applyReturnMutation(returnId, initiateRefundRecord, options),
    [applyReturnMutation]
  );

  const completeReturnRefund = useCallback(
    (returnId, options = {}) => applyReturnMutation(returnId, completeRefundRecord, options),
    [applyReturnMutation]
  );

  const claimGuestOrders = useCallback(
    (id = customerId) => {
      if (!id) return { ok: false, claimed: 0 };
      const result = orderService.claimGuestOrders(ordersRef.current, id);
      if (result.claimed === 0) return { ok: false, claimed: 0 };
      ordersRef.current = result.orders;
      setOrders(result.orders);
      return { ok: true, claimed: result.claimed };
    },
    [customerId]
  );

  /* ---------------------------------------------------------------- */
  /* Writes — operational (admin / employee)                           */
  /* ---------------------------------------------------------------- */

  const allocateOrder = useCallback(
    (orderId, { locationId, employeeId, employeeName, actor } = {}) => {
      const result = orderService.allocateOrder(ordersRef.current, orderId, {
        locationId,
        employeeId,
        employeeName,
        actor: actor || { name: employeeName || "System" },
      });
      return applyResult(result);
    },
    [applyResult]
  );

  const assignFulfillment = useCallback(
    (orderId, payload) => {
      const result = orderService.assignFulfillment(ordersRef.current, orderId, payload);
      return applyResult(result);
    },
    [applyResult]
  );

  const startPicking = useCallback(
    (orderId, { actor } = {}) => {
      const result = orderService.startPicking(ordersRef.current, orderId, { actor });
      return applyResult(result);
    },
    [applyResult]
  );

  const markItemPicked = useCallback(
    (orderId, lineId, opts = {}) => {
      const result = orderService.markItemPicked(ordersRef.current, orderId, lineId, opts);
      return applyResult(result);
    },
    [applyResult]
  );

  const markPacked = useCallback(
    (orderId, opts = {}) => {
      const result = orderService.markPacked(ordersRef.current, orderId, opts);
      return applyResult(result);
    },
    [applyResult]
  );

  const markReadyToDispatch = useCallback(
    (orderId, opts = {}) => {
      const result = orderService.markReadyToDispatch(ordersRef.current, orderId, opts);
      return applyResult(result);
    },
    [applyResult]
  );

  const dispatchOrder = useCallback(
    (orderId, payload) => {
      const result = orderService.dispatchOrder(ordersRef.current, orderId, payload);
      return applyResult(result);
    },
    [applyResult]
  );

  const markOutForDelivery = useCallback(
    (orderId, opts = {}) => {
      const result = orderService.markOutForDelivery(ordersRef.current, orderId, opts);
      return applyResult(result);
    },
    [applyResult]
  );

  const markDelivered = useCallback(
    (orderId, opts = {}) => {
      const result = orderService.markDelivered(ordersRef.current, orderId, opts);
      return applyResult(result);
    },
    [applyResult]
  );

  const addInternalNote = useCallback(
    (orderId, payload) => {
      const result = orderService.addInternalNote(ordersRef.current, orderId, payload);
      return applyResult(result);
    },
    [applyResult]
  );

  const cancelOrderAdmin = useCallback(
    (orderId, { reason, note, actor } = {}) => {
      const order = orderService.findOrder(ordersRef.current, orderId);
      if (!order) return { ok: false, message: "Order not found." };
      const result = orderService.cancelOrder(ordersRef.current, orderId, {
        reason: reason || "operational_issue",
        note: note || "Cancelled by admin.",
        actor: actor || { name: "Admin" },
      });
      if (!result.ok) return result;
      if (result.order.inventoryReservationId) {
        const restock = inventoryRepository.restockCancelledOrder(result.order, {
          label: actor?.name || "Admin",
        });
        // Even if restock fails (already restocked), we still succeed to avoid blocking admin
        if (!restock.ok && !restock.alreadySettled) {
          // Log but don't block
          console.warn("Restock failed during admin cancel", restock.error);
        }
      }
      return applyResult(result);
    },
    [applyResult]
  );

  const forceTransition = useCallback(
    (orderId, nextStatus, opts = {}) => {
      const result = orderService.forceTransition(ordersRef.current, orderId, nextStatus, opts);
      return applyResult(result);
    },
    [applyResult]
  );

  const applyStatusAdmin = useCallback(
    (orderId, nextStatus, opts = {}) => {
      const result = orderService.applyStatus(ordersRef.current, orderId, nextStatus, opts.at, opts.actor);
      return applyResult(result);
    },
    [applyResult]
  );

  /* ---------------------------------------------------------------- */

  const value = useMemo(
    () => ({
      /* State */
      orders: customerOrders,
      allOrders: orders,
      currentOrder,
      guestOrderCount,
      /* Reads */
      getOrders,
      getAllOrders,
      getOrderById,
      getOrderByIdAdmin,
      getCustomerOrders,
      getTracking,
      getTrackingAdmin,
      getReturn,
      /* Customer Writes */
      createOrder,
      placeOrder: createOrder,
      clearCurrentOrder,
      updateMockOrderStatus,
      updateMockReturnStatus,
      cancelOrder,
      createReturn,
      claimGuestOrders,
      ordersForCustomer: getCustomerOrders,
      /* Operational Writes */
      allocateOrder,
      assignFulfillment,
      startPicking,
      markItemPicked,
      markPacked,
      markReadyToDispatch,
      dispatchOrder,
      markOutForDelivery,
      markDelivered,
      addInternalNote,
      cancelOrderAdmin,
      forceTransition,
      applyStatusAdmin,
      /* Return Operations */
      approveReturn,
      rejectReturn,
      scheduleReturnPickup,
      receiveReturn,
      inspectReturn,
      initiateReturnRefund,
      completeReturnRefund,
    }),
    [
      customerOrders,
      orders,
      currentOrder,
      guestOrderCount,
      getOrders,
      getAllOrders,
      getOrderById,
      getOrderByIdAdmin,
      getCustomerOrders,
      getTracking,
      getTrackingAdmin,
      getReturn,
      createOrder,
      clearCurrentOrder,
      updateMockOrderStatus,
      updateMockReturnStatus,
      cancelOrder,
      createReturn,
      claimGuestOrders,
      getCustomerOrders,
      allocateOrder,
      assignFulfillment,
      startPicking,
      markItemPicked,
      markPacked,
      markReadyToDispatch,
      dispatchOrder,
      markOutForDelivery,
      markDelivered,
      addInternalNote,
      cancelOrderAdmin,
      forceTransition,
      applyStatusAdmin,
      approveReturn,
      rejectReturn,
      scheduleReturnPickup,
      receiveReturn,
      inspectReturn,
      initiateReturnRefund,
      completeReturnRefund,
    ]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

const inertOrders = {
  orders: [],
  allOrders: [],
  currentOrder: null,
  guestOrderCount: 0,
  getOrders: () => [],
  getAllOrders: () => [],
  getOrderById: () => null,
  getOrderByIdAdmin: () => null,
  getCustomerOrders: () => [],
  getTracking: () => null,
  getTrackingAdmin: () => null,
  getReturn: () => null,
  createOrder: () => ({ ok: false, order: null, message: "" }),
  placeOrder: () => ({ ok: false, order: null, message: "" }),
  clearCurrentOrder: () => {},
  updateMockOrderStatus: () => ({ ok: false, message: "" }),
  updateMockReturnStatus: () => ({ ok: false, message: "" }),
  cancelOrder: () => ({ ok: false, message: "" }),
  createReturn: () => ({ ok: false, errors: {}, message: "" }),
  claimGuestOrders: () => ({ ok: false, claimed: 0 }),
  ordersForCustomer: () => [],
  allocateOrder: () => ({ ok: false, message: "" }),
  assignFulfillment: () => ({ ok: false, message: "" }),
  startPicking: () => ({ ok: false, message: "" }),
  markItemPicked: () => ({ ok: false, message: "" }),
  markPacked: () => ({ ok: false, message: "" }),
  markReadyToDispatch: () => ({ ok: false, message: "" }),
  dispatchOrder: () => ({ ok: false, message: "" }),
  markOutForDelivery: () => ({ ok: false, message: "" }),
  markDelivered: () => ({ ok: false, message: "" }),
  addInternalNote: () => ({ ok: false, message: "" }),
  cancelOrderAdmin: () => ({ ok: false, message: "" }),
  forceTransition: () => ({ ok: false, message: "" }),
  applyStatusAdmin: () => ({ ok: false, message: "" }),
  approveReturn: () => ({ ok: false, message: "" }),
  rejectReturn: () => ({ ok: false, message: "" }),
  scheduleReturnPickup: () => ({ ok: false, message: "" }),
  receiveReturn: () => ({ ok: false, message: "" }),
  inspectReturn: () => ({ ok: false, message: "" }),
  initiateReturnRefund: () => ({ ok: false, message: "" }),
  completeReturnRefund: () => ({ ok: false, message: "" }),
};

export function useOrder() {
  return useContext(OrderContext) ?? inertOrders;
}

export { ORDER_STATUS };

export default OrderContext;
