import { useMemo } from "react";
import EmployeeField, { employeeInputClass } from "./EmployeeField";
import { ROLE_OPTIONS } from "../../config/employeeRoles";
import { DEPARTMENT_OPTIONS, STORE_OPTIONS, sectionsForDepartment } from "../../config/employeeDepartments";
import { STATUS_OPTIONS } from "../../config/employeeStatus";

/* This catalogue contains operational employee roles only. Admin identities
   are a separate domain and therefore cannot appear in this form. */
export const EMPLOYEE_ROLE_OPTIONS = ROLE_OPTIONS;

export default function EmployeeForm({
  values,
  errors = {},
  onChange,
  idPrefix = "emp",
}) {
  const sections = useMemo(
    () => sectionsForDepartment(values.department),
    [values.department]
  );

  const field = (name, value) =>
    onChange({
      ...values,
      [name]: value,
      ...(name === "department" ? { section: sectionsForDepartment(value)[0]?.id || "" } : {}),
    });

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <EmployeeField label="First name" required error={errors.firstName} id={`${idPrefix}-first`}>
        <input
          id={`${idPrefix}-first`}
          value={values.firstName}
          onChange={(event) => field("firstName", event.target.value)}
          className={employeeInputClass(Boolean(errors.firstName))}
        />
      </EmployeeField>
      <EmployeeField label="Last name" required error={errors.lastName} id={`${idPrefix}-last`}>
        <input
          id={`${idPrefix}-last`}
          value={values.lastName}
          onChange={(event) => field("lastName", event.target.value)}
          className={employeeInputClass(Boolean(errors.lastName))}
        />
      </EmployeeField>
      <EmployeeField label="Email" required error={errors.email} id={`${idPrefix}-email`}>
        <input
          id={`${idPrefix}-email`}
          type="email"
          value={values.email}
          onChange={(event) => field("email", event.target.value)}
          className={employeeInputClass(Boolean(errors.email))}
        />
      </EmployeeField>
      <EmployeeField label="Phone" error={errors.phone} id={`${idPrefix}-phone`}>
        <input
          id={`${idPrefix}-phone`}
          value={values.phone}
          onChange={(event) => field("phone", event.target.value)}
          className={employeeInputClass(Boolean(errors.phone))}
        />
      </EmployeeField>
      <EmployeeField label="Role" required error={errors.role} id={`${idPrefix}-role`}>
        <select
          id={`${idPrefix}-role`}
          value={values.role}
          onChange={(event) => field("role", event.target.value)}
          className={employeeInputClass(Boolean(errors.role))}
        >
          <option value="">Select role</option>
          {EMPLOYEE_ROLE_OPTIONS.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </select>
      </EmployeeField>
      <EmployeeField label="Department" required error={errors.department} id={`${idPrefix}-dept`}>
        <select
          id={`${idPrefix}-dept`}
          value={values.department}
          onChange={(event) => field("department", event.target.value)}
          className={employeeInputClass(Boolean(errors.department))}
        >
          <option value="">Select department</option>
          {DEPARTMENT_OPTIONS.map((department) => (
            <option key={department.id} value={department.id}>
              {department.label}
            </option>
          ))}
        </select>
      </EmployeeField>
      <EmployeeField label="Section" id={`${idPrefix}-section`}>
        <select
          id={`${idPrefix}-section`}
          value={values.section}
          onChange={(event) => field("section", event.target.value)}
          className={employeeInputClass()}
        >
          <option value="">Select section</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
      </EmployeeField>
      <EmployeeField label="Store / location" required error={errors.store} id={`${idPrefix}-store`}>
        <select
          id={`${idPrefix}-store`}
          value={values.store}
          onChange={(event) => field("store", event.target.value)}
          className={employeeInputClass(Boolean(errors.store))}
        >
          <option value="">Select floor</option>
          {STORE_OPTIONS.map((store) => (
            <option key={store.id} value={store.id}>
              {store.label}
            </option>
          ))}
        </select>
      </EmployeeField>
      <EmployeeField label="Joining date" required error={errors.joiningDate} id={`${idPrefix}-join`}>
        <input
          id={`${idPrefix}-join`}
          type="date"
          value={values.joiningDate}
          onChange={(event) => field("joiningDate", event.target.value)}
          className={employeeInputClass(Boolean(errors.joiningDate))}
        />
      </EmployeeField>
      <EmployeeField label="Status" id={`${idPrefix}-status`}>
        <select
          id={`${idPrefix}-status`}
          value={values.status}
          onChange={(event) => field("status", event.target.value)}
          className={employeeInputClass()}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>
      </EmployeeField>
    </div>
  );
}

export const emptyEmployeeDraft = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "",
  department: "",
  section: "",
  store: "",
  joiningDate: "",
  status: "PENDING",
});
