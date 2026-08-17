/**
 * PRATIKSHYA FASHON — Inventory & warehouse repository (Phase 14).
 *
 * This is the stock layer of the existing catalogue, never a product
 * catalogue of its own. Every row stores productId + optional variantId and
 * resolves names, SKUs, categories, media and prices from catalogRepository.
 *
 * Frontend demo limitation: writes are atomic only inside this browser tab.
 * The mutation surface is deliberately transaction-shaped so a backend
 * transaction/API can replace localStorage without changing consumers.
 */

import catalogRepository from "../catalogRepository";
import { resolveVariantPrice } from "../../utils/pricing";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../employees/activityService";

export const INVENTORY_STORAGE_KEYS = {
  INVENTORY: "pratikshya_inventory",
  MOVEMENTS: "pratikshya_inventory_movements",
  LOCATIONS: "pratikshya_inventory_locations",
  TRANSFERS: "pratikshya_inventory_transfers",
  RESERVATIONS: "pratikshya_inventory_reservations",
};

export const INVENTORY_CHANGED_EVENT = "pratikshya-inventory-changed";

export const LOCATION_TYPES = { STORE: "STORE", WAREHOUSE: "WAREHOUSE" };
export const LOCATION_STATUS = { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" };

export const STOCK_STATUS = {
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  OVERSTOCKED: "OVERSTOCKED",
  UNAVAILABLE: "UNAVAILABLE",
};

export const MOVEMENT_TYPES = {
  OPENING_BALANCE: "OPENING_BALANCE",
  RECEIVE: "RECEIVE",
  ADJUST: "ADJUST",
  TRANSFER_OUT: "TRANSFER_OUT",
  TRANSFER_IN: "TRANSFER_IN",
  RESERVE: "RESERVE",
  RELEASE: "RELEASE",
  SALE: "SALE",
  RETURN: "RETURN",
  DAMAGE: "DAMAGE",
  RESTOCK: "RESTOCK",
};

export const TRANSFER_STATES = {
  DRAFT: "DRAFT",
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  IN_TRANSIT: "IN_TRANSIT",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
};

const DEFAULT_THRESHOLD = 5;
const memory = new Map();

const readJson = (key, fallback) => {
  try {
    if (typeof window === "undefined") return memory.has(key) ? memory.get(key) : fallback;
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    if (typeof window === "undefined") memory.set(key, value);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Demo persistence is an enhancement; stock operations still return. */
  }
};

const announce = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
  }
};

const stamp = () => new Date().toISOString();
const whole = (value) => Math.max(0, Math.floor(Number(value) || 0));
const signedWhole = (value) => Math.trunc(Number(value) || 0);
const cloneQuantity = (quantity) => ({ ...quantity });

const actorDetails = (actor) => {
  const described = describeActor(actor);
  return {
    employeeId: actor?.employeeId || actor?.adminId || null,
    employeeName: described.actorName || "System",
  };
};

