import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import EmployeePage from "../../components/employee/EmployeePage";
import DataTable from "../../components/employee/DataTable";
import FutureNote from "../../components/employee/FutureNote";
import {
  getAppointments,
  getFeedback,
  getStylingRequests,
  getSupportCases,
  getTransfers,
  getWarehouseTasks,
} from "../../services/employees/operationsService";
import { employeeFullName } from "../../utils/employee";
import { formatINR } from "../../utils/shopping";
import { useEmployeeManagement } from "../../context/EmployeeManagementContext";
import { useOrder } from "../../context/OrderContext";
import { getRoleLabel } from "../../config/employeeRoles";
import { getDepartmentLabel } from "../../config/employeeDepartments";
import { RETURN_STATUSES } from "../../config/orderConfig";
import StatusBadge from "../../components/employee/StatusBadge";

const desks = {
  "/employee/warehouse": () => ({
    eyebrow: "Warehouse",
    title: (
      <>
        The <span className="italic text-accent">back house.</span>
      </>
    ),
    description: "Incoming, outgoing, picks and holds — the warehouse working list.",
    rows: getWarehouseTasks(),
    columns: [
      { id: "kind", label: "Kind" },
      { id: "ref", label: "Ref" },
      { id: "detail", label: "Detail" },
      { id: "status", label: "Status" },
      { id: "eta", label: "When" },
    ],
  }),
  "/employee/warehouse/incoming": () => ({
    eyebrow: "Incoming",
    title: (
      <>
        Incoming <span className="italic text-accent">stock.</span>
      </>
    ),
    rows: getWarehouseTasks("Incoming"),
    columns: [
      { id: "ref", label: "ASN" },
      { id: "detail", label: "Detail" },
      { id: "status", label: "Status" },
      { id: "eta", label: "When" },
    ],
  }),
  "/employee/warehouse/outgoing": () => ({
    eyebrow: "Outgoing",
    title: (
      <>
        Outgoing <span className="italic text-accent">stock.</span>
      </>
    ),
    rows: getWarehouseTasks("Outgoing"),
    columns: [
      { id: "ref", label: "Ref" },
      { id: "detail", label: "Detail" },
      { id: "status", label: "Status" },
      { id: "eta", label: "When" },
    ],
  }),
  "/employee/warehouse/pick-pack": () => ({
    eyebrow: "Pick & pack",
    title: (
      <>
        Pick and <span className="italic text-accent">pack.</span>
      </>
    ),
    rows: getWarehouseTasks("Pick"),
    columns: [
      { id: "ref", label: "Pick" },
      { id: "detail", label: "Piece" },
      { id: "status", label: "Status" },
      { id: "eta", label: "When" },
    ],
  }),
  "/employee/warehouse/transfers": () => ({
    eyebrow: "Warehouse transfers",
    title: (
      <>
        Warehouse <span className="italic text-accent">transfers.</span>
      </>
    ),
    rows: getTransfers().filter((item) =>
      item.source?.type === "WAREHOUSE" || item.destination?.type === "WAREHOUSE"
    ),
    columns: [
      { id: "id", label: "Ref" },
      { id: "piece", label: "Piece" },
      { id: "from", label: "From" },
      { id: "to", label: "To" },
      { id: "status", label: "Status" },
    ],
  }),
  "/employee/warehouse/damaged": () => ({
    eyebrow: "Damaged",
    title: (
      <>
        Damaged <span className="italic text-accent">stock.</span>
      </>
    ),
    rows: getWarehouseTasks("Damaged"),
    columns: [
      { id: "ref", label: "Ref" },
      { id: "detail", label: "Piece" },
      { id: "status", label: "Status" },
    ],
  }),
  "/employee/support": () => ({
    eyebrow: "Support",
    title: (
      <>
        Care <span className="italic text-accent">desk.</span>
      </>
    ),
    description: "Open cases for the house. Inventory and people administration are not on this desk.",
    rows: getSupportCases(),
    columns: [
      { id: "id", label: "Case" },
      { id: "customer", label: "Customer" },
      { id: "topic", label: "Topic" },
      { id: "status", label: "Status" },
      { id: "priority", label: "Queue" },
    ],
    note: "Later this desk will draft replies from the same order records. No assistant is running now.",
  }),
  "/employee/support/cases": () => ({
    eyebrow: "Cases",
    title: (
      <>
        Support <span className="italic text-accent">cases.</span>
      </>
    ),
    rows: getSupportCases(),
    columns: [
      { id: "id", label: "Case" },
      { id: "customer", label: "Customer" },
      { id: "topic", label: "Topic" },
      { id: "status", label: "Status" },
    ],
  }),
  "/employee/support/feedback": () => ({
    eyebrow: "Feedback",
    title: (
      <>
        Customer <span className="italic text-accent">feedback.</span>
      </>
    ),
    rows: getFeedback(),
    columns: [
      { id: "customer", label: "Customer" },
      { id: "score", label: "Score", render: (row) => `${row.score}/5` },
      { id: "note", label: "Note" },
      { id: "at", label: "When" },
    ],
  }),
  "/employee/styling": () => ({
    eyebrow: "Styling",
    title: (
      <>
        The styling <span className="italic text-accent">book.</span>
      </>
    ),
    description: "Requests and sittings. Bridal and wedding collections live one desk over.",
    rows: getStylingRequests(),
    columns: [
      { id: "id", label: "Request" },
      { id: "customer", label: "Customer" },
      { id: "occasion", label: "Occasion" },
      { id: "status", label: "Status" },
      { id: "when", label: "When" },
    ],
    note: "Later an AI styling assistant will read these same requests. It is not on in this preview.",
  }),
  "/employee/styling/requests": () => desks["/employee/styling"](),
  "/employee/styling/appointments": () => ({
    eyebrow: "Appointments",
    title: (
      <>
        Sittings this <span className="italic text-accent">week.</span>
      </>
    ),
    rows: getAppointments(),
    columns: [
      { id: "when", label: "When" },
      { id: "customer", label: "Customer" },
      { id: "type", label: "Sitting" },
      { id: "with", label: "With" },
      { id: "room", label: "Room" },
    ],
  }),
  "/employee/styling/recommendations": () => ({
    eyebrow: "Recommendations",
    title: (
      <>
        Suggested <span className="italic text-accent">edits.</span>
      </>
    ),
    rows: [
      { customer: "Aisha Rahman", edit: "Ivory lehenga + polki set + blush dupatta", status: "Shared" },
      { customer: "Meher Gill", edit: "Trousseau: three silk, one reception, everyday cotton", status: "Draft" },
      { customer: "Radhika Bose", edit: "Banarasi heritage + temple bangles", status: "Follow-up" },
    ],
    columns: [
      { id: "customer", label: "Customer" },
      { id: "edit", label: "Edit" },
      { id: "status", label: "Status" },
    ],
  }),
  "/employee/styling/bridal": () => ({
    eyebrow: "Bridal desk",
    title: (
      <>
        Bridal <span className="italic text-accent">consultations.</span>
      </>
    ),
    rows: getStylingRequests().filter((item) => /bridal|wedding|trousseau|reception/i.test(item.occasion)),
    columns: [
      { id: "customer", label: "Bride" },
      { id: "occasion", label: "Occasion" },
      { id: "status", label: "Status" },
      { id: "when", label: "When" },
    ],
  }),
  "/employee/styling/wedding": () => ({
    eyebrow: "Wedding collections",
    title: (
      <>
        Wedding <span className="italic text-accent">collections.</span>
      </>
    ),
    rows: [
      { name: "Pheras ivory", pieces: "Lehenga, veil, jewellery pairing", availability: "Bridal suite" },
      { name: "Reception champagne", pieces: "Saree + blouse + maang tikka", availability: "On request" },
      { name: "Groom midnight", pieces: "Sherwani + stole", availability: "First floor" },
    ],
    columns: [
      { id: "name", label: "Collection" },
      { id: "pieces", label: "Includes" },
      { id: "availability", label: "Where" },
    ],
  }),
  "/employee/sales": () => ({
    eyebrow: "Sales",
    title: (
      <>
        Store <span className="italic text-accent">sales.</span>
      </>
    ),
    description: "₹8,42,600 billed today across the house — demo figures for leadership.",
    rows: [
      { department: "Women's Sarees", billed: 324850, tickets: 18 },
      { department: "Bridal", billed: 286000, tickets: 4 },
      { department: "Jewellery", billed: 124600, tickets: 9 },
      { department: "Men + Groom", billed: 68400, tickets: 6 },
      { department: "Kids", billed: 38750, tickets: 7 },
    ],
    columns: [
      { id: "department", label: "Department" },
      { id: "billed", label: "Billed", render: (row) => formatINR(row.billed) },
      { id: "tickets", label: "Tickets" },
    ],
    note: "Later AI sales insights will read this same departmental view.",
  }),
};

