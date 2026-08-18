/**
 * PRATIKSHYA FASHON — Lightweight employee activity log.
 *
 * Structured so the future Admin Portal can consume it. This is not an
 * enterprise audit trail — just a readable house diary of people events.
 *
 * Passwords are never written here.
 */

import { INITIAL_ACTIVITY } from "../../data/employees/operations";
import { readStorage, writeStorage } from "../../utils/shopping";
import { employeeFullName } from "../../utils/employee";
import { EMPLOYEE_STORAGE_KEYS } from "./storage";

export const ACTIVITY_ACTIONS = {
  EMPLOYEE_CREATED: "EMPLOYEE_CREATED",
  EMPLOYEE_UPDATED: "EMPLOYEE_UPDATED",
  ROLE_CHANGED: "ROLE_CHANGED",
  DEPARTMENT_CHANGED: "DEPARTMENT_CHANGED",
  PERMISSIONS_CHANGED: "PERMISSIONS_CHANGED",
  STATUS_CHANGED: "STATUS_CHANGED",
  EMPLOYEE_SUSPENDED: "EMPLOYEE_SUSPENDED",
  EMPLOYEE_ACTIVATED: "EMPLOYEE_ACTIVATED",
  EMPLOYEE_DEACTIVATED: "EMPLOYEE_DEACTIVATED",
  PASSWORD_RESET: "PASSWORD_RESET",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  LOGIN: "LOGIN",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  SETTINGS_RESET: "SETTINGS_RESET",

  /* Media — Phase 12 & 12.1. Recorded in this same diary rather than a second log. */
  MEDIA_UPLOADED: "MEDIA_UPLOADED",
  MEDIA_SUBMITTED_FOR_REVIEW: "MEDIA_SUBMITTED_FOR_REVIEW",
  MEDIA_APPROVED: "MEDIA_APPROVED",
  MEDIA_REJECTED: "MEDIA_REJECTED",
  MEDIA_ASSIGNED: "MEDIA_ASSIGNED",
  MEDIA_COVER_CHANGED: "MEDIA_COVER_CHANGED",
  MEDIA_REORDERED: "MEDIA_REORDERED",
  MEDIA_EDITED: "MEDIA_EDITED",
  MEDIA_REMOVED: "MEDIA_REMOVED",
  MARKETING_MEDIA_ACTIVATED: "MARKETING_MEDIA_ACTIVATED",
  MARKETING_MEDIA_ARCHIVED: "MARKETING_MEDIA_ARCHIVED",

  /* Products — Phase 13. Recorded in this same diary, never a second log. */
  PRODUCT_CREATED: "PRODUCT_CREATED",
  PRODUCT_EDITED: "PRODUCT_EDITED",
  PRODUCT_PRICE_CHANGED: "PRODUCT_PRICE_CHANGED",
  PRODUCT_VARIANT_ADDED: "PRODUCT_VARIANT_ADDED",
  PRODUCT_VARIANT_UPDATED: "PRODUCT_VARIANT_UPDATED",
  PRODUCT_SUBMITTED: "PRODUCT_SUBMITTED",
  PRODUCT_APPROVED: "PRODUCT_APPROVED",
  PRODUCT_REJECTED: "PRODUCT_REJECTED",
  PRODUCT_PUBLISHED: "PRODUCT_PUBLISHED",
  PRODUCT_UNPUBLISHED: "PRODUCT_UNPUBLISHED",
  PRODUCT_ARCHIVED: "PRODUCT_ARCHIVED",
  PRODUCT_RESTORED: "PRODUCT_RESTORED",
  PRODUCT_DUPLICATED: "PRODUCT_DUPLICATED",
  PRODUCT_BULK_UPDATED: "PRODUCT_BULK_UPDATED",
  /* Phase 3F — permanent deletion of a dependency-free draft. */
  PRODUCT_DELETED: "PRODUCT_DELETED",

  /* Products — Phase 22. Media-to-product workflow, recorded in this same
     diary rather than a second logging system. */
  PRODUCT_DRAFT_CREATED: "PRODUCT_DRAFT_CREATED",
  PRODUCT_MEDIA_ASSIGNED: "PRODUCT_MEDIA_ASSIGNED",
  PRODUCT_MEDIA_UNASSIGNED: "PRODUCT_MEDIA_UNASSIGNED",
  PRODUCT_MEDIA_TRANSFERRED: "PRODUCT_MEDIA_TRANSFERRED",
  PRODUCT_ASSIGNED: "PRODUCT_ASSIGNED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_SUBMITTED_FOR_REVIEW: "PRODUCT_SUBMITTED_FOR_REVIEW",
  PRODUCT_RENAMED_ID: "PRODUCT_RENAMED_ID",
  PRODUCT_GROUP_CREATED: "PRODUCT_GROUP_CREATED",
  PRODUCT_GROUP_UPDATED: "PRODUCT_GROUP_UPDATED",
  PRODUCT_GROUP_MERGED: "PRODUCT_GROUP_MERGED",
  PRODUCT_GROUP_SPLIT: "PRODUCT_GROUP_SPLIT",
  PRODUCT_GROUP_DECIDED: "PRODUCT_GROUP_DECIDED",
  PRODUCT_VARIANT_REVIEW_REQUIRED: "PRODUCT_VARIANT_REVIEW_REQUIRED",

  /* Product conflict resolution is recorded in this shared activity diary. */
  PRODUCT_CONFLICT_RESOLVED: "PRODUCT_CONFLICT_RESOLVED",
  PRODUCT_REVIEW_FLAGS_CLEARED: "PRODUCT_REVIEW_FLAGS_CLEARED",

  /* Inventory — Phase 14. The stock ledger holds quantity-level detail;
     this shared diary carries the readable cross-module activity note. */
  INVENTORY_MOVEMENT: "INVENTORY_MOVEMENT",

  /* Returns — Phase 16.1. Full return operational lifecycle. */
  RETURN_REQUESTED: "RETURN_REQUESTED",
  RETURN_APPROVED: "RETURN_APPROVED",
  RETURN_REJECTED: "RETURN_REJECTED",
  RETURN_PICKUP_SCHEDULED: "RETURN_PICKUP_SCHEDULED",
  RETURN_RECEIVED: "RETURN_RECEIVED",
  RETURN_INSPECTED: "RETURN_INSPECTED",
  RETURN_REFUND_REQUESTED: "RETURN_REFUND_REQUESTED",
  RETURN_REFUNDED: "RETURN_REFUNDED",

  /* Offers — Phase 17. Recorded in this same diary, never a second log. */
  OFFER_CREATED: "OFFER_CREATED",
  OFFER_UPDATED: "OFFER_UPDATED",
  OFFER_ACTIVATED: "OFFER_ACTIVATED",
  OFFER_PAUSED: "OFFER_PAUSED",
  OFFER_ARCHIVED: "OFFER_ARCHIVED",
  OFFER_REDEEMED: "OFFER_REDEEMED",

  /* Analytics — export only. Page views are not logged. */
  ANALYTICS_EXPORT: "ANALYTICS_EXPORT",

  /* Workforce — attendance, leave and performance. Same diary, never a second log. */
  ATTENDANCE_CHECKED_IN: "ATTENDANCE_CHECKED_IN",
  ATTENDANCE_CHECKED_OUT: "ATTENDANCE_CHECKED_OUT",
  ATTENDANCE_CORRECTED: "ATTENDANCE_CORRECTED",
  LEAVE_REQUESTED: "LEAVE_REQUESTED",
  LEAVE_APPROVED: "LEAVE_APPROVED",
  LEAVE_REJECTED: "LEAVE_REJECTED",
  PERFORMANCE_REVIEWED: "PERFORMANCE_REVIEWED",

  /* AI assistants — Phase 21.1. The demo shopping and business assistants
     note their use in this same diary, never a second log. */
  AI_SHOPPING_SESSION_STARTED: "AI_SHOPPING_SESSION_STARTED",
  AI_SHOPPING_QUERY: "AI_SHOPPING_QUERY",
  AI_BUSINESS_QUERY: "AI_BUSINESS_QUERY",
  AI_BUSINESS_INSIGHT_VIEWED: "AI_BUSINESS_INSIGHT_VIEWED",
  AI_BUSINESS_ACTION_OPENED: "AI_BUSINESS_ACTION_OPENED",

  /* Taxonomy — Phase 18. Central category, subcategory and collection management. */
  CATEGORY_CREATED: "CATEGORY_CREATED",
  CATEGORY_UPDATED: "CATEGORY_UPDATED",
  CATEGORY_ARCHIVED: "CATEGORY_ARCHIVED",
  CATEGORY_RESTORED: "CATEGORY_RESTORED",
  SUBCATEGORY_CREATED: "SUBCATEGORY_CREATED",
  SUBCATEGORY_UPDATED: "SUBCATEGORY_UPDATED",
  SUBCATEGORY_ARCHIVED: "SUBCATEGORY_ARCHIVED",
  COLLECTION_CREATED: "COLLECTION_CREATED",
  COLLECTION_UPDATED: "COLLECTION_UPDATED",
  COLLECTION_ACTIVATED: "COLLECTION_ACTIVATED",
  COLLECTION_PAUSED: "COLLECTION_PAUSED",
  COLLECTION_ARCHIVED: "COLLECTION_ARCHIVED",
  COLLECTION_PRODUCTS_UPDATED: "COLLECTION_PRODUCTS_UPDATED",
};

