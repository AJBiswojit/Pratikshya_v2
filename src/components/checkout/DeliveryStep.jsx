import { forwardRef, useImperativeHandle, useState } from "react";
import { Clock, MapPin, Plus, Truck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAccount } from "../../context/AccountContext";
import { useCheckout } from "../../context/CheckoutContext";
import AddressModal from "../account/AddressModal";
import { DELIVERY_METHODS } from "../../config/checkoutConfig";
import {
  calculateDeliveryFee,
  formatDeliveryEstimate,
  getDeliveryEstimate,
  validateAddress,
} from "../../utils/checkout";
import { formatPhone } from "../../utils/validation";
import { formatINR } from "../../utils/shopping";
import { readShippingRules } from "../../config/commerceDefaults";
import { AtelierButton } from "../../design-system";
import { cn } from "../../utils/cn";

/**
 * Step 2 — Delivery.
 *
 * Two quiet sections: the delivery address (saved addresses from the
 * AccountContext for signed-in customers, an add/edit flow for everyone —
 * the Phase 7 address form is reused, never recreated) and the delivery
 * method, priced from the same shipping rules the bag already uses.
 */

/** One selectable saved address card with an Edit affordance. */
function SavedAddressCard({ address, selected, onSelect, onEdit }) {
  return (
    <div className="relative">
      <input
        id={`checkout-address-${address.id}`}
        type="radio"
        name="checkout-address"
        checked={selected}
        onChange={onSelect}
        className="peer sr-only"
      />
      <label
        htmlFor={`checkout-address-${address.id}`}
        className={cn(
          "block cursor-pointer border bg-surface/20 p-5 pr-14 transition-colors",
          "peer-checked:border-ink peer-checked:bg-surface/60",
          "peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-accent",
          "hover:border-brass"
        )}
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="bg-ink px-2 py-1 font-ui text-[9px] uppercase tracking-[.16em] text-ivory">
            {address.type || "Home"}
          </span>
          {address.isDefault && (
            <span className="font-ui text-[9px] uppercase tracking-[.16em] text-accent">
              Primary
            </span>
          )}
        </span>
        <span className="mt-3 block font-display text-base font-light text-ink">
          {address.fullName}
        </span>
        <span className="mt-1 block font-ui text-xs leading-relaxed text-graphite">
          {address.addressLine}
          {address.landmark ? `, ${address.landmark}` : ""}
        </span>
        <span className="block font-ui text-xs text-graphite">
          {address.city}, {address.state} — {address.pincode}
        </span>
        <span className="mt-2 block font-ui text-[11px] text-taupe">
          {formatPhone(address.phone)}
        </span>
      </label>
      <button
        type="button"
        onClick={onEdit}
        className="absolute top-4 right-4 font-ui text-[10px] uppercase tracking-[.14em] text-brass hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
      >
        Edit
      </button>
    </div>
  );
}

