import { AtelierSection, Breadcrumb } from "../../design-system";
import AccountHero from "./AccountHero";
import AccountNav from "./AccountNav";

/**
 * Common layout frame for all customer account pages.
 */
export default function AccountShell({
  breadcrumbItems = [{ label: "Account" }],
  children,
}) {
  const fullBreadcrumbs = [
    { label: "Atelier", to: "/" },
    ...breadcrumbItems,
  ];

  return (
    <main>
      <AtelierSection rhythm="none" width="wide" className="pb-24 pt-28 sm:pt-32 md:pb-32">
        <Breadcrumb items={fullBreadcrumbs} className="mb-6 md:mb-8" />
        <AccountHero />
        <AccountNav className="mb-8 md:mb-10" />
        {children}
      </AtelierSection>
    </main>
  );
}