const ACTION_LABELS = {
  [ACTIVITY_ACTIONS.EMPLOYEE_CREATED]: "Employee created",
  [ACTIVITY_ACTIONS.EMPLOYEE_UPDATED]: "Employee updated",
  [ACTIVITY_ACTIONS.ROLE_CHANGED]: "Role changed",
  [ACTIVITY_ACTIONS.DEPARTMENT_CHANGED]: "Department changed",
  [ACTIVITY_ACTIONS.PERMISSIONS_CHANGED]: "Permissions updated",
  [ACTIVITY_ACTIONS.STATUS_CHANGED]: "Status changed",
  [ACTIVITY_ACTIONS.EMPLOYEE_SUSPENDED]: "Employee suspended",
  [ACTIVITY_ACTIONS.EMPLOYEE_ACTIVATED]: "Employee activated",
  [ACTIVITY_ACTIONS.EMPLOYEE_DEACTIVATED]: "Employee deactivated",
  [ACTIVITY_ACTIONS.PASSWORD_RESET]: "Password reset",
  [ACTIVITY_ACTIONS.PASSWORD_CHANGED]: "Password changed",
  [ACTIVITY_ACTIONS.LOGIN]: "Signed in",
  [ACTIVITY_ACTIONS.SETTINGS_UPDATED]: "Settings updated",
  [ACTIVITY_ACTIONS.SETTINGS_RESET]: "Settings reset",
  [ACTIVITY_ACTIONS.MEDIA_UPLOADED]: "Media added",
  [ACTIVITY_ACTIONS.MEDIA_SUBMITTED_FOR_REVIEW]: "Media submitted for review",
  [ACTIVITY_ACTIONS.MEDIA_APPROVED]: "Media approved",
  [ACTIVITY_ACTIONS.MEDIA_REJECTED]: "Media rejected",
  [ACTIVITY_ACTIONS.MEDIA_ASSIGNED]: "Media assigned",
  [ACTIVITY_ACTIONS.MEDIA_COVER_CHANGED]: "Cover changed",
  [ACTIVITY_ACTIONS.MEDIA_REORDERED]: "Media reordered",
  [ACTIVITY_ACTIONS.MEDIA_EDITED]: "Media edited",
  [ACTIVITY_ACTIONS.MEDIA_REMOVED]: "Media removed",
  [ACTIVITY_ACTIONS.MARKETING_MEDIA_ACTIVATED]: "Marketing media activated",
  [ACTIVITY_ACTIONS.MARKETING_MEDIA_ARCHIVED]: "Marketing media archived",
  [ACTIVITY_ACTIONS.PRODUCT_CREATED]: "Product created",
  [ACTIVITY_ACTIONS.PRODUCT_EDITED]: "Product edited",
  [ACTIVITY_ACTIONS.PRODUCT_PRICE_CHANGED]: "Product price changed",
  [ACTIVITY_ACTIONS.PRODUCT_VARIANT_ADDED]: "Product variant added",
  [ACTIVITY_ACTIONS.PRODUCT_VARIANT_UPDATED]: "Product variant updated",
  [ACTIVITY_ACTIONS.PRODUCT_SUBMITTED]: "Product submitted for review",
  [ACTIVITY_ACTIONS.PRODUCT_APPROVED]: "Product approved",
  [ACTIVITY_ACTIONS.PRODUCT_REJECTED]: "Product rejected",
  [ACTIVITY_ACTIONS.PRODUCT_PUBLISHED]: "Product published",
  [ACTIVITY_ACTIONS.PRODUCT_UNPUBLISHED]: "Product unpublished",
  [ACTIVITY_ACTIONS.PRODUCT_ARCHIVED]: "Product archived",
  [ACTIVITY_ACTIONS.PRODUCT_RESTORED]: "Product restored",
  [ACTIVITY_ACTIONS.PRODUCT_DUPLICATED]: "Product duplicated",
  [ACTIVITY_ACTIONS.PRODUCT_BULK_UPDATED]: "Products updated in bulk",
  [ACTIVITY_ACTIONS.PRODUCT_DELETED]: "Product permanently deleted",
  [ACTIVITY_ACTIONS.PRODUCT_DRAFT_CREATED]: "Product draft created",
  [ACTIVITY_ACTIONS.PRODUCT_MEDIA_ASSIGNED]: "Product media assigned",
  [ACTIVITY_ACTIONS.PRODUCT_MEDIA_UNASSIGNED]: "Product media unassigned",
  [ACTIVITY_ACTIONS.PRODUCT_MEDIA_TRANSFERRED]: "Product media ownership transferred",
  [ACTIVITY_ACTIONS.PRODUCT_ASSIGNED]: "Product assigned to employee",
  [ACTIVITY_ACTIONS.PRODUCT_UPDATED]: "Product draft updated",
  [ACTIVITY_ACTIONS.PRODUCT_SUBMITTED_FOR_REVIEW]: "Product submitted for review",
  [ACTIVITY_ACTIONS.PRODUCT_RENAMED_ID]: "Product ID changed",
  [ACTIVITY_ACTIONS.PRODUCT_GROUP_CREATED]: "Product media group created",
  [ACTIVITY_ACTIONS.PRODUCT_GROUP_UPDATED]: "Product media group updated",
  [ACTIVITY_ACTIONS.PRODUCT_GROUP_MERGED]: "Product media groups merged",
  [ACTIVITY_ACTIONS.PRODUCT_GROUP_SPLIT]: "Product media group split",
  [ACTIVITY_ACTIONS.PRODUCT_GROUP_DECIDED]: "Product group decision recorded",
  [ACTIVITY_ACTIONS.PRODUCT_VARIANT_REVIEW_REQUIRED]: "Variant review required",
  [ACTIVITY_ACTIONS.PRODUCT_CONFLICT_RESOLVED]: "Product media conflict resolved",
  [ACTIVITY_ACTIONS.PRODUCT_REVIEW_FLAGS_CLEARED]: "Product review flags cleared",
  [ACTIVITY_ACTIONS.INVENTORY_MOVEMENT]: "Inventory updated",
  [ACTIVITY_ACTIONS.RETURN_REQUESTED]: "Return requested",
  [ACTIVITY_ACTIONS.RETURN_APPROVED]: "Return approved",
  [ACTIVITY_ACTIONS.RETURN_REJECTED]: "Return rejected",
  [ACTIVITY_ACTIONS.RETURN_PICKUP_SCHEDULED]: "Return pickup scheduled",
  [ACTIVITY_ACTIONS.RETURN_RECEIVED]: "Return received",
  [ACTIVITY_ACTIONS.RETURN_INSPECTED]: "Return inspected",
  [ACTIVITY_ACTIONS.RETURN_REFUND_REQUESTED]: "Refund requested",
  [ACTIVITY_ACTIONS.RETURN_REFUNDED]: "Refund completed",
  [ACTIVITY_ACTIONS.OFFER_CREATED]: "Offer created",
  [ACTIVITY_ACTIONS.OFFER_UPDATED]: "Offer updated",
  [ACTIVITY_ACTIONS.OFFER_ACTIVATED]: "Offer activated",
  [ACTIVITY_ACTIONS.OFFER_PAUSED]: "Offer paused",
  [ACTIVITY_ACTIONS.OFFER_ARCHIVED]: "Offer archived",
  [ACTIVITY_ACTIONS.OFFER_REDEEMED]: "Offer redeemed",
  [ACTIVITY_ACTIONS.CATEGORY_CREATED]: "Category created",
  [ACTIVITY_ACTIONS.CATEGORY_UPDATED]: "Category updated",
  [ACTIVITY_ACTIONS.CATEGORY_ARCHIVED]: "Category archived",
  [ACTIVITY_ACTIONS.CATEGORY_RESTORED]: "Category restored",
  [ACTIVITY_ACTIONS.SUBCATEGORY_CREATED]: "Subcategory created",
  [ACTIVITY_ACTIONS.SUBCATEGORY_UPDATED]: "Subcategory updated",
  [ACTIVITY_ACTIONS.SUBCATEGORY_ARCHIVED]: "Subcategory archived",
  [ACTIVITY_ACTIONS.COLLECTION_CREATED]: "Collection created",
  [ACTIVITY_ACTIONS.COLLECTION_UPDATED]: "Collection updated",
  [ACTIVITY_ACTIONS.COLLECTION_ACTIVATED]: "Collection activated",
  [ACTIVITY_ACTIONS.COLLECTION_PAUSED]: "Collection paused",
  [ACTIVITY_ACTIONS.COLLECTION_ARCHIVED]: "Collection archived",
  [ACTIVITY_ACTIONS.COLLECTION_PRODUCTS_UPDATED]: "Collection products updated",
  [ACTIVITY_ACTIONS.AI_SHOPPING_SESSION_STARTED]: "AI shopping session started",
  [ACTIVITY_ACTIONS.AI_SHOPPING_QUERY]: "AI shopping query",
  [ACTIVITY_ACTIONS.AI_BUSINESS_QUERY]: "AI business query",
  [ACTIVITY_ACTIONS.AI_BUSINESS_INSIGHT_VIEWED]: "AI business insight viewed",
  [ACTIVITY_ACTIONS.AI_BUSINESS_ACTION_OPENED]: "AI business action opened",
  [ACTIVITY_ACTIONS.ATTENDANCE_CHECKED_IN]: "Checked in",
  [ACTIVITY_ACTIONS.ATTENDANCE_CHECKED_OUT]: "Checked out",
  [ACTIVITY_ACTIONS.ATTENDANCE_CORRECTED]: "Attendance corrected",
  [ACTIVITY_ACTIONS.LEAVE_REQUESTED]: "Leave requested",
  [ACTIVITY_ACTIONS.LEAVE_APPROVED]: "Leave approved",
  [ACTIVITY_ACTIONS.LEAVE_REJECTED]: "Leave rejected",
  [ACTIVITY_ACTIONS.PERFORMANCE_REVIEWED]: "Performance reviewed",
};

