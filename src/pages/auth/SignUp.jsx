import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  AtelierButton,
  AtelierSection,
  Breadcrumb,
  Rule,
} from "../../design-system";
import { useAuth } from "../../context/AuthContext";
import { useOrder } from "../../context/OrderContext";
import {
  isValidEmail,
  isValidPhone,
  sanitizeReturnUrl,
  validatePassword,
  validatePasswordMatch,
} from "../../utils/validation";
import { cn } from "../../utils/cn";

/**
 * Customer Sign Up — /signup
 *
 * Join the PRATIKSHYA FASHON atelier.
 * Clean, editorial form with inline feedback, password visibility toggles,
 * and immediate session establishment.
 */
export default function SignUp() {
  const { signUp, isAuthenticated } = useAuth();
  const { claimGuestOrders } = useOrder();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawReturnTo = searchParams.get("returnTo") || "/account";
  const returnTo = sanitizeReturnUrl(rawReturnTo);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Create Account — PRATIKSHYA FASHON";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isSubmitting && !success) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, navigate, returnTo, isSubmitting, success]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (generalError) {
      setGeneralError("");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email format.";
    }

    if (formData.phone.trim() && !isValidPhone(formData.phone)) {
      newErrors.phone = "Please enter a valid 10-digit mobile number.";
    }

    const pwdCheck = validatePassword(formData.password);
    if (!pwdCheck.ok) {
      newErrors.password = pwdCheck.message;
    }

    const matchCheck = validatePasswordMatch(
      formData.password,
      formData.confirmPassword
    );
    if (!matchCheck.ok) {
      newErrors.confirmPassword = matchCheck.message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError("");

    if (!validateForm()) return;

    setIsSubmitting(true);
    const result = await signUp({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      dateOfBirth: formData.dateOfBirth,
    });

    if (result.ok) {
      /*
       * Anything ordered as a guest in this browser now belongs to the account
       * that was just created, so the new customer finds their purchase waiting
       * in Order History instead of losing it at signup.
       */
      claimGuestOrders(result.user?.id);
      setSuccess(true);
      setTimeout(() => {
        navigate(returnTo, { replace: true });
      }, 500);
    } else {
      setGeneralError(result.error || "Unable to create account. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      <AtelierSection rhythm="none" width="content" className="pb-24 pt-28 sm:pt-32 md:pb-32">
        <Breadcrumb
          items={[{ label: "Atelier", to: "/" }, { label: "Create Account" }]}
          className="mb-8 md:mb-10"
        />

        <div className="mx-auto max-w-2xl">
          <div className="border border-mist/80 bg-surface/50 p-7 sm:p-12 md:p-14">
            <div className="text-center">
              <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">
                Join The Atelier
              </p>
              <h1 className="mt-3 font-display text-3xl font-light tracking-tight md:text-4xl text-ink">
                Create your <span className="italic text-accent">account.</span>
              </h1>
              <Rule width="w-12" tone="accent" className="mx-auto my-6" />
              <p className="font-ui text-xs leading-relaxed text-taupe max-w-md mx-auto">
                Enjoy a tailored experience with saved measurements, custom edits, and curated ceremonial previews.
              </p>
            </div>

            {/* General Error */}
            {generalError && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 border border-accent/40 bg-accent/5 p-4 text-accent"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                <p className="font-ui text-xs leading-relaxed">{generalError}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div
                role="status"
                className="mt-6 flex items-center gap-3 border border-cocoa/40 bg-cocoa/10 p-4 text-cocoa"
              >
                <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
                <p className="font-ui text-xs">Account created successfully. Welcome to PRATIKSHYA FASHON.</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
              {/* Names */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="signup-firstName"
                    className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                  >
                    First Name <span className="text-accent">*</span>
                  </label>
                  <input
                    id="signup-firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="e.g. Ananya"
                    className={cn(
                      "w-full border bg-canvas px-4 py-3.5 font-ui text-sm text-ink placeholder:text-taupe/60 transition-colors focus:outline-none focus:ring-1",
                      errors.firstName
                        ? "border-accent focus:border-accent focus:ring-accent"
                        : "border-pearl focus:border-ink focus:ring-ink"
                    )}
                  />
                  {errors.firstName && (
                    <p className="mt-1.5 font-ui text-[11px] text-accent">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="signup-lastName"
                    className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                  >
                    Last Name
                  </label>
                  <input
                    id="signup-lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="e.g. Sharma"
                    className="w-full border border-pearl bg-canvas px-4 py-3.5 font-ui text-sm text-ink placeholder:text-taupe/60 transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                  >
                    Email Address <span className="text-accent">*</span>
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. ananya.sharma@example.com"
                    className={cn(
                      "w-full border bg-canvas px-4 py-3.5 font-ui text-sm text-ink placeholder:text-taupe/60 transition-colors focus:outline-none focus:ring-1",
                      errors.email
                        ? "border-accent focus:border-accent focus:ring-accent"
                        : "border-pearl focus:border-ink focus:ring-ink"
                    )}
                  />
                  {errors.email && (
                    <p className="mt-1.5 font-ui text-[11px] text-accent">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="signup-phone"
                    className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                  >
                    Mobile Phone
                  </label>
                  <input
                    id="signup-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. +91 98765 43210"
                    className={cn(
                      "w-full border bg-canvas px-4 py-3.5 font-ui text-sm text-ink placeholder:text-taupe/60 transition-colors focus:outline-none focus:ring-1",
                      errors.phone
                        ? "border-accent focus:border-accent focus:ring-accent"
                        : "border-pearl focus:border-ink focus:ring-ink"
                    )}
                  />
                  {errors.phone && (
                    <p className="mt-1.5 font-ui text-[11px] text-accent">
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                  >
                    Password <span className="text-accent">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
                      className={cn(
                        "w-full border bg-canvas px-4 py-3.5 pr-12 font-ui text-sm text-ink placeholder:text-taupe/60 transition-colors focus:outline-none focus:ring-1",
                        errors.password
                          ? "border-accent focus:border-accent focus:ring-accent"
                          : "border-pearl focus:border-ink focus:ring-ink"
                      )}
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
                  {errors.password && (
                    <p className="mt-1.5 font-ui text-[11px] text-accent">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="signup-confirmPassword"
                    className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                  >
                    Confirm Password <span className="text-accent">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repeat password"
                      className={cn(
                        "w-full border bg-canvas px-4 py-3.5 pr-12 font-ui text-sm text-ink placeholder:text-taupe/60 transition-colors focus:outline-none focus:ring-1",
                        errors.confirmPassword
                          ? "border-accent focus:border-accent focus:ring-accent"
                          : "border-pearl focus:border-ink focus:ring-ink"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      aria-pressed={showConfirmPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-taupe hover:text-ink transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" />
                      ) : (
                        <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1.5 font-ui text-[11px] text-accent">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Date of Birth */}
              <div>
                <label
                  htmlFor="signup-dateOfBirth"
                  className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                >
                  Date of Birth <span className="text-taupe font-normal lowercase">(optional — for birthday celebrations)</span>
                </label>
                <input
                  id="signup-dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full border border-pearl bg-canvas px-4 py-3.5 font-ui text-sm text-ink placeholder:text-taupe/60 transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              {/* Terms notice */}
              <p className="font-ui text-[11px] leading-relaxed text-taupe">
                By creating an account, you agree to PRATIKSHYA FASHON&apos;s{" "}
                <Link to="/terms" className="text-ink underline hover:text-accent">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-ink underline hover:text-accent">
                  Privacy Policy
                </Link>
                .
              </p>

              {/* CTA */}
              <div className="pt-2">
                <AtelierButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || success}
                  className="w-full justify-center py-4"
                >
                  {isSubmitting ? (
                    "Creating Account..."
                  ) : success ? (
                    "Welcome to PRATIKSHYA FASHON"
                  ) : (
                    <>
                      Create Account <ArrowRight size={14} aria-hidden="true" />
                    </>
                  )}
                </AtelierButton>
              </div>
            </form>

            {/* Already have account */}
            <div className="mt-8 border-t border-mist/70 pt-6 text-center">
              <p className="font-ui text-xs text-graphite">
                Already have an account?{" "}
                <Link
                  to={`/signin${rawReturnTo ? `?returnTo=${encodeURIComponent(rawReturnTo)}` : ""}`}
                  className="font-medium text-ink hover:text-accent transition-colors underline-offset-4 underline ml-1"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </AtelierSection>
    </main>
  );
}
