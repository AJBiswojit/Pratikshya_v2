import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import EmployeeForm from "../../../components/employee/EmployeeForm";
import PermissionMatrix from "../../../components/employee/PermissionMatrix";
import { AtelierButton } from "../../../design-system";
import { useEmployeeManagement } from "../../../context/EmployeeManagementContext";
import { getDefaultPermissions } from "../../../config/employeeRoles";

const draftFrom = (person) => ({
  firstName: person.firstName,
  lastName: person.lastName,
  email: person.email,
  phone: person.phone,
  role: person.role,
  department: person.department,
  section: person.section,
  store: person.store,
  joiningDate: person.joiningDate,
  status: person.status,
});

export default function AdminEmployeeEdit() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { getEmployee, updateEmployee, isWorking } = useEmployeeManagement();
  const person = getEmployee(employeeId);
  const [draft, setDraft] = useState(() => person ? draftFrom(person) : null);
  const [permissions, setPermissions] = useState(() => person?.permissions || []);
  const [customPermissions, setCustomPermissions] = useState(() => person?.permissionMode === "custom");
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!person) return;
    setDraft(draftFrom(person));
    setPermissions(person.permissions || []);
    setCustomPermissions(person.permissionMode === "custom");
  }, [person?.employeeId]);

  if (!person || !draft) {
    return (
      <AdminPage eyebrow="People / Organization" title="Employee not found" description="That employee account is not in the register.">
        <AtelierButton as={Link} to="/admin/employees" size="chip" variant="outline">All employees</AtelierButton>
      </AdminPage>
    );
  }

  const handleChange = (next) => {
    if (next.role !== draft.role && !customPermissions) {
      setPermissions(getDefaultPermissions(next.role));
    }
    setDraft(next);
    setErrors({});
    setNotice("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isWorking) return;
    setErrors({});
    setNotice("");
    const result = await updateEmployee(person.employeeId, {
      ...draft,
      permissionMode: customPermissions ? "custom" : "role",
      permissions: customPermissions ? permissions : getDefaultPermissions(draft.role),
    });
    if (!result.ok) {
      setErrors(result.errors || {});
      setNotice(result.message || result.errors?.authorization || "Please review the employee details.");
      return;
    }
    navigate(`/admin/employees/${person.employeeId}`, {
      state: { notice: "Employee account saved." },
    });
  };

  return (
    <AdminPage
      eyebrow="People / Organization / Edit"
      title={<>Edit <span className="italic text-accent">{person.firstName}.</span></>}
      description={`${person.employeeId} is permanent. Role and permissions control Employee Portal operations, never Admin Portal access.`}
    >
      {notice ? (
        <p role="alert" className="mb-6 border border-accent/40 bg-accent/5 px-4 py-3 font-ui text-sm text-accent">{notice}</p>
      ) : null}

      <form onSubmit={submit} className="space-y-7">
        <AdminPanel eyebrow="Account identity" title="Employee details">
          <EmployeeForm values={draft} errors={errors} onChange={handleChange} idPrefix="admin-edit-employee" />
        </AdminPanel>

        <AdminPanel
          eyebrow="Operational access"
          title="Permissions"
          action={
            <AtelierButton
              type="button"
              size="chip"
              variant="outline"
              onClick={() => {
                setCustomPermissions(false);
                setPermissions(getDefaultPermissions(draft.role));
              }}
            >
              Use role defaults
            </AtelierButton>
          }
        >
          <label className="mb-5 flex items-start gap-3 font-ui text-sm text-ink">
            <input
              type="checkbox"
              checked={customPermissions}
              onChange={(event) => {
                setCustomPermissions(event.target.checked);
                if (event.target.checked) setPermissions(permissions.length ? permissions : getDefaultPermissions(draft.role));
              }}
              className="mt-0.5 accent-ink"
            />
            <span>
              Custom operational permissions
              <span className="mt-1 block text-[11px] text-taupe">Super Admin employee-management authority is never assignable to an employee.</span>
            </span>
          </label>
          <PermissionMatrix
            permissions={customPermissions ? permissions : getDefaultPermissions(draft.role)}
            editable={customPermissions}
            onToggle={(key, allowed) =>
              setPermissions((current) =>
                allowed ? [...new Set([...current, key])] : current.filter((item) => item !== key)
              )
            }
          />
          {errors.permissions ? <p className="mt-3 font-ui text-xs text-accent">{errors.permissions}</p> : null}
        </AdminPanel>

        <div className="flex flex-wrap gap-3">
          <AtelierButton type="submit" disabled={isWorking}>{isWorking ? "Saving…" : "Save changes"}</AtelierButton>
          <AtelierButton type="button" variant="outline" disabled={isWorking} onClick={() => navigate(`/admin/employees/${person.employeeId}`)}>
            Cancel
          </AtelierButton>
        </div>
      </form>
    </AdminPage>
  );
}
