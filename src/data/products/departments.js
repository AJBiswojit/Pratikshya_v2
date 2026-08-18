/**
 * Department and category helpers projected from the generated catalogue
 * taxonomy. Department is an ordinary product field: every admin and
 * storefront consumer reads the same Department → Category → Subcategory
 * hierarchy from `src/data/catalog/taxonomy.js`.
 */

import { departments as canonicalDepartments } from "../catalog/taxonomy";

const titleCase = (value) =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const departmentRows = canonicalDepartments.map((department) => ({
  value: department.id,
  label: department.name,
  categories: department.categories.map((category) => ({
    value: category.id,
    label: category.name,
    subcategories: category.subcategories.map((subcategory) => ({
      value: subcategory.slug,
      label: subcategory.name,
    })),
  })),
}));

const departmentById = new Map(departmentRows.map((department) => [department.value, department]));
const categoryToDepartment = new Map(
  departmentRows.flatMap((department) =>
    department.categories.map((category) => [category.value, department.value])
  )
);

export const DEPARTMENTS = departmentRows;

export const DEPARTMENT_OPTIONS = departmentRows.map(({ value, label }) => ({ value, label }));

export const departmentForCategory = (category) =>
  categoryToDepartment.get(String(category || "")) ?? null;

export const departmentForProduct = (product) => {
  const explicit = String(product?.department || "").trim();
  if (departmentById.has(explicit)) return explicit;
  return departmentForCategory(product?.category);
};

export const categoriesForDepartment = (department) =>
  departmentById.get(String(department || ""))?.categories.map(({ value, label }) => ({ value, label })) ?? [];

export const subcategoriesForDepartmentCategory = (department, category) => {
  const row = departmentById
    .get(String(department || ""))
    ?.categories.find((entry) => entry.value === category);
  return row?.subcategories.map(({ value, label }) => ({ value, label })) ?? [];
};

export const categoryLabel = (department, category) =>
  categoriesForDepartment(department).find((entry) => entry.value === category)?.label ?? titleCase(category);

export const subcategoryLabel = (department, category, subcategory) =>
  subcategoriesForDepartmentCategory(department, category).find(
    (entry) => entry.value === subcategory
  )?.label ?? titleCase(subcategory);

export const productBelongsToDepartment = (product, department) =>
  departmentForProduct(product) === department;

export default DEPARTMENTS;
