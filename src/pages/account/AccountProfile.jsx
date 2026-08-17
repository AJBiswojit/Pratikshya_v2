import { useState, useEffect, useRef } from "react";
import { Camera, CheckCircle2, AlertCircle } from "lucide-react";
import AccountShell from "../../components/account/AccountShell";
import { useAccount } from "../../context/AccountContext";
import { AtelierButton, EditorialHeading } from "../../design-system";
import { isValidEmail, isValidPhone } from "../../utils/validation";
import { cn } from "../../utils/cn";

export default function AccountProfile() {
  const { profile, updateProfile } = useAccount();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    avatar: null,
  });

  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Profile — PRATIKSHYA FASHON";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        avatar: profile.avatar || null,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback({ ok: false, message: "Please select a valid image file (JPEG, PNG, WebP)." });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ ok: false, message: "Image size must be less than 2MB." });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({ ...prev, avatar: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const result = updateProfile({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      dateOfBirth: formData.dateOfBirth,
      avatar: formData.avatar,
    });

    setIsSaving(false);
    setFeedback({ ok: result.ok, message: result.message });
  };

  const initials = [formData.firstName[0], formData.lastName[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "P";

  return (
    <AccountShell breadcrumbItems={[{ label: "Account", to: "/account" }, { label: "Profile" }]}>
      <div className="max-w-3xl">
        <EditorialHeading
          as="h2"
          size="subsection"
          eyebrow="Personal Details"
          description="Update your personal details, contact information, and portrait."
          spacing={{ eyebrow: "mb-3", title: "mb-3", description: "mb-0" }}
        >
          Your personal <span className="italic text-accent">profile.</span>
        </EditorialHeading>

        {feedback && (
          <div
            role="status"
            className={cn(
              "mt-6 flex items-center gap-3 border p-4 font-ui text-xs leading-relaxed",
              feedback.ok
                ? "border-cocoa/40 bg-cocoa/10 text-cocoa"
                : "border-accent/40 bg-accent/5 text-accent"
            )}
          >
            {feedback.ok ? (
              <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
            )}
            <p>{feedback.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 border border-mist/80 bg-surface/40 p-7 sm:p-10" noValidate>
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-mist/70">
            <div className="relative">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt="Profile"
                  className="h-24 w-24 object-cover border border-mist"
                />
              ) : (
                <div className="h-24 w-24 flex items-center justify-center bg-ink text-ivory font-display text-3xl font-light border border-ink/20">
                  {initials}
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <p className="font-ui text-xs font-medium text-ink uppercase tracking-wider">
                Profile Portrait
              </p>
              <p className="font-ui text-[11px] text-taupe leading-relaxed">
                PNG, JPG or WebP (max 2MB). Used for order confirmations and atelier styling notes.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="cursor-pointer inline-flex items-center gap-2 border border-pearl bg-canvas px-4 py-2 font-ui text-[11px] uppercase tracking-[.14em] text-ink hover:text-accent hover:border-accent transition-colors"
                >
                  <Camera size={13} aria-hidden="true" /> Upload Photo
                </label>

                {formData.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="font-ui text-[11px] uppercase tracking-[.14em] text-taupe hover:text-accent transition-colors px-2 py-2"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="mt-8 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="profile-firstName"
                  className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                >
                  First Name <span className="text-accent">*</span>
                </label>
                <input
                  id="profile-firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className={cn(
                    "w-full border bg-canvas px-4 py-3 font-ui text-sm text-ink transition-colors focus:outline-none focus:ring-1",
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
                  htmlFor="profile-lastName"
                  className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                >
                  Last Name
                </label>
                <input
                  id="profile-lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full border border-pearl bg-canvas px-4 py-3 font-ui text-sm text-ink transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="profile-email"
                  className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                >
                  Email Address <span className="text-accent">*</span>
                </label>
                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={cn(
                    "w-full border bg-canvas px-4 py-3 font-ui text-sm text-ink transition-colors focus:outline-none focus:ring-1",
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
                  htmlFor="profile-phone"
                  className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                >
                  Mobile Number
                </label>
                <input
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className={cn(
                    "w-full border bg-canvas px-4 py-3 font-ui text-sm text-ink transition-colors focus:outline-none focus:ring-1",
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

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="profile-dateOfBirth"
                  className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                >
                  Date of Birth
                </label>
                <input
                  id="profile-dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full border border-pearl bg-canvas px-4 py-3 font-ui text-sm text-ink transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              <div>
                <label
                  className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2"
                >
                  Member Since
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.memberSince || "2025"}
                  className="w-full border border-mist bg-canvas-deep/50 px-4 py-3 font-ui text-sm text-taupe cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-10 pt-6 border-t border-mist/70 flex flex-wrap items-center gap-4">
            <AtelierButton
              type="submit"
              variant="primary"
              size="md"
              disabled={isSaving}
            >
              {isSaving ? "Saving Changes..." : "Save Profile"}
            </AtelierButton>
            <AtelierButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                if (profile) {
                  setFormData({
                    firstName: profile.firstName || "",
                    lastName: profile.lastName || "",
                    email: profile.email || "",
                    phone: profile.phone || "",
                    dateOfBirth: profile.dateOfBirth || "",
                    avatar: profile.avatar || null,
                  });
                }
                setErrors({});
              }}
            >
              Reset
            </AtelierButton>
          </div>
        </form>
      </div>
    </AccountShell>
  );
}
