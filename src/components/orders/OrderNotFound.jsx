import { Link } from "react-router-dom";
import OrderPageShell from "./OrderPageShell";
import { AtelierButton, EmptyState } from "../../design-system";

/**
 * The safe not-found state for every order route.
 *
 * One state covers both "no such order" and "not your order", deliberately:
 * a customer probing another customer's order id must learn nothing from
 * the difference. No technical detail ever reaches the page.
 */
export default function OrderNotFound({
  eyebrow = "Order Not Found",
  title = "Order not found",
  description = "That order could not be found in your account.",
}) {
  return (
    <OrderPageShell
      breadcrumbItems={[
        { label: "Account", to: "/account" },
        { label: "Orders", to: "/account/orders" },
        { label: "Not Found" },
      ]}
    >
      <div className="border border-mist/80 bg-surface/30 px-6">
        <EmptyState
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={
            <div className="flex flex-wrap items-center justify-center gap-4">
              <AtelierButton
                as={Link}
                to="/account/orders"
                variant="primary"
                size="md"
              >
                View My Orders
              </AtelierButton>
              <AtelierButton as={Link} to="/shop" variant="outline" size="md">
                Continue Shopping
              </AtelierButton>
            </div>
          }
        />
      </div>
    </OrderPageShell>
  );
}
