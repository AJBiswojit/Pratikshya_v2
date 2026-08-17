/**
 * PRATIKSHYA FASHON — Payment service abstraction.
 *
 * The one seam between the checkout UI and payment processing. Phase 8 is
 * a frontend demo, so the only implementation is a clearly-labelled mock
 * service that resolves deterministic demo scenarios — but the UI depends
 * only on this interface, never on the mock.
 *
 * Future wiring (unchanged UI):
 *
 *   Frontend
 *     └── paymentService (interface below)
 *           ├── MockPaymentService      (this phase — demo)
 *           ├── SandboxPaymentService   (later — test gateway via backend)
 *           └── ProductionPaymentService(later — never in client code)
 *
 * No gateway credentials, secret keys or real card data ever appear in
 * this module or anywhere in the client.
 */

export const PAYMENT_STATUS = {
  /** No payment attempt yet. */
  IDLE: "idle",
  /** Awaiting resolution — never assumed to be success. */
  PENDING: "pending",
  SUCCESS: "success",
  FAILURE: "failure",
  CANCELLED: "cancelled",
};

/** How long each demo scenario stays pending before resolving, ms. */
const SCENARIO_DELAYS = {
  success: 1800,
  failure: 1600,
  cancelled: 1200,
  pending: 4200,
};

const resolveScenario = (scenario) => {
  switch (scenario) {
    case "failure":
      return PAYMENT_STATUS.FAILURE;
    case "cancelled":
      return PAYMENT_STATUS.CANCELLED;
    case "pending":
      // A long verification, then success — never a false success.
      return PAYMENT_STATUS.SUCCESS;
    case "success":
    default:
      return PAYMENT_STATUS.SUCCESS;
  }
};

/**
 * The mock implementation. Each created session starts PENDING and
 * resolves itself to the outcome of its scenario after a realistic delay.
 * `cancelPayment` interrupts a pending session; a settled session is final.
 *
 * All state lives in memory — nothing payment-related is persisted.
 */
export class MockPaymentService {
  constructor(options = {}) {
    this.scenario = options.scenario ?? "success";
    this.sessions = new Map();
    this.sequence = 0;
  }

  /** Creates a pending payment session for the demo amount + method. */
  async createPayment({ amount, method, scenario } = {}) {
    const session = {
      id: `mockpay-${Date.now().toString(36)}-${(this.sequence += 1)}`,
      amount,
      method,
      scenario: scenario ?? this.scenario,
      status: PAYMENT_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      settledAt: null,
    };
    this.sessions.set(session.id, session);

    const delay = SCENARIO_DELAYS[session.scenario] ?? 1600;
    setTimeout(() => {
      if (session.status !== PAYMENT_STATUS.PENDING) return;
      session.status = resolveScenario(session.scenario);
      session.settledAt = new Date().toISOString();
      this.notify(session);
    }, delay);

    return session;
  }

  /** The current status of a session, or null when unknown. */
  async getPaymentStatus(sessionId) {
    return this.sessions.get(sessionId)?.status ?? null;
  }

  /** Cancels a session that is still pending. Settled sessions are final. */
  async cancelPayment(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && session.status === PAYMENT_STATUS.PENDING) {
      session.status = PAYMENT_STATUS.CANCELLED;
      session.settledAt = new Date().toISOString();
      this.notify(session);
    }
    return session?.status ?? null;
  }

  /** Subscribes to a session's resolution; returns an unsubscribe fn. */
  subscribe(sessionId, listener) {
    const session = this.sessions.get(sessionId);
    if (!session) return () => {};
    session.listeners = session.listeners ?? [];
    session.listeners.push(listener);
    return () => {
      session.listeners = (session.listeners ?? []).filter(
        (entry) => entry !== listener
      );
    };
  }

  notify(session) {
    (session.listeners ?? []).forEach((listener) => listener(session));
  }
}

let sharedService = null;

/**
 * Returns the active payment service. Phase 8 always resolves to the
 * mock; a future `VITE_PAYMENT_PROVIDER=sandbox` would resolve to the
 * sandbox implementation behind the same interface without touching the UI.
 */
export const getPaymentService = () => {
  if (sharedService) return sharedService;
  const provider = import.meta.env?.VITE_PAYMENT_PROVIDER ?? "mock";
  sharedService =
    provider === "mock"
      ? new MockPaymentService()
      : // Future sandbox/production adapters plug in here — never in client code.
        new MockPaymentService();
  return sharedService;
};

export default {
  PAYMENT_STATUS,
  MockPaymentService,
  getPaymentService,
};
