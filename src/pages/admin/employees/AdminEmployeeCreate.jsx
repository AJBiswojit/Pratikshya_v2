import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import EmployeeForm, { emptyEmployeeDraft } from "../../../components/employee/EmployeeForm";
import PermissionMatrix from "../../../components/employee/PermissionMatrix";
import CredentialSheet from "../../../components/employee/CredentialSheet";
import { AtelierButton } from "../../../design-system";
import { useEmployeeManagement } from "../../../context/EmployeeManagementContext";
import { getDefaultPermissions } from "../../../config/employeeRoles";
import { generateEmployeeId } from "../../../services/employees/employeeId";

export default function AdminEmployeeCreate() {
  const navigate = useNavigate();
  const { employees, createEmployee, isWorking } = useEmployeeManagement();
  const [draft, setDraft] = useState(emptyEmployeeDraft);
  const [permissions, setPermissions] = useState([]);
  const [customPermissions, setCustomPermissions] = useState(false);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const generatedId = useMemo(
    () => draft.role
      ? generateEmployeeId({
          role: draft.role,
          department: draft.department,
          existingIds: employees.map((person) => person.employeeId),
        })
      : "Assigned after a role is selected",
    [draft.role, draft.department, employees]
  );

  const handleChange = (next) => {
    if (next.role !== draft.role) {
      setPermissions(next.role ? getDefaultPermissions(next.role) : []);
    }
    setDraft(next);
    setErrors({});
    setSubmitError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isWorking) return;
    setErrors({});
    setSubmitError("");
    const created = await createEmployee({
      ...draft,
      permissionMode: customPermissions ? "custom" : "role",
      permissions: customPermissions ? permissions : getDefaultPermissions(draft.role),
    });
    if (!created.ok) {
      setErrors(created.errors || {});
      setSubmitError(created.message || created.errors?.authorization || "Please review the highlighted employee details.");
      return;
    }
    setResult(created);
  };

  if (result?.employee) {
    return (
      <AdminPage
        eyebrow="People / Organization"
        title="Employee created"
        description="The account is in the existing employee identity store. Share the temporary credential once."
      >
        <CredentialSheet
          employee={result.employee}
          temporaryPassword={result.temporaryPassword}
          onDone={() => navigate(`/admin/employees/${result.employee.employeeId}`)}
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      eyebrow="People / Organization / New"
      title={<>Add an <span className="italic text-accent">employee.</span></>}
      description="Create an operational employee identity. Admin and Super Admin roles are intentionally unavailable here."
    >
      {submitError ? (
        <p role="alert" className="mb-6 border border-accent/40 bg-accent/5 px-4 py-3 font-ui text-sm text-accent">
          {submitError}
        </p>
      ) : null}

      <form onSubmit={submit} className="space-y-7">
        <AdminPanel
          eyebrow="Account identity"
          title="Employee details"
          action={
            <div className="text-right">
              <p className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe">Employee ID</p>
              <p className="mt-1 font-ui text-xs text-ink">{generatedId}</p>
            </div>
          }
        >
          <EmployeeForm values={draft} errors={errors} onChange={handleChange} idPrefix="admin-create-employee" />
          <p className="mt-5 border-l-2 border-accent pl-3 font-ui text-[11px] leading-relaxed text-taupe">
            A unique, deterministic employee ID and temporary password are generated when saved. The employee must change that password on first sign-in.
          </p>
        </AdminPanel>

        <AdminPanel eyebrow="Operational access" title="Permissions">
          <label className="flex items-start gap-3 font-ui text-sm text-ink">
            <input
              type="checkbox"
              checked={customPermissions}
              onChange={(event) => {
                const custom = event.target.checked;
                setCustomPermissions(custom);
                if (custom && draft.role) setPermissions(getDefaultPermissions(draft.role));
              }}
              className="mt-0.5 accent-ink"
            />
            <span>
              Customise operational permissions
              <span className="mt-1 block text-[11px] text-taupe">
                Employee-account administration is reserved to Super Admin and cannot be granted here.
              </span>
            </span>
          </label>
          {errors.permissions ? <p className="mt-3 font-ui text-xs text-accent">{errors.permissions}</p> : null}
          {customPermissions ? (
            <PermissionMatrix
              className="mt-6"
              permissions={permissions}
              editable
              onToggle={(key, allowed) =>
                setPermissions((current) =>
                  allowed ? [...new Set([...current, key])] : current.filter((item) => item !== key)
                )
              }
            />
          ) : (
            <p className="mt-4 font-ui text-xs text-taupe">
              The selected role's established operational permission set will be used.
            </p>
          )}
        </AdminPanel>

        <div className="flex flex-wrap gap-3">
          <AtelierButton type="submit" disabled={isWorking}>
            {isWorking ? "Creating…" : "Create employee"}
          </AtelierButton>
          <AtelierButton type="button" variant="outline" onClick={() => navigate("/admin/employees")} disabled={isWorking}>
            Cancel
          </AtelierButton>
        </div>
      </form>
    </AdminPage>
  );
}
