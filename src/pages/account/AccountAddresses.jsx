import { useState, useEffect } from "react";
import { Plus, CheckCircle2, AlertCircle, Trash2, Edit3, Check } from "lucide-react";
import AccountShell from "../../components/account/AccountShell";
import AddressModal from "../../components/account/AddressModal";
import { useAccount } from "../../context/AccountContext";
import {
  AtelierButton,
  EditorialHeading,
  EmptyState,
  transition,
} from "../../design-system";
import { cn } from "../../utils/cn";

export default function AccountAddresses() {
  const {
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAccount();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Addresses — PRATIKSHYA FASHON";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingAddress(addr);
    setModalOpen(true);
  };

  const handleSave = (addressData) => {
    if (editingAddress?.id) {
      const res = updateAddress(editingAddress.id, addressData);
      setFeedback({ ok: res.ok, message: res.message });
    } else {
      const res = addAddress(addressData);
      setFeedback({ ok: res.ok, message: res.message });
    }
    setModalOpen(false);
  };

  const handleDelete = (id) => {
    const res = deleteAddress(id);
    setFeedback({ ok: res.ok, message: res.message });
  };

  const handleSetDefault = (id) => {
    const res = setDefaultAddress(id);
    setFeedback({ ok: res.ok, message: res.message });
  };

  return (
    <AccountShell
      breadcrumbItems={[
        { label: "Account", to: "/account" },
        { label: "Saved Addresses" },
      ]}
    >
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <EditorialHeading
            as="h2"
            size="subsection"
            eyebrow="Delivery Book"
            description="Manage your primary residence, work locations, and celebration delivery addresses."
            spacing={{ eyebrow: "mb-3", title: "mb-3", description: "mb-0" }}
          >
            Your saved <span className="italic text-accent">addresses.</span>
          </EditorialHeading>

          <div className="shrink-0">
            <AtelierButton
              type="button"
              variant="primary"
              size="md"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2"
            >
              <Plus size={14} aria-hidden="true" /> Add New Address
            </AtelierButton>
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            role="status"
            className={cn(
              "mt-6 flex items-center gap-3 border p-4 font-ui text-xs leading-relaxed",
              feedback.ok
                ? "border-cocoa/40 bg-cocoa/10 text-cocoa"
                : "border-accent/40 bg-accent/5 text-accent"
            )}
          >
            {feedback.ok ? (
              <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
            )}
            <p>{feedback.message}</p>
          </div>
        )}

        {/* Addresses Grid */}
        {addresses.length > 0 ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={cn(
                  "border p-6 sm:p-7 flex flex-col justify-between transition-colors bg-surface/40",
                  address.isDefault
                    ? "border-accent bg-surface/70"
                    : "border-mist/80"
                )}
              >
                <div>
                  {/* Card Header: Type and Default badge */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="border border-pearl bg-canvas px-2.5 py-1 font-ui text-[10px] uppercase tracking-[.14em] text-ink font-medium">
                      {address.type}
                    </span>

                    {address.isDefault && (
                      <span className="font-ui text-[10px] uppercase tracking-[.18em] text-accent font-medium inline-flex items-center gap-1">
                        <Check size={12} strokeWidth={2} aria-hidden="true" /> Default Address
                      </span>
                    )}
                  </div>

                  {/* Address Content */}
                  <h3 className="font-display text-lg font-light text-ink">
                    {address.fullName}
                  </h3>
                  <p className="mt-1 font-ui text-xs text-graphite leading-relaxed">
                    {address.addressLine}
                  </p>
                  {address.landmark && (
                    <p className="font-ui text-xs text-taupe leading-relaxed">
                      Landmark: {address.landmark}
                    </p>
                  )}
                  <p className="font-ui text-xs text-graphite font-medium mt-1">
                    {address.city}, {address.state} — {address.pincode}
                  </p>
                  <p className="mt-2 font-ui text-xs text-taupe">
                    Phone: <span className="text-ink">{address.phone}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-mist/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(address)}
                      className={cn(
                        "font-ui text-[11px] uppercase tracking-[.14em] text-ink hover:text-accent inline-flex items-center gap-1.5",
                        transition.colors
                      )}
                    >
                      <Edit3 size={13} aria-hidden="true" /> Edit
                    </button>
                    <span aria-hidden="true" className="text-mist">|</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      className={cn(
                        "font-ui text-[11px] uppercase tracking-[.14em] text-taupe hover:text-accent inline-flex items-center gap-1.5",
                        transition.colors
                      )}
                    >
                      <Trash2 size={13} aria-hidden="true" /> Delete
                    </button>
                  </div>

                  {!address.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(address.id)}
                      className={cn(
                        "font-ui text-[11px] uppercase tracking-[.14em] text-brass hover:text-accent font-medium",
                        transition.colors
                      )}
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 border border-mist/80 bg-surface/30 p-12 text-center">
            <EmptyState
              eyebrow="Addresses"
              title="No saved addresses yet."
              description="Save your shipping and residence addresses for an effortless celebration checkout experience."
              actions={
                <AtelierButton
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2"
                >
                  <Plus size={14} aria-hidden="true" /> Add Your First Address
                </AtelierButton>
              }
            />
          </div>
        )}

        {/* Modal */}
        <AddressModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          initialAddress={editingAddress}
        />
      </div>
    </AccountShell>
  );
}
