import { PublicSeoPage } from "@/components/web/PublicSeoPage";
import { getPublicSeoPage } from "@/components/web/publicSeoData";

const page = getPublicSeoPage("/software-para-abogados-colombia");

export default function SoftwareParaAbogadosColombiaPage() {
  if (!page) return null;

  return (
    <PublicSeoPage
      title={page.title}
      description={page.description}
      canonicalPath={page.canonicalPath}
      breadcrumbLabel={page.breadcrumbLabel}
      eyebrow={page.eyebrow}
      heroTitle={page.heroTitle}
      heroBody={page.heroBody}
      bullets={page.bullets}
      sections={page.sections}
      primaryCtaLabel={page.primaryCtaLabel}
      primaryCtaHref={page.primaryCtaHref}
      secondaryCtaLabel={page.secondaryCtaLabel}
      secondaryCtaHref={page.secondaryCtaHref}
      faq={page.faq}
      extraSchemas={[
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "ProcesoClaro",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, iOS, Android",
          areaServed: {
            "@type": "Country",
            name: "Colombia",
          },
          audience: {
            "@type": "Audience",
            audienceType: "Abogados en Colombia",
          },
        },
      ]}
    />
  );
}
