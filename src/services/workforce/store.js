/**
 * Shared persistence helpers for the workforce module.
 */

import { WORKFORCE_CHANGED_EVENT } from "../../config/attendanceConfig";
import { readStorage, writeStorage } from "../../utils/shopping";

export const announceWorkforceChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WORKFORCE_CHANGED_EVENT));
  }
};

export const readList = (key) => {
  const stored = readStorage(key, null);
  return Array.isArray(stored) ? stored : null;
};

export const writeList = (key, list, { quiet = false } = {}) => {
  writeStorage(key, Array.isArray(list) ? list : []);
  if (!quiet) announceWorkforceChanged();
};

export default {
  announceWorkforceChanged,
  readList,
  writeList,
};
