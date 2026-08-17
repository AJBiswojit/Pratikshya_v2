import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { AtelierButton } from "../../design-system";
import AdminPage from "../../components/admin/AdminPage";
import AdminPanel from "../../components/admin/AdminPanel";
import EmployeeField, { employeeInputClass } from "../../components/employee/EmployeeField";
import StatusBadge from "../../components/employee/StatusBadge";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { getAdminRoleLabel, getAdminStatusLabel } from "../../config/adminAccess";
import { formatAdminDate, formatAdminDateTime } from "../../utils/admin";

/**
 * /admin/profile
 *
 * Name, email, phone and title are editable. Admin ID, role and status are
 * shown read-only by design — an administrator cannot promote themselves or
 * rewrite their own identity through the profile surface.
 */
export default function AdminProfile() {
  const { admin, updateProfile } = useAdminAuth();
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", title: "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!admin) return;
    setDraft({
      name: admin.name || "",
      email: admin.email || "",
      phone: admin.phone || "",
      title: admin.title || "",
    });
  }, [admin?.adminId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!admin) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setSaved(false);
    const result = updateProfile(draft);
    if (!result.ok) {
      setError(result.error || "That profile could not be saved.");
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  };

  const readOnly = [
    ["Admin ID", admin.adminId],
    ["Role", getAdminRoleLabel(admin.role)],
    ["Status", getAdminStatusLabel(admin.status)],
    ["Last login", formatAdminDateTime(admin.lastLogin)],
    ["Administrator since", formatAdminDate(admin.createdAt)],
  ];

  return (
    <AdminPage
      eyebrow="System"
      title={
        <>
          Admin <span className="italic text-accent">profile.</span>
        </>
      }
      description="Your administration identity. Admin ID, role and status are set by the account owner and cannot be changed here."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <AdminPanel eyebrow="Identity" title="Account" bodyClassName="px-0 py-0 sm:px-0">
          <div className="flex items-center gap-4 border-b border-mist/70 px-5 py-5 sm:px-6">
            <span className="flex h-14 w-14 items-center justify-center bg-ink font-display text-xl font-light text-gold">
              {admin.name?.[0]?.toUpperCase() ?? "A"}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-light text-ink">{admin.name}</p>
              <p className="font-ui text-[11px] text-taupe">{admin.email}</p>
            </div>
          </div>
          <dl className="divide-y divide-mist/70">
            {readOnly.map(([label, value]) => (
              <div key={label} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[170px_minmax(0,1fr)] sm:px-6">
                <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{label}</dt>
                <dd className="font-ui text-sm text-ink">
                  {label === "Status" ? (
                    <StatusBadge status={admin.status} label={value} tone="ink" />
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </AdminPanel>

        <AdminPanel eyebrow="Edit" title="Contact details">
          {error ? (
            <p role="alert" className="mb-4 border border-accent/40 bg-accent/5 p-3 font-ui text-xs text-accent">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p
              role="status"
              className="mb-4 inline-flex items-center gap-2 border border-mist bg-canvas px-3 py-2 font-ui text-xs text-cocoa"
            >
              <Check size={13} aria-hidden="true" /> Profile saved.
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2" noValidate>
            <EmployeeField label="Name" required id="admin-profile-name">
              <input
                id="admin-profile-name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className={employeeInputClass()}
              />
            </EmployeeField>
            <EmployeeField label="Email" required id="admin-profile-email">
              <input
                id="admin-profile-email"
                type="email"
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                className={employeeInputClass()}
              />
            </EmployeeField>
            <EmployeeField label="Phone" id="admin-profile-phone">
              <input
                id="admin-profile-phone"
                value={draft.phone}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                className={employeeInputClass()}
              />
            </EmployeeField>
            <EmployeeField label="Title" id="admin-profile-title">
              <input
                id="admin-profile-title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className={employeeInputClass()}
              />
            </EmployeeField>
            <div className="sm:col-span-2">
              <AtelierButton type="submit" size="chip">
                Save profile
              </AtelierButton>
            </div>
          </form>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
