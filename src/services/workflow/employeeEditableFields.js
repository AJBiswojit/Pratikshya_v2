/**
 * PRATIKSHYA FASHON — Employee-editable product fields (Phase 2, Step D).
 *
 * The single whitelist of product fields an assigned employee may edit
 * through the workflow. Leaf module (no imports) so both the workflow
 * command service and the compatibility layer (productWorkflow) can share it
 * without import cycles. Identity, ownership, status and assignment fields
 * are deliberately excluded.
 */

/** Fields an assigned employee may edit — never identity or ownership. */
export const EMPLOYEE_EDITABLE_FIELDS = [
  "name",
  "price",
  "compareAtPrice",
  "description",
  "shortDescription",
  "category",
  "subcategory",
  "gender",
  "fabric",
  "material",
  "primaryColor",
  "secondaryColor",
  "colors",
  "patterns",
  "work",
  "occasion",
  "sizes",
  "season",
  "fit",
  "length",
  "highlights",
  "careInstructions",
  "collectionIds",
  "collections",
  "tags",
  "stock",
  "availability",
];

export const pickEmployeeEditableFields = (patch = {}) =>
  Object.fromEntries(
    Object.entries(patch).filter(([key]) => EMPLOYEE_EDITABLE_FIELDS.includes(key))
  );

export default {
  EMPLOYEE_EDITABLE_FIELDS,
  pickEmployeeEditableFields,
};