export const getActivityLabel = (action) => ACTION_LABELS[action] ?? "Activity";

/** Announced whenever the diary is written, so live views can re-sync. */
export const ACTIVITY_CHANGED_EVENT = "pratikshya-activity-changed";

const normaliseEntry = (entry) => {
  if (!entry || typeof entry !== "object" || !entry.id) return null;
  return {
    id: String(entry.id),
    at: entry.at || new Date().toISOString(),
    actorEmployeeId: entry.actorEmployeeId || null,
    actorName: entry.actorName || "System",
    targetEmployeeId: entry.targetEmployeeId || null,
    /* Phase 13 — product events reference the product they acted on. */
    targetProductId: entry.targetProductId || null,
    /* Phase 17 — offer events reference the offer they acted on. */
    targetOfferId: entry.targetOfferId || null,
    /* Phase 18 — taxonomy events reference categories and collections. */
    targetCategoryId: entry.targetCategoryId || null,
    targetCollectionId: entry.targetCollectionId || null,
    action: entry.action || ACTIVITY_ACTIONS.EMPLOYEE_UPDATED,
    summary: String(entry.summary || getActivityLabel(entry.action)),
  };
};

/* In-memory mirror so the diary stays consistent when storage is
   unavailable (tests, private mode) — never a second log. */
