/**
 * PRATIKSHYA FASHON — Departments, sections and store locations.
 *
 * The mall is organised by fashion house, not by generic corporate units.
 * Employees are assigned a department, a section inside it, and a floor.
 */

export const DEPARTMENTS = {
  WOMENS_SAREES: "WOMENS_SAREES",
  WOMENS_LEHENGAS: "WOMENS_LEHENGAS",
  BRIDAL: "BRIDAL",
  GROOM: "GROOM",
  BANGLES_JEWELLERY: "BANGLES_JEWELLERY",
  KIDS: "KIDS",
  MENS_KURTA: "MENS_KURTA",
  INNER_WEAR: "INNER_WEAR",
  ACCESSORIES: "ACCESSORIES",
  CUSTOMER_SUPPORT: "CUSTOMER_SUPPORT",
  INVENTORY: "INVENTORY",
  WAREHOUSE: "WAREHOUSE",
  MANAGEMENT: "MANAGEMENT",
};

export const DEPARTMENT_DEFINITIONS = {
  [DEPARTMENTS.WOMENS_SAREES]: {
    id: DEPARTMENTS.WOMENS_SAREES,
    label: "Women's Sarees",
    idPrefix: "SLS",
    sections: [
      { id: "SILK_BANARASI", label: "Silk & Banarasi" },
      { id: "COTTON_PATO", label: "Cotton & Pato" },
      { id: "DESIGNER_SAREES", label: "Designer Sarees" },
    ],
  },
  [DEPARTMENTS.WOMENS_LEHENGAS]: {
    id: DEPARTMENTS.WOMENS_LEHENGAS,
    label: "Women's Lehengas",
    idPrefix: "SLS",
    sections: [
      { id: "PARTY_LEHENGAS", label: "Party Lehengas" },
      { id: "DESIGNER_LEHENGAS", label: "Designer Lehengas" },
    ],
  },
  [DEPARTMENTS.BRIDAL]: {
    id: DEPARTMENTS.BRIDAL,
    label: "Bridal",
    idPrefix: "SLS",
    sections: [
      { id: "BRIDAL_COUTURE", label: "Bridal Couture" },
      { id: "TROUSSEAU", label: "Trousseau" },
      { id: "RECEPTION", label: "Reception Wear" },
    ],
  },
  [DEPARTMENTS.GROOM]: {
    id: DEPARTMENTS.GROOM,
    label: "Groom",
    idPrefix: "SLS",
    sections: [
      { id: "SHERWANI", label: "Sherwani" },
      { id: "WEDDING_KURTA", label: "Wedding Kurta" },
    ],
  },
  [DEPARTMENTS.BANGLES_JEWELLERY]: {
    id: DEPARTMENTS.BANGLES_JEWELLERY,
    label: "Bangles & Jewellery",
    idPrefix: "SLS",
    sections: [
      { id: "BRIDAL_JEWELLERY", label: "Bridal Jewellery" },
      { id: "BANGLES", label: "Bangles" },
      { id: "SETS", label: "Sets & Pairings" },
    ],
  },
  [DEPARTMENTS.KIDS]: {
    id: DEPARTMENTS.KIDS,
    label: "Kids Wear",
    idPrefix: "SLS",
    sections: [
      { id: "GIRLS_ETHNIC", label: "Girls Ethnic" },
      { id: "BOYS_ETHNIC", label: "Boys Ethnic" },
    ],
  },
  [DEPARTMENTS.MENS_KURTA]: {
    id: DEPARTMENTS.MENS_KURTA,
    label: "Men's Kurta",
    idPrefix: "SLS",
    sections: [
      { id: "EVERYDAY_KURTA", label: "Everyday Kurta" },
      { id: "FESTIVE_KURTA", label: "Festive Kurta" },
    ],
  },
  [DEPARTMENTS.INNER_WEAR]: {
    id: DEPARTMENTS.INNER_WEAR,
    label: "Inner Wear",
    idPrefix: "SLS",
    sections: [{ id: "ESSENTIALS", label: "Essentials" }],
  },
  [DEPARTMENTS.ACCESSORIES]: {
    id: DEPARTMENTS.ACCESSORIES,
    label: "Accessories",
    idPrefix: "SLS",
    sections: [
      { id: "DUPATTAS", label: "Dupattas & Stoles" },
      { id: "FINISHING", label: "Finishing Pieces" },
    ],
  },
  [DEPARTMENTS.CUSTOMER_SUPPORT]: {
    id: DEPARTMENTS.CUSTOMER_SUPPORT,
    label: "Customer Support",
    idPrefix: "CS",
    sections: [
      { id: "CARE_DESK", label: "Care Desk" },
      { id: "RETURNS_DESK", label: "Returns Desk" },
    ],
  },
  [DEPARTMENTS.INVENTORY]: {
    id: DEPARTMENTS.INVENTORY,
    label: "Inventory",
    idPrefix: "INV",
    sections: [
      { id: "FLOOR_STOCK", label: "Floor Stock" },
      { id: "STOCK_CONTROL", label: "Stock Control" },
    ],
  },
  [DEPARTMENTS.WAREHOUSE]: {
    id: DEPARTMENTS.WAREHOUSE,
    label: "Warehouse",
    idPrefix: "WHS",
    sections: [
      { id: "RECEIVING", label: "Receiving" },
      { id: "DISPATCH", label: "Dispatch" },
      { id: "PICK_PACK", label: "Pick & Pack" },
    ],
  },
  [DEPARTMENTS.MANAGEMENT]: {
    id: DEPARTMENTS.MANAGEMENT,
    label: "Management",
    idPrefix: "MGR",
    sections: [
      { id: "STORE_LEADERSHIP", label: "Store Leadership" },
      { id: "OPERATIONS", label: "Operations" },
    ],
  },
};

