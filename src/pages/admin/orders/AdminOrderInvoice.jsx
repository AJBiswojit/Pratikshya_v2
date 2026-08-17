import { Link, useParams } from "react-router-dom";
import AdminPage from "../../../components/admin/AdminPage";
import { useOrder } from "../../../context/OrderContext";
import { AtelierButton, Rule } from "../../../design-system";
import { formatINR } from "../../../utils/shopping";
import { formatOrderDate } from "../../../utils/orders";
import { formatPhone } from "../../../utils/validation";
import { getPaymentStatus } from "../../../config/orderConfig";

function Row({ label, value, strong = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-ui text-[11px] text-graphite">{label}</dt>
      <dd className={strong ? "font-display text-lg font-light text-ink" : "font-ui text-xs text-ink"}>{value}</dd>
    </div>
  );
}

export default function AdminOrderInvoice() {
  const { orderId } = useParams();
  const { getOrderByIdAdmin } = useOrder();
  const order = getOrderByIdAdmin(orderId);

  if (!order) {
    return (
      <AdminPage eyebrow="Orders" title="Invoice not found">
        <Link to="/admin/orders" className="font-ui text-sm text-brass hover:text-accent">Back to orders</Link>
      </AdminPage>
    );
  }

  const payment = getPaymentStatus(order.paymentStatus);
  const address = order.address;

  return (
    <AdminPage
      eyebrow={`Orders / ${order.id}`}
      title={`Invoice · ${order.invoice.number}`}
      description="Frontend demo document — not a tax invoice. Use browser Print to PDF."
      actions={
        <>
          <AtelierButton variant="outline" size="chip" onClick={() => window.print()}>
            Print / PDF
          </AtelierButton>
          <AtelierButton as={Link} to={`/admin/orders/${order.id}`} variant="outline" size="chip">
            Back to order
          </AtelierButton>
        </>
      }
    >
      <div className="mx-auto max-w-3xl border border-mist bg-ivory px-6 py-8 sm:px-10 sm:py-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl font-light tracking-[.08em] text-ink">PRATIKSHYA FASHON</h2>
            <p className="mt-1 font-ui text-[10px] uppercase tracking-[.24em] text-brass">Atelier of Handcrafted Indian Couture</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">Invoice</p>
            <p className="mt-1 font-display text-lg font-light text-ink">{order.invoice.number}</p>
            <p className="mt-1 font-ui text-[11px] text-taupe">{formatOrderDate(order.invoice.issuedAt)}</p>
          </div>
        </div>

        <Rule width="w-full" tone="accent" className="my-7" />

        <div className="grid gap-7 sm:grid-cols-2">
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Billed To</p>
            <p className="mt-2.5 font-display text-base font-light text-ink">{order.customer.fullName}</p>
            <p className="font-ui text-xs text-graphite">{order.customer.email}</p>
            {order.customer.phone && <p className="font-ui text-xs text-graphite">{formatPhone(order.customer.phone)}</p>}
          </div>
          {address && (
            <div>
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Delivered To</p>
              <p className="mt-2.5 font-display text-base font-light text-ink">{address.fullName}</p>
              <p className="font-ui text-xs leading-relaxed text-graphite">{address.addressLine}{address.landmark ? `, ${address.landmark}` : ""}</p>
              <p className="font-ui text-xs text-graphite">{address.city}, {address.state} — {address.pincode}</p>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-4 border border-mist/80 bg-surface/30 p-5 sm:grid-cols-3">
          <div><p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">Order ID</p><p className="mt-1 font-ui text-sm text-ink">{order.id}</p></div>
          <div><p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">Order Date</p><p className="mt-1 font-ui text-sm text-ink">{formatOrderDate(order.createdAt)}</p></div>
          <div><p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">Payment</p><p className="mt-1 font-ui text-sm text-ink">{order.paymentMethod.label} · {payment.label}</p></div>
        </div>

        <table className="mt-8 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-ink/20">
              <th className="pb-3 font-ui text-[10px] uppercase tracking-[.2em] text-taupe">Piece</th>
              <th className="pb-3 text-center font-ui text-[10px] uppercase tracking-[.2em] text-taupe">Qty</th>
              <th className="pb-3 text-right font-ui text-[10px] uppercase tracking-[.2em] text-taupe">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.lineId} className="border-b border-mist/70">
                <td className="py-3.5 pr-4">
                  <p className="font-display text-base font-light text-ink">{item.name}</p>
                  <p className="mt-0.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe">{[item.color, item.size].filter(Boolean).join(" · ") || "Free Size"}</p>
                </td>
                <td className="py-3.5 text-center font-ui text-xs text-graphite">{item.quantity}</td>
                <td className="py-3.5 text-right font-ui text-xs text-ink">{formatINR(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-7 flex justify-end">
          <dl className="w-full space-y-2.5 sm:max-w-xs">
            <Row label="Subtotal" value={formatINR(order.pricing.subtotal)} />
            {order.pricing.productDiscount > 0 && <Row label="Product discount" value={`− ${formatINR(order.pricing.productDiscount)}`} />}
            {order.pricing.couponDiscount > 0 && <Row label={`Offer · ${order.pricing.couponCode ?? "Applied"}`} value={`− ${formatINR(order.pricing.couponDiscount)}`} />}
            <Row label="Delivery" value={order.pricing.shipping === 0 ? "Complimentary" : formatINR(order.pricing.shipping)} />
            {order.pricing.codFee > 0 && <Row label="Cash on delivery fee" value={formatINR(order.pricing.codFee)} />}
            <div className="border-t border-ink/20 pt-3"><Row label="Total" value={formatINR(order.pricing.total)} strong /></div>
          </dl>
        </div>

        <Rule width="w-full" tone="accent" className="my-8" />
        <p className="font-ui text-[10px] uppercase leading-relaxed tracking-[.16em] text-taupe">Demonstration invoice — issued by the PRATIKSHYA FASHON frontend for client preview. Not a tax invoice and not a record of any real transaction.</p>
      </div>
    </AdminPage>
  );
}
