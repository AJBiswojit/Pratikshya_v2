import { useEffect, useState } from "react";
import { AtelierButton } from "../../design-system";
import EmployeeField, { employeeInputClass } from "../employee/EmployeeField";
import { ATTENDANCE_STATUS_OPTIONS } from "../../config/attendanceConfig";
import { correctAttendance } from "../../services/workforce/attendanceService";

const toLocalInput = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromLocalInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export function CorrectionForm({ record, actor, onDone }) {
  const [checkIn, setCheckIn] = useState(toLocalInput(record?.checkIn));
  const [checkOut, setCheckOut] = useState(toLocalInput(record?.checkOut));
  const [status, setStatus] = useState(record?.status || "");
  const [notes, setNotes] = useState(record?.notes || "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setCheckIn(toLocalInput(record?.checkIn));
    setCheckOut(toLocalInput(record?.checkOut));
    setStatus(record?.status || "");
    setNotes(record?.notes || "");
    setReason("");
    setError("");
    setMessage("");
  }, [record?.attendanceId, record?.updatedAt]);

  if (!record) return null;

  const save = (event) => {
    event.preventDefault();
    const result = correctAttendance({
      employeeId: record.employeeId,
      date: record.date,
      actor,
      reason,
      patch: {
        checkIn: fromLocalInput(checkIn),
        checkOut: fromLocalInput(checkOut),
        status,
        notes,
      },
    });
    if (!result.ok) {
      setError(result.message);
      setMessage("");
      return;
    }
    setError("");
    setMessage(result.message);
    onDone?.(result.record);
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <EmployeeField label="Check-in" id="corr-in">
          <input id="corr-in" type="datetime-local" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className={employeeInputClass()} />
        </EmployeeField>
        <EmployeeField label="Check-out" id="corr-out">
          <input id="corr-out" type="datetime-local" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className={employeeInputClass()} />
        </EmployeeField>
      </div>
      <EmployeeField label="Status" id="corr-status">
        <select id="corr-status" value={status} onChange={(event) => setStatus(event.target.value)} className={employeeInputClass()}>
          {ATTENDANCE_STATUS_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </EmployeeField>
      <EmployeeField label="Notes" id="corr-notes" optional>
        <textarea id="corr-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className={employeeInputClass()} />
      </EmployeeField>
      <EmployeeField label="Reason for correction" id="corr-reason" required error={error}>
        <textarea id="corr-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={2} className={employeeInputClass(Boolean(error))} required />
      </EmployeeField>
      {message ? (
        <p className="font-ui text-xs text-cocoa" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
      <AtelierButton type="submit" size="chip">
        Save correction
      </AtelierButton>
    </form>
  );
}
