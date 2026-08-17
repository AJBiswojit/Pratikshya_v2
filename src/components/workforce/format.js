import { METRIC_UNIT } from "../../config/performanceConfig";
import { formatINR } from "../../utils/shopping";
import { formatCount } from "../../utils/employee";

export const formatMetricValue = (value, unit) => {
  if (value == null || value === "") return "—";
  if (unit === METRIC_UNIT.INR) return formatINR(value);
  if (unit === METRIC_UNIT.PERCENT) return `${Math.round(Number(value) * 10) / 10}%`;
  return formatCount(value);
};

export const formatPercent = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value) * 10) / 10}%`;
};

export default { formatMetricValue, formatPercent };
