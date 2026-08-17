/**
 * PRATIKSHYA FASHON — Workforce live subscription.
 *
 * The repositories write to namespaced storage and announce
 * `pratikshya-workforce-changed`. This provider keeps dashboards and
 * desks in sync without a second data store.
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { WORKFORCE_CHANGED_EVENT } from "../config/attendanceConfig";

const WorkforceContext = createContext(null);

export function WorkforceProvider({ children }) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const sync = () => setRevision((value) => value + 1);
    window.addEventListener(WORKFORCE_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WORKFORCE_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const value = useMemo(() => ({ revision }), [revision]);
  return <WorkforceContext.Provider value={value}>{children}</WorkforceContext.Provider>;
}

export function useWorkforce() {
  return useContext(WorkforceContext) ?? { revision: 0 };
}

export default WorkforceContext;
