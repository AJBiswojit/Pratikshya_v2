import { Link } from "react-router-dom";
import { AtelierButton, Rule } from "../../design-system";

/**
 * The Admin Portal 404.
 *
 * Written in the brand's voice and pointed at the modules that are live —
 * never a stack trace, never a bare error string.
 */
export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">Error 404</p>
      <h1 className="mt-3 font-display text-4xl font-light tracking-tight text-ink">
        No such <span className="italic text-accent">desk.</span>
      </h1>
      <Rule width="w-12" tone="accent" className="mx-auto my-6" />
      <p className="font-ui text-sm leading-relaxed text-taupe">
        That administration page doesn't exist. It may have been renamed, or it may
        belong to a module that hasn't opened yet.
      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <AtelierButton as={Link} to="/admin">
          Business overview
        </AtelierButton>
        <AtelierButton as={Link} to="/admin/products" variant="outline">
          Products
        </AtelierButton>
      </div>
    </div>
  );
}
