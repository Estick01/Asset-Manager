import { PublicSeoPage } from "@/components/web/PublicSeoPage";
import { getPublicSeoPage } from "@/components/web/publicSeoData";

const page = getPublicSeoPage("/crm-para-abogados");

export default function CrmParaAbogadosPage() {
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
      extraSchemas={[
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "ProcesoClaro",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, iOS, Android",
          featureList: [
            "CRM para abogados",
            "Gestion de clientes legales",
            "Seguimiento de casos",
            "Comunicacion centralizada con clientes"
          ]
        }
      ]}
    />
  );
}
