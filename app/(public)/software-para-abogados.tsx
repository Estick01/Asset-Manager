import { PublicSeoPage } from "@/components/web/PublicSeoPage";

export default function SoftwareParaAbogadosPage() {
  return (
    <PublicSeoPage
      title="Software para abogados en Colombia | ProcesoClaro"
      description="Organiza clientes, procesos, documentos y calendario legal en una sola plataforma pensada para abogados independientes en Colombia."
      canonicalPath="/software-para-abogados"
      breadcrumbLabel="Software para abogados"
      eyebrow="Software para abogados"
      heroTitle="Software para abogados en Colombia para ordenar tu practica legal"
      heroBody="ProcesoClaro ayuda a abogados independientes a organizar procesos, centralizar clientes y dar mejor seguimiento sin depender de Excel, WhatsApp o notas sueltas."
      bullets={[
        "Gestion de clientes y procesos en un solo sistema",
        "Calendario legal con recordatorios",
        "Portal y chat para clientes",
      ]}
      sections={[
        {
          title: "Menos friccion operativa",
          body: "Toda la informacion clave del caso queda concentrada: estado, historial, archivos, responsables y proximas acciones.",
        },
        {
          title: "Mas profesionalismo ante el cliente",
          body: "El cliente puede seguir su caso, recibir actualizaciones y comunicarse sin exigir seguimiento manual por canales externos.",
        },
        {
          title: "Escala sin perder control",
          body: "Aunque hoy trabajes solo, la estructura del sistema te permite crecer a colaboraciones y equipos con mejores procesos.",
        },
      ]}
      extraSchemas={[
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "ProcesoClaro",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, iOS, Android",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "COP",
          },
          audience: {
            "@type": "Audience",
            audienceType: "Abogados independientes",
          },
          featureList: [
            "Gestion de clientes",
            "Seguimiento de procesos legales",
            "Calendario legal",
            "Portal y chat con clientes",
          ],
        },
      ]}
    />
  );
}
