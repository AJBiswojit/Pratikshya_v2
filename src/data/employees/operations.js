/**
 * PRATIKSHYA FASHON — Mock retail-operations data.
 *
 * Floor tickets, stock movements, support cases and styling work used
 * by role-specific portals. Customer checkout orders are read separately
 * from the existing order service when present.
 */

export const MOCK_ASSISTED_ORDERS = [
  {
    id: "PF-FLR-00018",
    employeeId: "PF-SLS-00124",
    associate: "Ananya Sharma",
    customer: "Radhika Bose",
    phone: "+91 99001 11223",
    department: "Women's Sarees",
    pieces: "Banarasi silk saree · Gold zari",
    amount: 24850,
    status: "Billed",
    createdAt: "2026-08-11T11:20:00.000Z",
  },
  {
    id: "PF-FLR-00017",
    employeeId: "PF-SLS-00124",
    associate: "Ananya Sharma",
    customer: "Sneha Kulkarni",
    phone: "+91 99001 11880",
    department: "Women's Sarees",
    pieces: "Pato cotton saree · Indigo",
    amount: 8990,
    status: "Hold — alteration",
    createdAt: "2026-08-11T10:05:00.000Z",
  },
  {
    id: "PF-FLR-00016",
    employeeId: "PF-SLS-00131",
    associate: "Meera Nair",
    customer: "Aisha Rahman",
    phone: "+91 98877 22001",
    department: "Bridal",
    pieces: "Bridal lehenga · Ivory & rose gold",
    amount: 186000,
    status: "Consultation billed",
    createdAt: "2026-08-11T12:40:00.000Z",
  },
  {
    id: "PF-FLR-00014",
    employeeId: "PF-SLS-00124",
    associate: "Ananya Sharma",
    customer: "Ananya Sharma",
    phone: "+91 98765 43210",
    department: "Women's Sarees",
    pieces: "Silk saree · Heritage weave",
    amount: 16400,
    status: "Delivered to bag",
    createdAt: "2026-08-10T16:18:00.000Z",
  },
  {
    id: "PF-FLR-00012",
    employeeId: "PF-SLS-00131",
    associate: "Meera Nair",
    customer: "Priyanka Patel",
    phone: "+91 97123 98765",
    department: "Bridal",
    pieces: "Reception saree · Champagne",
    amount: 42000,
    status: "Fitting booked",
    createdAt: "2026-08-09T14:00:00.000Z",
  },
];

export const MOCK_FOLLOW_UPS = [
  { id: "fu-01", employeeId: "PF-SLS-00124", customer: "Nandini Rao", note: "Banarasi shortlist — decide by Thursday", when: "Today · 4:00 PM" },
  { id: "fu-02", employeeId: "PF-SLS-00124", customer: "Kavita Menon", note: "Blouse measurement pending", when: "Tomorrow · 11:30 AM" },
  { id: "fu-03", employeeId: "PF-SLS-00131", customer: "Aisha Rahman", note: "Second lehenga viewing with family", when: "Today · 6:00 PM" },
  { id: "fu-04", employeeId: "PF-STY-00012", customer: "Meher Gill", note: "Trousseau colour story", when: "Friday · 12:00 PM" },
];

export const MOCK_OFFERS = [
  { id: "off-01", name: "Festive Weave Week", applies: "Silk & Banarasi sarees", value: "10% on billed pieces", status: "Live", until: "24 August 2026" },
  { id: "off-02", name: "Bridal Atelier Preview", applies: "Bridal suite consultations", value: "Complimentary styling hour", status: "Live", until: "31 August 2026" },
  { id: "off-03", name: "Family Celebration", applies: "Kids festive + men's kurta", value: "₹1,500 off above ₹12,000", status: "Scheduled", until: "7 September 2026" },
  { id: "off-04", name: "Jewellery Pairing", applies: "Bangles with saree purchase", value: "15% on selected kada", status: "Live", until: "18 August 2026" },
];

