import { PublicSeoPage } from "@/components/web/PublicSeoPage";

export default function GestionDeProcesosLegalesPage() {
  return (
    <PublicSeoPage
      title="Gestion de procesos legales sin caos | ProcesoClaro"
      description="Administra etapas, fechas, audiencias, documentos y responsables desde una sola herramienta para gestion de procesos legales."
      canonicalPath="/gestion-de-procesos-legales"
      breadcrumbLabel="Gestion de procesos legales"
      eyebrow="Gestion de procesos legales"
      heroTitle="Gestion de procesos legales con seguimiento claro y trazabilidad"
      heroBody="ProcesoClaro ayuda a abogados y bufetes a gestionar procesos legales con mas orden, trazabilidad y contexto operativo para cada caso."
      bullets={[
        "Estado, historial y responsables por proceso",
        "Documentos y fechas clave centralizadas",
        "Menos dispersion y mas control del trabajo juridico",
      ]}
      sections={[
        {
          title: "Seguimiento claro del caso",
          body: "Cada proceso concentra informacion operativa util: avances, estado actual, responsables, hitos y archivos asociados.",
        },
        {
          title: "Menos riesgo operativo",
          body: "Cuando las fechas, documentos y avances viven en un solo sistema, baja la probabilidad de omisiones y dependencias manuales.",
        },
        {
          title: "Mejor coordinacion interna y externa",
          body: "El equipo y el cliente trabajan con mayor contexto, evitando la repeticion de informacion y el seguimiento improvisado.",
        },
      ]}
      extraSchemas={[
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "ProcesoClaro",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, iOS, Android",
          featureList: [
            "Seguimiento de procesos legales",
            "Historial por caso",
            "Documentos por proceso",
            "Asignacion de responsables",
          ],
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "COP",
          },
        },
      ]}
    />
  );
}
