import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AtelierButton, Brand, Rule } from "../../design-system";
import { EMPLOYEE_BRAND } from "../../config/employeeNavigation";

export default function EmployeeForgotPassword() {
  const [employeeId, setEmployeeId] = useState("");
  const [contact, setContact] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = "Reset Employee Access — PRATIKSHYA FASHON";
    return () => {
      document.title = previous;
    };
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-mist/80 px-6 py-5">
        <Brand
          as="h1"
          size="default"
          variant="lockup"
          theme="light"
          wordmark={EMPLOYEE_BRAND.name}
          subtitle={EMPLOYEE_BRAND.portal}
        />
      </header>
      <main className="mx-auto max-w-xl px-6 py-16 md:py-24">
        <div className="border border-mist/80 bg-surface/50 p-7 sm:p-12">
          <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">Account recovery</p>
          <h1 className="mt-3 font-display text-3xl font-light tracking-tight">
            Reset needs an <span className="italic text-accent">administrator.</span>
          </h1>
          <Rule width="w-12" tone="accent" className="my-6" />

          {submitted ? (
            <div role="status">
              <p className="font-ui text-sm leading-relaxed text-graphite">
                Please contact your administrator to reset your employee credentials.
                No email has been sent — this preview has no mail service.
              </p>
              {employeeId ? (
                <p className="mt-3 font-ui text-xs text-taupe">
                  Mention employee ID <span className="text-ink">{employeeId}</span>
                  {contact ? ` and ${contact}` : ""}.
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="font-ui text-sm leading-relaxed text-taupe">
                Employee passwords are issued by administration. Leave your ID and a way to reach you, then speak to the floor lead or Super Admin.
              </p>
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="forgot-id" className="mb-2 block font-ui text-[11px] uppercase tracking-[.18em] text-ink">
                    Employee ID
                  </label>
                  <input
                    id="forgot-id"
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value)}
                    placeholder="PF-SLS-00124"
                    className="w-full border border-pearl bg-canvas px-4 py-3.5 font-ui text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
                <div>
                  <label htmlFor="forgot-contact" className="mb-2 block font-ui text-[11px] uppercase tracking-[.18em] text-ink">
                    Email or desk phone
                  </label>
                  <input
                    id="forgot-contact"
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    placeholder="Your house email or mobile"
                    className="w-full border border-pearl bg-canvas px-4 py-3.5 font-ui text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
                <AtelierButton type="submit" className="w-full justify-center py-4">
                  Request administrator reset <ArrowRight size={14} aria-hidden="true" />
                </AtelierButton>
              </form>
            </>
          )}

          <div className="mt-8 border-t border-mist/70 pt-6">
            <Link to="/employee/login" className="inline-flex items-center gap-1.5 font-ui text-xs text-graphite hover:text-accent">
              <ArrowLeft size={13} aria-hidden="true" /> Back to employee sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
