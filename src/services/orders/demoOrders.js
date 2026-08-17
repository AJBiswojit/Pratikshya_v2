/**
 * PRATIKSHYA FASHON — Demo order generator (Phase 15)
 *
 * Produces realistic demo orders covering every lifecycle stage so the
 * admin and employee desks are populated in a fresh browser without
 * requiring a checkout.
 *
 * Uses real catalogue identities, realistic Indian customer data,
 * realistic pricing and deterministic timestamps.
 * Only used when localStorage has no orders — never overwrites real orders.
 */

import catalogRepository from "../catalogRepository";
import { ORDER_STATUS, ORDER_PAYMENT_STATUS, FULFILLMENT_STATUS } from "../../config/orderConfig";
import { buildTrackingId, buildInvoiceNumber } from "../../utils/orders";
import { buildFulfillmentRecord } from "./fulfillmentService";
import { buildTimelineEvent } from "./orderTimelineService";
import { ORDER_ACTIVITY_TYPES } from "../../config/orderConfig";

const now = new Date("2026-08-12T10:00:00.000Z");

const customers = [
  { fullName: "Ananya Sharma", email: "ananya.sharma@example.com", phone: "+91 98765 40001", city: "Bhubaneswar" },
  { fullName: "Riya Banerjee", email: "riya.b@example.com", phone: "+91 98765 40002", city: "Kolkata" },
  { fullName: "Meera Nair", email: "meera.nair@example.com", phone: "+91 98765 40003", city: "Mumbai" },
  { fullName: "Sneha Kulkarni", email: "sneha.k@example.com", phone: "+91 98765 40004", city: "Pune" },
  { fullName: "Ishita Kapoor", email: "ishita.k@example.com", phone: "+91 98765 40005", city: "Delhi" },
  { fullName: "Divya Krishnan", email: "divya.k@example.com", phone: "+91 98765 40006", city: "Chennai" },
  { fullName: "Pooja Reddy", email: "pooja.reddy@example.com", phone: "+91 98765 40007", city: "Hyderabad" },
  { fullName: "Kavita Menon", email: "kavita.menon@example.com", phone: "+91 98765 40008", city: "Bhubaneswar" },
  { fullName: "Radhika Bose", email: "radhika.bose@example.com", phone: "+91 98765 40009", city: "Kolkata" },
  { fullName: "Aarav Singh", email: "aarav.s@example.com", phone: "+91 98765 40010", city: "Lucknow" },
  { fullName: "Vikram Iyer", email: "vikram.iyer@example.com", phone: "+91 98765 40011", city: "Bengaluru" },
  { fullName: "Leela Sen", email: "leela.sen@example.com", phone: "+91 98765 40012", city: "Jaipur" },
];

const productNeedles = [
  "Sambalpuri Pato",
  "Banarasi Katan",
  "Handloom Cotton Saree",
  "Wine Velvet Bridal",
  "White Cotton Kurta",
  "Girls' Festive Lehenga",
  "Meenakari Bangles",
  "Kundan Bridal Necklace",
  "Cotton Saree Petticoat",
];

const resolveDemoProducts = () => {
  const all = catalogRepository.all();
  const find = (needle) => all.find((p) => p.name.toLowerCase().includes(needle.toLowerCase())) || all[Math.floor(Math.random() * all.length)];
  return productNeedles.map(find).filter(Boolean);
};

const buildItems = (products, count = 2) => {
  const chosen = [...products].sort(() => 0.5 - Math.random()).slice(0, count);
  return chosen.map((product, idx) => {
    const variant = product.variants?.[0] || null;
    const price = variant?.price ?? product.pricing?.selling ?? product.price ?? 3999;
    const quantity = idx === 0 ? 2 : 1;
    return {
      lineId: `line-${idx + 1}`,
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      image: product.image,
      color: variant?.color || null,
      size: variant?.size || "Free Size",
      quantity,
      price,
      originalPrice: product.pricing?.mrp || null,
      lineTotal: price * quantity,
    };
  });
};

const calculatePricing = (items) => {
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const productDiscount = Math.round(subtotal * 0.1);
  const shipping = subtotal > 5000 ? 0 : 150;
  const total = subtotal - productDiscount + shipping;
  return {
    subtotal,
    productDiscount,
    couponDiscount: 0,
    couponCode: null,
    shipping,
    codFee: 0,
    total,
    saved: productDiscount,
  };
};

const addHours = (date, hours) => new Date(date.getTime() + hours * 3600 * 1000).toISOString();
const subHours = (date, hours) => new Date(date.getTime() - hours * 3600 * 1000).toISOString();
const subDays = (date, days) => new Date(date.getTime() - days * 24 * 3600 * 1000).toISOString();

