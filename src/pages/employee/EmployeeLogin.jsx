import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { AtelierButton, Brand, Rule } from "../../design-system";
import { EMPLOYEE_BRAND, sanitizeEmployeeReturnUrl } from "../../config/employeeNavigation";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { DEMO_EMPLOYEE_LOGINS } from "../../data/employees/demoCredentials";
import { cn } from "../../utils/cn";

export default function EmployeeLogin() {
  const { signIn, isAuthenticated, mustChangePassword, isLoading } = useEmployeeAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = sanitizeEmployeeReturnUrl(searchParams.get("returnTo"));

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = "Employee Sign In — PRATIKSHYA FASHON";
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      navigate(mustChangePassword ? "/employee/change-password" : returnTo, { replace: true });
    }
  }, [isAuthenticated, isSubmitting, mustChangePassword, navigate, returnTo]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!employeeId.trim()) {
      setError("Please enter your employee ID.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setIsSubmitting(true);
    const result = await signIn({ employeeId, password });
    if (result.ok) {
      navigate(result.employee?.mustChangePassword ? "/employee/change-password" : returnTo, {
        replace: true,
      });
    } else {
      setError(result.error || "Employee ID or password is not correct.");
      setIsSubmitting(false);
    }
  };

  const fill = (entry) => {
    setEmployeeId(entry.employeeId);
    setPassword(entry.password);
    setError("");
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
          subtitle={`${EMPLOYEE_BRAND.portal} · ${EMPLOYEE_BRAND.subtitle}`}
        />
      </header>

      <main className="mx-auto max-w-xl px-6 py-16 md:py-24">
        <div className="border border-mist/80 bg-surface/50 p-7 sm:p-12">
          <div className="text-center">
            <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">Team entry</p>
            <h1 className="mt-3 font-display text-3xl font-light tracking-tight md:text-4xl">
              Sign in to the <span className="italic text-accent">floor.</span>
            </h1>
            <Rule width="w-12" tone="accent" className="mx-auto my-6" />
            <p className="font-ui text-xs leading-relaxed text-taupe">
              Employee accounts are created by an administrator. Use the employee ID and temporary password you were given.
            </p>
          </div>

          {error ? (
            <div role="alert" className="mt-6 flex items-start gap-3 border border-accent/40 bg-accent/5 p-4 text-accent">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="font-ui text-xs leading-relaxed">{error}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="employee-id" className="mb-2 block font-ui text-[11px] uppercase tracking-[.18em] text-ink">
                Employee ID
              </label>
              <input
                id="employee-id"
                autoComplete="username"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                placeholder="PF-SLS-00124"
                className="w-full border border-pearl bg-canvas px-4 py-3.5 font-ui text-sm text-ink placeholder:text-taupe/60 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="employee-password" className="font-ui text-[11px] uppercase tracking-[.18em] text-ink">
                  Password
                </label>
                <Link
                  to="/employee/forgot-password"
                  className="font-ui text-[11px] text-taupe underline-offset-4 hover:text-accent hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="employee-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Temporary or current password"
                  className="w-full border border-pearl bg-canvas px-4 py-3.5 pr-12 font-ui text-sm text-ink placeholder:text-taupe/60 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((open) => !open)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-taupe hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <AtelierButton
              type="submit"
              className="w-full justify-center py-4"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? "Verifying desk access..." : (
                <>
                  Sign in <ArrowRight size={14} aria-hidden="true" />
                </>
              )}
            </AtelierButton>
          </form>

          <div className="mt-8 border-t border-mist/70 pt-6">
            <div className="mb-3 flex items-center gap-2 text-brass">
              <Sparkles size={14} aria-hidden="true" />
              <p className="font-ui text-[10px] uppercase tracking-[.2em]">Demo credentials</p>
            </div>
            <p className="mb-3 font-ui text-[11px] text-taupe">
              Frontend mock authentication only. Example: PF-SLS-00124 / PF@7Kx92. Click a desk to fill.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEMO_EMPLOYEE_LOGINS.map((entry) => (
                <button
                  key={entry.employeeId}
                  type="button"
                  onClick={() => fill(entry)}
                  className={cn(
                    "border bg-canvas/70 px-3 py-2 text-left font-ui text-[11px] transition-colors hover:border-ink",
                    entry.highlight ? "border-accent/50" : "border-pearl"
                  )}
                >
                  <span className="block truncate font-medium text-ink">{entry.label}</span>
                  <span className="block text-[10px] text-taupe">{entry.employeeId}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center font-ui text-[11px] text-taupe">
            Need an account? Contact your administrator.
          </p>
        </div>
      </main>
    </div>
  );
}