let memoryActivity = null;

export const loadActivity = () => {
  const stored = readStorage(EMPLOYEE_STORAGE_KEYS.ACTIVITY, null);
  if (Array.isArray(stored) && stored.length > 0) {
    memoryActivity = stored.map(normaliseEntry).filter(Boolean);
    return memoryActivity;
  }
  if (memoryActivity) return memoryActivity;
  const seeded = INITIAL_ACTIVITY.map(normaliseEntry).filter(Boolean);
  memoryActivity = seeded;
  writeStorage(EMPLOYEE_STORAGE_KEYS.ACTIVITY, seeded);
  return seeded;
};

export const saveActivity = (entries) => {
  const clean = (Array.isArray(entries) ? entries : []).map(normaliseEntry).filter(Boolean);
  memoryActivity = clean;
  writeStorage(EMPLOYEE_STORAGE_KEYS.ACTIVITY, clean);
  /* Both portals keep live copies in context state; let them re-sync. */
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACTIVITY_CHANGED_EVENT));
  }
};

export const recordActivity = (entries, draft) => {
  const entry = normaliseEntry({
    id: `act-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`,
    at: new Date().toISOString(),
    ...draft,
  });
  if (!entry) return entries;
  const next = [entry, ...entries].slice(0, 200);
  saveActivity(next);
  return next;
};

