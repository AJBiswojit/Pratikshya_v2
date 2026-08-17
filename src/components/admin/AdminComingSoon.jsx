import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AtelierButton, Rule } from "../../design-system";
import AdminPage from "./AdminPage";

/**
 * The placeholder a navigable-but-unbuilt module opens.
 *
 * It states plainly that the module is planned, points at the two people
 * surfaces that are live today, and never pretends to hold data. A module
 * in this state must read as unfinished, not broken.
 */
export default function AdminComingSoon({ title, group, description }) {
  return (
    <AdminPage
      eyebrow={group || "Business module"}
      title={
        <>
          {title} <span className="italic text-accent">soon.</span>
        </>
      }
      description={description}
    >
      <section className="border border-mist/80 bg-surface/40 p-6 sm:p-10">
        <p className="font-ui text-[10px] uppercase tracking-[.3em] text-brass">In development</p>
        <h2 className="mt-3 font-display text-2xl font-light tracking-tight text-ink">
          This module is not part of the current phase.
        </h2>
        <Rule width="w-10" tone="accent" className="my-5" />
        <p className="max-w-xl font-ui text-sm leading-relaxed text-taupe">
          Catalogue, media, orders, offers and analytics are fully live in the Admin
          Portal today. The remaining business modules land in later phases.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <AtelierButton as={Link} to="/admin/products" size="chip">
            Manage products <ArrowRight size={12} aria-hidden="true" />
          </AtelierButton>
          <AtelierButton as={Link} to="/admin" variant="outline" size="chip">
            Business overview
          </AtelierButton>
        </div>
      </section>
    </AdminPage>
  );
}