export const MOCK_SUPPORT_CASES = [
  { id: "CS-1044", customer: "Rohan Mehta", topic: "Groom sherwani delivery window", status: "Open", priority: "Today", owner: "Divya Krishnan" },
  { id: "CS-1041", customer: "Ananya Sharma", topic: "Blouse stitch confirmation", status: "Waiting on atelier", priority: "Today", owner: "Divya Krishnan" },
  { id: "CS-1038", customer: "Priyanka Patel", topic: "Return window for innerwear set", status: "Open", priority: "Tomorrow", owner: "Divya Krishnan" },
  { id: "CS-1033", customer: "Kavita Menon", topic: "Invoice copy for Banarasi", status: "Resolved", priority: "Done", owner: "Divya Krishnan" },
  { id: "CS-1029", customer: "Aisha Rahman", topic: "Bridal fitting reschedule", status: "Open", priority: "Today", owner: "Divya Krishnan" },
];

export const MOCK_FEEDBACK = [
  { id: "fb-12", customer: "Sneha Kulkarni", score: 5, note: "Ananya found the exact indigo Pato I had in mind.", at: "2026-08-10" },
  { id: "fb-11", customer: "Rohan Mehta", score: 4, note: "Alteration took a day longer than promised.", at: "2026-08-09" },
  { id: "fb-10", customer: "Meher Gill", score: 5, note: "Ishita's bridal edit felt considered, not rushed.", at: "2026-08-08" },
  { id: "fb-09", customer: "Nandini Rao", score: 3, note: "Wanted more Banarasi options under ₹20,000.", at: "2026-08-07" },
];

export const MOCK_STYLING_REQUESTS = [
  { id: "ST-220", customer: "Aisha Rahman", occasion: "Wedding — pheras", status: "In consultation", stylist: "Ishita Kapoor", when: "Today · 2:00 PM" },
  { id: "ST-218", customer: "Meher Gill", occasion: "Trousseau edit", status: "Moodboard ready", stylist: "Ishita Kapoor", when: "Today · 4:30 PM" },
  { id: "ST-214", customer: "Radhika Bose", occasion: "Reception saree", status: "New request", stylist: "Ishita Kapoor", when: "Tomorrow · 11:00 AM" },
  { id: "ST-210", customer: "Ananya Sharma", occasion: "Festive family puja", status: "Recommended", stylist: "Ishita Kapoor", when: "Friday · 1:00 PM" },
];

export const MOCK_APPOINTMENTS = [
  { id: "ap-71", customer: "Aisha Rahman", type: "Bridal consultation", with: "Ishita Kapoor", when: "Today · 2:00 PM", room: "Bridal Suite" },
  { id: "ap-70", customer: "Meher Gill", type: "Trousseau styling", with: "Ishita Kapoor", when: "Today · 4:30 PM", room: "Atelier" },
  { id: "ap-69", customer: "Kavita Menon", type: "Saree drape session", with: "Ananya Sharma", when: "Tomorrow · 12:00 PM", room: "Main Floor" },
  { id: "ap-68", customer: "Rohan Mehta", type: "Groom fitting", with: "Vikram Iyer", when: "Tomorrow · 5:00 PM", room: "First Floor" },
];

export const MOCK_PERFORMANCE = {
  "PF-SLS-00124": {
    monthlyTarget: 1800000,
    achievement: 1246500,
    customersServed: 42,
    ordersAssisted: 18,
    conversion: 31,
    averageTicket: 69250,
    followUps: 6,
  },
  "PF-SLS-00131": {
    monthlyTarget: 2400000,
    achievement: 1864000,
    customersServed: 21,
    ordersAssisted: 9,
    conversion: 38,
    averageTicket: 207111,
    followUps: 4,
  },
  "PF-SLS-00155": {
    monthlyTarget: 1200000,
    achievement: 0,
    customersServed: 0,
    ordersAssisted: 0,
    conversion: 0,
    averageTicket: 0,
    followUps: 0,
  },
  "PF-SLS-00122": {
    monthlyTarget: 1400000,
    achievement: 842000,
    customersServed: 19,
    ordersAssisted: 8,
    conversion: 27,
    averageTicket: 105250,
    followUps: 2,
  },
  "PF-INV-00031": {
    monthlyTarget: 0,
    achievement: 0,
    customersServed: 0,
    ordersAssisted: 0,
    conversion: 0,
    averageTicket: 0,
    followUps: 0,
    stockAccuracy: 98.4,
    transfersClosed: 16,
    adjustments: 3,
  },
  "PF-INV-00044": {
    monthlyTarget: 0,
    achievement: 0,
    customersServed: 0,
    ordersAssisted: 0,
    stockReceived: 86,
    adjustments: 2,
    transfersRaised: 5,
  },
  "PF-CS-00044": {
    monthlyTarget: 0,
    achievement: 0,
    customersServed: 27,
    casesClosed: 18,
    openCases: 11,
    pendingReturns: 4,
    responseMinutes: 14,
  },
  "PF-STY-00012": {
    monthlyTarget: 0,
    achievement: 0,
    customersServed: 16,
    appointments: 4,
    stylingRequests: 9,
    bridalConsults: 3,
    recommendations: 16,
  },
  "PF-MGR-00008": {
    monthlyTarget: 9200000,
    achievement: 6842600,
    customersServed: 186,
    ordersAssisted: 74,
    conversion: 28,
    teamOnFloor: 14,
  },
};

