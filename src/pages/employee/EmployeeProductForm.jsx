/**
 * /employee/products/new · /employee/products/:productId/edit
 *
 * Employees holding `products.manage` draft products inside the Employee
 * Portal and submit them for review — publishing stays with managers and
 * admins. Rendered in EmployeeLayout, never the Admin shell.
 */

import { Navigate, useParams } from "react-router-dom";
import EmployeePage from "../../components/employee/EmployeePage";
import ProductEditor from "../../components/products/ProductEditor";
import { PERMISSIONS } from "../../config/employeePermissions";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";

export default function EmployeeProductForm() {
  const { productId } = useParams();
  const { employee, hasPermission } = useEmployeeAuth();

  if (!hasPermission(PERMISSIONS.PRODUCTS_MANAGE)) {
    return <Navigate to="/employee/access-denied" replace />;
  }

  const actor = employee
    ? {
        employeeId: employee.employeeId,
        label: `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim(),
      }
    : null;

  return (
    <EmployeePage
      eyebrow="Catalogue"
      title={
        productId ? (
          <>
            Edit <span className="italic text-accent">piece.</span>
          </>
        ) : (
          <>
            New <span className="italic text-accent">piece.</span>
          </>
        )
      }
      description="Draft the complete product record and submit it for review. A manager or admin approves it before it reaches the storefront."
    >
      <ProductEditor
        key={productId ?? "new"}
        productId={productId}
        portal="employee"
        actor={actor}
        canPublish={false}
        exitTo="/employee/products"
      />
    </EmployeePage>
  );
}
