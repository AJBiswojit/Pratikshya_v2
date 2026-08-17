/**
 * Resolve the employee's assigned house location.
 *
 * Uses the existing inventory location register. Never invents GPS.
 */

import { FALLBACK_LOCATION } from "../../config/attendanceConfig";
import { getStoreLabel } from "../../config/employeeDepartments";
import inventoryRepository from "../inventory/inventoryRepository";

export const resolveEmployeeLocation = (employee) => {
  const locations = inventoryRepository.loadLocations();
  const preferWarehouse = employee?.store === "WAREHOUSE";
  const match = locations.find((location) =>
    preferWarehouse ? location.type === "WAREHOUSE" : location.type === "STORE"
  );
  const location = match || locations[0] || FALLBACK_LOCATION;
  return {
    locationId: location.id,
    locationName: location.name,
    locationType: location.type,
    assignedFloor: getStoreLabel(employee?.store),
    demo: Boolean(location.demo) || !match,
    caption: match
      ? `${location.name} · assigned floor ${getStoreLabel(employee?.store)} · demo, not GPS`
      : `${FALLBACK_LOCATION.name} · assigned floor ${getStoreLabel(employee?.store)} · demo fallback, not GPS`,
  };
};

export const locationLabel = (locationId) => {
  if (!locationId) return "Unassigned";
  const locations = inventoryRepository.loadLocations();
  const match = locations.find((location) => location.id === locationId);
  return match?.name || (locationId === FALLBACK_LOCATION.id ? FALLBACK_LOCATION.name : locationId);
};

export default { resolveEmployeeLocation, locationLabel };
