/**
 * Seeds attendance, leave and performance together when all three stores
 * are empty. Individual repositories never invent a half-house.
 */

import { ATTENDANCE_STORAGE_KEY, LEAVE_STORAGE_KEY } from "../../config/attendanceConfig";
import { PERFORMANCE_STORAGE_KEY } from "../../config/performanceConfig";
import { buildWorkforceSeed } from "./seedWorkforce";
import { readList, writeList } from "./store";

let booted = false;

export const ensureWorkforceSeeded = () => {
  if (booted) return;
  const attendance = readList(ATTENDANCE_STORAGE_KEY);
  const leave = readList(LEAVE_STORAGE_KEY);
  const performance = readList(PERFORMANCE_STORAGE_KEY);
  const hasAny =
    (attendance && attendance.length) ||
    (leave && leave.length) ||
    (performance && performance.length);

  if (!hasAny) {
    const seed = buildWorkforceSeed();
    writeList(LEAVE_STORAGE_KEY, seed.leave, { quiet: true });
    writeList(PERFORMANCE_STORAGE_KEY, seed.performance, { quiet: true });
    writeList(ATTENDANCE_STORAGE_KEY, seed.attendance, { quiet: true });
  }
  booted = true;
};

export default { ensureWorkforceSeeded };
