/**
 * PRATIKSHYA FASHON — Isolated DEMO employee credentials.
 *
 * FRONTEND DEMO ONLY. These are not production secrets.
 * They exist so the client demo can sign in without a backend.
 *
 * Never copy this table into an employee profile. Never log the password.
 */

/*
 * NOTE — Admin/Employee boundary:
 * Admin credentials (Kavya Menon · PF-ADM-00001) live in the isolated
 * admin credential table (src/data/admin/demoAdminCredentials.js) and are
 * used at /admin/login only. They are never listed here.
 */
export const DEMO_EMPLOYEE_LOGINS = [
  {
    employeeId: "PF-MGR-00008",
    password: "PF@Mgr4N",
    label: "Vikram Iyer · Store Manager",
    highlight: false,
  },
  {
    employeeId: "PF-SLS-00124",
    password: "PF@7Kx92",
    label: "Ananya Sharma · Sales · Women's Sarees",
    highlight: true,
  },
  {
    employeeId: "PF-SLS-00131",
    password: "PF@Sls9W",
    label: "Meera Nair · Sales · Bridal",
    highlight: false,
  },
  {
    employeeId: "PF-SLS-00155",
    password: "PF@Tmp8Q",
    label: "Tanvi Joshi · First login (must change password)",
    highlight: false,
  },
  {
    employeeId: "PF-SLS-00122",
    password: "PF@Lv3Nk",
    label: "Leela Sen · Sales · On leave",
    highlight: false,
  },
  {
    employeeId: "PF-INV-00031",
    password: "PF@Inv3Q",
    label: "Arjun Desai · Inventory Manager",
    highlight: false,
  },
  {
    employeeId: "PF-INV-00044",
    password: "PF@Inv8L",
    label: "Riya Banerjee · Inventory Staff",
    highlight: false,
  },
  {
    employeeId: "PF-INV-00052",
    password: "PF@Inv2H",
    label: "Suresh Patil · Inventory Staff",
    highlight: false,
  },
  {
    employeeId: "PF-WHS-00018",
    password: "PF@Whs6Y",
    label: "Imran Qureshi · Warehouse",
    highlight: false,
  },
  {
    employeeId: "PF-CS-00044",
    password: "PF@Cs5Rp",
    label: "Divya Krishnan · Customer Support",
    highlight: false,
  },
  {
    employeeId: "PF-STY-00012",
    password: "PF@Sty1B",
    label: "Ishita Kapoor · Fashion Stylist",
    highlight: false,
  },
  {
    employeeId: "PF-SLS-00140",
    password: "PF@Sus9X",
    label: "Nikhil Rao · Suspended (login blocked)",
    highlight: false,
    blocked: true,
  },
  {
    employeeId: "PF-SLS-00118",
    password: "PF@Ina4M",
    label: "Pooja Reddy · Inactive (login blocked)",
    highlight: false,
    blocked: true,
  },
];

export const findDemoLogin = (employeeId) =>
  DEMO_EMPLOYEE_LOGINS.find((entry) => entry.employeeId === employeeId) ?? null;

export default {
  DEMO_EMPLOYEE_LOGINS,
  findDemoLogin,
};
