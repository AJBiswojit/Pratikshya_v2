/**
 * PRATIKSHYA FASHON — Media authorization.
 *
 * Media is governed by the permission architecture the house already has:
 * the keys live in `employeePermissions`, the role defaults in
 * `employeeRoles`, and the checks in `employees/authorization`. Nothing here
 * invents a second permission system — this file only answers "who is
 * asking" for the two portals that can reach media.
 *
 *   Admin Portal    a Super Admin session carries every media permission
 *   Employee portal permissions come from the employee's own grant list
 *   Customer        no media permissions at all
 *
 * UI hiding is never the only control: the routes are also guarded, and a
 * real backend must enforce the same keys later.
 */

import { PERMISSIONS } from "../../config/employeePermissions";
import { hasPermission } from "../employees/authorization";

export const MEDIA_PERMISSIONS = {
  VIEW: PERMISSIONS.MEDIA_VIEW,
  UPLOAD: PERMISSIONS.MEDIA_UPLOAD,
  EDIT: PERMISSIONS.MEDIA_EDIT,
  DELETE: PERMISSIONS.MEDIA_DELETE,
  ASSIGN: PERMISSIONS.MEDIA_ASSIGN,
  MANAGE: PERMISSIONS.MEDIA_MANAGE,
};

/** Every media permission, granted. */
const fullGrant = {
  canView: true,
  canUpload: true,
  canEdit: true,
  canDelete: true,
  canAssign: true,
  canManageMarketing: true,
};

/** No media permissions at all — the answer for a signed-out visitor. */
const noGrant = {
  canView: false,
  canUpload: false,
  canEdit: false,
  canDelete: false,
  canAssign: false,
  canManageMarketing: false,
};

/**
 * Resolves what a viewer may do with media.
 *
 * `admin` is an Admin Portal session; `employee` an employee one. An
 * administrator is answered first because the Admin Portal is where media
 * is managed.
 */
export const resolveMediaAccess = ({ admin = null, employee = null } = {}) => {
  if (admin) return { ...fullGrant, actorLabel: admin.name ?? "Administrator" };
  if (!employee) return { ...noGrant, actorLabel: "Guest" };

  return {
    canView: hasPermission(employee, MEDIA_PERMISSIONS.VIEW),
    canUpload: hasPermission(employee, MEDIA_PERMISSIONS.UPLOAD),
    canEdit: hasPermission(employee, MEDIA_PERMISSIONS.EDIT),
    canDelete: hasPermission(employee, MEDIA_PERMISSIONS.DELETE),
    canAssign: hasPermission(employee, MEDIA_PERMISSIONS.ASSIGN),
    canManageMarketing: hasPermission(employee, MEDIA_PERMISSIONS.MANAGE),
    actorLabel: [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "Team member",
  };
};

export default resolveMediaAccess;
