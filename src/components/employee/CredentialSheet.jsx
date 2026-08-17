import { useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import { AtelierButton, Rule } from "../../design-system";
import { getDepartmentLabel } from "../../config/employeeDepartments";
import { getRoleLabel } from "../../config/employeeRoles";
import { employeeFullName } from "../../utils/employee";

const copyText = async (value) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through.
  }
  return false;
};

export default function CredentialSheet({ employee, temporaryPassword, onDone }) {
  const [copied, setCopied] = useState("");

  if (!employee || !temporaryPassword) return null;

  const handleCopy = async (key, value) => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1800);
    }
  };

  const handlePrint = () => {
    const popup = window.open("", "pf-credential", "width=640,height=720");
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>Demo credentials</title>
      <style>
        body { font-family: Georgia, serif; color: #2a2015; padding: 40px; }
        h1 { font-weight: 300; font-size: 28px; }
        .label { font-family: sans-serif; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: #8a3e22; }
        .row { margin: 16px 0; }
        .value { font-family: sans-serif; font-size: 18px; }
        .note { margin-top: 32px; font-family: sans-serif; font-size: 12px; color: #777; }
      </style></head><body>
      <p class="label">PRATIKSHYA FASHON · DEMO CREDENTIALS</p>
      <h1>Employee created</h1>
      <div class="row"><div class="label">Name</div><div class="value">${employeeFullName(employee)}</div></div>
      <div class="row"><div class="label">Employee ID</div><div class="value">${employee.employeeId}</div></div>
      <div class="row"><div class="label">Temporary password</div><div class="value">${temporaryPassword}</div></div>
      <div class="row"><div class="label">Role</div><div class="value">${getRoleLabel(employee.role)}</div></div>
      <div class="row"><div class="label">Department</div><div class="value">${getDepartmentLabel(employee.department)}</div></div>
      <p class="note">These are DEMO credentials for the client preview. They are not production secrets. The employee must change this password on first sign-in.</p>
      </body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div
      role="status"
      className="border border-ink bg-ink p-6 text-ivory sm:p-8"
      data-credential-sheet="true"
    >
      <p className="font-ui text-[10px] uppercase tracking-[.3em] text-gold">Demo credentials</p>
      <h2 className="mt-2 font-display text-3xl font-light tracking-tight">
        Employee <span className="italic text-gold">created.</span>
      </h2>
      <Rule width="w-10" tone="gold" className="my-4" />
      <p className="font-ui text-xs leading-relaxed text-ash">
        Share these once, then put the sheet away. This is a frontend demo —
        not a production secret store.
      </p>

      <dl className="mt-6 space-y-4">
        <div>
          <dt className="font-ui text-[10px] uppercase tracking-[.18em] text-ash">Name</dt>
          <dd className="mt-1 font-display text-xl font-light">{employeeFullName(employee)}</dd>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <dt className="font-ui text-[10px] uppercase tracking-[.18em] text-ash">Employee ID</dt>
            <dd className="mt-1 font-ui text-lg tracking-wide">{employee.employeeId}</dd>
          </div>
          <button
            type="button"
            onClick={() => handleCopy("id", employee.employeeId)}
            className="inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[.16em] text-ivory hover:text-gold"
          >
            {copied === "id" ? <Check size={12} /> : <Copy size={12} />}
            {copied === "id" ? "Copied" : "Copy ID"}
          </button>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <dt className="font-ui text-[10px] uppercase tracking-[.18em] text-ash">
              Temporary password
            </dt>
            <dd className="mt-1 font-ui text-lg tracking-wide">{temporaryPassword}</dd>
          </div>
          <button
            type="button"
            onClick={() => handleCopy("password", temporaryPassword)}
            className="inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[.16em] text-ivory hover:text-gold"
          >
            {copied === "password" ? <Check size={12} /> : <Copy size={12} />}
            {copied === "password" ? "Copied" : "Copy password"}
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-ui text-[10px] uppercase tracking-[.18em] text-ash">Role</dt>
            <dd className="mt-1 font-ui text-sm">{getRoleLabel(employee.role)}</dd>
          </div>
          <div>
            <dt className="font-ui text-[10px] uppercase tracking-[.18em] text-ash">Department</dt>
            <dd className="mt-1 font-ui text-sm">{getDepartmentLabel(employee.department)}</dd>
          </div>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        <AtelierButton variant="inverse" size="chip" onClick={handlePrint}>
          <Printer size={12} aria-hidden="true" /> Print demo sheet
        </AtelierButton>
        {onDone ? (
          <AtelierButton variant="outline" size="chip" onClick={onDone} className="border-ivory/30 text-ivory hover:bg-ivory hover:text-ink">
            Continue
          </AtelierButton>
        ) : null}
      </div>
    </div>
  );
}