/** The only stock status calculator. Components never repeat these rules. */
export const calculateStockStatus = ({
  available = 0,
  lowStockThreshold = DEFAULT_THRESHOLD,
  maximumStock = null,
  active = true,
} = {}) => {
  if (!active) return STOCK_STATUS.UNAVAILABLE;
  if (Number(available) <= 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (Number(available) <= Math.max(0, Number(lowStockThreshold) || 0)) {
    return STOCK_STATUS.LOW_STOCK;
  }
  if (Number(maximumStock) > 0 && Number(available) > Number(maximumStock)) {
    return STOCK_STATUS.OVERSTOCKED;
  }
  return STOCK_STATUS.IN_STOCK;
};

/** Available = on hand − reserved − damaged. Returned stock is quarantined
 * outside on-hand until inspection, so it cannot become sellable by accident. */
export const normaliseQuantity = (raw = {}) => {
  const onHand = whole(raw.onHand);
  const reserved = Math.min(whole(raw.reserved), onHand);
  const damaged = Math.min(whole(raw.damaged), Math.max(0, onHand - reserved));
  return {
    onHand,
    available: Math.max(0, onHand - reserved - damaged),
    reserved,
    sold: whole(raw.sold),
    returned: whole(raw.returned),
    damaged,
  };
};

const normaliseRecord = (raw) => {
  if (!raw || typeof raw !== "object" || !raw.id || !raw.productId || !raw.locationId) {
    return null;
  }
  const quantity = normaliseQuantity(raw.quantity);
  const lowStockThreshold = whole(raw.lowStockThreshold ?? DEFAULT_THRESHOLD);
  const active = raw.active !== false;
  return {
    id: String(raw.id),
    productId: String(raw.productId),
    variantId: raw.variantId ? String(raw.variantId) : null,
    locationId: String(raw.locationId),
    placement: {
      department: raw.placement?.department || "",
      section: raw.placement?.section || "",
      zone: raw.placement?.zone || "",
      rack: raw.placement?.rack || "",
      shelf: raw.placement?.shelf || "",
      bin: raw.placement?.bin || "",
    },
    quantity,
    lowStockThreshold,
    maximumStock: Number(raw.maximumStock) > 0 ? whole(raw.maximumStock) : null,
    active,
    status: calculateStockStatus({
      available: quantity.available,
      lowStockThreshold,
      maximumStock: raw.maximumStock,
      active,
    }),
    review: raw.review && typeof raw.review === "object" ? raw.review : null,
    createdAt: raw.createdAt || stamp(),
    updatedAt: raw.updatedAt || raw.createdAt || stamp(),
    lastMovementAt: raw.lastMovementAt || null,
  };
};

const recordId = (productId, variantId, locationId) =>
  `inv::${productId}::${variantId || "base"}::${locationId}`;

const SEED_LOCATIONS = [
  {
    id: "loc-main-store",
    name: "Main Store",
    type: LOCATION_TYPES.STORE,
    address: "Central shopping mall · Main retail floor",
    area: "Customer-facing departments",
    status: LOCATION_STATUS.ACTIVE,
  },
  {
    id: "loc-main-warehouse",
    name: "Main Warehouse",
    type: LOCATION_TYPES.WAREHOUSE,
    address: "Service wing · Receiving entrance",
    area: "Bulk storage & dispatch",
    status: LOCATION_STATUS.ACTIVE,
  },
];

const findProductLike = (products, text) =>
  products.find((product) => product.name.toLowerCase().includes(text.toLowerCase())) ?? null;

const seedRecord = (product, locationId, onHand, options = {}) => {
  if (!product) return null;
  const at = options.createdAt || "2026-08-01T09:00:00.000Z";
  return normaliseRecord({
    id: recordId(product.id, options.variantId || null, locationId),
    productId: product.id,
    variantId: options.variantId || null,
    locationId,
    placement: options.placement,
    quantity: {
      onHand,
      reserved: options.reserved || 0,
      sold: options.sold || 0,
      returned: options.returned || 0,
      damaged: options.damaged || 0,
    },
    lowStockThreshold: options.threshold ?? product.lowStockThreshold ?? DEFAULT_THRESHOLD,
    maximumStock: options.maximumStock ?? null,
    createdAt: at,
    updatedAt: options.updatedAt || at,
    lastMovementAt: options.lastMovementAt || at,
  });
};

/** Inventory starts empty until operator-created product records are stocked. */
const buildSeedRecords = () => [];

const buildSeedMovements = (records) => {
  const movements = [];
  const add = (record, index, sequence, type, quantity, before, after, timestamp, reference, reason) => {
    movements.push({
      id: `mov-seed-${String(index + 1).padStart(2, "0")}-${sequence}`,
      productId: record.productId,
      variantId: record.variantId,
      locationId: record.locationId,
      type,
      quantity,
      before: cloneQuantity(before),
      after: cloneQuantity(after),
      employeeId: "PF-INV-00031",
      employeeName: "Riya Banerjee · PF-INV-00031",
      timestamp,
      reference,
      reason,
      notes: "Deterministic Phase 14 demo movement.",
    });
  };

  records.forEach((record, index) => {
    const target = record.quantity;
    let current = normaliseQuantity({ onHand: target.onHand + target.sold });
    add(
      record,
      index,
      "opening",
      MOVEMENT_TYPES.OPENING_BALANCE,
      current.onHand,
      normaliseQuantity({}),
      current,
      `2026-08-01T09:${String(index).padStart(2, "0")}:00.000Z`,
      "OPENING-2026-08",
      "Opening Balance"
    );

    if (target.sold > 0) {
      const before = current;
      current = normaliseQuantity({
        ...current,
        onHand: current.onHand - target.sold,
        sold: target.sold,
      });
      add(record, index, "sale", MOVEMENT_TYPES.SALE, -target.sold, before, current,
        `2026-08-06T11:${String(index).padStart(2, "0")}:00.000Z`, "PF-DEMO-SALES", "Recorded demo sales");
    }
    if (target.reserved > 0) {
      const before = current;
      current = normaliseQuantity({ ...current, reserved: target.reserved });
      add(record, index, "reserve", MOVEMENT_TYPES.RESERVE, -target.reserved, before, current,
        `2026-08-10T14:${String(index).padStart(2, "0")}:00.000Z`, "CHECKOUT-DEMO", "Checkout stock reservation");
    }
    if (target.damaged > 0) {
      const before = current;
      current = normaliseQuantity({ ...current, damaged: target.damaged });
      add(record, index, "damage", MOVEMENT_TYPES.DAMAGE, -target.damaged, before, current,
        `2026-08-11T10:${String(index).padStart(2, "0")}:00.000Z`, "DMG-DEMO", "Handling damage");
    }
    if (target.returned > 0) {
      const before = current;
      current = normaliseQuantity({ ...current, returned: target.returned });
      add(record, index, "return", MOVEMENT_TYPES.RETURN, target.returned, before, current,
        `2026-08-11T12:${String(index).padStart(2, "0")}:00.000Z`, "RET-DEMO", "Customer return received");
    }
  });

  return movements.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const loadLocations = () => {
  const stored = readJson(INVENTORY_STORAGE_KEYS.LOCATIONS, null);
  if (Array.isArray(stored) && stored.length) {
    const safe = stored.filter((location) => location?.id && location?.name && Object.values(LOCATION_TYPES).includes(location.type));
    if (safe.length) return safe;
  }
  writeJson(INVENTORY_STORAGE_KEYS.LOCATIONS, SEED_LOCATIONS);
  return SEED_LOCATIONS;
};

export const loadInventory = () => {
  const stored = readJson(INVENTORY_STORAGE_KEYS.INVENTORY, null);
  if (Array.isArray(stored) && stored.length) {
    const locationIds = new Set(loadLocations().map((location) => location.id));
    const safe = stored.map(normaliseRecord).filter((record) => {
      if (!record || !locationIds.has(record.locationId)) return false;
      return Boolean(catalogRepository.find(record.productId));
    });
    if (safe.length) return safe;
  }
  const seeded = buildSeedRecords();
  writeJson(INVENTORY_STORAGE_KEYS.INVENTORY, seeded);
  return seeded;
};

export const loadMovements = () => {
  const stored = readJson(INVENTORY_STORAGE_KEYS.MOVEMENTS, null);
  if (Array.isArray(stored) && stored.length) {
    const locationIds = new Set(loadLocations().map((location) => location.id));
    const movementTypes = new Set(Object.values(MOVEMENT_TYPES));
    const safe = stored.filter((movement) =>
      movement?.id &&
      movement?.productId &&
      movementTypes.has(movement.type) &&
      movement?.timestamp &&
      locationIds.has(movement.locationId)
    );
    if (safe.length) return safe;
  }
  const seeded = buildSeedMovements(loadInventory());
  writeJson(INVENTORY_STORAGE_KEYS.MOVEMENTS, seeded);
  return seeded;
};

export const loadTransfers = () => {
  const stored = readJson(INVENTORY_STORAGE_KEYS.TRANSFERS, null);
  if (Array.isArray(stored)) {
    const locationIds = new Set(loadLocations().map((location) => location.id));
    const safe = stored.filter((transfer) =>
      transfer?.id &&
      transfer?.productId &&
      TRANSFER_STATES[transfer.status] &&
      whole(transfer.quantity) > 0 &&
      locationIds.has(transfer.sourceLocationId) &&
      locationIds.has(transfer.destinationLocationId) &&
      transfer.sourceLocationId !== transfer.destinationLocationId
    );
    if (safe.length || stored.length === 0) return safe;
  }
  const records = loadInventory();
  const sample = records.find((record) => record.locationId === "loc-main-warehouse" && record.quantity.available >= 4);
  const seeded = sample
    ? [{
        id: "TR-2026-001",
        sourceLocationId: "loc-main-warehouse",
        destinationLocationId: "loc-main-store",
        productId: sample.productId,
        variantId: sample.variantId,
        quantity: 4,
        reason: "Store replenishment",
        notes: "Demo transfer awaiting manager approval.",
        status: TRANSFER_STATES.REQUESTED,
        requestedBy: "Riya Banerjee · PF-INV-00031",
        requestedById: "PF-INV-00031",
        createdAt: "2026-08-11T09:30:00.000Z",
        updatedAt: "2026-08-11T09:30:00.000Z",
        history: [{ status: TRANSFER_STATES.REQUESTED, at: "2026-08-11T09:30:00.000Z", by: "Riya Banerjee · PF-INV-00031" }],
      }]
    : [];
  writeJson(INVENTORY_STORAGE_KEYS.TRANSFERS, seeded);
  return seeded;
};

const loadReservations = () => {
  const stored = readJson(INVENTORY_STORAGE_KEYS.RESERVATIONS, null);
  if (!Array.isArray(stored)) return [];
  const statuses = new Set(["ACTIVE", "SOLD", "RELEASED", "RESTOCKED"]);
  const safe = stored.filter((reservation) =>
    reservation?.id &&
    statuses.has(reservation.status) &&
    Array.isArray(reservation.allocations) &&
    reservation.allocations.every((allocation) => allocation?.inventoryId && whole(allocation.quantity) > 0)
  );
  const now = Date.now();
  const expired = safe.filter((reservation) =>
    reservation.status === "ACTIVE" &&
    Number.isFinite(new Date(reservation.expiresAt).getTime()) &&
    new Date(reservation.expiresAt).getTime() <= now
  );
  if (!expired.length) return safe;

  /* Browser sessions can close while the sandbox payment is pending. Lazy
     expiry prevents those abandoned holds from reserving stock forever. */
  const records = [...loadInventory()];
  const existingMovements = loadMovements();
  const movements = [];
  const at = stamp();
  const expiredIds = new Set(expired.map((reservation) => reservation.id));
  expired.forEach((reservation) => {
    reservation.allocations.forEach((allocation) => {
      const index = records.findIndex((record) => record.id === allocation.inventoryId);
      if (index < 0) return;
      const record = records[index];
      const amount = Math.min(record.quantity.reserved, whole(allocation.quantity));
      if (amount <= 0) return;
      const before = record.quantity;
      const after = normaliseQuantity({ ...before, reserved: before.reserved - amount });
      const next = normaliseRecord({ ...record, quantity: after, updatedAt: at, lastMovementAt: at });
      records[index] = next;
      movements.push(makeMovement({
        record: next,
        type: MOVEMENT_TYPES.RELEASE,
        quantity: amount,
        before,
        after,
        actor: null,
        reference: reservation.reference || reservation.id,
        reason: "Checkout reservation expired",
        notes: "Automatically released after the browser-demo hold window.",
        timestamp: at,
      }));
    });
  });
  const released = safe.map((reservation) => expiredIds.has(reservation.id)
    ? { ...reservation, status: "RELEASED", settledAt: at, settlementReference: "EXPIRED" }
    : reservation
  );
  writeJson(INVENTORY_STORAGE_KEYS.INVENTORY, records.map(normaliseRecord).filter(Boolean));
  if (movements.length) {
    writeJson(INVENTORY_STORAGE_KEYS.MOVEMENTS, [...movements, ...existingMovements].slice(0, 1000));
  }
  writeJson(INVENTORY_STORAGE_KEYS.RESERVATIONS, released.slice(0, 300));
  announce();
  return released;
};

export const releaseExpiredReservations = () => loadReservations();

const saveInventory = (records, { quiet = false } = {}) => {
  const safe = records.map(normaliseRecord).filter(Boolean);
  writeJson(INVENTORY_STORAGE_KEYS.INVENTORY, safe);
  if (!quiet) announce();
  return safe;
};

const saveMovements = (movements, { quiet = false } = {}) => {
  writeJson(INVENTORY_STORAGE_KEYS.MOVEMENTS, movements.slice(0, 1000));
  if (!quiet) announce();
};

const saveTransfers = (transfers, { quiet = false } = {}) => {
  writeJson(INVENTORY_STORAGE_KEYS.TRANSFERS, transfers.slice(0, 300));
  if (!quiet) announce();
};

const saveReservations = (reservations, { quiet = false } = {}) => {
  writeJson(INVENTORY_STORAGE_KEYS.RESERVATIONS, reservations.slice(0, 300));
  if (!quiet) announce();
};

const activityNote = (actor, summary, productId = null) => {
  try {
    recordActivity(loadActivity(), {
      ...describeActor(actor),
      targetProductId: productId,
      action: ACTIVITY_ACTIONS.INVENTORY_MOVEMENT || "INVENTORY_MOVEMENT",
      summary,
    });
  } catch {
    /* The movement ledger remains the inventory audit source. */
  }
};

const makeMovement = ({ record, type, quantity, before, after, actor, reference, reason, notes, timestamp = stamp() }) => {
  const id = `mov-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
  return {
    id,
    productId: record.productId,
    variantId: record.variantId,
    locationId: record.locationId,
    type,
    quantity: signedWhole(quantity),
    before: cloneQuantity(before),
    after: cloneQuantity(after),
    ...actorDetails(actor),
    timestamp,
    reference: String(reference || id).trim(),
    reason: String(reason || `Inventory ${String(type).replaceAll("_", " ").toLowerCase()}`).trim(),
    notes: String(notes || "").trim(),
  };
};

const productAndVariant = (productId, variantId = null) => {
  const product = catalogRepository.find(productId);
  if (!product) return { product: null, variant: null };
  const variant = variantId
    ? product.variants.find((entry) => String(entry.id) === String(variantId)) ?? null
    : null;
  return { product, variant };
};

const validateIdentity = (productId, variantId = null, { allowProductLevel = false } = {}) => {
  const { product, variant } = productAndVariant(productId, variantId);
  if (!product) return { ok: false, error: "Select a product from the catalogue." };
  if (!variantId && !allowProductLevel && product.variants.some((entry) => entry.status !== "INACTIVE")) {
    return { ok: false, error: "Select an active variant for this product." };
  }
  if (variantId && !variant) return { ok: false, error: "That product variant no longer exists." };
  if (variant?.status === "INACTIVE") return { ok: false, error: "Inactive variants cannot carry a new stock movement." };
  return { ok: true, product, variant };
};

const createEmptyRecord = ({ product, variantId = null, locationId, placement = null }) =>
  normaliseRecord({
    id: recordId(product.id, variantId, locationId),
    productId: product.id,
    variantId,
    locationId,
    placement: placement || {},
    quantity: {},
    lowStockThreshold: product.lowStockThreshold ?? DEFAULT_THRESHOLD,
    createdAt: stamp(),
    updatedAt: stamp(),
  });

const findOrCreate = (records, { product, variantId, locationId, placement }) => {
  const id = recordId(product.id, variantId, locationId);
  let index = records.findIndex((record) => record.id === id);
  if (index >= 0) return { index, record: records[index] };
  const record = createEmptyRecord({ product, variantId, locationId, placement });
  records.push(record);
  index = records.length - 1;
  return { index, record };
};

const locationActive = (locationId) =>
  loadLocations().some((location) => location.id === locationId && location.status === LOCATION_STATUS.ACTIVE);

const mutateOne = ({
  productId,
  variantId = null,
  locationId,
  placement = null,
  type,
  quantity,
  actor,
  reference,
  reason,
  notes,
  apply,
  allowProductLevel = false,
}) => {
  if (!locationActive(locationId)) return { ok: false, error: "Select an active stock location." };

  const records = [...loadInventory()];
  const hasExistingBase = records.some((record) =>
    record.productId === String(productId) && !record.variantId
  );
  const identity = validateIdentity(productId, variantId, {
    allowProductLevel: allowProductLevel || hasExistingBase,
  });
  if (!identity.ok) return identity;
  /* Initialise/read the ledger before changing records so a fresh browser's
     deterministic opening history cannot accidentally include this write. */
  const existingMovements = loadMovements();
  const found = findOrCreate(records, { product: identity.product, variantId, locationId, placement });
  const before = cloneQuantity(found.record.quantity);
  const rawNext = apply(cloneQuantity(before));
  const after = normaliseQuantity(rawNext);

  /* Normalisation must never hide an invalid subtraction. */
  if (Number(rawNext.onHand) < 0 || Number(rawNext.reserved) < 0 || Number(rawNext.damaged) < 0 || Number(rawNext.returned) < 0) {
    return { ok: false, error: "This movement would make stock negative." };
  }
  if (after.available < 0) return { ok: false, error: "Available stock cannot be negative." };

  const at = stamp();
  const placementPatch = placement
    ? Object.fromEntries(Object.entries(placement).filter(([, value]) => String(value || "").trim()))
    : null;
  const nextRecord = normaliseRecord({
    ...found.record,
    placement: placementPatch ? { ...found.record.placement, ...placementPatch } : found.record.placement,
    quantity: after,
    updatedAt: at,
    lastMovementAt: at,
  });
  records[found.index] = nextRecord;
  const movement = makeMovement({
    record: nextRecord,
    type,
    quantity,
    before,
    after,
    actor,
    reference,
    reason,
    notes,
    timestamp: at,
  });

  saveInventory(records, { quiet: true });
  saveMovements([movement, ...existingMovements], { quiet: true });
  activityNote(actor, `${type.replaceAll("_", " ")} · ${identity.product.name} · ${quantity > 0 ? "+" : ""}${quantity}`, productId);
  announce();
  return { ok: true, record: nextRecord, movement };
};

export const receiveStock = ({ productId, variantId = null, locationId, quantity, supplier = "", reference = "", notes = "", placement = null, actor = null }) => {
  const amount = whole(quantity);
  if (amount <= 0) return { ok: false, error: "Receiving quantity must be greater than zero." };
  return mutateOne({
    productId, variantId, locationId, placement,
    type: MOVEMENT_TYPES.RECEIVE,
    quantity: amount,
    actor,
    reference,
    reason: supplier ? `Received from ${supplier}` : "Stock received",
    notes,
    apply: (current) => ({ ...current, onHand: current.onHand + amount }),
  });
};

export const adjustStock = ({ productId, variantId = null, locationId, adjustment, reason, notes = "", reference = "", actor = null }) => {
  const amount = signedWhole(adjustment);
  if (amount === 0) return { ok: false, error: "Adjustment cannot be zero." };
  return mutateOne({
    productId, variantId, locationId,
    type: MOVEMENT_TYPES.ADJUST,
    quantity: amount,
    actor, reference, reason: reason || "System Correction", notes,
    apply: (current) => {
      const nextOnHand = current.onHand + amount;
      if (nextOnHand < current.reserved + current.damaged) return { ...current, onHand: -1 };
      return { ...current, onHand: nextOnHand };
    },
  });
};

export const markDamaged = ({ productId, variantId = null, locationId, quantity, reason, notes = "", reference = "", actor = null }) => {
  const amount = whole(quantity);
  if (amount <= 0) return { ok: false, error: "Damaged quantity must be greater than zero." };
  return mutateOne({
    productId, variantId, locationId,
    type: MOVEMENT_TYPES.DAMAGE,
    quantity: -amount,
    actor, reference, reason: reason || "Stock marked damaged", notes,
    apply: (current) => {
      if (current.available < amount) return { ...current, damaged: -1 };
      return { ...current, damaged: current.damaged + amount };
    },
  });
};

/** A received customer return enters quarantine; on-hand/available do not change. */
export const returnStock = ({ productId, variantId = null, locationId = "loc-main-warehouse", quantity, reason, notes = "", reference = "", actor = null }) => {
  const amount = whole(quantity);
  if (amount <= 0) return { ok: false, error: "Returned quantity must be greater than zero." };
  return mutateOne({
    productId, variantId, locationId,
    allowProductLevel: true,
    type: MOVEMENT_TYPES.RETURN,
    quantity: amount,
    actor, reference, reason: reason || "Customer return awaiting inspection", notes,
    apply: (current) => ({ ...current, returned: current.returned + amount }),
  });
};

/** Inspection moves quarantine to sellable on-hand or damaged on-hand. */
export const inspectReturnedStock = ({ productId, variantId = null, locationId, quantity, condition = "SELLABLE", reason, notes = "", reference = "", actor = null }) => {
  const amount = whole(quantity);
  if (amount <= 0) return { ok: false, error: "Inspection quantity must be greater than zero." };
  const damaged = condition === "DAMAGED";
  return mutateOne({
    productId, variantId, locationId,
    type: damaged ? MOVEMENT_TYPES.DAMAGE : MOVEMENT_TYPES.RESTOCK,
    quantity: damaged ? -amount : amount,
    actor, reference,
    reason: reason || (damaged ? "Return inspected as damaged" : "Return inspected as sellable"),
    notes,
    apply: (current) => {
      if (current.returned < amount) return { ...current, returned: -1 };
      return {
        ...current,
        returned: current.returned - amount,
        onHand: current.onHand + amount,
        damaged: current.damaged + (damaged ? amount : 0),
      };
    },
  });
};

export const updateThreshold = ({ inventoryId, threshold, actor = null }) => {
  const amount = whole(threshold);
  const records = [...loadInventory()];
  const existingMovements = loadMovements();
  const index = records.findIndex((record) => record.id === inventoryId);
  if (index < 0) return { ok: false, error: "Inventory record not found." };
  const before = records[index];
  const at = stamp();
  const next = normaliseRecord({ ...before, lowStockThreshold: amount, updatedAt: at });
  records[index] = next;
  const movement = makeMovement({
    record: next,
    type: MOVEMENT_TYPES.ADJUST,
    quantity: 0,
    before: before.quantity,
    after: next.quantity,
    actor,
    reference: "THRESHOLD",
    reason: `Low stock threshold ${before.lowStockThreshold} → ${amount}`,
    notes: "Inventory setting update; quantities unchanged.",
    timestamp: at,
  });
  saveInventory(records, { quiet: true });
  saveMovements([movement, ...existingMovements], { quiet: true });
  activityNote(actor, `Inventory threshold updated · ${before.productId} · ${amount}`, before.productId);
  announce();
  return { ok: true, record: next, movement };
};

export const addLocation = ({ name, type, address = "", area = "", actor = null }) => {
  const label = String(name || "").trim();
  if (!label) return { ok: false, error: "Location name is required." };
  if (!Object.values(LOCATION_TYPES).includes(type)) return { ok: false, error: "Choose store or warehouse." };
  const locations = loadLocations();
  if (locations.some((location) => location.name.toLowerCase() === label.toLowerCase())) {
    return { ok: false, error: "A location with that name already exists." };
  }
  const location = {
    id: `loc-${Date.now().toString(36)}`,
    name: label,
    type,
    address: String(address).trim(),
    area: String(area).trim(),
    status: LOCATION_STATUS.ACTIVE,
    createdAt: stamp(),
  };
  writeJson(INVENTORY_STORAGE_KEYS.LOCATIONS, [...locations, location]);
  activityNote(actor, `Inventory location added · ${location.name}`);
  announce();
  return { ok: true, location };
};

const variantForSelection = (product, selection = {}) => {
  if (!product?.variants?.length) return null;
  return product.variants.find((variant) =>
    variant.status !== "INACTIVE" &&
    (!selection.color || variant.color === selection.color) &&
    (!selection.size || variant.size === selection.size)
  ) ?? null;
};

const stockRowsForSelection = (product, selection = {}) => {
  const activeVariants = (product.variants || []).filter((variant) => variant.status !== "INACTIVE");
  const activeVariantIds = new Set(activeVariants.map((variant) => variant.id));
  const all = loadInventory().filter((record) =>
    record.productId === String(product.id) &&
    record.active &&
    (!record.variantId || activeVariantIds.has(record.variantId))
  );
  const matchingVariants = selection.variantId
    ? activeVariants.filter((variant) => variant.id === selection.variantId)
    : selection.color || selection.size
      ? activeVariants.filter((variant) =>
          (!selection.color || variant.color === selection.color) &&
          (!selection.size || variant.size === selection.size)
        )
      : [];
  if (activeVariants.length && (selection.variantId || selection.color || selection.size) && matchingVariants.length === 0) {
    return { rows: [], variant: null };
  }
  if (matchingVariants.length) {
    const ids = new Set(matchingVariants.map((variant) => variant.id));
    const variantRows = all.filter((record) => ids.has(record.variantId));
    if (variantRows.length) {
      return { rows: variantRows, variant: matchingVariants.length === 1 ? matchingVariants[0] : null };
    }
  }
  if (!selection.variantId && !selection.color && !selection.size) {
    return { rows: all, variant: null };
  }
  const baseRows = all.filter((record) => !record.variantId);
  return {
    rows: baseRows.length ? baseRows : all,
    variant: matchingVariants.length === 1 ? matchingVariants[0] : null,
  };
};

/** Customer-safe availability: no location, reserved or warehouse details. */
export const getCustomerAvailability = (productOrId, selection = {}) => {
  const product = typeof productOrId === "object" ? productOrId : catalogRepository.find(productOrId);
  if (!product) return { tracked: true, available: 0, status: STOCK_STATUS.UNAVAILABLE, variantId: null };
  const { rows, variant } = stockRowsForSelection(product, selection);
  const tracked = rows.length > 0 || Boolean(product.inventoryTracked);
  if (!tracked) {
    const archived = product.status === "ARCHIVED";
    const available = archived || product.availability === "unavailable" ? 0 : whole(product.stock);
    return {
      tracked: false,
      available,
      status: archived
        ? STOCK_STATUS.UNAVAILABLE
        : product.availability === "unavailable" || available <= 0
          ? STOCK_STATUS.OUT_OF_STOCK
          : product.availability === "low-stock"
            ? STOCK_STATUS.LOW_STOCK
            : STOCK_STATUS.IN_STOCK,
      variantId: variant?.id ?? null,
    };
  }
  const available = rows.reduce((sum, record) => sum + record.quantity.available, 0);
  const threshold = whole(product.lowStockThreshold ?? DEFAULT_THRESHOLD);
  return {
    tracked: true,
    available,
    status: calculateStockStatus({ available, lowStockThreshold: threshold, active: product.status !== "ARCHIVED" }),
    variantId: variant?.id ?? null,
  };
};

export const validateCartItems = (items = []) => {
  for (const item of items) {
    const availability = getCustomerAvailability(item.product || item.productId, item);
    if (availability.status === STOCK_STATUS.UNAVAILABLE) {
      return {
        ok: false,
        productId: item.productId,
        available: 0,
        message: `${item.product?.name || "A piece"} is currently unavailable.`,
      };
    }
    if (availability.tracked && item.quantity > availability.available) {
      return {
        ok: false,
        productId: item.productId,
        available: availability.available,
        message: availability.available <= 0
          ? `${item.product?.name || "A piece"} is currently unavailable.`
          : `${item.product?.name || "A piece"} no longer has enough stock for that quantity. Please adjust your bag.`,
      };
    }
  }
  return { ok: true };
};

/** Checkout reservation transaction. Untracked pieces preserve legacy behaviour. */
export const reserveCart = (items = [], { reference = "", actor = null, expiresInMinutes = 15 } = {}) => {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: "Your bag is empty." };
  const reservations = loadReservations();
  const records = [...loadInventory()];
  const existingMovements = loadMovements();
  const locationMap = new Map(loadLocations().map((location) => [location.id, location]));
  const working = new Map(records.map((record) => [record.id, cloneQuantity(record.quantity)]));
  const allocations = [];

  for (const item of items) {
    const product = item.product || catalogRepository.find(item.productId);
    if (!product || product.status === "ARCHIVED" || product.availability === "unavailable") {
      return { ok: false, error: "A product in your bag is no longer available." };
    }
    const selection = stockRowsForSelection(product, item);
    const tracked = selection.rows.length > 0 || Boolean(product.inventoryTracked);
    if (!tracked) continue;
    let remaining = whole(item.quantity);
    const candidates = [...selection.rows].sort((a, b) => {
      const aStore = locationMap.get(a.locationId)?.type === LOCATION_TYPES.STORE ? 0 : 1;
      const bStore = locationMap.get(b.locationId)?.type === LOCATION_TYPES.STORE ? 0 : 1;
      return aStore - bStore || a.id.localeCompare(b.id);
    });
    for (const record of candidates) {
      if (remaining <= 0) break;
      const current = normaliseQuantity(working.get(record.id));
      const take = Math.min(current.available, remaining);
      if (take <= 0) continue;
      working.set(record.id, normaliseQuantity({ ...current, reserved: current.reserved + take }));
      allocations.push({
        inventoryId: record.id,
        productId: product.id,
        variantId: record.variantId,
        locationId: record.locationId,
        lineId: item.id || item.lineId || null,
        quantity: take,
      });
      remaining -= take;
    }
    if (remaining > 0) {
      return {
        ok: false,
        error: `${product.name} no longer has enough stock. Please adjust your bag.`,
        productId: product.id,
      };
    }
  }

  if (allocations.length === 0) {
    return { ok: true, reservationId: null, untrackedOnly: true };
  }

  const at = stamp();
  const movements = [];
  allocations.forEach((allocation) => {
    const index = records.findIndex((record) => record.id === allocation.inventoryId);
    const before = records[index].quantity;
    const after = normaliseQuantity({
      ...before,
      reserved: before.reserved + allocation.quantity,
    });
    const next = normaliseRecord({ ...records[index], quantity: after, updatedAt: at, lastMovementAt: at });
    records[index] = next;
    movements.push(makeMovement({
      record: next,
      type: MOVEMENT_TYPES.RESERVE,
      quantity: -allocation.quantity,
      before,
      after,
      actor,
      reference,
      reason: "Checkout stock reservation",
      notes: "Temporary browser-demo reservation.",
      timestamp: at,
    }));
  });

  const reservationId = `res-${Date.now().toString(36)}-${Math.floor(Math.random() * 999).toString(36)}`;
  const reservation = {
    id: reservationId,
    reference: reference || reservationId,
    status: "ACTIVE",
    allocations,
    createdAt: at,
    expiresAt: new Date(Date.now() + Math.max(1, expiresInMinutes) * 60000).toISOString(),
    ...actorDetails(actor),
  };
  saveInventory(records, { quiet: true });
  saveMovements([...movements, ...existingMovements], { quiet: true });
  saveReservations([reservation, ...reservations], { quiet: true });
  announce();
  return { ok: true, reservationId, reservation };
};

const settleReservation = (reservationId, action, { actor = null, reference = "" } = {}) => {
  if (!reservationId) return { ok: true, skipped: true };
  const reservations = loadReservations();
  const reservationIndex = reservations.findIndex((entry) => entry.id === reservationId);
  if (reservationIndex < 0) return { ok: false, error: "Reservation not found." };
  const reservation = reservations[reservationIndex];
  if (reservation.status !== "ACTIVE") return { ok: true, reservation, alreadySettled: true };

  const records = [...loadInventory()];
  const existingMovements = loadMovements();
  const at = stamp();
  const movements = [];
  for (const allocation of reservation.allocations) {
    const index = records.findIndex((record) => record.id === allocation.inventoryId);
    if (index < 0) return { ok: false, error: "Reserved inventory no longer exists." };
    const record = records[index];
    const before = record.quantity;
    if (before.reserved < allocation.quantity) return { ok: false, error: "Reserved quantity is no longer available." };
    const after = normaliseQuantity(action === "SALE"
      ? {
          ...before,
          reserved: before.reserved - allocation.quantity,
          onHand: before.onHand - allocation.quantity,
          sold: before.sold + allocation.quantity,
        }
      : { ...before, reserved: before.reserved - allocation.quantity });
    const next = normaliseRecord({ ...record, quantity: after, updatedAt: at, lastMovementAt: at });
    records[index] = next;
    movements.push(makeMovement({
      record: next,
      type: action === "SALE" ? MOVEMENT_TYPES.SALE : MOVEMENT_TYPES.RELEASE,
      quantity: action === "SALE" ? -allocation.quantity : allocation.quantity,
      before,
      after,
      actor,
      reference: reference || reservation.reference,
      reason: action === "SALE" ? "Payment confirmed" : "Checkout reservation released",
      notes: "Resolved through the existing checkout payment result.",
      timestamp: at,
    }));
  }
  const nextReservation = { ...reservation, status: action === "SALE" ? "SOLD" : "RELEASED", settledAt: at, settlementReference: reference || reservation.reference };
  reservations[reservationIndex] = nextReservation;
  saveInventory(records, { quiet: true });
  saveMovements([...movements, ...existingMovements], { quiet: true });
  saveReservations(reservations, { quiet: true });
  announce();
  return { ok: true, reservation: nextReservation };
};

export const confirmReservationSale = (reservationId, options = {}) =>
  settleReservation(reservationId, "SALE", options);
export const releaseReservation = (reservationId, options = {}) =>
  settleReservation(reservationId, "RELEASE", options);

/**
 * Restores stock sold by a checkout reservation when its resulting order is
 * subsequently cancelled. The reservation is the allocation authority, so
 * no order line is re-resolved against today's catalogue or location setup.
 * Repeated calls are harmless and every restored allocation is ledgered.
 */
export const restockCancelledOrder = (order, actor = null) => {
  const reservationId = order?.inventoryReservationId;
  if (!reservationId) return { ok: true, skipped: true };

  const reservations = loadReservations();
  const reservationIndex = reservations.findIndex((entry) => entry.id === reservationId);
  if (reservationIndex < 0) {
    return { ok: false, error: "The order's inventory reservation could not be found." };
  }

  const reservation = reservations[reservationIndex];
  if (reservation.status === "RESTOCKED") {
    return { ok: true, reservation, alreadySettled: true };
  }
  if (reservation.status !== "SOLD") {
    return { ok: false, error: "Only sold order inventory can be restocked." };
  }

  const records = [...loadInventory()];
  const existingMovements = loadMovements();
  const allocations = Array.isArray(reservation.allocations) ? reservation.allocations : [];
  const prepared = [];
  for (const allocation of allocations) {
    const amount = whole(allocation.quantity);
    const index = records.findIndex((record) => record.id === allocation.inventoryId);
    if (amount <= 0 || index < 0) {
      return { ok: false, error: "The sold inventory allocation is no longer valid." };
    }
    const record = records[index];
    if (record.quantity.sold < amount) {
      return { ok: false, error: "Sold quantity is no longer sufficient to restock this order." };
    }
    prepared.push({ allocation, amount, index, record });
  }

  const at = stamp();
  const reference = String(order.id || reservation.reference || reservation.id);
  const movements = [];
  prepared.forEach(({ amount, index, record }) => {
    const before = record.quantity;
    const after = normaliseQuantity({
      ...before,
      onHand: before.onHand + amount,
      sold: before.sold - amount,
    });
    const next = normaliseRecord({
      ...record,
      quantity: after,
      updatedAt: at,
      lastMovementAt: at,
    });
    records[index] = next;
    movements.push(makeMovement({
      record: next,
      type: MOVEMENT_TYPES.RESTOCK,
      quantity: amount,
      before,
      after,
      actor,
      reference,
      reason: "Order cancelled after successful checkout",
      notes: "Restored from the order's original inventory allocation.",
      timestamp: at,
    }));
  });

  const nextReservation = {
    ...reservation,
    status: "RESTOCKED",
    restockedAt: at,
    restockReference: reference,
  };
  reservations[reservationIndex] = nextReservation;
  saveInventory(records, { quiet: true });
  saveMovements([...movements, ...existingMovements], { quiet: true });
  saveReservations(reservations, { quiet: true });
  announce();
  return { ok: true, reservation: nextReservation };
};

const pendingOutboundQuantity = ({
  sourceLocationId,
  productId,
  variantId = null,
  excludeTransferId = null,
}) => loadTransfers()
  .filter((transfer) =>
    transfer.id !== excludeTransferId &&
    transfer.sourceLocationId === sourceLocationId &&
    transfer.productId === String(productId) &&
    String(transfer.variantId || "") === String(variantId || "") &&
    [TRANSFER_STATES.REQUESTED, TRANSFER_STATES.APPROVED].includes(transfer.status)
  )
  .reduce((sum, transfer) => sum + whole(transfer.quantity), 0);

const TRANSFER_NEXT = {
  [TRANSFER_STATES.DRAFT]: [TRANSFER_STATES.REQUESTED, TRANSFER_STATES.CANCELLED],
  [TRANSFER_STATES.REQUESTED]: [TRANSFER_STATES.APPROVED, TRANSFER_STATES.CANCELLED],
  [TRANSFER_STATES.APPROVED]: [TRANSFER_STATES.IN_TRANSIT, TRANSFER_STATES.CANCELLED],
  [TRANSFER_STATES.IN_TRANSIT]: [TRANSFER_STATES.RECEIVED],
  [TRANSFER_STATES.RECEIVED]: [],
  [TRANSFER_STATES.CANCELLED]: [],
};

export const createTransfer = ({ sourceLocationId, destinationLocationId, productId, variantId = null, quantity, reason, notes = "", actor = null, draft = false }) => {
  const amount = whole(quantity);
  if (amount <= 0) return { ok: false, error: "Transfer quantity must be greater than zero." };
  if (!sourceLocationId || !destinationLocationId) return { ok: false, error: "Choose a source and destination." };
  if (sourceLocationId === destinationLocationId) return { ok: false, error: "Source and destination must be different." };
  if (!locationActive(sourceLocationId) || !locationActive(destinationLocationId)) return { ok: false, error: "Both transfer locations must be active." };
  const source = loadInventory().find((record) =>
    record.productId === String(productId) &&
    record.locationId === sourceLocationId &&
    String(record.variantId || "") === String(variantId || "")
  );
  const identity = validateIdentity(productId, variantId, {
    allowProductLevel: Boolean(source && !source.variantId),
  });
  if (!identity.ok) return identity;
  if (identity.product.status === "ARCHIVED") return { ok: false, error: "Archived products cannot be transferred." };
  if (!source || source.quantity.available < amount) {
    return { ok: false, error: `Only ${source?.quantity.available || 0} units are available at the source.` };
  }
  if (!draft) {
    const committed = pendingOutboundQuantity({
      sourceLocationId,
      productId,
      variantId,
    });
    const requestable = Math.max(0, source.quantity.available - committed);
    if (amount > requestable) {
      return { ok: false, error: `Only ${requestable} units remain after pending transfers.` };
    }
  }
  const at = stamp();
  const by = actorDetails(actor);
  const status = draft ? TRANSFER_STATES.DRAFT : TRANSFER_STATES.REQUESTED;
  const sequence = loadTransfers().length + 1;
  const transfer = {
    id: `TR-${new Date().getFullYear()}-${String(sequence).padStart(3, "0")}`,
    sourceLocationId,
    destinationLocationId,
    productId: String(productId),
    variantId: variantId || null,
    quantity: amount,
    reason: String(reason || "Store replenishment").trim(),
    notes: String(notes).trim(),
    status,
    requestedBy: by.employeeName,
    requestedById: by.employeeId,
    createdAt: at,
    updatedAt: at,
    history: [{ status, at, by: by.employeeName }],
  };
  saveTransfers([transfer, ...loadTransfers()]);
  activityNote(actor, `Stock transfer ${transfer.id} requested · ${identity.product.name}`, productId);
  return { ok: true, transfer };
};

export const transitionTransfer = (transferId, nextStatus, actor = null) => {
  const transfers = [...loadTransfers()];
  const index = transfers.findIndex((entry) => entry.id === transferId);
  if (index < 0) return { ok: false, error: "Transfer not found." };
  const transfer = transfers[index];
  if (!(TRANSFER_NEXT[transfer.status] || []).includes(nextStatus)) {
    return { ok: false, error: `Transfer cannot move from ${transfer.status} to ${nextStatus}.` };
  }
  const hasExistingBase = !transfer.variantId && loadInventory().some((record) =>
    record.productId === transfer.productId && !record.variantId
  );
  const identity = validateIdentity(transfer.productId, transfer.variantId, {
    allowProductLevel: hasExistingBase,
  });
  if (!identity.ok) return identity;

  if (nextStatus === TRANSFER_STATES.REQUESTED) {
    const source = loadInventory().find((record) =>
      record.productId === transfer.productId &&
      record.locationId === transfer.sourceLocationId &&
      String(record.variantId || "") === String(transfer.variantId || "")
    );
    const committed = pendingOutboundQuantity({
      sourceLocationId: transfer.sourceLocationId,
      productId: transfer.productId,
      variantId: transfer.variantId,
      excludeTransferId: transfer.id,
    });
    const requestable = Math.max(0, (source?.quantity.available || 0) - committed);
    if (!source || transfer.quantity > requestable) {
      return { ok: false, error: `Only ${requestable} units remain after pending transfers.` };
    }
  }

  let movementResult = null;
  if (nextStatus === TRANSFER_STATES.IN_TRANSIT) {
    const source = loadInventory().find((record) =>
      record.productId === transfer.productId &&
      record.locationId === transfer.sourceLocationId &&
      String(record.variantId || "") === String(transfer.variantId || "")
    );
    if (!source || source.quantity.available < transfer.quantity) {
      return { ok: false, error: "Source stock is no longer sufficient to dispatch this transfer." };
    }
    movementResult = mutateOne({
      productId: transfer.productId,
      variantId: transfer.variantId,
      locationId: transfer.sourceLocationId,
      type: MOVEMENT_TYPES.TRANSFER_OUT,
      quantity: -transfer.quantity,
      actor,
      reference: transfer.id,
      reason: transfer.reason,
      notes: transfer.notes,
      apply: (current) => ({ ...current, onHand: current.onHand - transfer.quantity }),
    });
    if (!movementResult.ok) return movementResult;
  }

  if (nextStatus === TRANSFER_STATES.RECEIVED) {
    movementResult = mutateOne({
      productId: transfer.productId,
      variantId: transfer.variantId,
      locationId: transfer.destinationLocationId,
      type: MOVEMENT_TYPES.TRANSFER_IN,
      quantity: transfer.quantity,
      actor,
      reference: transfer.id,
      reason: transfer.reason,
      notes: transfer.notes,
      apply: (current) => ({ ...current, onHand: current.onHand + transfer.quantity }),
    });
    if (!movementResult.ok) return movementResult;
  }

  const at = stamp();
  const by = actorDetails(actor);
  const next = {
    ...transfer,
    status: nextStatus,
    updatedAt: at,
    history: [...(transfer.history || []), { status: nextStatus, at, by: by.employeeName }],
  };
  transfers[index] = next;
  saveTransfers(transfers);
  activityNote(actor, `Stock transfer ${transfer.id} · ${nextStatus.replaceAll("_", " ")}`, transfer.productId);
  return { ok: true, transfer: next, movement: movementResult?.movement || null };
};

/** First activation/opening-stock bridge for the existing product editor. */
export const ensureOpeningStock = (productOrId, actor = null, locationId = "loc-main-warehouse") => {
  const product = typeof productOrId === "object" ? productOrId : catalogRepository.find(productOrId);
  if (!product || !product.inventoryTracked) return { ok: true, skipped: true };
  if (loadInventory().some((record) => record.productId === String(product.id))) {
    return { ok: true, skipped: true, reason: "Inventory already exists." };
  }
  const activeVariants = product.variants?.filter((variant) => variant.status !== "INACTIVE") || [];
  let openings = activeVariants.length
    ? activeVariants.filter((variant) => whole(variant.stock) > 0).map((variant) => ({ variantId: variant.id, quantity: whole(variant.stock) }))
    : [{ variantId: null, quantity: whole(product.stock) }];
  /* The existing editor has one product-level Opening Stock field. When a
     variant product has no per-variant opening values, place that amount on
     its first active variant rather than creating conflicting base stock. */
  if (activeVariants.length && openings.length === 0 && whole(product.stock) > 0) {
    openings = [{ variantId: activeVariants[0].id, quantity: whole(product.stock) }];
  }
  const valid = openings.filter((entry) => entry.quantity > 0);
  if (!valid.length) return { ok: true, skipped: true, reason: "No opening stock." };
  const created = [];
  for (const opening of valid) {
    const result = mutateOne({
      productId: product.id,
      variantId: opening.variantId,
      locationId,
      type: MOVEMENT_TYPES.OPENING_BALANCE,
      quantity: opening.quantity,
      actor,
      reference: `OPENING-${product.sku}`,
      reason: "Opening Balance",
      notes: "Created from the existing product editor opening stock field.",
      apply: (current) => ({ ...current, onHand: current.onHand + opening.quantity }),
    });
    if (!result.ok) return result;
    created.push(result.record);
  }
  return { ok: true, records: created };
};

/** Existing order-return foundation: receipt enters warehouse quarantine once. */
export const recordOrderReturn = (returnRecord, actor = null) => {
  if (!returnRecord?.id || !Array.isArray(returnRecord.items)) return { ok: false, error: "Return record is invalid." };
  const existing = loadMovements();
  const results = [];
  for (const item of returnRecord.items) {
    const reference = `${returnRecord.id}:${item.lineId}`;
    if (existing.some((movement) => movement.type === MOVEMENT_TYPES.RETURN && movement.reference === reference)) continue;
    const product = catalogRepository.find(item.productId);
    if (!product) continue;
    const variant = variantForSelection(product, item);
    const result = returnStock({
      productId: product.id,
      variantId: variant?.id || null,
      locationId: "loc-main-warehouse",
      quantity: item.quantity,
      reason: "Customer return received — awaiting inspection",
      notes: returnRecord.reasonLabel || returnRecord.reason || "Customer return",
      reference,
      actor,
    });
    if (result.ok) results.push(result);
  }
  return { ok: true, recorded: results.length, results };
};

export const resolveInventoryRecord = (record) => {
  const product = catalogRepository.find(record.productId);
  const variant = product?.variants?.find((entry) => entry.id === record.variantId) ?? null;
  const location = loadLocations().find((entry) => entry.id === record.locationId) ?? null;
  const price = product ? resolveVariantPrice(variant || {}, product.pricing) || product.price || 0 : 0;
  const variantLabel = variant
    ? [variant.color, variant.size].filter(Boolean).join(" / ") || "Variant"
    : "Base product";
  return {
    ...record,
    status: calculateStockStatus({
      available: record.quantity.available,
      lowStockThreshold: record.lowStockThreshold,
      maximumStock: record.maximumStock,
      active:
        record.active &&
        Boolean(product) &&
        product.status !== "ARCHIVED" &&
        (!record.variantId || Boolean(variant && variant.status !== "INACTIVE")),
    }),
    product,
    variant,
    location,
    productName: product?.name || "Unavailable catalogue product",
    sku: variant?.sku || product?.sku || "—",
    variantLabel,
    category: product?.category || "",
    subcategory: product?.subcategory || "",
    productType: product?.productType || "",
    unitPrice: price,
    estimatedValue: record.quantity.available * price,
    placementLabel: [
      record.placement.department,
      record.placement.section || record.placement.zone,
      record.placement.rack,
      record.placement.shelf || record.placement.bin,
    ].filter(Boolean).join(" · "),
  };
};

export const resolveMovement = (movement) => {
  const product = catalogRepository.find(movement.productId);
  const variant = product?.variants?.find((entry) => entry.id === movement.variantId) ?? null;
  const location = loadLocations().find((entry) => entry.id === movement.locationId) ?? null;
  return {
    ...movement,
    product,
    variant,
    location,
    productName: product?.name || "Unavailable catalogue product",
    variantLabel: variant ? [variant.color, variant.size].filter(Boolean).join(" / ") : "Base product",
  };
};

export const resolveTransfer = (transfer) => {
  const product = catalogRepository.find(transfer.productId);
  const variant = product?.variants?.find((entry) => entry.id === transfer.variantId) ?? null;
  const locations = loadLocations();
  return {
    ...transfer,
    product,
    variant,
    productName: product?.name || "Unavailable catalogue product",
    variantLabel: variant ? [variant.color, variant.size].filter(Boolean).join(" / ") : "Base product",
    source: locations.find((entry) => entry.id === transfer.sourceLocationId) ?? null,
    destination: locations.find((entry) => entry.id === transfer.destinationLocationId) ?? null,
  };
};

/** Centralized inventory search & filters. */
export const queryInventory = ({
  search = "",
  category = "",
  subcategory = "",
  productType = "",
  locationId = "",
  locationType = "",
  department = "",
  status = "",
  hasAvailable = false,
  hasReserved = false,
  hasDamaged = false,
  hasReturned = false,
} = {}) => {
  const term = String(search).trim().toLowerCase();
  return loadInventory()
    .map(resolveInventoryRecord)
    .filter((row) => {
      const haystack = [
        row.productName,
        row.sku,
        row.variantLabel,
        row.category,
        row.subcategory,
        row.location?.name,
        row.placementLabel,
      ].join(" ").toLowerCase();
      return (!term || term.split(/\s+/).every((word) => haystack.includes(word))) &&
        (!category || row.category === category) &&
        (!subcategory || row.subcategory === subcategory) &&
        (!productType || row.productType === productType) &&
        (!locationId || row.locationId === locationId) &&
        (!locationType || row.location?.type === locationType) &&
        (!department || row.placement.department === department) &&
        (!status || row.status === status) &&
        (!hasAvailable || row.quantity.available > 0) &&
        (!hasReserved || row.quantity.reserved > 0) &&
        (!hasDamaged || row.quantity.damaged > 0) &&
        (!hasReturned || row.quantity.returned > 0);
    })
    .sort((a, b) => a.productName.localeCompare(b.productName) || a.locationId.localeCompare(b.locationId));
};

export const getInventoryMetrics = (rows = queryInventory()) => {
  const products = new Set(rows.map((row) => row.productId));
  const variants = new Set(rows.filter((row) => row.variantId).map((row) => row.variantId));
  const sum = (field) => rows.reduce((total, row) => total + row.quantity[field], 0);
  const stockAt = (type) => rows
    .filter((row) => row.location?.type === type)
    .reduce((total, row) => total + row.quantity.onHand, 0);
  return {
    totalProducts: products.size,
    totalVariants: variants.size,
    totalUnits: sum("onHand"),
    availableUnits: sum("available"),
    reservedUnits: sum("reserved"),
    soldUnits: sum("sold"),
    returnedUnits: sum("returned"),
    damagedUnits: sum("damaged"),
    lowStock: rows.filter((row) => row.status === STOCK_STATUS.LOW_STOCK).length,
    outOfStock: rows.filter((row) => row.status === STOCK_STATUS.OUT_OF_STOCK).length,
    estimatedValue: rows.reduce((total, row) => total + row.estimatedValue, 0),
    storeStock: stockAt(LOCATION_TYPES.STORE),
    warehouseStock: stockAt(LOCATION_TYPES.WAREHOUSE),
    pendingTransfers: loadTransfers().filter((transfer) => ![TRANSFER_STATES.RECEIVED, TRANSFER_STATES.CANCELLED].includes(transfer.status)).length,
    receivingToday: loadMovements().filter((movement) => movement.type === MOVEMENT_TYPES.RECEIVE && movement.timestamp.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((sum, movement) => sum + Math.max(0, movement.quantity), 0),
  };
};

export const getReports = (rows = queryInventory()) => {
  const aggregate = (keyOf) => {
    const map = new Map();
    rows.forEach((row) => {
      const key = keyOf(row) || "Unassigned";
      const current = map.get(key) || { id: key, label: key, units: 0, available: 0, value: 0, lowStock: 0, outOfStock: 0 };
      current.units += row.quantity.onHand;
      current.available += row.quantity.available;
      current.value += row.estimatedValue;
      current.lowStock += row.status === STOCK_STATUS.LOW_STOCK ? 1 : 0;
      current.outOfStock += row.status === STOCK_STATUS.OUT_OF_STOCK ? 1 : 0;
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => b.units - a.units);
  };
  return {
    byLocation: aggregate((row) => row.location?.name),
    byCategory: aggregate((row) => row.product?.category || row.placement.department),
  };
};

export const inventoryRepository = {
  loadInventory,
  loadLocations,
  loadMovements,
  loadTransfers,
  query: queryInventory,
  metrics: getInventoryMetrics,
  reports: getReports,
  resolveInventoryRecord,
  resolveMovement,
  resolveTransfer,
  getCustomerAvailability,
  validateCartItems,
  receiveStock,
  adjustStock,
  markDamaged,
  returnStock,
  inspectReturnedStock,
  updateThreshold,
  addLocation,
  reserveCart,
  releaseExpiredReservations,
  confirmReservationSale,
  releaseReservation,
  restockCancelledOrder,
  createTransfer,
  transitionTransfer,
  ensureOpeningStock,
  recordOrderReturn,
};

export default inventoryRepository;
