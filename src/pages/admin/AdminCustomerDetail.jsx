import { Link, useParams } from "react-router-dom";
import AdminPage from "../../components/admin/AdminPage";
import AdminPanel from "../../components/admin/AdminPanel";
import { findCustomer } from "../../services/customer/customerRegistry";
import { useOrder } from "../../context/OrderContext";

export default function AdminCustomerDetail() {
  const { customerId } = useParams();
  const { allOrders = [] } = useOrder();
  const c = findCustomer(customerId);
  if (!c) return <AdminPage title="Customer not found" />;
  const orders = allOrders.filter(
    (o) => o.customerId === c.id || o.customer?.email === c.email
  );
  const spend = orders.reduce(
    (s, o) => s + Number(o.total || o.totalAmount || o.pricing?.total || 0),
    0
  );
  return (
    <AdminPage
      title={`${c.firstName} ${c.lastName}`}
      eyebrow="Customer profile"
      description={`PF-CUS-${c.id.replace("cust-", "")} · ${c.email}`}
    >
      <div className="grid gap-5 md:grid-cols-3 mb-6">
        <AdminPanel title="Overview">
          <p>
            Status <b>ACTIVE</b>
          </p>
          <p>Created {new Date(c.createdAt).toLocaleDateString()}</p>
          <p>
            {orders.length} orders · ₹{Math.round(spend).toLocaleString("en-IN")}
          </p>
        </AdminPanel>
        <AdminPanel title="Contact">
          <p>{c.phone}</p>
          <p>{c.addresses?.[0]?.addressLine || "No saved address"}</p>
          <p>{c.addresses?.[0]?.city || ""}</p>
        </AdminPanel>
        <AdminPanel title="Support notes">
          <p className="text-slate">Internal notes are visible to authorized support staff only.</p>
        </AdminPanel>
      </div>
      <AdminPanel title="Purchase history">
        <div className="space-y-3">
          {orders.length ? (
            orders.map((o) => (
              <div className="flex justify-between border-b border-pearl py-3" key={o.id}>
                <Link className="underline" to={`/admin/orders/${o.id}`}>
                  {o.id}
                </Link>
                <span>
                  {o.status} · ₹
                  {Math.round(o.total || o.totalAmount || o.pricing?.total || 0).toLocaleString("en-IN")}
                </span>
              </div>
            ))
          ) : (
            <p>No orders yet.</p>
          )}
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
