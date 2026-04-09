import { PublicSeoPage } from "@/components/web/PublicSeoPage";

export default function SoftwareJuridicoColombiaPage() {
  return (
    <PublicSeoPage
      title="Software juridico en Colombia para abogados y bufetes | ProcesoClaro"
      description="Plataforma legal colombiana para gestionar operacion juridica, clientes, procesos, documentos y portal del cliente desde un solo lugar."
      canonicalPath="/software-juridico-colombia"
      breadcrumbLabel="Software juridico Colombia"
      eyebrow="Software juridico en Colombia"
      heroTitle="Software juridico en Colombia pensado para la operacion legal real"
      heroBody="ProcesoClaro resuelve necesidades reales de abogados y firmas en Colombia: orden, privacidad, seguimiento del cliente y control de procesos."
      bullets={[
        "Enfoque en despachos y abogados colombianos",
        "Operacion legal, clientes y documentos en un solo sistema",
        "Portal del cliente y visibilidad del caso",
      ]}
      sections={[
        {
          title: "Producto alineado al trabajo juridico local",
          body: "La propuesta no es un software generico de tareas, sino una estructura mas cercana a como operan abogados, firmas y clientes en Colombia.",
        },
        {
          title: "Util para independientes y equipos",
          body: "Sirve tanto para abogados que gestionan su propia cartera como para firmas que requieren coordinacion, privacidad y trazabilidad interna.",
        },
        {
          title: "Mas confianza para el cliente final",
          body: "Un cliente que puede ver avances, recibir notificaciones y conversar dentro del sistema percibe un servicio mas claro y profesional.",
        },
      ]}
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
