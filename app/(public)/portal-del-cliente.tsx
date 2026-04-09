import { PublicSeoPage } from "@/components/web/PublicSeoPage";

export default function PortalDelClientePage() {
  return (
    <PublicSeoPage
      title="Portal del cliente para abogados | ProcesoClaro"
      description="Ofrece a tus clientes seguimiento claro de sus procesos, mensajes y documentos desde un portal seguro para abogados y bufetes."
      canonicalPath="/portal-del-cliente"
      breadcrumbLabel="Portal del cliente"
      eyebrow="Portal del cliente"
      heroTitle="Portal del cliente para abogados con seguimiento claro y seguro"
      heroBody="ProcesoClaro incorpora un portal del cliente para que cada persona o empresa consulte el estado de su proceso, reciba notificaciones y converse con su abogado."
      bullets={[
        "Estado del proceso visible para el cliente",
        "Notificaciones y documentos centralizados",
        "Menos llamadas repetidas y mas confianza",
      ]}
      sections={[
        {
          title: "Reduce soporte repetitivo",
          body: "Cuando el cliente ve avances y documentos por si mismo, el equipo deja de invertir tiempo respondiendo siempre la misma pregunta.",
        },
        {
          title: "Mejora la percepcion del servicio",
          body: "La experiencia digital transmite orden, seguimiento y profesionalismo, que son factores clave para retencion y recomendacion.",
        },
        {
          title: "Conecta mejor con el resto del sistema",
          body: "El portal no vive aislado: se alimenta del estado real de los procesos, mensajes y archivos que ya administra el despacho.",
        },
      ]}
      extraSchemas={[
        {
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Portal del cliente de ProcesoClaro",
          provider: {
            "@type": "Organization",
            name: "ProcesoClaro",
          },
          areaServed: {
            "@type": "Country",
            name: "Colombia",
          },
          serviceType: "Portal digital para seguimiento de procesos legales y comunicacion abogado-cliente",
        },
      ]}
    />
  );
}
