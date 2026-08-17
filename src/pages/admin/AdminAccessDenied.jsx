import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { AtelierButton, Rule } from "../../design-system";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";

/**
 * Admin access refusal.
 *
 * Shown when an identity reaches an admin route without an administration
 * role. It states the boundary and offers the door that identity actually
 * has — no technical detail, no hint about what would have worked.
 */
export default function AdminAccessDenied() {
  const { isAuthenticated: isEmployee } = useEmployeeAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-16">
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center bg-ink text-gold">
          <ShieldAlert size={20} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">
          Admin access required
        </p>
        <h1 className="mt-3 font-display text-4xl font-light tracking-tight text-ink">
          Not your <span className="italic text-accent">portal.</span>
        </h1>
        <Rule width="w-12" tone="accent" className="mx-auto my-6" />
        <p className="font-ui text-sm leading-relaxed text-taupe">
          You don't have permission to access the administration portal.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {isEmployee ? (
            <AtelierButton as={Link} to="/employee">
              Return to employee portal
            </AtelierButton>
          ) : (
            <AtelierButton as={Link} to="/admin/login">
              Admin sign in
            </AtelierButton>
          )}
          <AtelierButton as={Link} to="/" variant="outline">
            Back to store
          </AtelierButton>
        </div>
      </div>
    </div>
  );
}
