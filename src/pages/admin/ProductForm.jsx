/**
 * /admin/products/new · /admin/products/:productId/edit
 *
 * The Phase 13 merchandising workspace, wrapped in the Admin shell.
 * Admins (and the Super Admin) hold publishing rights; the editor does
 * the rest against the shared catalogue repository.
 */

import { useParams } from "react-router-dom";
import AdminPage from "../../components/admin/AdminPage";
import ProductEditor from "../../components/products/ProductEditor";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function ProductForm() {
  const { productId } = useParams();
  const { admin } = useAdminAuth();

  const actor = admin
    ? { adminId: admin.adminId, name: admin.name || admin.fullName || "Administrator" }
    : null;

  return (
    <AdminPage
      eyebrow="Business / Products"
      title={
        productId ? (
          <>
            Edit <span className="italic text-accent">product.</span>
          </>
        ) : (
          <>
            New <span className="italic text-accent">product.</span>
          </>
        )
      }
      description="The complete merchandising record — identity, category, pricing, variants, content, media, SEO and publishing. One shared catalogue serves the storefront, the portals and every future surface."
    >
      <ProductEditor
        key={productId ?? "new"}
        productId={productId}
        portal="admin"
        actor={actor}
        canPublish
        exitTo="/admin/products"
      />
    </AdminPage>
  );
}
