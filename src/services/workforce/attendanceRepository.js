/**
 * PRATIKSHYA FASHON — Attendance repository.
 *
 * One store: `pratikshya_attendance`. Admin, manager and employee views
 * all read this list. The older Phase 9 map
 * (`pratikshya_employee_attendance`) is migrated once, never written again.
 */

import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STORAGE_KEY,
} from "../../config/attendanceConfig";
import { EMPLOYEE_STORAGE_KEYS } from "../employees/storage";
import { readStorage } from "../../utils/shopping";
import { employeeFullName } from "../../utils/employee";
import { todayKey } from "./dateUtils";
import { makeId } from "./ids";
import { readList, writeList } from "./store";
import { ensureWorkforceSeeded } from "./bootstrap";

const VALID_STATUS = new Set(Object.values(ATTENDANCE_STATUS));

export const normaliseAttendance = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const employeeId = String(raw.employeeId || "").trim();
  const date = String(raw.date || "").trim();
  if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const status = VALID_STATUS.has(raw.status) ? raw.status : ATTENDANCE_STATUS.NOT_CHECKED_IN;
  const corrections = Array.isArray(raw.corrections)
    ? raw.corrections
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          at: entry.at || new Date().toISOString(),
          actorId: entry.actorId || null,
          actorName: entry.actorName || "System",
          reason: String(entry.reason || ""),
          previous: entry.previous && typeof entry.previous === "object" ? entry.previous : {},
          next: entry.next && typeof entry.next === "object" ? entry.next : {},
        }))
    : [];

  return {
    attendanceId: String(raw.attendanceId || `att-${employeeId}-${date}`),
    employeeId,
    employeeNameSnapshot: String(raw.employeeNameSnapshot || employeeId),
    date,
    checkIn: raw.checkIn || null,
    checkOut: raw.checkOut || null,
    status,
    workMinutes: Math.max(0, Math.round(Number(raw.workMinutes) || 0)),
    lateMinutes: Math.max(0, Math.round(Number(raw.lateMinutes) || 0)),
    earlyLeaveMinutes: Math.max(0, Math.round(Number(raw.earlyLeaveMinutes) || 0)),
    locationId: raw.locationId || null,
    notes: String(raw.notes || ""),
    corrections,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    seeded: Boolean(raw.seeded),
  };
};

const dedupe = (list) => {
  const seen = new Set();
  const next = [];
  list.forEach((record) => {
    const key = `${record.employeeId}::${record.date}`;
    if (seen.has(key)) return;
    seen.add(key);
    next.push(record);
  });
  return next;
};

const migrateLegacyMap = (existing) => {
  const legacy = readStorage(EMPLOYEE_STORAGE_KEYS.ATTENDANCE, null);
  if (!legacy || typeof legacy !== "object" || Array.isArray(legacy)) return existing;
  const today = todayKey();
  const known = new Set(existing.map((record) => `${record.employeeId}::${record.date}`));
  const extras = [];
  Object.values(legacy).forEach((entry) => {
    if (!entry || !entry.employeeId) return;
    const date = entry.date || today;
    const key = `${entry.employeeId}::${date}`;
    if (known.has(key)) return;
    extras.push(
      normaliseAttendance({
        attendanceId: `att-legacy-${entry.employeeId}-${date}`,
        employeeId: entry.employeeId,
        employeeNameSnapshot: entry.employeeNameSnapshot || entry.employeeId,
        date,
        checkIn: entry.checkedInAt || entry.checkIn || null,
        checkOut: entry.checkedOutAt || entry.checkOut || null,
        status: entry.status === "ON_LEAVE" ? ATTENDANCE_STATUS.LEAVE : entry.status || ATTENDANCE_STATUS.PRESENT,
        notes: "Migrated from the earlier daily attendance map.",
      })
    );
    known.add(key);
  });
  return extras.length ? [...existing, ...extras] : existing;
};

export const saveAttendance = (records, options) => {
  const next = dedupe((Array.isArray(records) ? records : []).map(normaliseAttendance).filter(Boolean));
  writeList(ATTENDANCE_STORAGE_KEY, next, options);
  return next;
};

export const loadAttendance = () => {
  ensureWorkforceSeeded();
  const stored = readList(ATTENDANCE_STORAGE_KEY) || [];
  const safe = migrateLegacyMap(dedupe(stored.map(normaliseAttendance).filter(Boolean)));
  if (safe.length !== stored.length) saveAttendance(safe, { quiet: true });
  return safe;
};

export const findAttendance = (employeeId, date, records = loadAttendance()) =>
  records.find((record) => record.employeeId === employeeId && record.date === date) ?? null;

export const attendanceForEmployee = (employeeId, records = loadAttendance()) =>
  records
    .filter((record) => record.employeeId === employeeId)
    .sort((a, b) => b.date.localeCompare(a.date));

export const attendanceOnDate = (date, records = loadAttendance()) =>
  records.filter((record) => record.date === date);

export const upsertAttendance = (draft) => {
  const records = [...loadAttendance()];
  const next = normaliseAttendance({
    attendanceId: draft.attendanceId || makeId("att"),
    ...draft,
    updatedAt: new Date().toISOString(),
    createdAt: draft.createdAt || new Date().toISOString(),
  });
  if (!next) return { ok: false, record: null, records, message: "Attendance record is incomplete." };

  const index = records.findIndex(
    (record) =>
      record.attendanceId === next.attendanceId ||
      (record.employeeId === next.employeeId && record.date === next.date)
  );
  if (index >= 0) {
    records[index] = { ...records[index], ...next, attendanceId: records[index].attendanceId };
    saveAttendance(records);
    return { ok: true, record: records[index], records };
  }
  const created = [next, ...records];
  saveAttendance(created);
  return { ok: true, record: next, records: created };
};

export const createBlankAttendance = (employee, date, extras = {}) =>
  normaliseAttendance({
    attendanceId: makeId("att"),
    employeeId: employee.employeeId,
    employeeNameSnapshot: employeeFullName(employee),
    date,
    status: ATTENDANCE_STATUS.NOT_CHECKED_IN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extras,
  });

export default {
  normaliseAttendance,
  saveAttendance,
  loadAttendance,
  findAttendance,
  attendanceForEmployee,
  attendanceOnDate,
  upsertAttendance,
  createBlankAttendance,
};
