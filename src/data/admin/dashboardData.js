/**
 * PRATIKSHYA FASHON — Admin dashboard mock business data.
 *
 * Static, centralised and deliberately deterministic: the same numbers on
 * every render so the demo never contradicts itself. Each export is the
 * seam a real reporting service replaces later.
 *
 * Amounts are rupees as plain numbers — formatting happens in the UI via
 * `formatINR` so currency presentation stays in one place.
 */

/* ------------------------------------------------------------------ */
/* Headline metrics                                                    */
/* ------------------------------------------------------------------ */

export const BUSINESS_METRICS = {
  todaysSales: 124850,
  totalOrders: 184,
  customers: 2486,
  pendingOrders: 18,
  returns: 4,
  employeesPresent: 32,
};

/** Movement against the previous comparable period, for the metric hints. */
export const METRIC_TRENDS = {
  todaysSales: "+12.4% vs yesterday",
  totalOrders: "This month",
  customers: "Registered accounts",
  pendingOrders: "Awaiting fulfilment",
  returns: "Open requests",
  employeesPresent: "Checked in today",
};

/* ------------------------------------------------------------------ */
/* Sales overview — last seven days                                    */
/* ------------------------------------------------------------------ */

export const SALES_SERIES = [
  { day: "Wed", date: "06 Aug", sales: 98400, orders: 21 },
  { day: "Thu", date: "07 Aug", sales: 112600, orders: 24 },
  { day: "Fri", date: "08 Aug", sales: 141200, orders: 29 },
  { day: "Sat", date: "09 Aug", sales: 186500, orders: 38 },
  { day: "Sun", date: "10 Aug", sales: 174300, orders: 34 },
  { day: "Mon", date: "11 Aug", sales: 96800, orders: 19 },
  { day: "Tue", date: "12 Aug", sales: 124850, orders: 26 },
];

/** Share of the week's revenue by fashion category. */
export const SALES_BY_CATEGORY = [
  { id: "sarees", label: "Sarees", sales: 386400 },
  { id: "lehengas", label: "Lehengas", sales: 241800 },
  { id: "bridal", label: "Bridal", sales: 198600 },
  { id: "jewellery", label: "Bangles & Jewellery", sales: 96200 },
  { id: "kids", label: "Kids", sales: 62400 },
  { id: "kurta", label: "Men's Kurta", sales: 49250 },
];

/* ------------------------------------------------------------------ */
/* Department performance                                              */
/* ------------------------------------------------------------------ */

export const DEPARTMENT_PERFORMANCE = [
  { id: "WOMENS_SAREES", label: "Women's Sarees", sales: 386400, orders: 62, target: 420000 },
  { id: "WOMENS_LEHENGAS", label: "Women's Lehengas", sales: 241800, orders: 28, target: 260000 },
  { id: "BRIDAL", label: "Bridal", sales: 198600, orders: 9, target: 300000 },
  { id: "GROOM", label: "Groom", sales: 74300, orders: 11, target: 90000 },
  { id: "BANGLES_JEWELLERY", label: "Bangles & Jewellery", sales: 96200, orders: 34, target: 100000 },
  { id: "KIDS", label: "Kids", sales: 62400, orders: 26, target: 60000 },
  { id: "MENS_KURTA", label: "Men's Kurta", sales: 49250, orders: 22, target: 55000 },
  { id: "INNER_WEAR", label: "Inner Wear", sales: 21400, orders: 31, target: 30000 },
  { id: "ACCESSORIES", label: "Accessories", sales: 34800, orders: 41, target: 35000 },
];

/* ------------------------------------------------------------------ */
/* Recent orders fallback                                              */
/* ------------------------------------------------------------------ */

/**
 * Shown only when the browser has no customer orders yet. Real orders from
 * OrderContext always take precedence — the Admin Portal never runs a
 * second, disconnected order system.
 */
export const DEMO_RECENT_ORDERS = [
  {
    id: "PF-ORD-24188",
    customer: "Radhika Bose",
    items: 2,
    amount: 24850,
    status: "CONFIRMED",
    placedAt: "2026-08-12T06:20:00.000Z",
  },
  {
    id: "PF-ORD-24187",
    customer: "Aisha Rahman",
    items: 1,
    amount: 186000,
    status: "PROCESSING",
    placedAt: "2026-08-11T12:40:00.000Z",
  },
  {
    id: "PF-ORD-24186",
    customer: "Sneha Kulkarni",
    items: 3,
    amount: 18990,
    status: "SHIPPED",
    placedAt: "2026-08-11T10:05:00.000Z",
  },
  {
    id: "PF-ORD-24185",
    customer: "Priyanka Patel",
    items: 1,
    amount: 42000,
    status: "DELIVERED",
    placedAt: "2026-08-10T14:00:00.000Z",
  },
  {
    id: "PF-ORD-24184",
    customer: "Kavita Menon",
    items: 4,
    amount: 31500,
    status: "PLACED",
    placedAt: "2026-08-10T09:15:00.000Z",
  },
];

/* ------------------------------------------------------------------ */
/* People snapshot                                                     */
/* ------------------------------------------------------------------ */

/** Departments leading the house this month, by achievement. */
export const TOP_DEPARTMENTS = [
  { id: "WOMENS_SAREES", label: "Women's Sarees", achievement: 92 },
  { id: "BANGLES_JEWELLERY", label: "Bangles & Jewellery", achievement: 96 },
  { id: "KIDS", label: "Kids", achievement: 104 },
];

export default {
  BUSINESS_METRICS,
  METRIC_TRENDS,
  SALES_SERIES,
  SALES_BY_CATEGORY,
  DEPARTMENT_PERFORMANCE,
  DEMO_RECENT_ORDERS,
  TOP_DEPARTMENTS,
};
