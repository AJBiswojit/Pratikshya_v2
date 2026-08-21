import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAccount } from "../../context/AccountContext";
import { AtelierButton } from "../../design-system";

export default function AccountHero() {
  const { signOut } = useAuth();
  const { profile } = useAccount();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate("/", { replace: true });
  };

  const firstName = profile?.firstName || "there";
  const lastName = profile?.lastName || "";
  const initials = [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() || "P";

  return (
    <header className="mb-8 border-b border-mist/70 pb-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4 sm:gap-5">
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt=""
              className="h-14 w-14 shrink-0 object-cover border border-mist sm:h-16 sm:w-16"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center border border-ink/15 bg-ink font-display text-lg font-light text-ivory sm:h-16 sm:w-16 sm:text-xl"
            >
              {initials}
            </div>
          )}
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[.28em] text-accent">Welcome back</p>
            <h1 className="mt-1 font-display text-3xl font-light tracking-tight text-ink sm:text-4xl">
              {firstName}
            </h1>
            <p className="mt-2 font-ui text-sm text-taupe">Your personal fashion space.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AtelierButton as={Link} to="/shop" variant="primary" size="chip">
            Continue Shopping
          </AtelierButton>
          <AtelierButton as={Link} to="/account/orders" variant="outline" size="chip">
            View Orders
          </AtelierButton>
          <AtelierButton as={Link} to="/collections/new-arrivals" variant="outline" size="chip">
            Explore New Arrivals
          </AtelierButton>
          <button
            type="button"
            onClick={handleSignOut}
            className="font-ui text-[11px] uppercase tracking-[.14em] text-taupe hover:text-accent"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
