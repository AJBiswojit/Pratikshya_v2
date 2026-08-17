import { Link } from "react-router-dom";
import AccountShell from "../account/AccountShell";
import { useAuth } from "../../context/AuthContext";
import { AtelierSection, Breadcrumb, transition } from "../../design-system";
import { cn } from "../../utils/cn";

/**
 * The frame every single-order page sits in.
 *
 * A signed-in customer gets the full account shell — the same hero and
 * account navigation as the rest of their account. A guest who has just
 * checked out gets the same page inside a plain atelier section, so the
 * order they placed in this browser stays reachable without an account.
 *
 * Access control does not live here: the order itself is read through the
 * ownership-checked context accessor, so a guest can only ever resolve a
 * guest order from this browser.
 */
export default function OrderPageShell({ breadcrumbItems = [], children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <AccountShell breadcrumbItems={breadcrumbItems}>{children}</AccountShell>;
  }

  return (
    <main>
      <AtelierSection
        rhythm="none"
        width="wide"
        className="pb-24 pt-28 sm:pt-32 md:pb-32"
      >
        <Breadcrumb
          items={[{ label: "Atelier", to: "/" }, ...breadcrumbItems]}
          className="mb-6 md:mb-8"
        />

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-mist/80 bg-surface/50 px-6 py-5">
          <p className="font-ui text-[11px] leading-relaxed text-graphite">
            You're viewing a guest order from this browser.{" "}
            <span className="text-taupe">
              Create an account to keep your orders organized.
            </span>
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/signup?returnTo=%2Faccount%2Forders"
              className={cn(
                "font-ui text-[10px] uppercase tracking-[.16em] text-accent underline-offset-2 hover:underline",
                transition.colors
              )}
            >
              Create Account
            </Link>
            <Link
              to="/signin?returnTo=%2Faccount%2Forders"
              className={cn(
                "font-ui text-[10px] uppercase tracking-[.16em] text-brass hover:text-accent",
                transition.colors
              )}
            >
              Sign In
            </Link>
          </div>
        </div>

        {children}
      </AtelierSection>
    </main>
  );
}
