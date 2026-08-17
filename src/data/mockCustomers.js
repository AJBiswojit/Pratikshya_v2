/**
 * PRATIKSHYA FASHON — Realistic Mock Customers & Demo Accounts
 *
 * Clearly isolated mock data for frontend demonstration purposes.
 * Passwords and sensitive credentials are isolated in demo-only lookup
 * and are NEVER exposed, logged, or persisted in cleartext.
 */

export const INITIAL_DEMO_CUSTOMERS = [
  {
    id: "cust-01",
    firstName: "Ananya",
    lastName: "Sharma",
    email: "ananya.sharma@example.com",
    phone: "+91 98765 43210",
    dateOfBirth: "1994-08-14",
    avatar: null,
    memberSince: "October 2024",
    createdAt: "2024-10-15T10:30:00.000Z",
    addresses: [
      {
        id: "addr-01",
        fullName: "Ananya Sharma",
        phone: "+91 98765 43210",
        addressLine: "Flat 402, Lotus Residency, 14th Main Road",
        landmark: "Near Indiranagar Club",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560038",
        type: "Home",
        isDefault: true,
      },
      {
        id: "addr-02",
        fullName: "Ananya Sharma",
        phone: "+91 98765 43210",
        addressLine: "Atelier Studio, Level 3, UB City",
        landmark: "Vittal Mallya Road",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
        type: "Work",
        isDefault: false,
      },
    ],
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      promotionalUpdates: true,
      orderUpdates: true,
      stylingInvitations: true,
    },
    security: {
      activeSessions: [
        {
          id: "sess-01",
          device: "Chrome on macOS (Current Device)",
          location: "Bengaluru, India",
          lastActive: "Active now",
          isCurrent: true,
        },
        {
          id: "sess-02",
          device: "Safari on iPhone 15 Pro",
          location: "Bengaluru, India",
          lastActive: "Yesterday at 6:45 PM",
          isCurrent: false,
        },
      ],
    },
  },
  {
    id: "cust-02",
    firstName: "Rohan",
    lastName: "Mehta",
    email: "rohan.mehta@example.com",
    phone: "+91 98200 12345",
    dateOfBirth: "1991-03-22",
    avatar: null,
    memberSince: "January 2025",
    createdAt: "2025-01-10T14:20:00.000Z",
    addresses: [
      {
        id: "addr-03",
        fullName: "Rohan Mehta",
        phone: "+91 98200 12345",
        addressLine: "B-12, Sea Breeze Apartments, Worli Sea Face",
        landmark: "Opposite Promenade Garden",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400030",
        type: "Home",
        isDefault: true,
      },
    ],
    preferences: {
      emailNotifications: true,
      smsNotifications: true,
      promotionalUpdates: false,
      orderUpdates: true,
      stylingInvitations: false,
    },
    security: {
      activeSessions: [
        {
          id: "sess-03",
          device: "Firefox on Windows (Current Device)",
          location: "Mumbai, India",
          lastActive: "Active now",
          isCurrent: true,
        },
      ],
    },
  },
  {
    id: "cust-03",
    firstName: "Priyanka",
    lastName: "Patel",
    email: "priyanka.patel@example.com",
    phone: "+91 97123 98765",
    dateOfBirth: "1996-11-05",
    avatar: null,
    memberSince: "April 2025",
    createdAt: "2025-04-02T09:15:00.000Z",
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
          id: "sess-04",
          device: "Safari on iOS (Current Device)",
          location: "Ahmedabad, India",
          lastActive: "Active now",
          isCurrent: true,
        },
      ],
    },
  },
];

/**
 * Isolated demo credentials table for mock matching only.
 * In this frontend demo, any password >= 6 characters or standard demo password works for demo accounts.
 */
export const DEMO_CREDENTIALS = [
  {
    email: "ananya.sharma@example.com",
    phone: "+91 98765 43210",
    phoneClean: "9876543210",
    customerId: "cust-01",
    label: "Ananya Sharma (Default Demo Customer with Addresses)",
  },
  {
    email: "rohan.mehta@example.com",
    phone: "+91 98200 12345",
    phoneClean: "9820012345",
    customerId: "cust-02",
    label: "Rohan Mehta (Groom & Menswear Customer)",
  },
  {
    email: "priyanka.patel@example.com",
    phone: "+91 97123 98765",
    phoneClean: "9712398765",
    customerId: "cust-03",
    label: "Priyanka Patel (New Customer, No Addresses)",
  },
];

export default {
  INITIAL_DEMO_CUSTOMERS,
  DEMO_CREDENTIALS,
};
