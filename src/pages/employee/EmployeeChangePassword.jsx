import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { AtelierButton, Brand, Rule } from "../../design-system";
import { EMPLOYEE_BRAND } from "../../config/employeeNavigation";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { validateEmployeePasswordChange } from "../../services/employees/employeePassword";

export default function EmployeeChangePassword() {
  const { employee, changePassword, mustChangePassword, signOut } = useEmployeeAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = "Change Password — PRATIKSHYA FASHON";
    return () => {
      document.title = previous;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const check = validateEmployeePasswordChange({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setIsSubmitting(true);
    const result = await changePassword({ currentPassword, newPassword, confirmPassword });
    if (result.ok) {
      navigate("/employee", { replace: true });
    } else {
      setError(result.error || "The password could not be updated.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-mist/80 px-6 py-5">
        <Brand
          as="h1"
          size="default"
          variant="lockup"
          theme="light"
          wordmark={EMPLOYEE_BRAND.name}
          subtitle={
            employee?.employeeId
              ? `${employee.employeeId} · First-time access`
              : "First-time access"
          }
        />
      </header>
      <main className="mx-auto max-w-xl px-6 py-16 md:py-24">
        <div className="border border-mist/80 bg-surface/50 p-7 sm:p-12">
          <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">
            {mustChangePassword ? "Temporary password" : "Password"}
          </p>
          <h1 className="mt-3 font-display text-3xl font-light tracking-tight">
            Choose a new <span className="italic text-accent">password.</span>
          </h1>
          <Rule width="w-12" tone="accent" className="my-6" />
          <p className="font-ui text-xs leading-relaxed text-taupe">
            {mustChangePassword
              ? "Your administrator issued a temporary password. Replace it before opening the portal."
              : "Update the password on this employee account. This is a demo change — not a production rotation."}
          </p>

          {error ? (
            <div role="alert" className="mt-6 flex items-start gap-3 border border-accent/40 bg-accent/5 p-4 text-accent">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="font-ui text-xs leading-relaxed">{error}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="current-password" className="mb-2 block font-ui text-[11px] uppercase tracking-[.18em]">
                Current password
              </label>
              <input
                id="current-password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full border border-pearl bg-canvas px-4 py-3.5 font-ui text-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-2 block font-ui text-[11px] uppercase tracking-[.18em]">
                New password
              </label>
              <input
                id="new-password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full border border-pearl bg-canvas px-4 py-3.5 font-ui text-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block font-ui text-[11px] uppercase tracking-[.18em]">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full border border-pearl bg-canvas px-4 py-3.5 pr-12 font-ui text-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
                <button
                  type="button"
                  onClick={() => setShow((open) => !open)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-taupe"
                  aria-label={show ? "Hide passwords" : "Show passwords"}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <AtelierButton type="submit" className="w-full justify-center py-4" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (
                <>
                  Update password <ArrowRight size={14} aria-hidden="true" />
                </>
              )}
            </AtelierButton>
          </form>
          <button
            type="button"
            onClick={() => {
              signOut();
              navigate("/employee/login", { replace: true });
            }}
            className="mt-6 font-ui text-xs text-taupe hover:text-accent"
          >
            Sign out instead
          </button>
        </div>
      </main>
    </div>
  );
}