const returnColumns = [
  { id: "id", label: "Return" },
  { id: "customer", label: "Customer" },
  { id: "piece", label: "Piece" },
  { id: "status", label: "Status" },
  { id: "resolution", label: "Resolution" },
];

const projectReturns = (orders) =>
  (orders || []).flatMap((order) =>
    (order.returns || []).map((record) => ({
      id: record.id,
      customer: order.customer?.fullName || "Customer",
      piece: (record.items || []).map((item) => item.name).join(" · ") || "—",
      status: RETURN_STATUSES[record.status]?.label || record.status,
      resolution: record.resolution === "exchange" ? "Exchange" : "Refund",
    }))
  );

export default function EmployeeDesk() {
  const { pathname } = useLocation();
  const { employees } = useEmployeeManagement();
  const { allOrders = [] } = useOrder();
  const returnRows = useMemo(() => projectReturns(allOrders), [allOrders]);
  let spec = desks[pathname];

  if (pathname === "/employee/returns" || pathname === "/employee/support/returns") {
    spec = () => ({
      eyebrow: "Returns",
      title: (
        <>
          Pending <span className="italic text-accent">returns.</span>
        </>
      ),
      description: "Return requests held on the canonical order register.",
      rows: returnRows,
      columns: returnColumns,
      empty: "No return requests in the order register yet.",
    });
  }

  if (pathname === "/employee/team") {
    spec = () => ({
      eyebrow: "Team",
      title: (
        <>
          Assigned <span className="italic text-accent">team.</span>
        </>
      ),
      description: "People on the floor. Credential management stays with Super Admin.",
      rows: employees,
      columns: [
        { id: "employeeId", label: "ID" },
        { id: "name", label: "Name", render: (row) => employeeFullName(row) },
        { id: "role", label: "Role", render: (row) => getRoleLabel(row.role) },
        { id: "department", label: "Department", render: (row) => getDepartmentLabel(row.department) },
        { id: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
      ],
    });
  }

  const view = typeof spec === "function" ? spec() : {
    eyebrow: "Desk",
    title: "This desk",
    rows: [],
    columns: [],
  };

  return (
    <EmployeePage eyebrow={view.eyebrow} title={view.title} description={view.description}>
      <DataTable rows={view.rows} columns={view.columns} empty={view.empty} />
      {view.note ? (
        <div className="mt-6">
          <FutureNote title="Later">{view.note}</FutureNote>
        </div>
      ) : null}
    </EmployeePage>
  );
}
