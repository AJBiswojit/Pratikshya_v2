import { Heart, Search, ShoppingBag, User } from "lucide-react";

/**
 * Maps the `icon` keys used by `utilityNavigation` onto Lucide components,
 * so the header and the mobile drawer render the same glyph for the same
 * action without either importing the other.
 */
export const utilityIcons = {
  search: Search,
  wishlist: Heart,
  account: User,
  cart: ShoppingBag,
};

export default utilityIcons;