export const activityForEmployee = (entries, employeeId) =>
  entries.filter(
    (entry) =>
      entry.targetEmployeeId === employeeId || entry.actorEmployeeId === employeeId
  );

/** Phase 13 — the product-detail activity panel reads through this. */
export const activityForProduct = (entries, productId) =>
  entries.filter((entry) => entry.targetProductId === productId);

/** Phase 17 — the offer-detail activity panel reads through this. */
export const activityForOffer = (entries, offerId) =>
  entries.filter((entry) => entry.targetOfferId === offerId);

/**
 * Signs an entry for whoever acted. Employees carry `employeeId`; the
 * Admin Portal carries `adminId` and is its own authentication boundary.
 */
export const describeActor = (actor) => {
  if (!actor) return { actorEmployeeId: null, actorName: "System" };
  if (actor.adminId) {
    return {
      actorEmployeeId: null,
      actorName: actor.name ? `${actor.name} · ${actor.adminId}` : actor.adminId,
    };
  }
  if (actor.label) {
    return {
      actorEmployeeId: actor.employeeId || null,
      actorName: actor.employeeId ? `${actor.label} · ${actor.employeeId}` : actor.label,
    };
  }
  return {
    actorEmployeeId: actor.employeeId || null,
    actorName: employeeFullName(actor),
  };
};

export default {
  ACTIVITY_ACTIONS,
  ACTIVITY_CHANGED_EVENT,
  getActivityLabel,
  loadActivity,
  saveActivity,
  recordActivity,
  activityForEmployee,
  activityForProduct,
  describeActor,
};