const buildAddressFor = (customer) => ({
  fullName: customer.fullName,
  phone: customer.phone,
  addressLine: "42 Rashtrakavi Marg, Near Master Canteen",
  landmark: "Near City Centre",
  city: customer.city,
  state: "Odisha",
  pincode: "751001",
  type: "Home",
});

const carrierFor = (id) => {
  const carriers = ["Delhivery", "Blue Dart", "DTDC", "India Post", "Store Delivery", "Atelier Express"];
  return carriers[parseInt(id.replace(/\D/g, "").slice(-1) || "0", 10) % carriers.length];
};

const fulfillmentLocations = [
  { id: "loc-main-store", name: "Main Store", type: "STORE" },
  { id: "loc-main-warehouse", name: "Main Warehouse", type: "WAREHOUSE" },
];

const employees = [
  { id: "PF-WHS-00018", name: "Imran Qureshi" },
  { id: "PF-MGR-00008", name: "Vikram Iyer" },
  { id: "PF-INV-00031", name: "Arjun Desai" },
  { id: "PF-SLS-00124", name: "Ananya Sharma" },
];

const statusesToDemo = [
  { status: ORDER_STATUS.PENDING_PAYMENT, payment: ORDER_PAYMENT_STATUS.PENDING, label: "Pending Payment" },
  { status: ORDER_STATUS.PAYMENT_CONFIRMED, payment: ORDER_PAYMENT_STATUS.PAID, label: "Payment Confirmed" },
  { status: ORDER_STATUS.ORDER_CONFIRMED, payment: ORDER_PAYMENT_STATUS.PAID, label: "Confirmed" },
  { status: ORDER_STATUS.PROCESSING, payment: ORDER_PAYMENT_STATUS.PAID, label: "Processing" },
  { status: ORDER_STATUS.ALLOCATED, payment: ORDER_PAYMENT_STATUS.PAID, label: "Allocated" },
  { status: ORDER_STATUS.PICKING, payment: ORDER_PAYMENT_STATUS.PAID, label: "Picking" },
  { status: ORDER_STATUS.PACKED, payment: ORDER_PAYMENT_STATUS.PAID, label: "Packed" },
  { status: ORDER_STATUS.READY_TO_DISPATCH, payment: ORDER_PAYMENT_STATUS.PAID, label: "Ready to Dispatch" },
  { status: ORDER_STATUS.SHIPPED, payment: ORDER_PAYMENT_STATUS.PAID, label: "Shipped" },
  { status: ORDER_STATUS.OUT_FOR_DELIVERY, payment: ORDER_PAYMENT_STATUS.PAID, label: "Out for Delivery" },
  { status: ORDER_STATUS.DELIVERED, payment: ORDER_PAYMENT_STATUS.PAID, label: "Delivered" },
  { status: ORDER_STATUS.CANCELLED, payment: ORDER_PAYMENT_STATUS.REFUND_PENDING, label: "Cancelled" },
  { status: ORDER_STATUS.RETURN_REQUESTED, payment: ORDER_PAYMENT_STATUS.REFUND_PENDING, label: "Return Requested" },
  { status: ORDER_STATUS.RETURNED, payment: ORDER_PAYMENT_STATUS.REFUND_PENDING, label: "Returned" },
];

