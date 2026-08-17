import { Link } from "react-router-dom";
import { AtelierButton, Rule } from "../../design-system";

export default function EmployeeAccessDenied() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">Access restricted</p>
      <h1 className="mt-3 font-display text-4xl font-light tracking-tight text-ink">
        This desk is not <span className="italic text-accent">yours.</span>
      </h1>
      <Rule width="w-12" tone="accent" className="mx-auto my-6" />
      <p className="font-ui text-sm leading-relaxed text-taupe">
        You don't have permission to view this area. If you need it for today's work, speak to your administrator.
      </p>
      <div className="mt-10">
        <AtelierButton as={Link} to="/employee">
          Return to dashboard
        </AtelierButton>
      </div>
    </div>
  );
}
