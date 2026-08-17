/**
 * PRATIKSHYA FASHON — Leave repository.
 *
 * One store: `pratikshya_leave`. Leave is not duplicated inside attendance
 * records; attendance derives LEAVE from an approved request.
 */

import {
  LEAVE_STATUS,
  LEAVE_STORAGE_KEY,
  LEAVE_TYPE,
} from "../../config/attendanceConfig";
import { makeId } from "./ids";
import { inclusiveDayCount } from "./dateUtils";
import { readList, writeList } from "./store";
import { ensureWorkforceSeeded } from "./bootstrap";

const VALID_STATUS = new Set(Object.values(LEAVE_STATUS));
const VALID_TYPE = new Set(Object.values(LEAVE_TYPE));

export const normaliseLeave = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const employeeId = String(raw.employeeId || "").trim();
  const startDate = String(raw.startDate || "").trim();
  const endDate = String(raw.endDate || raw.startDate || "").trim();
  if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return null;
  }
  const from = startDate <= endDate ? startDate : endDate;
  const to = startDate <= endDate ? endDate : startDate;
  return {
    leaveId: String(raw.leaveId || makeId("lv")),
    employeeId,
    employeeNameSnapshot: String(raw.employeeNameSnapshot || employeeId),
    leaveType: VALID_TYPE.has(raw.leaveType) ? raw.leaveType : LEAVE_TYPE.OTHER,
    startDate: from,
    endDate: to,
    days: Math.max(1, Number(raw.days) || inclusiveDayCount(from, to)),
    reason: String(raw.reason || "").trim(),
    status: VALID_STATUS.has(raw.status) ? raw.status : LEAVE_STATUS.PENDING,
    requestedAt: raw.requestedAt || new Date().toISOString(),
    reviewedAt: raw.reviewedAt || null,
    reviewedBy: raw.reviewedBy || null,
    reviewNote: String(raw.reviewNote || ""),
    seeded: Boolean(raw.seeded),
  };
};

export const saveLeave = (records, options) => {
  const next = (Array.isArray(records) ? records : []).map(normaliseLeave).filter(Boolean);
  writeList(LEAVE_STORAGE_KEY, next, options);
  return next;
};

export const ensureLeaveSeeded = (seed = null) => {
  const stored = readList(LEAVE_STORAGE_KEY);
  if (stored && stored.length) return stored.map(normaliseLeave).filter(Boolean);
  if (Array.isArray(seed) && seed.length) {
    return saveLeave(seed, { quiet: true });
  }
  return stored ? stored.map(normaliseLeave).filter(Boolean) : [];
};

export const loadLeave = () => {
  ensureWorkforceSeeded();
  const stored = readList(LEAVE_STORAGE_KEY);
  if (stored && stored.length) return stored.map(normaliseLeave).filter(Boolean);
  return ensureLeaveSeeded();
};

export const findLeave = (leaveId, records = loadLeave()) =>
  records.find((entry) => entry.leaveId === leaveId) ?? null;

export const leaveForEmployee = (employeeId, records = loadLeave()) =>
  records
    .filter((entry) => entry.employeeId === employeeId)
    .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));

export const overlappingLeave = (employeeId, startDate, endDate, records = loadLeave(), exceptId = null) =>
  records.find((entry) => {
    if (entry.employeeId !== employeeId) return false;
    if (exceptId && entry.leaveId === exceptId) return false;
    if (entry.status === LEAVE_STATUS.REJECTED || entry.status === LEAVE_STATUS.CANCELLED) return false;
    return entry.startDate <= endDate && entry.endDate >= startDate;
  }) ?? null;

export const approvedLeaveOn = (employeeId, dateKey, records = loadLeave()) =>
  records.find(
    (entry) =>
      entry.employeeId === employeeId &&
      entry.status === LEAVE_STATUS.APPROVED &&
      dateKey >= entry.startDate &&
      dateKey <= entry.endDate
  ) ?? null;

export const upsertLeave = (draft) => {
  const records = [...loadLeave()];
  const next = normaliseLeave({
    leaveId: draft.leaveId || makeId("lv"),
    days: inclusiveDayCount(draft.startDate, draft.endDate || draft.startDate),
    ...draft,
  });
  if (!next) return { ok: false, record: null, records, message: "Leave request is incomplete." };
  const index = records.findIndex((entry) => entry.leaveId === next.leaveId);
  if (index >= 0) {
    records[index] = next;
    saveLeave(records);
    return { ok: true, record: next, records };
  }
  const created = [next, ...records];
  saveLeave(created);
  return { ok: true, record: next, records: created };
};

export default {
  normaliseLeave,
  saveLeave,
  ensureLeaveSeeded,
  loadLeave,
  findLeave,
  leaveForEmployee,
  overlappingLeave,
  approvedLeaveOn,
  upsertLeave,
};