export const generateDemoOrders = () => {
  const products = resolveDemoProducts();
  if (!products.length) return [];

  return statusesToDemo.map((def, idx) => {
    const customer = customers[idx % customers.length];
    const orderId = `PF-ORD-2026-${String(100 + idx).padStart(5, "0")}`;
    const createdAt = subDays(now, statusesToDemo.length - idx);
    const items = buildItems(products, idx % 2 === 0 ? 3 : 2);
    const pricing = calculatePricing(items);
    if (idx === 2) {
      pricing.couponCode = "WELCOME10";
      pricing.offerId = "off-welcome10";
      pricing.couponDiscount = Math.round(pricing.subtotal * 0.1);
      pricing.total = Math.max(0, pricing.subtotal - pricing.couponDiscount + pricing.shipping);
      pricing.saved = pricing.productDiscount + pricing.couponDiscount;
    } else if (idx === 8) {
      pricing.couponCode = "FESTIVE15";
      pricing.offerId = "off-festive15";
      pricing.couponDiscount = Math.round(pricing.subtotal * 0.15);
      pricing.total = Math.max(0, pricing.subtotal - pricing.couponDiscount + pricing.shipping);
      pricing.saved = pricing.productDiscount + pricing.couponDiscount;
    } else if (idx === 10) {
      pricing.couponCode = "BRIDAL20";
      pricing.offerId = "off-bridal20";
      pricing.couponDiscount = Math.round(pricing.subtotal * 0.2);
      pricing.total = Math.max(0, pricing.subtotal - pricing.couponDiscount + pricing.shipping);
      pricing.saved = pricing.productDiscount + pricing.couponDiscount;
    }

    // Build status history deterministic
    const journey = [
      ORDER_STATUS.PENDING_PAYMENT,
      ORDER_STATUS.PAYMENT_CONFIRMED,
      ORDER_STATUS.ORDER_CONFIRMED,
      ORDER_STATUS.PROCESSING,
      ORDER_STATUS.ALLOCATED,
      ORDER_STATUS.PICKING,
      ORDER_STATUS.PACKED,
      ORDER_STATUS.READY_TO_DISPATCH,
      ORDER_STATUS.SHIPPED,
      ORDER_STATUS.OUT_FOR_DELIVERY,
      ORDER_STATUS.DELIVERED,
    ];
    const targetIndex = journey.indexOf(def.status);
    const history = [];
    if (targetIndex >= 0) {
      for (let i = 0; i <= targetIndex; i++) {
        history.push({
          status: journey[i],
          at: subHours(new Date(createdAt), (targetIndex - i) * 3),
        });
      }
    } else {
      // For terminal states, push full journey + terminal
      journey.forEach((s, i) => history.push({ status: s, at: subHours(new Date(createdAt), (journey.length - i) * 3) }));
      history.push({ status: def.status, at: new Date(createdAt).toISOString() });
    }
    // If cancelled, truncate
    if (def.status === ORDER_STATUS.CANCELLED) {
      history.splice(2);
      history.push({ status: ORDER_STATUS.CANCELLED, at: addHours(new Date(createdAt), 2) });
    }
    if (def.status === ORDER_STATUS.RETURN_REQUESTED) {
      history.push({ status: ORDER_STATUS.RETURN_REQUESTED, at: addHours(new Date(createdAt), 48) });
    }

    // Fulfillment
    const location = idx % 3 === 0 ? fulfillmentLocations[0] : fulfillmentLocations[1];
    const employee = employees[idx % employees.length];
    const fulfillmentStatus =
      def.status === ORDER_STATUS.CANCELLED ? FULFILLMENT_STATUS.CANCELLED :
      def.status === ORDER_STATUS.DELIVERED ? FULFILLMENT_STATUS.DELIVERED :
      def.status === ORDER_STATUS.SHIPPED ? FULFILLMENT_STATUS.SHIPPED :
      def.status === ORDER_STATUS.PACKED ? FULFILLMENT_STATUS.PACKED :
      def.status === ORDER_STATUS.PICKING ? FULFILLMENT_STATUS.PICKING :
      def.status === ORDER_STATUS.ALLOCATED ? FULFILLMENT_STATUS.ALLOCATED :
      FULFILLMENT_STATUS.PENDING;

    const fulfillment = {
      ...buildFulfillmentRecord({
        orderId,
        sourceLocationId: location.id,
        fulfillmentType: location.type,
        assignedEmployeeId: employee.id,
        assignedEmployeeName: employee.name,
        status: fulfillmentStatus,
        createdAt: createdAt,
      }),
      sourceLocationId: location.id,
      fulfillmentType: location.type,
      assignedEmployeeId: employee.id,
      assignedEmployeeName: employee.name,
      status: fulfillmentStatus,
      allocatedAt: def.status !== ORDER_STATUS.PENDING_PAYMENT ? addHours(new Date(createdAt), 1) : null,
      pickingStartedAt: [ORDER_STATUS.PICKING, ORDER_STATUS.PACKED, ORDER_STATUS.READY_TO_DISPATCH, ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED].includes(def.status) ? addHours(new Date(createdAt), 2) : null,
      packedAt: [ORDER_STATUS.PACKED, ORDER_STATUS.READY_TO_DISPATCH, ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED].includes(def.status) ? addHours(new Date(createdAt), 4) : null,
      readyToDispatchAt: [ORDER_STATUS.READY_TO_DISPATCH, ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED].includes(def.status) ? addHours(new Date(createdAt), 6) : null,
      dispatchedAt: [ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED].includes(def.status) ? addHours(new Date(createdAt), 8) : null,
      deliveredAt: def.status === ORDER_STATUS.DELIVERED ? addHours(new Date(createdAt), 30) : null,
      packedBy: [ORDER_STATUS.PACKED, ORDER_STATUS.READY_TO_DISPATCH, ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED].includes(def.status) ? employee.name : null,
      packageCount: 1,
      picking: def.status === ORDER_STATUS.PICKING || def.status === ORDER_STATUS.PACKED || def.status === ORDER_STATUS.READY_TO_DISPATCH || def.status === ORDER_STATUS.SHIPPED || def.status === ORDER_STATUS.OUT_FOR_DELIVERY || def.status === ORDER_STATUS.DELIVERED
        ? Object.fromEntries(items.map((it) => [it.lineId, { picked: true, at: addHours(new Date(createdAt), 3), by: employee.id }]))
        : def.status === ORDER_STATUS.ALLOCATED
          ? {}
          : {},
      history: history.map((h) => ({ status: h.status, at: h.at, by: h.status === ORDER_STATUS.PENDING_PAYMENT ? "System" : employee.name })),
    };

    // Shipment
    const shipment = [ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED].includes(def.status)
      ? {
          carrier: carrierFor(orderId),
          trackingNumber: buildTrackingId(orderId, createdAt),
          shippingMethod: location.type === "STORE" ? "Store Delivery" : "Standard Delivery",
          dispatchedAt: addHours(new Date(createdAt), 8),
          estimatedDelivery: "14–16 August 2026",
          dispatchedBy: employee.id,
        }
      : null;

    const timeline = history.map((h) =>
      buildTimelineEvent({
        type:
          h.status === ORDER_STATUS.PENDING_PAYMENT ? ORDER_ACTIVITY_TYPES.ORDER_CREATED :
          h.status === ORDER_STATUS.PAYMENT_CONFIRMED ? ORDER_ACTIVITY_TYPES.PAYMENT_CONFIRMED :
          h.status === ORDER_STATUS.ORDER_CONFIRMED ? ORDER_ACTIVITY_TYPES.ORDER_CONFIRMED :
          h.status === ORDER_STATUS.ALLOCATED ? ORDER_ACTIVITY_TYPES.ORDER_ALLOCATED :
          h.status === ORDER_STATUS.PICKING ? ORDER_ACTIVITY_TYPES.ORDER_PICK_STARTED :
          h.status === ORDER_STATUS.PACKED ? ORDER_ACTIVITY_TYPES.ORDER_PACKED :
          h.status === ORDER_STATUS.READY_TO_DISPATCH ? ORDER_ACTIVITY_TYPES.ORDER_READY_TO_DISPATCH :
          h.status === ORDER_STATUS.SHIPPED ? ORDER_ACTIVITY_TYPES.ORDER_DISPATCHED :
          h.status === ORDER_STATUS.OUT_FOR_DELIVERY ? ORDER_ACTIVITY_TYPES.ORDER_OUT_FOR_DELIVERY :
          h.status === ORDER_STATUS.DELIVERED ? ORDER_ACTIVITY_TYPES.ORDER_DELIVERED :
          h.status === ORDER_STATUS.CANCELLED ? ORDER_ACTIVITY_TYPES.ORDER_CANCELLED :
          "STATUS_CHANGED",
        status: h.status,
        at: h.at,
        actorName: h.status === ORDER_STATUS.PENDING_PAYMENT ? "System" : employee.name,
        note: "",
      })
    );

    return {
      id: orderId,
      customerId: `cust-${idx + 1}`,
      inventoryReservationId: `res-demo-${idx}`,
      customer: {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
      items,
      currency: "INR",
      pricing,
      address: buildAddressFor(customer),
      deliveryMethod: { id: "standard", label: "Standard Delivery", estimate: "14–16 August 2026" },
      estimatedDelivery: "14–16 August 2026",
      paymentMethod: { id: idx % 2 === 0 ? "upi" : "card", label: idx % 2 === 0 ? "UPI" : "Credit / Debit Card" },
      paymentStatus: def.payment,
      status: def.status,
      statusHistory: history,
      tracking: {
        trackingId: buildTrackingId(orderId, createdAt),
        carrier: carrierFor(orderId),
        origin: "Bhubaneswar, Odisha",
      },
      invoice: { number: buildInvoiceNumber(orderId), issuedAt: createdAt },
      returns: [],
      refund: def.status === ORDER_STATUS.CANCELLED || def.status.includes("RETURN") || def.status.includes("REFUND")
        ? { amount: pricing.total, method: "Original payment method", status: ORDER_PAYMENT_STATUS.REFUND_PENDING, initiatedAt: new Date().toISOString(), note: "Demo refund — no real money movement." }
        : null,
      cancellation: def.status === ORDER_STATUS.CANCELLED ? { at: addHours(new Date(createdAt), 2), reason: "customer_request", note: "Customer requested cancellation." } : null,
      fulfillment,
      shipment,
      timeline,
      notes: {
        customer: idx % 3 === 0 ? "Please call before delivery." : "",
        internal: idx % 2 === 0 ? [{ at: createdAt, by: employee.name, text: idx % 4 === 0 ? "Customer requested evening delivery." : "Verify blouse measurement before packing." }] : [],
      },
      createdAt: createdAt,
      updatedAt: new Date().toISOString(),
    };
  });
};

export default { generateDemoOrders };
