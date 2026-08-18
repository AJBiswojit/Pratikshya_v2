import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import MediaUploadForm from "../../../components/media/MediaUploadForm";
import { AtelierButton } from "../../../design-system";

export default function AdminMediaUpload() {
  return (
    <AdminPage
      eyebrow="Business / Media"
      title="Upload Media"
      description="Upload and register new image and video assets for products or marketing placements across PRATIKSHYA FASHON."
      actions={
        <AtelierButton as={Link} to="/admin/media" size="chip" variant="outline">
          <ArrowLeft size={13} className="mr-1 inline-block" />
          Back to Media Management
        </AtelierButton>
      }
    >
      <AdminPanel eyebrow="Media Registration" title="Upload Assets">
        <MediaUploadForm portalType="admin" onSuccessRedirect="/admin/media" />
      </AdminPanel>
    </AdminPage>
  );
}
