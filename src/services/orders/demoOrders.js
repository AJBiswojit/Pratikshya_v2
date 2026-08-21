/**
 * PRATIKSHYA FASHON — Demo order generator.
 *
 * Intentionally empty. Checkout, employee-assisted tickets and the
 * canonical order register are the only sources of order records.
 * `loadOrders` still calls this when the register is empty so a future
 * sandbox seeder can return records without touching the loader.
 */
export const generateDemoOrders = () => [];

export default { generateDemoOrders };
