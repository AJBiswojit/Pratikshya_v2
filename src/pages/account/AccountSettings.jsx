import { useState, useEffect } from "react";
import { CheckCircle2, Bell, Mail } from "lucide-react";
import AccountShell from "../../components/account/AccountShell";
import { useAccount } from "../../context/AccountContext";
import { AtelierButton, EditorialHeading } from "../../design-system";

export default function AccountSettings() {
  const { preferences, updatePreferences } = useAccount();

  const [formPrefs, setFormPrefs] = useState({
    emailNotifications: true,
    smsNotifications: true,
    promotionalUpdates: true,
    orderUpdates: true,
    stylingInvitations: true,
  });

  const [feedback, setFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Settings — PRATIKSHYA FASHON";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    if (preferences) {
      setFormPrefs({
        emailNotifications: Boolean(preferences.emailNotifications),
        smsNotifications: Boolean(preferences.smsNotifications),
        promotionalUpdates: Boolean(preferences.promotionalUpdates),
        orderUpdates: Boolean(preferences.orderUpdates !== false),
        stylingInvitations: Boolean(preferences.stylingInvitations),
      });
    }
  }, [preferences]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleToggle = (key) => {
    setFormPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 250));

    const res = updatePreferences(formPrefs);
    setIsSaving(false);
    setFeedback({ ok: res.ok, message: res.message });
  };

  return (
    <AccountShell
      breadcrumbItems={[
        { label: "Account", to: "/account" },
        { label: "Settings & Preferences" },
      ]}
    >
      <div className="max-w-3xl">
        <EditorialHeading
          as="h2"
          size="subsection"
          eyebrow="Preferences"
          description="Control your communications, seasonal alerts, and tailored styling invitations."
          spacing={{ eyebrow: "mb-3", title: "mb-3", description: "mb-0" }}
        >
          Communication <span className="italic text-accent">preferences.</span>
        </EditorialHeading>

        {feedback && (
          <div
            role="status"
            className="mt-6 flex items-center gap-3 border border-cocoa/40 bg-cocoa/10 p-4 font-ui text-xs text-cocoa leading-relaxed"
          >
            <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
            <p>{feedback.message}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-8 border border-mist/80 bg-surface/40 p-7 sm:p-10">
          <div className="space-y-6 divide-y divide-mist/60">
            {/* Section 1: Order Updates */}
            <div className="pt-2">
              <h3 className="font-display text-lg font-light text-ink flex items-center gap-2 mb-2">
                <Mail size={16} strokeWidth={1.5} className="text-accent" /> Order &amp; Dispatch Updates
              </h3>
              <p className="font-ui text-xs text-taupe mb-4">
                Essential order confirmations, shipping dispatch notifications, and electronic invoices.
              </p>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formPrefs.orderUpdates}
                    onChange={() => handleToggle("orderUpdates")}
                    className="mt-0.5 h-4 w-4 rounded-none border-pearl text-ink focus:ring-ink accent-ink"
                  />
                  <div>
                    <span className="font-ui text-xs font-medium text-ink block">
                      Order Status Emails
                    </span>
                    <span className="font-ui text-[11px] text-taupe">
                      Receive tracking updates when your pieces are tailored and dispatched.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formPrefs.smsNotifications}
                    onChange={() => handleToggle("smsNotifications")}
                    className="mt-0.5 h-4 w-4 rounded-none border-pearl text-ink focus:ring-ink accent-ink"
                  />
                  <div>
                    <span className="font-ui text-xs font-medium text-ink block">
                      SMS Delivery Notifications
                    </span>
                    <span className="font-ui text-[11px] text-taupe">
                      Receive brief SMS alerts when your package is out for delivery.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 2: Editorial & Seasonal Edits */}
            <div className="pt-6">
              <h3 className="font-display text-lg font-light text-ink flex items-center gap-2 mb-2">
                <Bell size={16} strokeWidth={1.5} className="text-accent" /> Atelier Discoveries &amp; Stories
              </h3>
              <p className="font-ui text-xs text-taupe mb-4">
                Curated festive lookbooks, heritage weaving narratives, and new arrival announcements.
              </p>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formPrefs.promotionalUpdates}
                    onChange={() => handleToggle("promotionalUpdates")}
                    className="mt-0.5 h-4 w-4 rounded-none border-pearl text-ink focus:ring-ink accent-ink"
                  />
                  <div>
                    <span className="font-ui text-xs font-medium text-ink block">
                      Seasonal Edits &amp; Lookbooks
                    </span>
                    <span className="font-ui text-[11px] text-taupe">
                      Subtle notifications when new bridal and festive collections arrive.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formPrefs.stylingInvitations}
                    onChange={() => handleToggle("stylingInvitations")}
                    className="mt-0.5 h-4 w-4 rounded-none border-pearl text-ink focus:ring-ink accent-ink"
                  />
                  <div>
                    <span className="font-ui text-xs font-medium text-ink block">
                      Bespoke Styling Consultations
                    </span>
                    <span className="font-ui text-[11px] text-taupe">
                      Invitations to private showroom previews and virtual bridal fittings.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-mist/70">
            <AtelierButton
              type="submit"
              variant="primary"
              size="md"
              disabled={isSaving}
            >
              {isSaving ? "Saving Preferences..." : "Save Preferences"}
            </AtelierButton>
          </div>
        </form>
      </div>
    </AccountShell>
  );
}
