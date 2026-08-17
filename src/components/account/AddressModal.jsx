import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { AtelierButton } from "../../design-system";
import { isValidPhone, isValidPincode } from "../../utils/validation";
import { cn } from "../../utils/cn";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function AddressModal({
  isOpen,
  onClose,
  onSave,
  initialAddress = null,
}) {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    addressLine: "",
    landmark: "",
    city: "",
    state: "Karnataka",
    pincode: "",
    type: "Home",
    isDefault: false,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialAddress) {
      setFormData({
        fullName: initialAddress.fullName || "",
        phone: initialAddress.phone || "",
        addressLine: initialAddress.addressLine || "",
        landmark: initialAddress.landmark || "",
        city: initialAddress.city || "",
        state: initialAddress.state || "Karnataka",
        pincode: initialAddress.pincode || "",
        type: initialAddress.type || "Home",
        isDefault: Boolean(initialAddress.isDefault),
      });
    } else {
      setFormData({
        fullName: "",
        phone: "",
        addressLine: "",
        landmark: "",
        city: "",
        state: "Karnataka",
        pincode: "",
        type: "Home",
        isDefault: false,
      });
    }
    setErrors({});
  }, [initialAddress, isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = "Full name is required.";
    if (!formData.phone.trim()) {
      errs.phone = "Phone number is required.";
    } else if (!isValidPhone(formData.phone)) {
      errs.phone = "Enter a valid 10-digit phone number.";
    }
    if (!formData.addressLine.trim()) {
      errs.addressLine = "Flat, street or house name is required.";
    }
    if (!formData.city.trim()) errs.city = "City is required.";
    if (!formData.state.trim()) errs.state = "State is required.";
    if (!formData.pincode.trim()) {
      errs.pincode = "Pincode is required.";
    } else if (!isValidPincode(formData.pincode)) {
      errs.pincode = "Enter a valid 6-digit Indian PIN code.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
  };

  const isEditing = Boolean(initialAddress?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-ink/50 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-modal-title"
        className="relative z-10 w-full max-w-lg border border-mist bg-canvas p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mist/80 pb-4 mb-6">
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[.25em] text-accent">
              Delivery Destination
            </p>
            <h3
              id="address-modal-title"
              className="font-display text-2xl font-light tracking-tight text-ink mt-1"
            >
              {isEditing ? "Edit Address" : "Add New Address"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close address modal"
            className="p-1.5 text-taupe hover:text-ink transition-colors"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Address Type Chips */}
          <div>
            <label className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-2">
              Address Type
            </label>
            <div className="flex items-center gap-2">
              {["Home", "Work", "Other"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, type }))}
                  className={cn(
                    "px-4 py-2 font-ui text-xs uppercase tracking-[.12em] border transition-colors",
                    formData.type === type
                      ? "border-ink bg-ink text-ivory"
                      : "border-pearl bg-surface hover:border-ink"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Full Name & Phone */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="addr-fullName"
                className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-1.5"
              >
                Full Name <span className="text-accent">*</span>
              </label>
              <input
                id="addr-fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Ananya Sharma"
                className={cn(
                  "w-full border bg-surface/40 px-3.5 py-2.5 font-ui text-sm text-ink transition-colors focus:outline-none focus:ring-1",
                  errors.fullName
                    ? "border-accent focus:border-accent focus:ring-accent"
                    : "border-pearl focus:border-ink focus:ring-ink"
                )}
              />
              {errors.fullName && (
                <p className="mt-1 font-ui text-[11px] text-accent">
                  {errors.fullName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="addr-phone"
                className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-1.5"
              >
                Mobile Number <span className="text-accent">*</span>
              </label>
              <input
                id="addr-phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit number"
                className={cn(
                  "w-full border bg-surface/40 px-3.5 py-2.5 font-ui text-sm text-ink transition-colors focus:outline-none focus:ring-1",
                  errors.phone
                    ? "border-accent focus:border-accent focus:ring-accent"
                    : "border-pearl focus:border-ink focus:ring-ink"
                )}
              />
              {errors.phone && (
                <p className="mt-1 font-ui text-[11px] text-accent">
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Address Line */}
          <div>
            <label
              htmlFor="addr-addressLine"
              className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-1.5"
            >
              Flat, House No., Building, Street <span className="text-accent">*</span>
            </label>
            <input
              id="addr-addressLine"
              name="addressLine"
              type="text"
              required
              value={formData.addressLine}
              onChange={handleChange}
              placeholder="e.g. Flat 402, Lotus Residency, 14th Main"
              className={cn(
                "w-full border bg-surface/40 px-3.5 py-2.5 font-ui text-sm text-ink transition-colors focus:outline-none focus:ring-1",
                errors.addressLine
                  ? "border-accent focus:border-accent focus:ring-accent"
                  : "border-pearl focus:border-ink focus:ring-ink"
              )}
            />
            {errors.addressLine && (
              <p className="mt-1 font-ui text-[11px] text-accent">
                {errors.addressLine}
              </p>
            )}
          </div>

          {/* Landmark */}
          <div>
            <label
              htmlFor="addr-landmark"
              className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-1.5"
            >
              Area / Landmark <span className="text-taupe font-normal lowercase">(optional)</span>
            </label>
            <input
              id="addr-landmark"
              name="landmark"
              type="text"
              value={formData.landmark}
              onChange={handleChange}
              placeholder="e.g. Near Indiranagar Club"
              className="w-full border border-pearl bg-surface/40 px-3.5 py-2.5 font-ui text-sm text-ink transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>

          {/* City, State & Pincode */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="addr-city"
                className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-1.5"
              >
                City <span className="text-accent">*</span>
              </label>
              <input
                id="addr-city"
                name="city"
                type="text"
                required
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Bengaluru"
                className={cn(
                  "w-full border bg-surface/40 px-3.5 py-2.5 font-ui text-sm text-ink transition-colors focus:outline-none focus:ring-1",
                  errors.city
                    ? "border-accent focus:border-accent focus:ring-accent"
                    : "border-pearl focus:border-ink focus:ring-ink"
                )}
              />
              {errors.city && (
                <p className="mt-1 font-ui text-[11px] text-accent">
                  {errors.city}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="addr-state"
                className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-1.5"
              >
                State <span className="text-accent">*</span>
              </label>
              <select
                id="addr-state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full border border-pearl bg-surface/40 px-3 py-2.5 font-ui text-sm text-ink transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="addr-pincode"
                className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-1.5"
              >
                Pincode <span className="text-accent">*</span>
              </label>
              <input
                id="addr-pincode"
                name="pincode"
                type="text"
                required
                maxLength={6}
                value={formData.pincode}
                onChange={handleChange}
                placeholder="6 digits"
                className={cn(
                  "w-full border bg-surface/40 px-3.5 py-2.5 font-ui text-sm text-ink transition-colors focus:outline-none focus:ring-1",
                  errors.pincode
                    ? "border-accent focus:border-accent focus:ring-accent"
                    : "border-pearl focus:border-ink focus:ring-ink"
                )}
              />
              {errors.pincode && (
                <p className="mt-1 font-ui text-[11px] text-accent">
                  {errors.pincode}
                </p>
              )}
            </div>
          </div>

          {/* Default Address toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                className="h-4 w-4 rounded-none border-pearl text-ink focus:ring-ink accent-ink"
              />
              <span className="font-ui text-xs text-graphite">
                Make this my primary delivery address
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-mist/80 flex items-center justify-end gap-3">
            <AtelierButton
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
            >
              Cancel
            </AtelierButton>
            <AtelierButton type="submit" variant="primary" size="md">
              {isEditing ? "Update Address" : "Save Address"}
            </AtelierButton>
          </div>
        </form>
      </div>
    </div>
  );
}
