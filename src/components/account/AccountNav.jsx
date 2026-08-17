import { Link, useLocation } from "react-router-dom";
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Sliders,
  Shield,
  LayoutDashboard,
  Sparkles,
  Camera,
  Wand2,
} from "lucide-react";
import { useWishlist } from "../../context/WishlistContext";
import { cn } from "../../utils/cn";
import { transition } from "../../design-system";

export const ACCOUNT_NAV_ITEMS = [
  {
    label: "Overview",
    to: "/account",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Profile",
    to: "/account/profile",
    icon: User,
  },
  {
    label: "Orders",
    to: "/account/orders",
    icon: ShoppingBag,
  },
  {
    label: "Wishlist",
    to: "/account/wishlist",
    icon: Heart,
    badge: "wishlist",
  },
  {
    label: "Addresses",
    to: "/account/addresses",
    icon: MapPin,
  },
  {
    label: "Style",
    to: "/account/preferences",
    icon: Sparkles,
  },
  {
    label: "AI Shopping",
    to: "/account/ai-shopping",
    icon: Wand2,
  },
  {
    label: "AI Mirror",
    to: "/account/ai-mirror",
    icon: Camera,
  },
  {
    label: "Settings",
    to: "/account/settings",
    icon: Sliders,
  },
  {
    label: "Security",
    to: "/account/security",
    icon: Shield,
  },
];

export default function AccountNav({ className = "" }) {
  const { pathname } = useLocation();
  const wishlist = useWishlist();

  return (
    <nav
      aria-label="Account navigation"
      className={cn(
        "border-b border-mist/80 bg-surface/30 overflow-x-auto scrollbar-none",
        className
      )}
    >
      <div className="flex items-center gap-1 min-w-max px-2 py-1">
        {ACCOUNT_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(`${item.to}/`);

          const count = item.badge === "wishlist" ? wishlist.count : 0;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3 font-ui text-xs uppercase tracking-[.14em]",
                transition.colors,
                isActive
                  ? "text-accent font-medium"
                  : "text-taupe hover:text-ink"
              )}
            >
              <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>{item.label}</span>
              {count > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] bg-accent/15 text-accent font-normal">
                  {count}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
