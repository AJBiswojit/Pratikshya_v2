/**
 * PRATIKSHYA FASHON — Customer Authentication Context
 *
 * Centralized customer identity and authentication state.
 * Implements a clean frontend mock auth architecture with realistic persistence.
 *
 * Password values and secrets are NEVER stored or persisted.
 * Shopping state (Bag and Wishlist) is preserved across sign in and sign out.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { INITIAL_DEMO_CUSTOMERS } from "../data/mockCustomers";
import { readStorage, writeStorage } from "../utils/shopping";
import { isValidEmail, isValidPhone, validatePassword } from "../utils/validation";

export const AUTH_STORAGE_KEY = "pratikshya_auth";
export const CUSTOMERS_REGISTRY_KEY = "pratikshya_customers_registry";

const AuthContext = createContext(null);

/**
 * Returns current list of mock registered customers from storage,
 * falling back to INITIAL_DEMO_CUSTOMERS.
 */
const getCustomersRegistry = () => {
  const stored = readStorage(CUSTOMERS_REGISTRY_KEY, null);
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }
  return INITIAL_DEMO_CUSTOMERS;
};

/**
 * Restores the active mock authenticated session from localStorage.
 */
const restoreAuthSession = () => {
  const stored = readStorage(AUTH_STORAGE_KEY, null);
  if (!stored || typeof stored !== "object" || !stored.userId) {
    return null;
  }

  const registry = getCustomersRegistry();
  const customer = registry.find((c) => c.id === stored.userId);
  if (!customer) {
    // If not found in registry, fallback safely to stored user snapshot if present
    if (stored.userSnapshot?.id) {
      return stored.userSnapshot;
    }
    return null;
  }

  // Return customer profile without sensitive fields
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    dateOfBirth: customer.dateOfBirth || "",
    avatar: customer.avatar || null,
    memberSince: customer.memberSince || "2025",
    createdAt: customer.createdAt || new Date().toISOString(),
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(restoreAuthSession);
  const [isLoading, setIsLoading] = useState(false);

  // Sync active session changes to localStorage safely
  useEffect(() => {
    if (user?.id) {
      writeStorage(AUTH_STORAGE_KEY, {
        userId: user.id,
        userSnapshot: user,
        sessionAt: Date.now(),
      });
    } else {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      } catch {
        // Ignore storage removal error
      }
    }
  }, [user]);

  /**
   * Mock Sign In
   * Supports email or phone with friendly customer-facing validation.
   */
  const signIn = useCallback(
    async ({ identifier, password, remember = true }) => {
      setIsLoading(true);

      // Simulate a realistic brief network verification pause
      await new Promise((resolve) => setTimeout(resolve, 350));

      const cleanIdentifier = (identifier || "").trim().toLowerCase();
      const phoneDigits = cleanIdentifier.replace(/\D/g, "");

      if (!cleanIdentifier) {
        setIsLoading(false);
        return {
          ok: false,
          error: "Please enter your email address or phone number.",
        };
      }

      if (!password || password.length < 6) {
        setIsLoading(false);
        return {
          ok: false,
          error: "Please enter a valid password (minimum 6 characters).",
        };
      }

      const registry = getCustomersRegistry();

      // Find matching customer by email or phone
      const matched = registry.find((c) => {
        const cEmail = (c.email || "").toLowerCase();
        const cPhoneDigits = (c.phone || "").replace(/\D/g, "");
        return (
          cEmail === cleanIdentifier ||
          (phoneDigits.length >= 10 && cPhoneDigits.endsWith(phoneDigits.slice(-10)))
        );
      });

      if (!matched) {
        setIsLoading(false);
        return {
          ok: false,
          error: "That email or phone doesn't match our records.",
        };
      }

      const profile = {
        id: matched.id,
        firstName: matched.firstName,
        lastName: matched.lastName,
        email: matched.email,
        phone: matched.phone,
        dateOfBirth: matched.dateOfBirth || "",
        avatar: matched.avatar || null,
        memberSince: matched.memberSince || "2025",
        createdAt: matched.createdAt || new Date().toISOString(),
      };

      setUser(profile);
      setIsLoading(false);

      return {
        ok: true,
        user: profile,
      };
    },
    []
  );

  /**
   * Mock Sign Up
   * Registers a new customer into mock storage and logs them in.
   */
  const signUp = useCallback(
    async ({ firstName, lastName, email, phone, password, dateOfBirth = "" }) => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));

      const trimmedFirst = (firstName || "").trim();
      const trimmedLast = (lastName || "").trim();
      const trimmedEmail = (email || "").trim().toLowerCase();
      const trimmedPhone = (phone || "").trim();

      if (!trimmedFirst) {
        setIsLoading(false);
        return { ok: false, error: "First name is required." };
      }

      if (!isValidEmail(trimmedEmail)) {
        setIsLoading(false);
        return { ok: false, error: "Please provide a valid email address." };
      }

      if (trimmedPhone && !isValidPhone(trimmedPhone)) {
        setIsLoading(false);
        return { ok: false, error: "Please enter a valid 10-digit mobile number." };
      }

      const pwdValidation = validatePassword(password);
      if (!pwdValidation.ok) {
        setIsLoading(false);
        return { ok: false, error: pwdValidation.message };
      }

      const registry = getCustomersRegistry();

      // Duplicate email check
      const duplicate = registry.find(
        (c) => (c.email || "").toLowerCase() === trimmedEmail
      );
      if (duplicate) {
        setIsLoading(false);
        return {
          ok: false,
          error: "An account with this email already exists. Please sign in.",
        };
      }

      const now = new Date();
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const memberSinceStr = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

      const newCustomer = {
        id: `cust-${Date.now().toString(36)}`,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        email: trimmedEmail,
        phone: trimmedPhone || "",
        dateOfBirth: dateOfBirth || "",
        avatar: null,
        memberSince: memberSinceStr,
        createdAt: now.toISOString(),
        addresses: [],
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          promotionalUpdates: true,
          orderUpdates: true,
          stylingInvitations: true,
        },
        security: {
          activeSessions: [
            {
              id: `sess-${Date.now().toString(36)}`,
              device: "Current Browser & Device",
              location: "India",
              lastActive: "Active now",
              isCurrent: true,
            },
          ],
        },
      };

      // Persist new customer in mock registry
      const updatedRegistry = [...registry, newCustomer];
      writeStorage(CUSTOMERS_REGISTRY_KEY, updatedRegistry);

      const userProfile = {
        id: newCustomer.id,
        firstName: newCustomer.firstName,
        lastName: newCustomer.lastName,
        email: newCustomer.email,
        phone: newCustomer.phone,
        dateOfBirth: newCustomer.dateOfBirth,
        avatar: null,
        memberSince: newCustomer.memberSince,
        createdAt: newCustomer.createdAt,
      };

      setUser(userProfile);
      setIsLoading(false);

      return {
        ok: true,
        user: userProfile,
      };
    },
    []
  );

  /**
   * Sign Out
   * Clears mock auth session while strictly preserving shopping bag and wishlist.
   */
  const signOut = useCallback(() => {
    setUser(null);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  /**
   * Mock Forgot Password
   */
  const forgotPassword = useCallback(async (identifier) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    setIsLoading(false);

    if (!identifier || (!isValidEmail(identifier) && !isValidPhone(identifier))) {
      return {
        ok: false,
        error: "Please provide a registered email address or phone number.",
      };
    }

    return {
      ok: true,
      message: `Password reset instructions have been sent to ${identifier}.`,
    };
  }, []);

  /**
   * Mock Reset Password
   */
  const resetPassword = useCallback(async (newPassword, confirmPassword) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    setIsLoading(false);

    if (!newPassword || newPassword.length < 6) {
      return {
        ok: false,
        error: "Password must be at least 6 characters.",
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        ok: false,
        error: "Passwords do not match.",
      };
    }

    return {
      ok: true,
      message: "Your password has been successfully updated.",
    };
  }, []);

  /**
   * Update User in Auth State & Registry
   */
  const updateUser = useCallback((updatedFields) => {
    setUser((current) => {
      if (!current) return null;
      const nextUser = { ...current, ...updatedFields };

      // Also update in registry
      const registry = getCustomersRegistry();
      const nextRegistry = registry.map((c) =>
        c.id === nextUser.id ? { ...c, ...updatedFields } : c
      );
      writeStorage(CUSTOMERS_REGISTRY_KEY, nextRegistry);

      return nextUser;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      signIn,
      signUp,
      signOut,
      forgotPassword,
      resetPassword,
      updateUser,
    }),
    [
      user,
      isLoading,
      signIn,
      signUp,
      signOut,
      forgotPassword,
      resetPassword,
      updateUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Accessor hook for customer authentication state.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      signIn: async () => ({ ok: false, error: "" }),
      signUp: async () => ({ ok: false, error: "" }),
      signOut: () => {},
      forgotPassword: async () => ({ ok: false, error: "" }),
      resetPassword: async () => ({ ok: false, error: "" }),
      updateUser: () => {},
    };
  }
  return context;
}

export default AuthContext;
