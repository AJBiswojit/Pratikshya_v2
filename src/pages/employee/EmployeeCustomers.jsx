import { useMemo, useState } from "react";
import EmployeePage from "../../components/employee/EmployeePage";
import DataTable from "../../components/employee/DataTable";
import { getDirectoryCustomers } from "../../services/employees/operationsService";
import { employeeInputClass } from "../../components/employee/EmployeeField";

export default function EmployeeCustomers() {
  const [query, setQuery] = useState("");
  const customers = useMemo(() => {
    const list = getDirectoryCustomers();
    const term = query.trim().toLowerCase();
    if (!term) return list;
    return list.filter((customer) =>
      [customer.name, customer.phone, customer.email, customer.interest]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [query]);

  return (
    <EmployeePage
      eyebrow="Customers"
      title={
        <>
          Who is in the <span className="italic text-accent">house.</span>
        </>
      }
      description="Floor walk-ins sit beside atelier accounts. This is the directory sales, support and styling share."
    >
      <div className="mb-6 max-w-md">
        <label htmlFor="customer-search" className="mb-2 block font-ui text-[11px] uppercase tracking-[.18em] text-ink">
          Customer search
        </label>
        <input
          id="customer-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, phone or interest"
          className={employeeInputClass()}
        />
      </div>
      <DataTable
        rows={customers}
        columns={[
          { id: "name", label: "Customer" },
          { id: "phone", label: "Phone" },
          { id: "email", label: "Email" },
          { id: "interest", label: "Looking for" },
          { id: "lastVisit", label: "Last seen" },
          { id: "associate", label: "Associate" },
          { id: "source", label: "Source" },
        ]}
        empty="No customers match that search."
      />
    </EmployeePage>
  );
}
