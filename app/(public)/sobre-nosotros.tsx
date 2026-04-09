import { PublicSeoPage } from "@/components/web/PublicSeoPage";

export default function SobreNosotrosPublicPage() {
  return (
    <PublicSeoPage
      title="Sobre ProcesoClaro | Software legal en Colombia"
      description="Conoce que es ProcesoClaro, a quien ayuda y como busca modernizar la gestion legal y la experiencia del cliente en Colombia."
      canonicalPath="/sobre-nosotros"
      breadcrumbLabel="Sobre nosotros"
      eyebrow="Sobre ProcesoClaro"
      heroTitle="Sobre ProcesoClaro y nuestra propuesta para el sector legal"
      heroBody="ProcesoClaro nace de un problema concreto: abogados, bufetes y clientes siguen operando con herramientas fragmentadas para procesos que exigen orden, trazabilidad y confianza."
      bullets={[
        "Enfoque en operacion legal real",
        "Mejor experiencia para clientes",
        "Herramientas pensadas para Colombia",
      ]}
      sections={[
        {
          title: "Que problema buscamos resolver",
          body: "La dispersion de informacion, el seguimiento manual y la falta de visibilidad deterioran tanto la operacion interna como la confianza del cliente.",
        },
        {
          title: "Como pensamos el producto",
          body: "No se trata de agregar complejidad, sino de ordenar clientes, procesos, documentos, mensajes y decisiones alrededor de una sola operacion.",
        },
        {
          title: "Que queremos mejorar",
          body: "Queremos que abogados y firmas trabajen con mas control y que el cliente final perciba un servicio legal mas transparente y profesional.",
        },
      ]}
    />
  );
}
