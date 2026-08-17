/**
 * PRATIKSHYA FASHON — Customer Account Context
 *
 * Centralized customer account data management:
 * Profile details, Saved Addresses, Preferences, and Security session signals.
 *
 * Exposes a clean state and action interface ready for Phase 8 Checkout handoff.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  CUSTOMERS_REGISTRY_KEY,
} from "./AuthContext";
import { INITIAL_DEMO_CUSTOMERS } from "../data/mockCustomers";
import { readStorage, writeStorage } from "../utils/shopping";

const ACCOUNT_STORAGE_PREFIX = "pratikshya_account_";

const AccountContext = createContext(null);

const DEFAULT_PREFERENCES = {
  emailNotifications: true,
  smsNotifications: true,
  promotionalUpdates: true,
  orderUpdates: true,
  stylingInvitations: true,
};

/**
 * Loads account state for a specific customer ID from storage or registry.
 */
const loadCustomerAccountData = (customer) => {
  if (!customer?.id) {
    return {
      profile: null,
      addresses: [],
      preferences: DEFAULT_PREFERENCES,
      security: { activeSessions: [] },
    };
  }

  const storageKey = `${ACCOUNT_STORAGE_PREFIX}${customer.id}`;
  const stored = readStorage(storageKey, null);
  if (stored && typeof stored === "object") {
    return {
      profile: stored.profile || customer,
      addresses: Array.isArray(stored.addresses) ? stored.addresses : [],
      preferences: stored.preferences || DEFAULT_PREFERENCES,
      security: stored.security || { activeSessions: [] },
    };
  }

  // Fallback to initial demo record if available in initial registry
  const demoRecord = INITIAL_DEMO_CUSTOMERS.find((c) => c.id === customer.id);
  if (demoRecord) {
    return {
      profile: {
        id: demoRecord.id,
        firstName: demoRecord.firstName,
        lastName: demoRecord.lastName,
        email: demoRecord.email,
        phone: demoRecord.phone,
        dateOfBirth: demoRecord.dateOfBirth || "",
        avatar: demoRecord.avatar || null,
        memberSince: demoRecord.memberSince || "2025",
        createdAt: demoRecord.createdAt,
      },
      addresses: demoRecord.addresses || [],
      preferences: demoRecord.preferences || DEFAULT_PREFERENCES,
      security: demoRecord.security || { activeSessions: [] },
    };
  }

  return {
    profile: customer,
    addresses: [],
    preferences: DEFAULT_PREFERENCES,
    security: {
      activeSessions: [
        {
          id: "sess-cur",
          device: "Current Browser & Device",
          location: "India",
          lastActive: "Active now",
          isCurrent: true,
        },
      ],
    },
  };
};

