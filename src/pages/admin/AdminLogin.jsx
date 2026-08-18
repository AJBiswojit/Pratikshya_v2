import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { AtelierButton, Brand, Rule } from "../../design-system";
import { ADMIN_BRAND, sanitizeAdminReturnUrl } from "../../config/adminNavigation";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { DEMO_ADMIN_LOGINS } from "../../data/admin/demoAdminCredentials";

/**
 * The Admin Portal entrance.
 *
 * A dedicated door: it never redirects to the employee login and never
 * accepts a customer or employee session. An employee who lands here is
 * told plainly that employee credentials do not open the Admin Portal.
 */
export default function AdminLogin() {
  const { signIn, isAuthenticated, isLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = sanitizeAdminReturnUrl(searchParams.get("returnTo"));

  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = "Admin Sign In — PRATIKSHYA FASHON";
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isSubmitting, navigate, returnTo]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!adminId.trim()) {
      setError("Please enter your admin ID or email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setIsSubmitting(true);
    const result = await signIn({ adminId, password });
    if (result.ok) {
      navigate(returnTo, { replace: true });
      return;
    }
    setError(result.error || "Admin ID or password is not correct.");
    setIsSubmitting(false);
  };

  const fillDemo = () => {
    const demo = DEMO_ADMIN_LOGINS[0];
    if (!demo) return;
    setAdminId(demo.adminId);
    setPassword(demo.password);
    setError("");
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-ink-line bg-ink px-6 py-5 text-ivory">
        <Brand
          as="h1"
          size="default"
          variant="lockup"
          theme="dark"
          wordmark={ADMIN_BRAND.name}
          subtitle={`${ADMIN_BRAND.portal} · ${ADMIN_BRAND.subtitle}`}
        />
      </header>

      <main className="mx-auto max-w-xl px-5 py-12 sm:px-6 md:py-20">
        <div className="border border-mist/80 bg-surface/50 p-6 sm:p-12">
          <div className="text-center">
            <span className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center bg-ink text-gold">
              <ShieldCheck size={18} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">
              Administration
            </p>
            <h1 className="mt-3 font-display text-3xl font-light tracking-tight md:text-4xl">
              Business <span className="italic text-accent">operations.</span>
            </h1>
            <Rule width="w-12" tone="accent" className="mx-auto my-6" />
            <p className="font-ui text-xs leading-relaxed text-taupe">
              This portal is for the administration of PRATIKSHYA FASHON. Employee
              credentials do not open it — the team portal is a separate door.
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 border border-accent/40 bg-accent/5 p-4 text-accent"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="font-ui text-xs leading-relaxed">{error}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label
                htmlFor="admin-id"
                className="mb-2 block font-ui text-[11px] uppercase tracking-[.18em] text-ink"
              >
                Admin ID / Email
              </label>
              <input
                id="admin-id"
                autoComplete="username"
                value={adminId}
                onChange={(event) => setAdminId(event.target.value)}
                placeholder="PF-ADM-00001"
                className="w-full border border-pearl bg-canvas px-4 py-3.5 font-ui text-sm text-ink placeholder:text-taupe/60 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block font-ui text-[11px] uppercase tracking-[.18em] text-ink"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your administration password"
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
              {isSubmitting ? (
                "Verifying administration access..."
              ) : (
                <>
                  Sign in <ArrowRight size={14} aria-hidden="true" />
                </>
              )}
            </AtelierButton>
          </form>

          <div className="mt-8 border-t border-mist/70 pt-6">
            <div className="mb-3 flex items-center gap-2 text-brass">
              <ShieldCheck size={14} aria-hidden="true" />
              <p className="font-ui text-[10px] uppercase tracking-[.2em]">Demo credentials</p>
            </div>
            <p className="mb-3 font-ui text-[11px] leading-relaxed text-taupe">
              Frontend mock authentication for the client preview only — not production
              credentials. Admin ID <span className="text-ink">PF-ADM-00001</span> ·
              password <span className="text-ink">PF@Admin2026</span>.
            </p>
            <button
              type="button"
              onClick={fillDemo}
              className="w-full border border-accent/50 bg-canvas/70 px-3 py-2.5 text-left font-ui text-[11px] transition-colors hover:border-ink"
            >
              <span className="block font-medium text-ink">Kavya Menon · Super Admin</span>
              <span className="block text-[10px] text-taupe">
                PF-ADM-00001 · fill the form
              </span>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center">
            <Link
              to="/"
              className="font-ui text-[11px] text-taupe underline-offset-4 hover:text-accent hover:underline"
            >
              Back to store
            </Link>
            <Link
              to="/employee/login"
              className="font-ui text-[11px] text-taupe underline-offset-4 hover:text-accent hover:underline"
            >
              Employee portal
            </Link>
            <a
              href="mailto:operations@pratikshyafashon.in"
              className="font-ui text-[11px] text-taupe underline-offset-4 hover:text-accent hover:underline"
            >
              Contact administrator
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