const DeliveryStep = forwardRef(function DeliveryStep(_props, ref) {
  const { isAuthenticated } = useAuth();
  const account = useAccount();
  const checkout = useCheckout();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressError, setAddressError] = useState("");

  const payable = checkout.totals.total - checkout.totals.shipping - checkout.totals.codFee;
  const { freeShippingThreshold } = readShippingRules();

  const feeFor = (method) => calculateDeliveryFee(method.id, payable);
  const estimateFor = (method) =>
    formatDeliveryEstimate(getDeliveryEstimate(method.id));

  /* ---------------------------------------------------------------- */
  /* Address modal handoff                                             */
  /* ---------------------------------------------------------------- */

  const openAddAddress = () => {
    setEditingAddress(null);
    setAddressError("");
    setModalOpen(true);
  };

  const openEditAddress = (address) => {
    setEditingAddress(address);
    setAddressError("");
    setModalOpen(true);
  };

  const handleSaveAddress = (formData) => {
    if (isAuthenticated) {
      if (editingAddress?.id) {
        account.updateAddress(editingAddress.id, formData);
        // The account-sync effect refreshes the selected snapshot.
      } else {
        const result = account.addAddress(formData);
        if (result.ok && result.addressId) {
          // Select synchronously from what was just saved, so continuing
          // works before the account state has re-rendered.
          checkout.selectAccountAddress(result.addressId, {
            id: result.addressId,
            fullName: formData.fullName,
            phone: formData.phone,
            addressLine: formData.addressLine,
            landmark: formData.landmark ?? "",
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            type: formData.type ?? "Home",
            isDefault: Boolean(formData.isDefault) || account.addresses.length === 0,
          });
        }
      }
    } else {
      checkout.setGuestAddress(formData);
    }
    setModalOpen(false);
  };

  useImperativeHandle(ref, () => ({
    validate() {
      if (!checkout.address) {
        setAddressError("Please choose a delivery address before continuing.");
        return false;
      }
      if (!validateAddress(checkout.address).ok) {
        setAddressError("That address needs a little attention — please review it.");
        return false;
      }
      setAddressError("");
      return true;
    },
  }));

  /* ---------------------------------------------------------------- */

  return (
    <section aria-labelledby="checkout-step-heading">
      <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">Step 02</p>
      <h2
        id="checkout-step-heading"
        tabIndex={-1}
        className="mt-2 font-display text-3xl font-light tracking-tight outline-none"
      >
        Delivery <span className="italic text-accent">arrangements.</span>
      </h2>

      {/* ----------------------------- Address ----------------------------- */}
      <div className="mt-9">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-ui text-[10px] uppercase tracking-[.22em] text-ink">
              Delivery Address
            </h3>
            <p className="mt-1.5 font-ui text-xs text-taupe">
              {isAuthenticated
                ? "Choose from your saved addresses, or add another."
                : "Tell us where your pieces should arrive."}
            </p>
          </div>
          <AtelierButton type="button" variant="outline" size="chip" onClick={openAddAddress}>
            <Plus size={12} aria-hidden="true" /> Add Address
          </AtelierButton>
        </div>

        {addressError && (
          <p role="alert" className="mt-4 border border-accent/30 bg-accent/5 px-4 py-3 font-ui text-[11px] text-accent">
            {addressError}
          </p>
        )}

        <div className="mt-5">
          {isAuthenticated && account.addresses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2" role="radiogroup" aria-label="Saved delivery addresses">
              {account.addresses.map((address) => (
                <SavedAddressCard
                  key={address.id}
                  address={address}
                  selected={checkout.addressId === address.id}
                  onSelect={() => checkout.selectAccountAddress(address.id)}
                  onEdit={() => openEditAddress(address)}
                />
              ))}
            </div>
          ) : checkout.address ? (
            <div className="max-w-md border border-ink bg-surface/60 p-5">
              <span className="inline-flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.16em] text-accent">
                <MapPin size={12} aria-hidden="true" /> Delivery Address
              </span>
              <p className="mt-3 font-display text-base font-light text-ink">
                {checkout.address.fullName}
              </p>
              <p className="mt-1 font-ui text-xs leading-relaxed text-graphite">
                {checkout.address.addressLine}
                {checkout.address.landmark ? `, ${checkout.address.landmark}` : ""}
              </p>
              <p className="font-ui text-xs text-graphite">
                {checkout.address.city}, {checkout.address.state} — {checkout.address.pincode}
              </p>
              <p className="mt-2 font-ui text-[11px] text-taupe">
                {formatPhone(checkout.address.phone)}
              </p>
              <div className="mt-4 flex gap-4 border-t border-mist/70 pt-4">
                <button
                  type="button"
                  onClick={() => openEditAddress(checkout.address)}
                  className="font-ui text-[10px] uppercase tracking-[.14em] text-brass hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={openAddAddress}
                  className="font-ui text-[10px] uppercase tracking-[.14em] text-brass hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-mist bg-surface/20 p-10 text-center">
              <p className="font-ui text-[11px] uppercase tracking-[.2em] text-taupe">
                {isAuthenticated
                  ? "No saved address yet"
                  : "Add a delivery address to continue"}
              </p>
              <AtelierButton
                type="button"
                variant="primary"
                size="md"
                className="mt-5"
                onClick={openAddAddress}
              >
                <Plus size={14} aria-hidden="true" /> Add Delivery Address
              </AtelierButton>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------ Delivery method ------------------------ */}
      <div className="mt-12">
        <h3 className="font-ui text-[10px] uppercase tracking-[.22em] text-ink">
          Delivery Method
        </h3>
        <p className="mt-1.5 font-ui text-xs text-taupe">
          {payable >= freeShippingThreshold
            ? "Standard delivery is complimentary on orders at or above this value."
            : `Standard delivery is complimentary above ${formatINR(freeShippingThreshold)}.`}
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2" role="radiogroup" aria-label="Delivery method">
          {DELIVERY_METHODS.map((method) => {
            const fee = feeFor(method);
            const selected = checkout.deliveryMethod === method.id;
            const Icon = method.id === "express" ? Clock : Truck;
            return (
              <div key={method.id} className="relative">
                <input
                  id={`delivery-${method.id}`}
                  type="radio"
                  name="checkout-delivery"
                  checked={selected}
                  onChange={() => checkout.setDeliveryMethod(method.id)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={`delivery-${method.id}`}
                  className={cn(
                    "flex h-full cursor-pointer flex-col border bg-surface/20 p-5 transition-colors",
                    "peer-checked:border-ink peer-checked:bg-surface/60",
                    "peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-accent",
                    "hover:border-brass"
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-2.5">
                      <Icon size={16} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
                      <span className="font-ui text-[11px] uppercase tracking-[.18em] text-ink">
                        {method.label}
                      </span>
                    </span>
                    <span className={cn("font-ui text-xs", fee === 0 ? "text-accent" : "text-ink")}>
                      {fee === 0 ? "Complimentary" : formatINR(fee)}
                    </span>
                  </span>
                  <span className="mt-3 font-ui text-[11px] text-taupe">{method.caption}</span>
                  <span className="mt-4 border-t border-mist/60 pt-3 font-ui text-[11px] text-graphite">
                    Estimated delivery:{" "}
                    <span className="text-ink">{estimateFor(method)}</span>
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <AddressModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveAddress}
        initialAddress={editingAddress}
      />
    </section>
  );
});

export default DeliveryStep;
