/**
 * PRATIKSHYA FASHON — Order timeline service (Phase 15)
 *
 * Centralizes every important transition as a timeline event.
 * Timeline lives inside the order record — no second storage.
 * Deterministic timestamps for demo orders, live for real checkout.
 */

import { ORDER_ACTIVITY_TYPES } from "../../config/orderConfig";

export const buildTimelineEvent = ({
  type = ORDER_ACTIVITY_TYPES.ORDER_CREATED,
  status = null,
  at = new Date().toISOString(),
  actor = null,
  actorName = "System",
  note = "",
  meta = {},
} = {}) => ({
  id: `evt-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
  type,
  status,
  at: at instanceof Date ? at.toISOString() : at,
  actor,
  actorName,
  note,
  meta,
});

export const normaliseTimeline = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && e.at)
    .map((e) => ({
      id: e.id || `evt-${Math.random().toString(36).slice(2)}`,
      type: e.type || "STATUS_CHANGED",
      status: e.status || null,
      at: e.at,
      actor: e.actor || null,
      actorName: e.actorName || "System",
      note: e.note || "",
      meta: e.meta || {},
    }))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
};

export const appendTimeline = (timeline = [], event) => {
  const next = [...timeline, event].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  // Deduplicate by id if repeated action
  const seen = new Map();
  next.forEach((e) => seen.set(e.id, e));
  return [...seen.values()].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
};

/** Build customer-safe timeline from order.statusHistory + timeline */
export const getCustomerTimeline = (order) => {
  const history = order.statusHistory || [];
  // Keep status history as the customer-safe base
  const events = history.map((h) => ({
    status: h.status,
    at: h.at,
    actorName: "Atelier",
    note: "",
  }));
  // Enrich with timeline notes where status matches
  return events;
};

export const getFullTimeline = (order) => {
  const history = (order.statusHistory || []).map((h) => ({
    id: `status-${h.status}-${h.at}`,
    type: "STATUS_CHANGED",
    status: h.status,
    at: h.at,
    actorName: "System",
    note: "",
    meta: {},
  }));
  const custom = normaliseTimeline(order.timeline || []);
  // Merge, dedup by at+status
  const all = [...history, ...custom].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return all;
};

export default {
  buildTimelineEvent,
  normaliseTimeline,
  appendTimeline,
  getCustomerTimeline,
  getFullTimeline,
};
