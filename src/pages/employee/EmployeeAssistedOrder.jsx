import { useMemo, useState } from "react";
import { AtelierButton } from "../../design-system";
import EmployeeField, { employeeInputClass } from "../../components/employee/EmployeeField";
import EmployeePage from "../../components/employee/EmployeePage";
import { searchProducts } from "../../services/employees/operationsService";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { formatINR } from "../../utils/shopping";
import { writeStorage, readStorage } from "../../utils/shopping";
import { EMPLOYEE_STORAGE_KEYS } from "../../services/employees/storage";

export default function EmployeeAssistedOrder() {
  const { employee } = useEmployeeAuth();
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [ticket, setTicket] = useState(null);

  const matches = useMemo(() => searchProducts(query).slice(0, 6), [query]);

  const handleCreate = (event) => {
    event.preventDefault();
    if (!customer.trim() || !selected) return;
    const id = `PF-FLR-${String(Math.floor(20 + Math.random() * 80)).padStart(5, "0")}`;
    const record = {
      id,
      employeeId: employee.employeeId,
      associate: `${employee.firstName} ${employee.lastName}`,
      customer: customer.trim(),
      phone: phone.trim(),
      department: selected.categoryLabel,
      pieces: selected.name,
      amount: selected.price,
      status: "Hold — floor ticket",
      createdAt: new Date().toISOString(),
      note,
    };
    const existing = readStorage(EMPLOYEE_STORAGE_KEYS.ASSISTED_ORDERS, []) || [];
    writeStorage(EMPLOYEE_STORAGE_KEYS.ASSISTED_ORDERS, [record, ...(Array.isArray(existing) ? existing : [])]);
    setTicket(record);
  };

  return (
    <EmployeePage
      eyebrow="Assisted shopping"
      title={
        <>
          Write a floor <span className="italic text-accent">ticket.</span>
        </>
      }
      description="Create an assisted order against live catalogue availability. This is a floor ticket — not a customer checkout."
    >
      {ticket ? (
        <div role="status" className="border border-cocoa/30 bg-cocoa/10 p-6 text-cocoa">
          <p className="font-ui text-[10px] uppercase tracking-[.2em]">Ticket written</p>
          <p className="mt-2 font-display text-2xl font-light text-ink">{ticket.id}</p>
          <p className="mt-2 font-ui text-sm text-graphite">
            {ticket.customer} · {ticket.pieces} · {formatINR(ticket.amount)}
          </p>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5 border border-mist/80 bg-surface/40 p-6">
            <EmployeeField label="Customer name" required>
              <input value={customer} onChange={(event) => setCustomer(event.target.value)} className={employeeInputClass()} />
            </EmployeeField>
            <EmployeeField label="Phone" optional>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} className={employeeInputClass()} />
            </EmployeeField>
            <EmployeeField label="Floor note" optional>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className={employeeInputClass()}
              />
            </EmployeeField>
          </div>
          <div className="space-y-4 border border-mist/80 bg-surface/40 p-6">
            <EmployeeField label="Find a piece">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search catalogue"
                className={employeeInputClass()}
              />
            </EmployeeField>
            <ul className="divide-y divide-mist/70 border border-mist/70">
              {matches.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(product)}
                    className={`flex w-full items-start justify-between gap-3 px-3 py-3 text-left ${
                      selected?.id === product.id ? "bg-ink text-ivory" : "bg-canvas hover:bg-surface"
                    }`}
                  >
                    <span>
                      <span className="block font-ui text-sm">{product.name}</span>
                      <span className="block font-ui text-[11px] opacity-70">
                        {product.availabilityLabel} · {product.categoryLabel}
                      </span>
                    </span>
                    <span className="font-ui text-sm">{formatINR(product.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <AtelierButton type="submit" disabled={!customer.trim() || !selected}>
              Create assisted order
            </AtelierButton>
          </div>
        </form>
      )}
    </EmployeePage>
  );
}
