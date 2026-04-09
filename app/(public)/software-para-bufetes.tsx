import { PublicSeoPage } from "@/components/web/PublicSeoPage";

export default function SoftwareParaBufetesPage() {
  return (
    <PublicSeoPage
      title="Software para bufetes y firmas legales | ProcesoClaro"
      description="Centraliza la operacion de tu bufete: equipo, procesos, clientes, documentos y seguimiento en tiempo real desde una sola plataforma."
      canonicalPath="/software-para-bufetes"
      breadcrumbLabel="Software para bufetes"
      eyebrow="Software para bufetes"
      heroTitle="Software para bufetes y firmas legales con control y trazabilidad"
      heroBody="ProcesoClaro ayuda a bufetes a organizar procesos, abogados, documentos y comunicacion con clientes bajo una sola operacion digital."
      bullets={[
        "Roles y permisos por usuario",
        "Clientes compartidos y clientes privados por abogado",
        "Dashboard del equipo y seguimiento de casos",
      ]}
      sections={[
        {
          title: "Operacion centralizada",
          body: "La firma puede supervisar flujos, asignar responsables y tener una vista clara de carga operativa, procesos activos y estado del equipo.",
        },
        {
          title: "Privacidad util para despachos reales",
          body: "Cada abogado puede mantener ciertos clientes como privados cuando el modelo del despacho asi lo requiere.",
        },
        {
          title: "Mejor experiencia para clientes corporativos y particulares",
          body: "La comunicacion y el seguimiento dejan de depender de cadenas de mensajes dispersas y pasan a un canal mas profesional.",
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
            audienceType: "Bufetes y firmas juridicas",
          },
          featureList: [
            "Roles y permisos",
            "Clientes compartidos y privados",
            "Seguimiento de procesos",
            "Dashboard del equipo",
          ],
        },
      ]}
    />
  );
}