export const STORES = {
  MAIN_FLOOR: { id: "MAIN_FLOOR", label: "Main Floor" },
  FIRST_FLOOR: { id: "FIRST_FLOOR", label: "First Floor" },
  BRIDAL_SUITE: { id: "BRIDAL_SUITE", label: "Bridal Suite" },
  JEWELLERY_SALON: { id: "JEWELLERY_SALON", label: "Jewellery Salon" },
  WAREHOUSE: { id: "WAREHOUSE", label: "Warehouse" },
  CARE_DESK: { id: "CARE_DESK", label: "Customer Care Desk" },
};

export const DEPARTMENT_OPTIONS = Object.values(DEPARTMENT_DEFINITIONS);
export const STORE_OPTIONS = Object.values(STORES);

export const getDepartment = (id) =>
  DEPARTMENT_DEFINITIONS[id] ?? {
    id: id || "UNKNOWN",
    label: "Unassigned department",
    idPrefix: "EMP",
    sections: [],
  };

export const getDepartmentLabel = (id) => getDepartment(id).label;

export const getSection = (departmentId, sectionId) => {
  const department = getDepartment(departmentId);
  return (
    department.sections.find((section) => section.id === sectionId) ?? {
      id: sectionId || "UNASSIGNED",
      label: sectionId ? String(sectionId) : "Unassigned section",
    }
  );
};

export const getSectionLabel = (departmentId, sectionId) =>
  getSection(departmentId, sectionId).label;

export const getStore = (id) =>
  STORES[id] ?? { id: id || "UNKNOWN", label: id ? String(id) : "Unassigned floor" };

export const getStoreLabel = (id) => getStore(id).label;

export const sectionsForDepartment = (departmentId) => getDepartment(departmentId).sections;

export default {
  DEPARTMENTS,
  DEPARTMENT_DEFINITIONS,
  DEPARTMENT_OPTIONS,
  STORES,
  STORE_OPTIONS,
  getDepartment,
  getDepartmentLabel,
  getSection,
  getSectionLabel,
  getStore,
  getStoreLabel,
  sectionsForDepartment,
};
