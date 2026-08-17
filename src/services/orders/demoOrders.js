/**
 * PRATIKSHYA FASHON — Demo order generator (Phase 15)
 *
 * Produces realistic demo orders covering every lifecycle stage so the
 * admin and employee desks are populated in a fresh browser without
 * requiring a checkout.
 *
 * Uses real catalogue identities, realistic Indian customer data,
 * realistic pricing and deterministic timestamps.
 * Only used when localStorage has no orders — never overwrites real orders.
 */

import catalogRepository from "../catalogRepository";
import { ORDER_STATUS, ORDER_PAYMENT_STATUS, FULFILLMENT_STATUS } from "../../config/orderConfig";
import { buildTrackingId, buildInvoiceNumber } from "../../utils/orders";
import { buildFulfillmentRecord } from "./fulfillmentService";
import { buildTimelineEvent } from "./orderTimelineService";
import { ORDER_ACTIVITY_TYPES } from "../../config/orderConfig";

const now = new Date("2026-08-12T10:00:00.000Z");

const customers = [
  { fullName: "Ananya Sharma", email: "ananya.sharma@example.com", phone: "+91 98765 40001", city: "Bhubaneswar" },
  { fullName: "Riya Banerjee", email: "riya.b@example.com", phone: "+91 98765 40002", city: "Kolkata" },
  { fullName: "Meera Nair", email: "meera.nair@example.com", phone: "+91 98765 40003", city: "Mumbai" },
  { fullName: "Sneha Kulkarni", email: "sneha.k@example.com", phone: "+91 98765 40004", city: "Pune" },
  { fullName: "Ishita Kapoor", email: "ishita.k@example.com", phone: "+91 98765 40005", city: "Delhi" },
  { fullName: "Divya Krishnan", email: "divya.k@example.com", phone: "+91 98765 40006", city: "Chennai" },
  { fullName: "Pooja Reddy", email: "pooja.reddy@example.com", phone: "+91 98765 40007", city: "Hyderabad" },
  { fullName: "Kavita Menon", email: "kavita.menon@example.com", phone: "+91 98765 40008", city: "Bhubaneswar" },
  { fullName: "Radhika Bose", email: "radhika.bose@example.com", phone: "+91 98765 40009", city: "Kolkata" },
  { fullName: "Aarav Singh", email: "aarav.s@example.com", phone: "+91 98765 40010", city: "Lucknow" },
  { fullName: "Vikram Iyer", email: "vikram.iyer@example.com", phone: "+91 98765 40011", city: "Bengaluru" },
  { fullName: "Leela Sen", email: "leela.sen@example.com", phone: "+91 98765 40012", city: "Jaipur" },
];

/** No generated orders are created while the catalogue is intentionally empty. */
export const generateDemoOrders = () => [];

export default { generateDemoOrders };
