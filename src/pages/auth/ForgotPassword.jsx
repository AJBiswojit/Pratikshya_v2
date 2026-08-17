import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from "lucide-react";
import {
  AtelierButton,
  AtelierSection,
  Breadcrumb,
  Rule,
} from "../../design-system";
import { useAuth } from "../../context/AuthContext";
import { isValidIdentifier } from "../../utils/validation";

/**
 * Forgot Password — /forgot-password
 *
 * Safe frontend mock password recovery flow.
 * Displays appropriate confirmation state with direct option to proceed
 * to the mock reset password screen.
 */
export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Forgot Password — PRATIKSHYA FASHON";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("Please enter your registered email address or phone number.");
      return;
    }

    if (!isValidIdentifier(identifier)) {
      setError("Please enter a valid email format or 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);
    const result = await forgotPassword(identifier);
    setIsSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
    } else {
      setError(result.error || "Unable to send reset instructions.");
    }
  };

  return (
    <main>
      <AtelierSection rhythm="none" width="content" className="pb-24 pt-28 sm:pt-32 md:pb-32">
        <Breadcrumb
          items={[
            { label: "Atelier", to: "/" },
            { label: "Sign In", to: "/signin" },
            { label: "Forgot Password" },
          ]}
          className="mb-8 md:mb-10"
        />

        <div className="mx-auto max-w-xl">
          <div className="border border-mist/80 bg-surface/50 p-7 sm:p-12 md:p-14">
            {!submitted ? (
              <>
                <div className="text-center">
                  <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">
                    Account Recovery
                  </p>
                  <h1 className="mt-3 font-display text-3xl font-light tracking-tight md:text-4xl text-ink">
                    Reset your <span className="italic text-accent">password.</span>
                  </h1>
                  <Rule width="w-12" tone="accent" className="mx-auto my-6" />
                  <p className="font-ui text-xs leading-relaxed text-taupe">
                    Enter the email address or mobile number associated with your PRATIKSHYA FASHON account, and we will send you instructions to reset your password.
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mt-6 flex items-start gap-3 border border-accent/40 bg-accent/5 p-4 text-accent"
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="font-ui text-xs leading-relaxed">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
                  <div>
                    <label
                      htmlFor="forgot-identifier"
                      className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                    >
                      Registered Email or Phone Number
                    </label>
                    <input
                      id="forgot-identifier"
                      type="text"
                      autoComplete="username"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. ananya.sharma@example.com"
                      className="w-full border border-pearl bg-canvas px-4 py-3.5 font-ui text-sm text-ink placeholder:text-taupe/60 transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </div>

                  <div className="pt-2">
                    <AtelierButton
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={isSubmitting}
                      className="w-full justify-center py-4"
                    >
                      {isSubmitting ? (
                        "Sending Instructions..."
                      ) : (
                        <>
                          Send Reset Link <ArrowRight size={14} aria-hidden="true" />
                        </>
                      )}
                    </AtelierButton>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center border border-cocoa/30 bg-cocoa/10 text-cocoa">
                  <CheckCircle2 size={28} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">
                  Instructions Dispatched
                </p>
                <h1 className="mt-3 font-display text-3xl font-light tracking-tight text-ink">
                  Check your <span className="italic text-accent">inbox.</span>
                </h1>
                <Rule width="w-12" tone="accent" className="mx-auto my-6" />
                <p className="font-ui text-xs leading-relaxed text-taupe max-w-md mx-auto">
                  We have prepared password reset instructions for{" "}
                  <span className="font-medium text-ink">{identifier}</span>.
                </p>

                <div className="mt-8 space-y-3">
                  <AtelierButton
                    onClick={() => navigate("/reset-password")}
                    variant="primary"
                    size="md"
                    className="w-full justify-center py-4"
                  >
                    Proceed to Reset Password <KeyRound size={14} aria-hidden="true" />
                  </AtelierButton>
                  <AtelierButton
                    as={Link}
                    to="/signin"
                    variant="outline"
                    size="md"
                    className="w-full justify-center py-4"
                  >
                    Return to Sign In
                  </AtelierButton>
                </div>
              </div>
            )}

            {/* Back link */}
            <div className="mt-8 border-t border-mist/70 pt-6 text-center">
              <Link
                to="/signin"
                className="font-ui text-xs text-graphite hover:text-accent transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={13} aria-hidden="true" /> Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </AtelierSection>
    </main>
  );
}
