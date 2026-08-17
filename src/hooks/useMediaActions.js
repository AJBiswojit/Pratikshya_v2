/**
 * PRATIKSHYA FASHON — Media actions.
 *
 * Every media write an operator can make, in one hook, so that each one:
 *
 *   1. goes through `mediaRepository` — the single door
 *   2. is signed by whoever is holding the session
 *   3. is recorded in the existing admin activity log, not a new one
 *
 * Pages call `actions.upload(...)`, `actions.setCover(...)` and so on; they
 * never import the repository's write methods directly, and they never write
 * an activity entry by hand.
 */

import { useCallback, useMemo } from "react";
import mediaRepository from "../services/media/mediaRepository";
import { ACTIVITY_ACTIONS } from "../services/employees/activityService";
import { getPlacementLabel, getProductRoleLabel } from "../config/mediaTypes";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useEmployeeAuth } from "../context/EmployeeAuthContext";
import { useEmployeeManagement } from "../context/EmployeeManagementContext";
import { resolveMediaAccess } from "../services/media/mediaAccess";

/** A short, readable name for a record in the activity line. */
const nameOf = (media) => media?.title || media?.fileName || media?.id || "media";

export default function useMediaActions() {
  const { admin } = useAdminAuth();
  const { employee } = useEmployeeAuth();
  const { noteEvent } = useEmployeeManagement();

  const access = useMemo(() => resolveMediaAccess({ admin, employee }), [admin, employee]);

  /* An admin session signs entries with the administrator's name; an
     employee session is already the log's default actor. */
  const signature = useMemo(
    () =>
      admin
        ? { actorEmployeeId: admin.adminId ?? null, actorName: admin.name ?? "Administrator" }
        : null,
    [admin]
  );

  const note = useCallback(
    (action, summary) => noteEvent?.(action, summary, signature),
    [noteEvent, signature]
  );

  /* ---------------------------------------------------------------- */
  /* Creating                                                          */
  /* ---------------------------------------------------------------- */

  /** Adds one or more drafts. Returns the records actually created. */
  const upload = useCallback(
    (drafts = [], context = {}) => {
      const list = Array.isArray(drafts) ? drafts : [drafts];
      const isEmp = !admin && Boolean(employee);
      const provenanceDefaults = isEmp
        ? {
            uploadedBy: [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") || "Employee",
            uploadedByEmployeeId: employee?.employeeId || null,
            uploadedByType: "EMPLOYEE",
            status: context.status || "PENDING_REVIEW",
          }
        : {
            uploadedBy: admin?.name || "Administrator",
            uploadedByEmployeeId: admin?.adminId || null,
            uploadedByType: "ADMIN",
            status: context.status || "ACTIVE",
          };

      const created = mediaRepository.createMany(
        list.map((draft) => ({ ...provenanceDefaults, ...context, ...draft }))
      );

      if (created.length) {
        const where = context.productId
          ? ` for product ${context.productId}`
          : context.placement
            ? ` to ${getPlacementLabel(context.placement)}`
            : " to the library";

        const isPending = created.some((item) => item.status === "PENDING_REVIEW");
        const actionType = isPending
          ? ACTIVITY_ACTIONS.MEDIA_SUBMITTED_FOR_REVIEW
          : ACTIVITY_ACTIONS.MEDIA_UPLOADED;

        const actorCode = isEmp ? employee?.employeeId || "Employee" : admin?.name || "Admin";

        note(
          actionType,
          created.length === 1
            ? `${actorCode} uploaded ${nameOf(created[0])}${where}${isPending ? " (submitted for review)" : ""}.`
            : `${actorCode} uploaded ${created.length} media assets${where}${isPending ? " (submitted for review)" : ""}.`
        );
      }
      return created;
    },
    [admin, employee, note]
  );

  /* ---------------------------------------------------------------- */
  /* Review & Approval                                                 */
  /* ---------------------------------------------------------------- */

  const approve = useCallback(
    (mediaId) => {
      const reviewer = admin
        ? { name: admin.name || "Administrator", id: admin.adminId }
        : { name: [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") || "Manager", id: employee?.employeeId };

      const next = mediaRepository.approve(mediaId, reviewer);
      if (next) {
        note(
          ACTIVITY_ACTIONS.MEDIA_APPROVED,
          `Approved ${nameOf(next)}${next.productId ? ` for ${next.productId}` : ""}.`
        );
      }
      return next;
    },
    [admin, employee, note]
  );

  const reject = useCallback(
    (mediaId, reason = "") => {
      const reviewer = admin
        ? { name: admin.name || "Administrator", id: admin.adminId }
        : { name: [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") || "Manager", id: employee?.employeeId };

      const next = mediaRepository.reject(mediaId, reason, reviewer);
      if (next) {
        note(
          ACTIVITY_ACTIONS.MEDIA_REJECTED,
          `Rejected ${nameOf(next)}${reason ? `: "${reason}"` : ""}.`
        );
      }
      return next;
    },
    [admin, employee, note]
  );

  const approveMany = useCallback(
    (mediaIds = []) => {
      const reviewer = admin
        ? { name: admin.name || "Administrator", id: admin.adminId }
        : { name: [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") || "Manager", id: employee?.employeeId };

      const approved = mediaRepository.approveMany(mediaIds, reviewer);
      if (approved.length) {
        note(
          ACTIVITY_ACTIONS.MEDIA_APPROVED,
          `Approved ${approved.length} media assets.`
        );
      }
      return approved;
    },
    [admin, employee, note]
  );

  const rejectMany = useCallback(
    (mediaIds = [], reason = "") => {
      const reviewer = admin
        ? { name: admin.name || "Administrator", id: admin.adminId }
        : { name: [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") || "Manager", id: employee?.employeeId };

      const rejected = mediaRepository.rejectMany(mediaIds, reason, reviewer);
      if (rejected.length) {
        note(
          ACTIVITY_ACTIONS.MEDIA_REJECTED,
          `Rejected ${rejected.length} media assets${reason ? `: "${reason}"` : ""}.`
        );
      }
      return rejected;
    },
    [admin, employee, note]
  );

  /* ---------------------------------------------------------------- */
  /* Editing                                                           */
  /* ---------------------------------------------------------------- */

  const edit = useCallback(
    (mediaId, changes) => {
      const next = mediaRepository.update(mediaId, changes);
      if (next) note(ACTIVITY_ACTIONS.MEDIA_EDITED, `Edited ${nameOf(next)}.`);
      return next;
    },
    [note]
  );

  const activate = useCallback(
    (mediaId) => {
      const next = mediaRepository.activate(mediaId);
      if (!next) return null;
      note(
        next.placement ? ACTIVITY_ACTIONS.MARKETING_MEDIA_ACTIVATED : ACTIVITY_ACTIONS.MEDIA_EDITED,
        next.placement
          ? `Activated ${nameOf(next)} on ${getPlacementLabel(next.placement)}.`
          : `Published ${nameOf(next)}.`
      );
      return next;
    },
    [note]
  );

  const archive = useCallback(
    (mediaId) => {
      const next = mediaRepository.archive(mediaId);
      if (!next) return null;
      note(
        next.placement ? ACTIVITY_ACTIONS.MARKETING_MEDIA_ARCHIVED : ACTIVITY_ACTIONS.MEDIA_EDITED,
        next.placement
          ? `Archived ${nameOf(next)} from ${getPlacementLabel(next.placement)}.`
          : `Archived ${nameOf(next)}.`
      );
      return next;
    },
    [note]
  );

  const setStatus = useCallback(
    (mediaId, status) => {
      const next = mediaRepository.setStatus(mediaId, status);
      if (next) note(ACTIVITY_ACTIONS.MEDIA_EDITED, `Set ${nameOf(next)} to ${status.toLowerCase()}.`);
      return next;
    },
    [note]
  );

  /* ---------------------------------------------------------------- */
  /* Removing                                                          */
  /* ---------------------------------------------------------------- */

  const remove = useCallback(
    (mediaId) => {
      const gone = mediaRepository.remove(mediaId);
      if (gone) note(ACTIVITY_ACTIONS.MEDIA_REMOVED, `Removed ${nameOf(gone)}.`);
      return gone;
    },
    [note]
  );

  const removeMany = useCallback(
    (mediaIds = []) => {
      const gone = mediaRepository.removeMany(mediaIds);
      if (gone.length) {
        note(
          ACTIVITY_ACTIONS.MEDIA_REMOVED,
          gone.length === 1 ? `Removed ${nameOf(gone[0])}.` : `Removed ${gone.length} media items.`
        );
      }
      return gone;
    },
    [note]
  );

  /* ---------------------------------------------------------------- */
  /* Arranging                                                         */
  /* ---------------------------------------------------------------- */

  const setCover = useCallback(
    (productId, mediaId) => {
      const next = mediaRepository.setCover(productId, mediaId);
      if (next) {
        note(ACTIVITY_ACTIONS.MEDIA_COVER_CHANGED, `Cover for ${productId} is now ${nameOf(next)}.`);
      }
      return next;
    },
    [note]
  );

  const move = useCallback(
    (productId, mediaId, direction) => {
      const ordered = mediaRepository.moveWithinProduct(productId, mediaId, direction);
      note(ACTIVITY_ACTIONS.MEDIA_REORDERED, `Reordered media for ${productId}.`);
      return ordered;
    },
    [note]
  );

  const reorder = useCallback(
    (productId, orderedIds) => {
      const ordered = mediaRepository.reorder(productId, orderedIds);
      note(ACTIVITY_ACTIONS.MEDIA_REORDERED, `Reordered media for ${productId}.`);
      return ordered;
    },
    [note]
  );

  /* ---------------------------------------------------------------- */
  /* Assigning                                                         */
  /* ---------------------------------------------------------------- */

  const assignToProduct = useCallback(
    (mediaId, productId, role = null) => {
      const next = mediaRepository.assignToProduct(mediaId, productId, role);
      if (!next) return null;
      note(
        ACTIVITY_ACTIONS.MEDIA_ASSIGNED,
        productId
          ? `Assigned ${nameOf(next)} to ${productId}${role ? ` as ${getProductRoleLabel(role)}` : ""}.`
          : `Returned ${nameOf(next)} to the library.`
      );
      return next;
    },
    [note]
  );

  const assignToPlacement = useCallback(
    (mediaId, placement, meta = {}) => {
      const next = mediaRepository.assignToPlacement(mediaId, placement, meta);
      if (!next) return null;
      note(
        ACTIVITY_ACTIONS.MEDIA_ASSIGNED,
        placement
          ? `Assigned ${nameOf(next)} to ${getPlacementLabel(placement)}.`
          : `Returned ${nameOf(next)} to the library.`
      );
      return next;
    },
    [note]
  );

  return useMemo(
    () => ({
      access,
      upload,
      edit,
      activate,
      archive,
      approve,
      reject,
      approveMany,
      rejectMany,
      setStatus,
      remove,
      removeMany,
      setCover,
      move,
      reorder,
      assignToProduct,
      assignToPlacement,
      reset: mediaRepository.resetMedia,
    }),
    [
      access,
      upload,
      edit,
      activate,
      archive,
      approve,
      reject,
      approveMany,
      rejectMany,
      setStatus,
      remove,
      removeMany,
      setCover,
      move,
      reorder,
      assignToProduct,
      assignToPlacement,
    ]
  );
}