export const MOCK_WALKIN_CUSTOMERS = [
  { id: "walk-01", name: "Radhika Bose", phone: "+91 99001 11223", email: "radhika.bose@example.com", interest: "Banarasi silk", lastVisit: "Today", associate: "Ananya Sharma" },
  { id: "walk-02", name: "Sneha Kulkarni", phone: "+91 99001 11880", email: "sneha.kulkarni@example.com", interest: "Pato cotton", lastVisit: "Today", associate: "Ananya Sharma" },
  { id: "walk-03", name: "Aisha Rahman", phone: "+91 98877 22001", email: "aisha.rahman@example.com", interest: "Bridal lehenga", lastVisit: "Today", associate: "Meera Nair" },
  { id: "walk-04", name: "Meher Gill", phone: "+91 98112 33445", email: "meher.gill@example.com", interest: "Trousseau", lastVisit: "Yesterday", associate: "Ishita Kapoor" },
  { id: "walk-05", name: "Nandini Rao", phone: "+91 97665 44332", email: "nandini.rao@example.com", interest: "Silk under ₹20,000", lastVisit: "2 days ago", associate: "Ananya Sharma" },
  { id: "walk-06", name: "Kavita Menon", phone: "+91 98221 55667", email: "kavita.menon@example.com", interest: "Saree + blouse", lastVisit: "3 days ago", associate: "Ananya Sharma" },
];

export const INITIAL_ACTIVITY = [
  {
    id: "act-seed-01",
    at: "2026-08-08T11:00:00.000Z",
    actorEmployeeId: null,
    actorName: "Kavya Menon · PF-ADM-00001",
    targetEmployeeId: "PF-SLS-00155",
    action: "EMPLOYEE_CREATED",
    summary: "Created employee Tanvi Joshi · PF-SLS-00155",
  },
  {
    id: "act-seed-02",
    at: "2026-07-30T09:12:00.000Z",
    actorEmployeeId: null,
    actorName: "Kavya Menon · PF-ADM-00001",
    targetEmployeeId: "PF-SLS-00140",
    action: "EMPLOYEE_SUSPENDED",
    summary: "Suspended Nikhil Rao · PF-SLS-00140",
  },
  {
    id: "act-seed-03",
    at: "2026-01-06T10:00:00.000Z",
    actorEmployeeId: null,
    actorName: "Kavya Menon · PF-ADM-00001",
    targetEmployeeId: "PF-SLS-00118",
    action: "EMPLOYEE_DEACTIVATED",
    summary: "Deactivated Pooja Reddy · PF-SLS-00118",
  },
  {
    id: "act-seed-04",
    at: "2026-07-28T16:40:00.000Z",
    actorEmployeeId: "PF-MGR-00008",
    actorName: "Vikram Iyer",
    targetEmployeeId: "PF-SLS-00122",
    action: "STATUS_CHANGED",
    summary: "Marked Leela Sen on leave",
  },
];

export default {
  MOCK_ASSISTED_ORDERS,
  MOCK_FOLLOW_UPS,
  MOCK_OFFERS,
  MOCK_SUPPORT_CASES,
  MOCK_FEEDBACK,
  MOCK_STYLING_REQUESTS,
  MOCK_APPOINTMENTS,
  MOCK_PERFORMANCE,
  MOCK_WALKIN_CUSTOMERS,
  INITIAL_ACTIVITY,
};
