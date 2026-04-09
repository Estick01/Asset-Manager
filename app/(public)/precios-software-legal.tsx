import { PublicSeoPage } from "@/components/web/PublicSeoPage";

export default function PreciosSoftwareLegalPage() {
  return (
    <PublicSeoPage
      title="Precios de software legal para abogados | ProcesoClaro"
      description="Conoce los planes de ProcesoClaro para abogados independientes y bufetes, desde opciones gratuitas hasta planes avanzados."
      canonicalPath="/precios-software-legal"
      breadcrumbLabel="Precios software legal"
      eyebrow="Precios software legal"
      heroTitle="Precios de software legal para abogados y bufetes"
      heroBody="ProcesoClaro ofrece planes pensados para empezar, crecer y operar con mas orden, tanto si eres abogado independiente como si lideras una firma."
      bullets={[
        "Plan de entrada para empezar sin barreras",
        "Escalabilidad para abogados y bufetes",
        "Ruta clara hacia funciones de mayor valor",
      ]}
      sections={[
        {
          title: "Empieza con bajo riesgo",
          body: "La estructura de planes permite probar la operacion digital sin comprometerse desde el primer dia a una carga financiera alta.",
        },
        {
          title: "Paga por complejidad real",
          body: "A medida que crecen tus necesidades de procesos, clientes, documentos y equipo, puedes pasar a niveles con mas capacidad.",
        },
        {
          title: "Conecta precios con operacion",
          body: "La decision no es solo de costo: el valor viene de reducir dispersion, mejorar seguimiento y dar una experiencia mas profesional al cliente.",
        },
      ]}
      extraSchemas={[
        {
          "@context": "https://schema.org",
          "@type": "OfferCatalog",
          name: "Planes de ProcesoClaro",
          url: "https://procesoclaro.co/precios-software-legal",
        },
      ]}
    />
  );
}
