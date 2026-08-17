import { useLocation } from "react-router-dom";
import EmployeePage from "../../components/employee/EmployeePage";
import DataTable from "../../components/employee/DataTable";
import FutureNote from "../../components/employee/FutureNote";
import {
  getAppointments,
  getCatalogueStock,
  getFeedback,
  getStockMovements,
  getStylingRequests,
  getSupportCases,
  getTransfers,
  getWarehouseTasks,
} from "../../services/employees/operationsService";
import { employeeFullName, formatEmployeeDateTime } from "../../utils/employee";
import { formatINR } from "../../utils/shopping";
import { useEmployeeManagement } from "../../context/EmployeeManagementContext";
import { getRoleLabel } from "../../config/employeeRoles";
import { getDepartmentLabel } from "../../config/employeeDepartments";
import StatusBadge from "../../components/employee/StatusBadge";

const desks = {
  "/employee/inventory": () => {
    const stock = getCatalogueStock();
    return {
      eyebrow: "Inventory",
      title: (
        <>
          Stock across the <span className="italic text-accent">house.</span>
        </>
      ),
      description: `${stock.available} available · ${stock.low || 7} low · ${stock.out || 3} out. Catalogue availability, not a warehouse backend.`,
      rows: stock.availableItems,
      columns: [
        { id: "name", label: "Piece" },
        { id: "sku", label: "SKU" },
        { id: "availabilityLabel", label: "Availability" },
        { id: "stock", label: "Units" },
        { id: "price", label: "Price", render: (row) => formatINR(row.price) },
      ],
    };
  },
  "/employee/inventory/movements": () => ({
    eyebrow: "Movements",
    title: (
      <>
        Stock <span className="italic text-accent">movements.</span>
      </>
    ),
    description: "Receiving, transfers, adjustments and outgoing — the diary of the stock desk.",
    rows: getStockMovements(),
    columns: [
      { id: "id", label: "Ref" },
      { id: "type", label: "Type" },
      { id: "piece", label: "Piece" },
      { id: "qty", label: "Qty" },
      { id: "location", label: "Location" },
      { id: "by", label: "By" },
      { id: "at", label: "When", render: (row) => formatEmployeeDateTime(row.at) },
    ],
  }),
  "/employee/inventory/transfers": () => ({
    eyebrow: "Transfers",
    title: (
      <>
        Floor <span className="italic text-accent">transfers.</span>
      </>
    ),
    description: "Pieces moving between warehouse, floors and the bridal suite.",
    rows: getTransfers(),
    columns: [
      { id: "id", label: "Ref" },
      { id: "piece", label: "Piece" },
      { id: "qty", label: "Qty" },
      { id: "from", label: "From" },
      { id: "to", label: "To" },
      { id: "status", label: "Status" },
      { id: "requestedBy", label: "Requested by" },
    ],
  }),
  "/employee/inventory/low-stock": () => {
    const stock = getCatalogueStock();
    return {
      eyebrow: "Low stock",
      title: (
        <>
          Running <span className="italic text-accent">low.</span>
        </>
      ),
      description: "Pieces the floor should not promise freely.",
      rows: stock.lowItems.length ? stock.lowItems : [
        { id: "ls-1", name: "Temple-work bangle set", sku: "PF-JWL-021", availabilityLabel: "Low stock", stock: 2, price: 6400 },
        { id: "ls-2", name: "Ivory silk kurta · 40", sku: "PF-KURT-011", availabilityLabel: "Low stock", stock: 3, price: 8900 },
      ],
      columns: [
        { id: "name", label: "Piece" },
        { id: "sku", label: "SKU" },
        { id: "stock", label: "Units" },
        { id: "price", label: "Price", render: (row) => formatINR(row.price) },
      ],
    };
  },
  "/employee/inventory/out-of-stock": () => {
    const stock = getCatalogueStock();
    return {
      eyebrow: "Out of stock",
      title: (
        <>
          Not on the <span className="italic text-accent">floor.</span>
        </>
      ),
      description: "Unavailable pieces. Do not write an assisted ticket against these.",
      rows: stock.outItems.length ? stock.outItems : [
        { id: "os-1", name: "Printed chiffon saree · garden", sku: "PF-SARE-088", availabilityLabel: "Unavailable", stock: 0, price: 7200 },
      ],
      columns: [
        { id: "name", label: "Piece" },
        { id: "sku", label: "SKU" },
        { id: "availabilityLabel", label: "Status" },
      ],
    };
  },
  "/employee/inventory/receive": () => ({
    eyebrow: "Receive",
    title: (
      <>
        Stock <span className="italic text-accent">received.</span>
      </>
    ),
    description: "Today's inbound pieces. Receiving is recorded as a mock movement.",
    rows: getStockMovements().filter((item) => item.type === "Received"),
    columns: [
      { id: "piece", label: "Piece" },
      { id: "qty", label: "Qty" },
      { id: "location", label: "Location" },
      { id: "by", label: "Received by" },
      { id: "at", label: "When", render: (row) => formatEmployeeDateTime(row.at) },
    ],
  }),
  "/employee/inventory/adjust": () => ({
    eyebrow: "Adjust",
    title: (
      <>
        Stock <span className="italic text-accent">adjustments.</span>
      </>
    ),
    description: "Counts that needed a human correction. Not a settings panel.",
    rows: getStockMovements().filter((item) => item.type === "Adjustment"),
    columns: [
      { id: "piece", label: "Piece" },
      { id: "qty", label: "Qty" },
      { id: "location", label: "Location" },
      { id: "by", label: "By" },
    ],
  }),
  "/employee/inventory/requests": () => ({
    eyebrow: "Requests",
    title: (
      <>
        Transfer <span className="italic text-accent">requests.</span>
      </>
    ),
    description: "Open requests from the floor. Inventory staff raise them; managers close them.",
    rows: getTransfers().filter((item) => item.status !== "Completed"),
    columns: [
      { id: "id", label: "Ref" },
      { id: "piece", label: "Piece" },
      { id: "from", label: "From" },
      { id: "to", label: "To" },
      { id: "status", label: "Status" },
    ],
  }),
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
  "/employee/returns": () => ({
    eyebrow: "Returns",
    title: (
      <>
        Pending <span className="italic text-accent">returns.</span>
      </>
    ),
    description: "Return requests the care desk is holding. Four are waiting on review in this preview.",
    rows: [
      { id: "RET-1041", customer: "Priyanka Patel", piece: "Innerwear set", status: "Under review", resolution: "Refund" },
      { id: "RET-1036", customer: "Rohan Mehta", piece: "Kurta pajama · midnight", status: "Pickup scheduled", resolution: "Exchange" },
      { id: "RET-1028", customer: "Kavita Menon", piece: "Printed saree", status: "Requested", resolution: "Refund" },
      { id: "RET-1022", customer: "Nandini Rao", piece: "Gold-finish bangles", status: "Received", resolution: "Refund" },
    ],
    columns: [
      { id: "id", label: "Return" },
      { id: "customer", label: "Customer" },
      { id: "piece", label: "Piece" },
      { id: "status", label: "Status" },
      { id: "resolution", label: "Resolution" },
    ],
  }),
  "/employee/support/returns": () => ({
    eyebrow: "Returns",
    title: (
      <>
        Pending <span className="italic text-accent">returns.</span>
      </>
    ),
    rows: [
      { id: "RET-1041", customer: "Priyanka Patel", piece: "Innerwear set", status: "Under review", resolution: "Refund" },
      { id: "RET-1036", customer: "Rohan Mehta", piece: "Kurta pajama · midnight", status: "Pickup scheduled", resolution: "Exchange" },
      { id: "RET-1028", customer: "Kavita Menon", piece: "Printed saree", status: "Requested", resolution: "Refund" },
      { id: "RET-1022", customer: "Nandini Rao", piece: "Gold-finish bangles", status: "Received", resolution: "Refund" },
    ],
    columns: [
      { id: "id", label: "Return" },
      { id: "customer", label: "Customer" },
      { id: "piece", label: "Piece" },
      { id: "status", label: "Status" },
      { id: "resolution", label: "Resolution" },
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
  "/employee/reports": () => ({
    eyebrow: "Reports",
    title: (
      <>
        Store <span className="italic text-accent">reports.</span>
      </>
    ),
    description: "A short leadership view. Full analytics belong to the later Admin Portal.",
    rows: [
      { metric: "Store sales today", value: "₹8,42,600" },
      { metric: "Conversion this week", value: "28%" },
      { metric: "Pending returns", value: "4" },
      { metric: "Low stock alerts", value: "7" },
      { metric: "Team on floor", value: "14" },
    ],
    columns: [
      { id: "metric", label: "Report" },
      { id: "value", label: "Value" },
    ],
  }),
};

export default function EmployeeDesk() {
  const { pathname } = useLocation();
  const { employees } = useEmployeeManagement();
  let spec = desks[pathname];

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
      <DataTable rows={view.rows} columns={view.columns} />
      {view.note ? (
        <div className="mt-6">
          <FutureNote title="Later">{view.note}</FutureNote>
        </div>
      ) : null}
    </EmployeePage>
  );
}
