import { useState, useEffect } from "react";
import { Eye, EyeOff, Smartphone, Laptop, CheckCircle2, AlertCircle } from "lucide-react";
import AccountShell from "../../components/account/AccountShell";
import { useAccount } from "../../context/AccountContext";
import { AtelierButton, EditorialHeading } from "../../design-system";
import { validatePassword, validatePasswordMatch } from "../../utils/validation";
import { cn } from "../../utils/cn";

export default function AccountSecurity() {
  const { security, signOutOtherSessions } = useAccount();

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [feedback, setFeedback] = useState(null);
  const [sessionFeedback, setSessionFeedback] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Security — PRATIKSHYA FASHON";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!sessionFeedback) return undefined;
    const timer = setTimeout(() => setSessionFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [sessionFeedback]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!currentPwd) {
      setFeedback({ ok: false, message: "Please enter your current password." });
      return;
    }

    const check = validatePassword(newPwd);
    if (!check.ok) {
      setFeedback({ ok: false, message: check.message });
      return;
    }

    const match = validatePasswordMatch(newPwd, confirmPwd);
    if (!match.ok) {
      setFeedback({ ok: false, message: match.message });
      return;
    }

    setIsUpdating(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsUpdating(false);

    setFeedback({ ok: true, message: "Your password has been changed successfully." });
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
  };

  const handleSignOutOther = () => {
    const res = signOutOtherSessions();
    setSessionFeedback({ ok: res.ok, message: res.message });
  };

  const sessions = security?.activeSessions || [
    {
      id: "sess-cur",
      device: "Current Browser & Device",
      location: "India",
      lastActive: "Active now",
      isCurrent: true,
    },
  ];

  return (
    <AccountShell
      breadcrumbItems={[
        { label: "Account", to: "/account" },
        { label: "Security & Sessions" },
      ]}
    >
      <div className="max-w-3xl space-y-10">
        <div>
          <EditorialHeading
            as="h2"
            size="subsection"
            eyebrow="Security Center"
            description="Manage your account access, change your password, and review connected devices."
            spacing={{ eyebrow: "mb-3", title: "mb-3", description: "mb-0" }}
          >
            Account <span className="italic text-accent">security.</span>
          </EditorialHeading>
        </div>

        {/* Change Password Card */}
        <div className="border border-mist/80 bg-surface/40 p-7 sm:p-10">
          <h3 className="font-display text-xl font-light text-ink mb-1">
            Change Password
          </h3>
          <p className="font-ui text-xs text-taupe mb-6">
            Ensure your account is protected with a secure password of at least 6 characters.
          </p>

          {feedback && (
            <div
              role="status"
              className={cn(
                "mb-6 flex items-center gap-3 border p-4 font-ui text-xs leading-relaxed",
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

          <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
            {/* Current Password */}
            <div>
              <label
                htmlFor="sec-current"
                className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-1.5"
              >
                Current Password
              </label>
              <div className="relative">
                <input
                  id="sec-current"
                  type={showCurrentPwd ? "text" : "password"}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full border border-pearl bg-canvas px-4 py-2.5 pr-12 font-ui text-sm text-ink transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  aria-label={showCurrentPwd ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-taupe hover:text-ink"
                >
                  {showCurrentPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password & Confirm Password */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="sec-new"
                  className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="sec-new"
                    type={showNewPwd ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full border border-pearl bg-canvas px-4 py-2.5 pr-12 font-ui text-sm text-ink transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    aria-label={showNewPwd ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-taupe hover:text-ink"
                  >
                    {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="sec-confirm"
                  className="block font-ui text-[11px] uppercase tracking-[.18em] text-ink mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="sec-confirm"
                    type={showConfirmPwd ? "text" : "password"}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full border border-pearl bg-canvas px-4 py-2.5 pr-12 font-ui text-sm text-ink transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    aria-label={showConfirmPwd ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-taupe hover:text-ink"
                  >
                    {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <AtelierButton
                type="submit"
                variant="primary"
                size="md"
                disabled={isUpdating}
              >
                {isUpdating ? "Updating..." : "Update Password"}
              </AtelierButton>
            </div>
          </form>
        </div>

        {/* Active Sessions Card */}
        <div className="border border-mist/80 bg-surface/40 p-7 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-display text-xl font-light text-ink mb-1">
                Active Devices &amp; Sessions
              </h3>
              <p className="font-ui text-xs text-taupe">
                Devices currently authenticated into your PRATIKSHYA FASHON atelier.
              </p>
            </div>

            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleSignOutOther}
                className="font-ui text-[11px] uppercase tracking-[.14em] text-accent hover:underline font-medium self-start sm:self-auto"
              >
                Sign Out Other Devices
              </button>
            )}
          </div>

          {sessionFeedback && (
            <div
              role="status"
              className="mb-6 flex items-center gap-3 border border-cocoa/40 bg-cocoa/10 p-4 font-ui text-xs text-cocoa leading-relaxed"
            >
              <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
              <p>{sessionFeedback.message}</p>
            </div>
          )}

          <div className="divide-y divide-mist/60">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 border border-mist/80 bg-canvas text-ink">
                    {sess.device.toLowerCase().includes("iphone") || sess.device.toLowerCase().includes("ios") ? (
                      <Smartphone size={16} strokeWidth={1.5} />
                    ) : (
                      <Laptop size={16} strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <p className="font-ui text-xs font-medium text-ink flex items-center gap-2">
                      {sess.device}
                      {sess.isCurrent && (
                        <span className="text-[10px] uppercase tracking-wider bg-cocoa/15 text-cocoa px-1.5 py-0.5">
                          This Device
                        </span>
                      )}
                    </p>
                    <p className="font-ui text-[11px] text-taupe">
                      {sess.location} • {sess.lastActive}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AccountShell>
  );
}
