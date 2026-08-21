import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminPage from "../../components/admin/AdminPage";
import AdminPanel from "../../components/admin/AdminPanel";
import AdminMetricCard from "../../components/admin/AdminMetricCard";
import { loadCustomerRegistry } from "../../services/customer/customerRegistry";
import { useOrder } from "../../context/OrderContext";

const money = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

export default function AdminCustomers() {
  const { allOrders = [] } = useOrder();
  const [q, setQ] = useState("");
  const customers = loadCustomerRegistry();
  const rows = useMemo(
    () =>
      customers
        .map((c) => {
          const orders = allOrders.filter(
            (o) => o.customerId === c.id || o.customer?.email === c.email
          );
          const spend = orders.reduce(
            (s, o) => s + Number(o.total || o.totalAmount || o.amount || o.pricing?.total || 0),
            0
          );
          return { ...c, orders, spend, last: orders[0]?.createdAt };
        })
        .filter((c) =>
          `${c.firstName} ${c.lastName} ${c.email} ${c.phone} ${c.id} ${c.orders.map((o) => o.id)}`
            .toLowerCase()
            .includes(q.toLowerCase())
        ),
    [customers, allOrders, q]
  );
  const returning = rows.filter((c) => c.orders.length > 1).length;
  return (
    <AdminPage
      title="Customers"
      eyebrow="Customer operations"
      description="A considered view of the people behind the house."
      actions={null}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-8">
        <AdminMetricCard label="Total customers" value={customers.length} />
        <AdminMetricCard label="With orders" value={rows.filter((c) => c.orders.length).length} />
        <AdminMetricCard label="Returning" value={returning} />
        <AdminMetricCard label="High value" value={rows.filter((c) => c.spend > 40000).length} />
      </div>
      <AdminPanel title="Customer directory">
        <input
          aria-label="Search customers"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone, customer ID or order number"
          className="w-full border border-pearl bg-ivory px-4 py-3 mb-5"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-pearl text-[10px] uppercase tracking-widest">
                <th className="py-3">Customer</th>
                <th>Contact</th>
                <th>Orders</th>
                <th>Total spend</th>
                <th>Segment</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-pearl/60">
                  <td className="py-4">
                    <Link className="font-medium underline" to={`/admin/customers/${c.id}`}>
                      {c.firstName} {c.lastName}
                    </Link>
                    <div className="text-xs text-slate">PF-CUS-{c.id.replace("cust-", "")}</div>
                  </td>
                  <td>
                    {c.email}
                    <br />
                    <span className="text-xs text-slate">{c.phone}</span>
                  </td>
                  <td>{c.orders.length}</td>
                  <td>{money(c.spend)}</td>
                  <td>
                    {c.spend > 40000
                      ? "HIGH VALUE"
                      : c.orders.length > 1
                        ? "RETURNING"
                        : c.orders.length
                          ? "ACTIVE"
                          : "NEW"}
                  </td>
                  <td>
                    <Link to={`/admin/customers/${c.id}`} className="text-xs uppercase tracking-widest">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
