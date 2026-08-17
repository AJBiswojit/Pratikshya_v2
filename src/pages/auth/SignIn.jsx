import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { AtelierButton, AtelierSection, Breadcrumb, Rule } from "../../design-system";
import { useAuth } from "../../context/AuthContext";
import { DEMO_CREDENTIALS } from "../../data/mockCustomers";
import { sanitizeReturnUrl } from "../../utils/validation";

/**
 * Customer Sign In — /signin
 *
 * Designed as a refined, personal fashion entry point.
 * Supports email or phone, show/hide password, remember me,
 * friendly validation, and quick demo credentials for seamless testing.
 */
export default function SignIn() {
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawReturnTo = searchParams.get("returnTo") || "/account";
  const returnTo = sanitizeReturnUrl(rawReturnTo);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Sign In — PRATIKSHYA FASHON";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && !isSubmitting && !success) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, navigate, returnTo, isSubmitting, success]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("Please enter your registered email address or phone number.");
      return;
    }

    if (!password) {
      setError("Please enter your account password.");
      return;
    }

    setIsSubmitting(true);
    const result = await signIn({
      identifier,
      password,
      remember: rememberMe,
    });

    if (result.ok) {
      setSuccess(true);
      setTimeout(() => {
        navigate(returnTo, { replace: true });
      }, 500);
    } else {
      setError(result.error || "That email or password doesn't match our records.");
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (cred) => {
    setIdentifier(cred.email);
    setPassword("Pass1234!");
    setError("");
  };

  return (
    <main>
      <AtelierSection rhythm="none" width="content" className="pb-24 pt-28 sm:pt-32 md:pb-32">
        <Breadcrumb
          items={[{ label: "Atelier", to: "/" }, { label: "Sign In" }]}
          className="mb-8 md:mb-10"
        />

        <div className="mx-auto max-w-xl">
          {/* Card Frame */}
          <div className="border border-mist/80 bg-surface/50 p-7 sm:p-12 md:p-14">
            <div className="text-center">
              <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">
                Welcome Back
              </p>
              <h1 className="mt-3 font-display text-3xl font-light tracking-tight md:text-4xl text-ink">
                Continue your <span className="italic text-accent">journey.</span>
              </h1>
              <Rule width="w-12" tone="accent" className="mx-auto my-6" />
              <p className="font-ui text-xs leading-relaxed text-taupe">
                Sign in to view saved pieces, address preferences, and your personal atelier space.
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 border border-accent/40 bg-accent/5 p-4 text-accent"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                <p className="font-ui text-xs leading-relaxed">{error}</p>
              </div>
            )}

            {/* Success Notification */}
            {success && (
              <div
                role="status"
                className="mt-6 flex items-center gap-3 border border-cocoa/40 bg-cocoa/10 p-4 text-cocoa"
              >
                <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
                <p className="font-ui text-xs">Welcome back. Opening your atelier...</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
              {/* Identifier */}
              <div>
                <label
                  htmlFor="signin-identifier"
                  className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                >
                  Email Address or Mobile Number
                </label>
                <input
                  id="signin-identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. ananya.sharma@example.com"
                  className="w-full border border-pearl bg-canvas px-4 py-3.5 font-ui text-sm text-ink placeholder:text-taupe/60 transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="signin-password"
                    className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="font-ui text-[11px] tracking-wide text-taupe hover:text-accent transition-colors underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full border border-pearl bg-canvas px-4 py-3.5 pr-12 font-ui text-sm text-ink placeholder:text-taupe/60 transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-taupe hover:text-ink transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded-none border-pearl text-ink focus:ring-ink accent-ink"
                  />
                  <span className="font-ui text-xs text-graphite">
                    Remember me on this device
                  </span>
                </label>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <AtelierButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || success}
                  className="w-full justify-center py-4"
                >
                  {isSubmitting ? (
                    "Verifying Credentials..."
                  ) : success ? (
                    "Authenticated"
                  ) : (
                    <>
                      Sign In to Account <ArrowRight size={14} aria-hidden="true" />
                    </>
                  )}
                </AtelierButton>
              </div>
            </form>

            {/* Quick Demo Credentials Panel */}
            <div className="mt-8 border-t border-mist/70 pt-6">
              <div className="flex items-center gap-2 mb-3 text-brass">
                <Sparkles size={14} aria-hidden="true" />
                <p className="font-ui text-[10px] uppercase tracking-[.2em] font-medium">
                  Client Demo Quick-Fill
                </p>
              </div>
              <p className="font-ui text-[11px] text-taupe mb-3">
                Click any demo profile to test the authentication and account journey instantly:
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {DEMO_CREDENTIALS.map((cred) => (
                  <button
                    key={cred.email}
                    type="button"
                    onClick={() => handleQuickFill(cred)}
                    className="border border-pearl bg-canvas/70 px-3 py-2 text-left font-ui text-[11px] hover:border-ink hover:bg-canvas transition-colors"
                  >
                    <span className="font-medium text-ink block truncate">
                      {cred.label.split(" ")[0]} {cred.label.split(" ")[1]}
                    </span>
                    <span className="text-taupe text-[10px] block truncate">
                      {cred.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Guest / Create Account Footers */}
            <div className="mt-8 border-t border-mist/70 pt-6 text-center space-y-4">
              <div>
                <p className="font-ui text-xs text-graphite">
                  New to PRATIKSHYA FASHON?{" "}
                  <Link
                    to={`/signup${rawReturnTo ? `?returnTo=${encodeURIComponent(rawReturnTo)}` : ""}`}
                    className="font-medium text-ink hover:text-accent transition-colors underline-offset-4 underline ml-1"
                  >
                    Create an account
                  </Link>
                </p>
              </div>

              <div>
                <Link
                  to={returnTo.startsWith("/account") ? "/shop" : returnTo}
                  className="font-ui text-[11px] uppercase tracking-[.18em] text-taupe hover:text-accent transition-colors inline-flex items-center gap-1.5"
                >
                  Continue as Guest <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AtelierSection>
    </main>
  );
}
