import { PublicSeoPage } from "@/components/web/PublicSeoPage";

export default function FaqPublicPage() {
  const faqItems = [
    {
      question: "¿Sirve si hoy operas con Excel y WhatsApp?",
      answer:
        "Si. De hecho, ese es uno de los escenarios donde mas valor aporta, porque centraliza procesos, clientes, mensajes, documentos y fechas.",
    },
    {
      question: "¿Puede usarlo una firma con varios abogados?",
      answer:
        "Si. La plataforma contempla roles, permisos y una estructura adecuada para equipos, incluyendo clientes privados por abogado cuando haga falta.",
    },
    {
      question: "¿El cliente puede ver avances del caso?",
      answer:
        "Si. El portal del cliente permite consultar el estado del proceso, revisar documentos y recibir notificaciones dentro de una experiencia mas profesional.",
    },
  ];

  return (
    <PublicSeoPage
      title="Preguntas frecuentes sobre ProcesoClaro | FAQ"
      description="Resuelve dudas sobre funciones, planes, privacidad, clientes, documentos y uso de ProcesoClaro para abogados y bufetes."
      canonicalPath="/faq"
      breadcrumbLabel="FAQ"
      eyebrow="Preguntas frecuentes"
      heroTitle="Preguntas frecuentes sobre ProcesoClaro para abogados y bufetes"
      heroBody="Esta pagina responde las preguntas mas comunes sobre uso, alcance, privacidad, planes y operacion de ProcesoClaro para abogados independientes y firmas."
      bullets={[
        "Como funciona para abogados y bufetes",
        "Que resuelve para clientes y seguimiento de casos",
        "Como se maneja la privacidad de la informacion",
      ]}
      sections={faqItems.map((item) => ({
        title: item.question,
        body: item.answer,
      }))}
      extraSchemas={[
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        },
      ]}
    />
  );
}
