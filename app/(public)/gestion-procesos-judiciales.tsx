import { PublicSeoPage } from "@/components/web/PublicSeoPage";
import { getPublicSeoPage } from "@/components/web/publicSeoData";

const page = getPublicSeoPage("/gestion-procesos-judiciales");

export default function GestionProcesosJudicialesPage() {
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
            "Gestion de procesos judiciales",
            "Seguimiento de etapas",
            "Tareas y responsables",
            "Documentos por caso"
          ]
        }
      ]}
    />
  );
}