export function AccountProvider({ children }) {
  const { user, updateUser } = useAuth();

  const [accountData, setAccountData] = useState(() =>
    loadCustomerAccountData(user)
  );

  // Reload account data whenever active authenticated user changes
  useEffect(() => {
    setAccountData(loadCustomerAccountData(user));
  }, [user?.id]);

  // Persist account data on changes
  useEffect(() => {
    if (!user?.id) return;
    const storageKey = `${ACCOUNT_STORAGE_PREFIX}${user.id}`;
    writeStorage(storageKey, accountData);

    // Also sync back to mock registry for consistency
    const registry = readStorage(CUSTOMERS_REGISTRY_KEY, INITIAL_DEMO_CUSTOMERS);
    if (Array.isArray(registry)) {
      const updatedRegistry = registry.map((c) =>
        c.id === user.id
          ? {
              ...c,
              firstName: accountData.profile?.firstName || c.firstName,
              lastName: accountData.profile?.lastName || c.lastName,
              email: accountData.profile?.email || c.email,
              phone: accountData.profile?.phone || c.phone,
              dateOfBirth: accountData.profile?.dateOfBirth || c.dateOfBirth,
              avatar: accountData.profile?.avatar || c.avatar,
              addresses: accountData.addresses,
              preferences: accountData.preferences,
            }
          : c
      );
      writeStorage(CUSTOMERS_REGISTRY_KEY, updatedRegistry);
    }
  }, [user?.id, accountData]);

  /* ---------------------------------------------------------------- */
  /* Profile Actions                                                  */
  /* ---------------------------------------------------------------- */

  const updateProfile = useCallback(
    (newProfile) => {
      setAccountData((current) => {
        const nextProfile = {
          ...current.profile,
          ...newProfile,
        };
        return {
          ...current,
          profile: nextProfile,
        };
      });

      // Synchronize auth state
      if (updateUser) {
        updateUser(newProfile);
      }

      return { ok: true, message: "Your profile has been updated." };
    },
    [updateUser]
  );

  /* ---------------------------------------------------------------- */
  /* Address Actions                                                  */
  /* ---------------------------------------------------------------- */

  const addAddress = useCallback((addressData) => {
    const id = `addr-${Date.now().toString(36)}`;
    setAccountData((current) => {
      const currentList = current.addresses || [];
      const makeDefault = addressData.isDefault || currentList.length === 0;

      const newAddress = {
        id,
        fullName: addressData.fullName || "",
        phone: addressData.phone || "",
        addressLine: addressData.addressLine || "",
        landmark: addressData.landmark || "",
        city: addressData.city || "",
        state: addressData.state || "",
        pincode: addressData.pincode || "",
        type: addressData.type || "Home",
        isDefault: makeDefault,
      };

      const updatedList = makeDefault
        ? currentList.map((a) => ({ ...a, isDefault: false }))
        : [...currentList];

      return {
        ...current,
        addresses: [...updatedList, newAddress],
      };
    });

    return { ok: true, addressId: id, message: "Address added successfully." };
  }, []);

  const updateAddress = useCallback((addressId, updatedFields) => {
    setAccountData((current) => {
      const currentList = current.addresses || [];
      const makeDefault = Boolean(updatedFields.isDefault);

      const nextList = currentList.map((addr) => {
        if (addr.id === addressId) {
          return { ...addr, ...updatedFields, isDefault: makeDefault };
        }
        if (makeDefault) {
          return { ...addr, isDefault: false };
        }
        return addr;
      });

      return {
        ...current,
        addresses: nextList,
      };
    });

    return { ok: true, message: "Address updated successfully." };
  }, []);

  const deleteAddress = useCallback((addressId) => {
    setAccountData((current) => {
      const currentList = current.addresses || [];
      const remaining = currentList.filter((a) => a.id !== addressId);

      // If the deleted address was default and others remain, designate first as default
      const wasDefault = currentList.find((a) => a.id === addressId)?.isDefault;
      if (wasDefault && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }

      return {
        ...current,
        addresses: remaining,
      };
    });

    return { ok: true, message: "Address removed." };
  }, []);

  const setDefaultAddress = useCallback((addressId) => {
    setAccountData((current) => {
      const currentList = current.addresses || [];
      const updated = currentList.map((addr) => ({
        ...addr,
        isDefault: addr.id === addressId,
      }));

      return {
        ...current,
        addresses: updated,
      };
    });

    return { ok: true, message: "Default address updated." };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Preferences Actions                                              */
  /* ---------------------------------------------------------------- */

  const updatePreferences = useCallback((newPreferences) => {
    setAccountData((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        ...newPreferences,
      },
    }));

    return { ok: true, message: "Notification preferences saved." };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Security Mock Actions                                            */
  /* ---------------------------------------------------------------- */

  const signOutOtherSessions = useCallback(() => {
    setAccountData((current) => ({
      ...current,
      security: {
        activeSessions: (current.security?.activeSessions || []).filter(
          (s) => s.isCurrent
        ),
      },
    }));

    return { ok: true, message: "Signed out of all other devices." };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Derived State                                                    */
  /* ---------------------------------------------------------------- */

  const defaultAddress = useMemo(() => {
    const list = accountData.addresses || [];
    return list.find((a) => a.isDefault) || list[0] || null;
  }, [accountData.addresses]);

  const value = useMemo(
    () => ({
      profile: accountData.profile,
      addresses: accountData.addresses,
      defaultAddress,
      preferences: accountData.preferences,
      security: accountData.security,
      updateProfile,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      updatePreferences,
      signOutOtherSessions,
    }),
    [
      accountData,
      defaultAddress,
      updateProfile,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      updatePreferences,
      signOutOtherSessions,
    ]
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

/**
 * Accessor hook for customer account state.
 */
export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    return {
      profile: null,
      addresses: [],
      defaultAddress: null,
      preferences: DEFAULT_PREFERENCES,
      security: { activeSessions: [] },
      updateProfile: () => ({ ok: false, message: "" }),
      addAddress: () => ({ ok: false, addressId: null, message: "" }),
      updateAddress: () => ({ ok: false, message: "" }),
      deleteAddress: () => ({ ok: false, message: "" }),
      setDefaultAddress: () => ({ ok: false, message: "" }),
      updatePreferences: () => ({ ok: false, message: "" }),
      signOutOtherSessions: () => ({ ok: false, message: "" }),
    };
  }
  return context;
}

export default AccountContext;
