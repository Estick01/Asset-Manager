import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Layout decisions based on viewport width, not platform.
// Esto funciona en mobile nativo, web móvil, y desktop.
const IS_MOBILE_LAYOUT = SCREEN_WIDTH < 768;
const CONTENT_MAX_WIDTH = 1100;

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Navbar({
  onLogin,
  onRegister,
  onNavigateSection,
  activeSection,
}: {
  onLogin: () => void;
  onRegister: () => void;
  onNavigateSection: (key: string) => void;
  activeSection: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.navbar, { paddingTop: insets.top + 12 }]}>
      <View style={styles.navShell}>
        <View style={styles.navInner}>
          <View style={styles.navBrandBlock}>
            <View style={styles.navBrand}>
              <View style={styles.navLogoCircle}>
                <Ionicons name="scale-outline" size={18} color={Colors.white} />
              </View>
              <View style={styles.navBrandTextWrap}>
                <Text style={styles.navBrandName}>ProcesoClaro</Text>
                {!IS_MOBILE_LAYOUT ? (
                  <Text style={styles.navBrandSubtitle}>Software legal para abogados y bufetes</Text>
                ) : null}
              </View>
            </View>
          </View>
          <View style={styles.navActions}>
            <Pressable
              style={({ pressed }) => [styles.navSecondaryBtn, pressed && styles.navButtonPressed]}
              onPress={onLogin}
              hitSlop={8}
            >
              <Text style={styles.navSecondaryBtnText}>Iniciar sesión</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.navPrimaryBtn, pressed && styles.navButtonPressed]}
              onPress={onRegister}
              hitSlop={8}
            >
              <Text style={styles.navPrimaryBtnText}>Solicitar acceso</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navQuickRow}
        >
        {QUICK_NAV_ITEMS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => onNavigateSection(item.key)}
            accessibilityRole="button"
            accessibilityLabel={`Ir a la seccion ${item.label}`}
            style={({ pressed }) => [
              styles.navQuickChip,
              activeSection === item.key && styles.navQuickChipActive,
              pressed && styles.navQuickChipPressed,
            ]}
          >
            <Text style={[
              styles.navQuickChipText,
              activeSection === item.key && styles.navQuickChipTextActive,
            ]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      </View>
    </View>
  );
}

function SectionTitle({
  label,
  title,
  subtitle,
  light,
}: {
  label?: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <View style={styles.sectionTitleWrap}>
      {!!label && (
        <View style={[styles.labelPill, light && styles.labelPillLight]}>
          <Text style={[styles.labelText, light && styles.labelTextLight]}>
            {label}
          </Text>
        </View>
      )}
      <Text style={[styles.sectionH2, light && styles.sectionH2Light]}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={[styles.sectionSubtitle, light && styles.sectionSubtitleLight]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const PROBLEMAS = [
  {
    icon: "document-text-outline" as const,
    titulo: "Información dispersa",
    desc: "Procesos en cuadernos, fechas en WhatsApp, clientes en Excel. Todo está en todas partes y en ninguna.",
  },
  {
    icon: "chatbubble-ellipses-outline" as const,
    titulo: "El cliente no sabe qué pasa",
    desc: "Llamadas sin respuesta, mensajes de WhatsApp sin contexto. El cliente no entiende cómo va su proceso y pierde la confianza en su abogado.",
  },
  {
    icon: "search-outline" as const,
    titulo: "Difícil encontrar un abogado de confianza",
    desc: "Para el cliente, elegir un abogado es una apuesta a ciegas. No hay forma de comparar, validar experiencia ni saber quién realmente lo puede ayudar.",
  },
  {
    icon: "briefcase-outline" as const,
    titulo: "El abogado nuevo no consigue trabajo",
    desc: "Graduarse no garantiza clientes. Sin red de contactos ni visibilidad, los abogados que inician pasan meses sin casos aunque tengan el conocimiento.",
  },
  {
    icon: "time-outline" as const,
    titulo: "Plazos que se escapan",
    desc: "Una audiencia olvidada, una notificación sin responder. El desorden cuesta dinero y reputación.",
  },
];

const FEATURES = [
  {
    icon: "people-outline" as const,
    color: "#3B82F6",
    bg: "#DBEAFE",
    titulo: "Gestión de clientes",
    desc: "Ficha completa de cada cliente: datos, documentos, procesos activos e historial. Todo en un solo lugar.",
    roles: ["Abogado", "Bufete"],
  },
  {
    icon: "briefcase-outline" as const,
    color: "#8B5CF6",
    bg: "#EDE9FE",
    titulo: "Seguimiento de procesos",
    desc: "Etapas procesales definidas, actualizaciones en tiempo real y estado de cada caso visible de un vistazo.",
    roles: ["Abogado", "Bufete"],
  },
  {
    icon: "shield-checkmark-outline" as const,
    color: Colors.primary,
    bg: "#DBEAFE",
    titulo: "Privacidad por abogado",
    desc: "Cada abogado controla qué clientes son privados. Solo tú ves lo tuyo — ni el administrador puede acceder.",
    roles: ["Abogado", "Bufete"],
    destacado: true,
  },
  {
    icon: "calendar-outline" as const,
    color: "#10B981",
    bg: "#D1FAE5",
    titulo: "Calendario legal",
    desc: "Audiencias, vencimientos y recordatorios automáticos. Nunca más una fecha perdida.",
    roles: ["Abogado", "Bufete"],
  },
  {
    icon: "folder-outline" as const,
    color: "#F59E0B",
    bg: "#FEF3C7",
    titulo: "Documentos y archivos",
    desc: "Sube, organiza y accede a los documentos de cada proceso desde cualquier dispositivo.",
    roles: ["Abogado", "Bufete"],
  },
  {
    icon: "chatbubble-ellipses-outline" as const,
    color: "#EF4444",
    bg: "#FEE2E2",
    titulo: "Chat con clientes",
    desc: "Comunicación directa y segura dentro de la plataforma. Sin mezclar WhatsApp con tu vida personal.",
    roles: ["Pro", "Bufete"],
  },
  {
    icon: "bar-chart-outline" as const,
    color: "#0EA5E9",
    bg: "#E0F2FE",
    titulo: "Dashboard y reportes",
    desc: "Visión completa del estado de tu firma: procesos activos, clientes, rendimiento del equipo.",
    roles: ["Bufete"],
  },
];

const PLANES_HIGHLIGHT = [
  {
    id: "gratis",
    nombre: "Gratis",
    precio: "0",
    desc: "Para empezar sin compromisos",
    popular: false,
    items: ["5 procesos", "10 clientes", "1 usuario"],
  },
  {
    id: "esencial",
    nombre: "Esencial",
    precio: "29.900",
    desc: "Para el abogado activo",
    popular: false,
    items: ["20 procesos", "30 clientes", "Calendario legal", "Etapas procesales", "2 GB documentos"],
  },
  {
    id: "pro",
    nombre: "Pro",
    precio: "84.900",
    desc: "Sin límites, todo incluido",
    popular: true,
    items: ["Procesos ilimitados", "Clientes ilimitados", "Chat con clientes", "Privacidad avanzada", "15 GB documentos", "Comunidad"],
  },
];

const CASOS_DE_USO = [
  {
    icon: "briefcase-outline" as const,
    title: "Software para abogados independientes",
    description:
      "Organiza clientes, procesos, documentos y agenda desde un solo lugar, sin depender de hojas de calculo ni mensajes sueltos.",
    bullets: ["Seguimiento de procesos", "Portal y chat con clientes", "Control total de informacion privada"],
  },
  {
    icon: "business-outline" as const,
    title: "Software de gestion juridica para bufetes",
    description:
      "Centraliza la operacion de la firma con roles, permisos, clientes compartidos, clientes privados y visibilidad del equipo.",
    bullets: ["Dashboard de la firma", "Roles y permisos", "Privacidad por abogado"],
  },
  {
    icon: "phone-portrait-outline" as const,
    title: "Portal para clientes legales",
    description:
      "Entrega una experiencia moderna a tus clientes con acceso al estado del caso, documentos, mensajes y notificaciones.",
    bullets: ["Menos llamadas repetidas", "Mas confianza del cliente", "Mejor experiencia postventa"],
  },
];

const FAQS = [
  {
    question: "¿ProcesoClaro sirve para abogados independientes y bufetes?",
    answer:
      "Si. La plataforma cubre el trabajo diario del abogado independiente y tambien la operacion de firmas con varios usuarios, roles y control de acceso.",
  },
  {
    question: "¿Puedo dar seguimiento a procesos judiciales y documentos en un mismo lugar?",
    answer:
      "Si. Cada caso concentra estado, etapas, historial, archivos, responsables, calendario y comunicacion con el cliente.",
  },
  {
    question: "¿Los clientes pueden ver el estado de su proceso?",
    answer:
      "Si. El portal del cliente permite consultar avances, recibir notificaciones y conversar con su abogado sin depender de WhatsApp.",
  },
  {
    question: "¿La informacion de mis clientes queda protegida dentro del bufete?",
    answer:
      "Si. ProcesoClaro permite manejar clientes privados por abogado para limitar el acceso incluso dentro de la firma cuando asi se requiera.",
  },
];

const SEO_LINKS = [
  {
    title: "Software para abogados",
    description: "Una pagina enfocada en abogados independientes que necesitan ordenar clientes, procesos y seguimiento.",
    href: "/software-para-abogados",
  },
  {
    title: "Software para bufetes",
    description: "Pensada para firmas que necesitan roles, privacidad por abogado y control operativo del equipo.",
    href: "/software-para-bufetes",
  },
  {
    title: "Portal del cliente",
    description: "Explica como mejorar la experiencia del cliente con acceso, notificaciones y seguimiento del caso.",
    href: "/portal-del-cliente",
  },
  {
    title: "Gestion de procesos legales",
    description: "Contenido orientado a seguimiento de casos, trazabilidad y reduccion de desorden operativo.",
    href: "/gestion-de-procesos-legales",
  },
  {
    title: "Software juridico en Colombia",
    description: "Aterriza la propuesta al contexto local y al tipo de operacion juridica que buscan despachos colombianos.",
    href: "/software-juridico-colombia",
  },
  {
    title: "Precios software legal",
    description: "Conecta el valor del producto con la estructura de planes y la decision economica de implementarlo.",
    href: "/precios-software-legal",
  },
];

const QUICK_NAV_ITEMS = [
  { key: "problema", label: "Problema", icon: "alert-circle-outline" as const },
  { key: "funcionalidades", label: "Funciones", icon: "grid-outline" as const },
  { key: "comunidad", label: "Comunidad", icon: "people-outline" as const },
  { key: "portal", label: "Portal cliente", icon: "phone-portrait-outline" as const },
  { key: "planes", label: "Planes", icon: "card-outline" as const },
  { key: "faq", label: "FAQ", icon: "help-circle-outline" as const },
];

// ── Pantalla principal ─────────────────────────────────────────────────────────

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});
  const [activeSection, setActiveSection] = useState(QUICK_NAV_ITEMS[0].key);

  const irARegistro = () => router.push("/(auth)/register-type");
  const irALogin = () => router.push("/(auth)/login");
  const irAPlanes = () => router.push("/planes");
  const irAFaq = () => router.push("/faq");
  const irAContacto = () => router.push("/contacto");
  const irASobreNosotros = () => router.push("/sobre-nosotros");
  const irASoftwareAbogados = () => router.push("/software-para-abogados");
  const irASoftwareBufetes = () => router.push("/software-para-bufetes");
  const irAPortalCliente = () => router.push("/portal-del-cliente");
  const irAGestionProcesos = () => router.push("/gestion-de-procesos-legales");
  const irASoftwareColombia = () => router.push("/software-juridico-colombia");
  const irAPreciosSoftware = () => router.push("/precios-software-legal");

  function registerSection(key: string) {
    return (event: LayoutChangeEvent) => {
      sectionPositions.current[key] = event.nativeEvent.layout.y;
    };
  }

  function goToSection(key: string) {
    const targetY = sectionPositions.current[key];
    if (typeof targetY !== "number") return;

    const topOffset = IS_MOBILE_LAYOUT ? 18 : 126;
    scrollRef.current?.scrollTo({
      y: Math.max(targetY - topOffset, 0),
      animated: true,
    });
  }

  function handleScroll(event: any) {
    const scrollY = event.nativeEvent.contentOffset.y;
    const threshold = scrollY + (IS_MOBILE_LAYOUT ? 90 : 150);

    let current = QUICK_NAV_ITEMS[0].key;
    for (const item of QUICK_NAV_ITEMS) {
      const y = sectionPositions.current[item.key];
      if (typeof y === "number" && threshold >= y) {
        current = item.key;
      }
    }

    setActiveSection((prev) => (prev === current ? prev : current));
  }

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const title = "ProcesoClaro | Software para abogados, bufetes y gestion juridica";
    const description =
      "Software de gestion juridica para abogados y bufetes en Colombia. Centraliza procesos legales, clientes, documentos, calendario y portal del cliente.";
    const canonicalHref = "https://procesoclaro.co/landing";

    document.title = title;

    const ensureMeta = (selector: string, attributes: Record<string, string>) => {
      let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!element) {
        element = document.createElement(attributes.rel ? "link" : "meta") as
          | HTMLMetaElement
          | HTMLLinkElement;
        document.head.appendChild(element);
      }
      Object.entries(attributes).forEach(([key, value]) => {
        element?.setAttribute(key, value);
      });
    };

    ensureMeta('meta[name="description"]', {
      name: "description",
      content: description,
    });
    ensureMeta('meta[property="og:title"]', {
      property: "og:title",
      content: title,
    });
    ensureMeta('meta[property="og:description"]', {
      property: "og:description",
      content: description,
    });
    ensureMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonicalHref,
    });
    ensureMeta('link[rel="canonical"]', {
      rel: "canonical",
      href: canonicalHref,
    });
  }, []);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: "ProcesoClaro | Software legal" }} />
      <Navbar
        onLogin={irALogin}
        onRegister={irARegistro}
        onNavigateSection={goToSection}
        activeSection={activeSection}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* ── HERO ── */}
        <LinearGradient
          colors={["#0F2640", "#1B3A5C", "#2A5A8C"]}
          style={styles.hero}
        >
          <View style={styles.heroInner}>
            <View style={styles.heroBadge}>
              <Ionicons name="flash" size={13} color={Colors.accent} />
              <Text style={styles.heroBadgeText}>Plataforma legal colombiana</Text>
            </View>

            <Text style={styles.heroH1}>
              Gestiona tu firma legal{"\n"}
              <Text style={styles.heroH1Accent}>sin el caos</Text>
            </Text>

            <Text style={styles.heroSubtitle}>
              Todo lo que necesitas como abogado independiente o bufete: clientes, procesos, documentos, calendario y equipo — en una sola plataforma.
            </Text>

            <View style={styles.heroCtas}>
              <Pressable
                style={({ pressed }) => [styles.ctaPrimary, pressed && styles.ctaPressed]}
                onPress={irARegistro}
              >
                <Text style={styles.ctaPrimaryText}>Empezar gratis</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.primaryDark} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.ctaSecondary, pressed && styles.ctaSecondaryPressed]}
                onPress={irAPlanes}
              >
                <Text style={styles.ctaSecondaryText}>Ver planes</Text>
              </Pressable>
            </View>

            <Text style={styles.heroNote}>
              Sin tarjeta de crédito · Activa en 2 minutos
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.heroStats}>
            {[
              { valor: "100%", label: "Privacidad garantizada" },
              { valor: "0 COP", label: "Para empezar" },
              { valor: "24/7", label: "Acceso desde cualquier lugar" },
            ].map((s, i) => (
              <View key={i} style={[styles.heroStat, i < 2 && styles.heroStatBorder]}>
                <Text style={styles.heroStatValor}>{s.valor}</Text>
                <Text style={styles.heroStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── PROBLEMA ── */}
        <View style={[styles.section, styles.sectionWhite]} onLayout={registerSection("problema")}>
          <View style={styles.sectionInner}>
            <SectionTitle
              label="El problema"
              title={"¿Te suena familiar?"}
              subtitle="El 78% de abogados independientes gestiona sus casos con herramientas que no fueron diseñadas para el derecho."
            />
            <View style={styles.problemasGrid}>
              {PROBLEMAS.map((p, i) => (
                <View key={i} style={styles.problemaCard}>
                  <View style={styles.problemaIconWrap}>
                    <Ionicons name={p.icon} size={28} color={Colors.danger} />
                  </View>
                  <Text style={styles.problemaTitulo}>{p.titulo}</Text>
                  <Text style={styles.problemaDesc}>{p.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── SOLUCIÓN ── */}
        <LinearGradient
          colors={["#0F2640", "#1B3A5C"]}
          style={[styles.section, styles.sectionDark]}
        >
          <View style={styles.sectionInner}>
            <SectionTitle
              label="La solución"
              title={"ProcesoClaro centraliza\ntodo tu trabajo legal"}
              subtitle="Una plataforma diseñada específicamente para abogados colombianos. Sin curvas de aprendizaje, sin complejidad innecesaria."
              light
            />

            <View style={styles.solucionGrid}>
              {[
                { icon: "checkmark-circle-outline" as const, texto: "Un lugar para clientes, procesos y documentos" },
                { icon: "checkmark-circle-outline" as const, texto: "Privacidad real: cada abogado controla su información" },
                { icon: "checkmark-circle-outline" as const, texto: "Calendario con recordatorios automáticos de audiencias" },
                { icon: "checkmark-circle-outline" as const, texto: "Chat directo con tus clientes — sin WhatsApp" },
                { icon: "checkmark-circle-outline" as const, texto: "Dashboard en tiempo real del estado de tu firma" },
                { icon: "checkmark-circle-outline" as const, texto: "Acceso desde móvil o computador, siempre sincronizado" },
              ].map((item, i) => (
                <View key={i} style={styles.solucionItem}>
                  <Ionicons name={item.icon} size={22} color={Colors.accent} />
                  <Text style={styles.solucionTexto}>{item.texto}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* ── FUNCIONALIDADES ── */}
        <View style={[styles.section, styles.sectionGray]} onLayout={registerSection("funcionalidades")}>
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Funcionalidades"
              title={"Todo lo que necesitas,\nnada que no uses"}
              subtitle="Diseñado para el flujo real de trabajo de un abogado — no para una consultora internacional."
            />
            <View style={styles.featuresGrid}>
              {FEATURES.map((f, i) => (
                <View
                  key={i}
                  style={[styles.featureCard, f.destacado && styles.featureCardDestacado]}
                >
                  {f.destacado && (
                    <View style={styles.featureDestacadoBadge}>
                      <Ionicons name="star" size={11} color={Colors.accent} />
                      <Text style={styles.featureDestacadoBadgeText}>Diferencial clave</Text>
                    </View>
                  )}
                  <View style={[styles.featureIconCircle, { backgroundColor: f.bg }]}>
                    <Ionicons name={f.icon} size={24} color={f.color} />
                  </View>
                  <Text style={[styles.featureTitulo, f.destacado && styles.featureTituloDestacado]}>
                    {f.titulo}
                  </Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                  <View style={styles.featureRoles}>
                    {f.roles.map((r) => (
                      <View key={r} style={styles.featureRolePill}>
                        <Text style={styles.featureRoleText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── PRIVACIDAD SPOTLIGHT ── */}
        <View style={[styles.section, styles.sectionWhite]}>
          <View style={styles.sectionInner}>
            <View style={styles.privacidadCard}>
              <View style={styles.privacidadLeft}>
                <View style={styles.privacidadIconBig}>
                  <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
                </View>
                <View style={styles.labelPill}>
                  <Text style={styles.labelText}>Diferencial único</Text>
                </View>
                <Text style={styles.privacidadH3}>
                  Privacidad real por abogado
                </Text>
                <Text style={styles.privacidadDesc}>
                  En un bufete, cada abogado puede marcar clientes como privados. Ni el administrador ni otros colegas pueden ver esa información.
                </Text>
                <Text style={styles.privacidadDesc}>
                  Ideal para firmas donde los abogados traen sus propios clientes y necesitan garantizar confidencialidad total, incluso internamente.
                </Text>
                <View style={styles.privacidadBeneficios}>
                  {[
                    "Clientes privados visibles solo para ti",
                    "Control granular por proceso",
                    "Registro de accesos",
                  ].map((b, i) => (
                    <View key={i} style={styles.privacidadBeneficioItem}>
                      <Ionicons name="checkmark" size={16} color={Colors.success} />
                      <Text style={styles.privacidadBeneficioTexto}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.privacidadRight}>
                {[
                  { icon: "person-circle-outline" as const, nombre: "Dr. García", clientes: "12 clientes", privados: "4 privados", color: Colors.primary },
                  { icon: "person-circle-outline" as const, nombre: "Dra. Torres", clientes: "8 clientes", privados: "8 privados", color: "#8B5CF6" },
                  { icon: "person-circle-outline" as const, nombre: "Dr. Mora", clientes: "15 clientes", privados: "6 privados", color: "#10B981" },
                ].map((a, i) => (
                  <View key={i} style={styles.privacidadAbogadoCard}>
                    <Ionicons name={a.icon} size={32} color={a.color} />
                    <View style={styles.privacidadAbogadoInfo}>
                      <Text style={styles.privacidadAbogadoNombre}>{a.nombre}</Text>
                      <Text style={styles.privacidadAbogadoSub}>{a.clientes}</Text>
                    </View>
                    <View style={styles.privacidadPrivadoBadge}>
                      <Ionicons name="lock-closed" size={11} color={Colors.white} />
                      <Text style={styles.privacidadPrivadoText}>{a.privados}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ── COMUNIDAD — HERO INTRO ── */}
        <LinearGradient
          colors={["#0F2640", "#1B3A5C", "#0F3460"]}
          style={[styles.section, styles.sectionDark]}
          onLayout={registerSection("comunidad")}
        >
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Comunidad ProcesoClaro"
              title={"Tu reputación trabaja\nmientras tú duermes"}
              subtitle="La única plataforma legal con un algoritmo que conecta clientes con el abogado correcto — automáticamente."
              light
            />

            {/* Stats de comunidad */}
            <View style={styles.comStatsRow}>
              {[
                { valor: "Algoritmo", label: "de matching inteligente", icon: "git-network-outline" as const },
                { valor: "Ranking", label: "de reputación por área", icon: "trophy-outline" as const },
                { valor: "Trabajo", label: "real desde el día 1", icon: "briefcase-outline" as const },
              ].map((s, i) => (
                <View key={i} style={styles.comStatCard}>
                  <View style={styles.comStatIconWrap}>
                    <Ionicons name={s.icon} size={22} color={Colors.accent} />
                  </View>
                  <Text style={styles.comStatValor}>{s.valor}</Text>
                  <Text style={styles.comStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* ── COMUNIDAD — ALGORITMO DE MATCHING ── */}
        <View style={[styles.section, styles.sectionWhite]}>
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Algoritmo inteligente"
              title={"El sistema encuentra\nel caso perfecto para ti"}
              subtitle="Cuando un cliente publica una necesidad legal, nuestro algoritmo evalúa tu perfil, especialidad y actividad — y te sugiere como candidato."
            />

            {/* Diagrama de matching */}
            <View style={styles.matchDiagram}>
              {/* Cliente publica */}
              <View style={styles.matchSide}>
                <View style={[styles.matchNodeCard, { borderColor: "#EF4444" }]}>
                  <View style={[styles.matchNodeIcon, { backgroundColor: "#FEE2E2" }]}>
                    <Ionicons name="person-circle-outline" size={28} color="#EF4444" />
                  </View>
                  <Text style={styles.matchNodeTitle}>Cliente publica</Text>
                  <View style={[styles.matchPostMini, { borderLeftColor: "#EF4444" }]}>
                    <View style={styles.matchPostMiniPill}>
                      <Ionicons name="flash" size={10} color="#EF4444" />
                      <Text style={[styles.matchPostMiniType, { color: "#EF4444" }]}>Urgente · Laboral</Text>
                    </View>
                    <Text style={styles.matchPostMiniText}>
                      &quot;Despido injustificado, necesito asesoría esta semana en Bogotá&quot;
                    </Text>
                  </View>
                </View>
              </View>

              {/* Flecha con algoritmo */}
              <View style={styles.matchArrowCol}>
                <View style={styles.matchAlgoBox}>
                  <Ionicons name="git-network-outline" size={20} color={Colors.primary} />
                  <Text style={styles.matchAlgoText}>Algoritmo</Text>
                </View>
                <View style={styles.matchArrowLine} />
                {["Especialidad", "Reputación", "Ciudad", "Actividad"].map((f, i) => (
                  <View key={i} style={styles.matchFactorPill}>
                    <Ionicons name="checkmark-circle" size={11} color={Colors.primary} />
                    <Text style={styles.matchFactorText}>{f}</Text>
                  </View>
                ))}
                <View style={styles.matchArrowLine} />
              </View>

              {/* Abogados sugeridos */}
              <View style={styles.matchSide}>
                <View style={[styles.matchNodeCard, { borderColor: Colors.primary }]}>
                  <View style={[styles.matchNodeIcon, { backgroundColor: "#DBEAFE" }]}>
                    <Ionicons name="shield-checkmark-outline" size={28} color={Colors.primary} />
                  </View>
                  <Text style={styles.matchNodeTitle}>Top coincidencias</Text>
                  {[
                    { nombre: "Dr. Ramírez", score: 98, area: "Laboral · Bogotá" },
                    { nombre: "Dra. Torres", score: 94, area: "Laboral · Bogotá" },
                    { nombre: "Dr. Mora",    score: 87, area: "Laboral · Soacha" },
                  ].map((a, i) => (
                    <View key={i} style={styles.matchAbogadoRow}>
                      <View style={[styles.matchRankBadge, i === 0 && { backgroundColor: Colors.accent }]}>
                        <Text style={styles.matchRankText}>#{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.matchAbogadoNombre}>{a.nombre}</Text>
                        <Text style={styles.matchAbogadoArea}>{a.area}</Text>
                      </View>
                      <Text style={[styles.matchScore, i === 0 && { color: Colors.accent }]}>{a.score}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Cómo funciona */}
            <View style={styles.matchStepsRow}>
              {[
                { num: "1", icon: "create-outline" as const, titulo: "Publica o participa", desc: "Responde casos, comparte artículos de tu área. Cada interacción suma a tu perfil." },
                { num: "2", icon: "analytics-outline" as const, titulo: "El algoritmo te evalúa", desc: "Analiza tu especialidad, historial de respuestas, valoraciones y ubicación en tiempo real." },
                { num: "3", icon: "mail-outline" as const, titulo: "Recibes el caso", desc: "El cliente te contacta directamente. Tú decides si aceptar o no, sin intermediarios." },
              ].map((step, i) => (
                <View key={i} style={styles.matchStepCard}>
                  <View style={styles.matchStepNumWrap}>
                    <Text style={styles.matchStepNum}>{step.num}</Text>
                  </View>
                  <View style={[styles.matchStepIconWrap, { backgroundColor: "#DBEAFE" }]}>
                    <Ionicons name={step.icon} size={22} color={Colors.primary} />
                  </View>
                  <Text style={styles.matchStepTitulo}>{step.titulo}</Text>
                  <Text style={styles.matchStepDesc}>{step.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── COMUNIDAD — REPUTACIÓN Y RECOMPENSAS ── */}
        <LinearGradient
          colors={["#1a1a2e", "#16213e", "#0f3460"]}
          style={[styles.section, styles.sectionDark]}
        >
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Sistema de reputación"
              title={"Tu actividad construye\ntu posición en el ranking"}
              subtitle="ProcesoClaro premia a los abogados más activos y útiles. Cuanto más aportas a la comunidad, más visible eres para los clientes."
              light
            />

            <View style={styles.reputGrid}>
              {/* Ranking */}
              <View style={styles.reputCard}>
                <View style={styles.reputCardHeader}>
                  <Ionicons name="trophy" size={24} color={Colors.accent} />
                  <Text style={styles.reputCardTitulo}>Ranking por área</Text>
                </View>
                <Text style={styles.reputCardDesc}>
                  Cada área del derecho tiene su propio ranking. Los abogados más activos y mejor valorados aparecen primero cuando un cliente busca asesoría.
                </Text>
                {/* Mock ranking */}
                <View style={styles.reputRankingMock}>
                  {[
                    { pos: 1, nombre: "Dra. Morales", pts: "2.840 pts", crown: true },
                    { pos: 2, nombre: "Dr. Ramírez",  pts: "2.510 pts", crown: false },
                    { pos: 3, nombre: "Dr. Castro",   pts: "2.190 pts", crown: false },
                  ].map((r, i) => (
                    <View key={i} style={[styles.reputRankRow, i === 0 && styles.reputRankRowTop]}>
                      {r.crown
                        ? <Ionicons name="trophy" size={16} color={Colors.accent} />
                        : <Text style={styles.reputRankPos}>#{r.pos}</Text>
                      }
                      <Text style={[styles.reputRankNombre, i === 0 && { color: Colors.accent }]}>{r.nombre}</Text>
                      <Text style={styles.reputRankPts}>{r.pts}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Cómo ganar puntos */}
              <View style={styles.reputCard}>
                <View style={styles.reputCardHeader}>
                  <Ionicons name="star" size={24} color="#A78BFA" />
                  <Text style={styles.reputCardTitulo}>Cómo subes de nivel</Text>
                </View>
                <Text style={styles.reputCardDesc}>
                  Cada acción en la comunidad genera puntos que construyen tu reputación visible para clientes y colegas.
                </Text>
                <View style={styles.reputPuntosGrid}>
                  {[
                    { icon: "create-outline" as const,          color: "#60A5FA", accion: "Publicar artículo",      pts: "+50 pts" },
                    { icon: "chatbubble-outline" as const,       color: "#34D399", accion: "Responder caso",        pts: "+30 pts" },
                    { icon: "heart-outline" as const,            color: "#F87171", accion: "Recibir like",          pts: "+5 pts"  },
                    { icon: "checkmark-done-outline" as const,   color: Colors.accent, accion: "Caso aceptado",    pts: "+100 pts" },
                    { icon: "star-outline" as const,             color: "#A78BFA", accion: "Valoración 5 estrellas", pts: "+80 pts" },
                    { icon: "eye-outline" as const,              color: "#FB923C", accion: "Perfil visitado",       pts: "+2 pts"  },
                  ].map((p, i) => (
                    <View key={i} style={styles.reputPuntoItem}>
                      <View style={[styles.reputPuntoIcon, { backgroundColor: p.color + "20" }]}>
                        <Ionicons name={p.icon} size={15} color={p.color} />
                      </View>
                      <Text style={styles.reputPuntoAccion}>{p.accion}</Text>
                      <Text style={[styles.reputPuntoPts, { color: p.color }]}>{p.pts}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Beneficios de reputación alta */}
              <View style={[styles.reputCard, styles.reputCardDestacado]}>
                <View style={styles.reputCardHeader}>
                  <Ionicons name="rocket-outline" size={24} color={Colors.accent} />
                  <Text style={[styles.reputCardTitulo, { color: Colors.white }]}>Beneficios de escalar</Text>
                </View>
                <Text style={[styles.reputCardDesc, { color: "rgba(255,255,255,0.65)" }]}>
                  Cuanto más alta tu reputación, más oportunidades recibe tu perfil automáticamente.
                </Text>
                <View style={styles.reputBeneficiosList}>
                  {[
                    { icon: "eye-outline" as const,            texto: "Mayor visibilidad en búsquedas de clientes" },
                    { icon: "flash-outline" as const,          texto: "El algoritmo te prioriza en el matching" },
                    { icon: "ribbon-outline" as const,         texto: "Insignia de 'Abogado destacado' en tu perfil" },
                    { icon: "mail-unread-outline" as const,    texto: "Clientes te contactan directamente" },
                    { icon: "trending-up-outline" as const,    texto: "Apareces en el feed de más usuarios" },
                  ].map((b, i) => (
                    <View key={i} style={styles.reputBeneficioItem}>
                      <View style={styles.reputBeneficioIconWrap}>
                        <Ionicons name={b.icon} size={15} color={Colors.accent} />
                      </View>
                      <Text style={styles.reputBeneficioTexto}>{b.texto}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ── COMUNIDAD — FEED + CTA ── */}
        <View style={[styles.section, styles.sectionGray]}>
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Consigue trabajo"
              title={"Clientes que buscan,\nabogados que responden"}
              subtitle="El feed de la comunidad es donde los clientes publican sus necesidades legales. Tú respondes, el cliente elige. Así de directo."
            />

            <View style={styles.comFeedLayout}>
              {/* Feed mock */}
              <View style={styles.comFeedCol}>
                {[
                  { tipo: "Derecho laboral", urgente: true,  titulo: "Despido sin justa causa — necesito abogado esta semana en Bogotá", autor: "Anónimo · Bogotá",    likes: 0,  replies: 4,  tomado: false },
                  { tipo: "Derecho de familia", urgente: false, titulo: "¿Cómo funciona la custodia compartida si el padre viaja al exterior?", autor: "Dra. Morales · Cali",   likes: 67, replies: 21, tomado: false },
                  { tipo: "Derecho penal", urgente: false, titulo: "Proceso de preclusión: criterios y plazos explicados paso a paso", autor: "Dr. Ramírez · Medellín", likes: 34, replies: 8,  tomado: true  },
                ].map((post, i) => (
                  <View key={i} style={styles.comFeedCard}>
                    <View style={styles.comFeedCardTop}>
                      <View style={[styles.comFeedTypePill, post.urgente && styles.comFeedTypePillUrgente]}>
                        {post.urgente && <Ionicons name="flash" size={10} color="#EF4444" />}
                        <Text style={[styles.comFeedTypeText, post.urgente && { color: "#EF4444" }]}>{post.tipo}</Text>
                      </View>
                      {post.tomado && (
                        <View style={styles.comFeedTomadoPill}>
                          <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                          <Text style={styles.comFeedTomadoText}>Caso tomado</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.comFeedCardTitulo}>{post.titulo}</Text>
                    <View style={styles.comFeedCardBottom}>
                      <Text style={styles.comFeedCardAutor}>{post.autor}</Text>
                      <View style={styles.comFeedCardStats}>
                        <Ionicons name="heart-outline" size={13} color={Colors.textTertiary} />
                        <Text style={styles.comFeedStatText}>{post.likes}</Text>
                        <Ionicons name="chatbubble-outline" size={13} color={Colors.textTertiary} />
                        <Text style={styles.comFeedStatText}>{post.replies}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Panel derecho: acciones */}
              <View style={styles.comActionsCol}>
                <View style={styles.comActionCard}>
                  <Ionicons name="hand-right-outline" size={28} color={Colors.primary} style={{ marginBottom: 10 }} />
                  <Text style={styles.comActionTitle}>&quot;Tomar&quot; un caso</Text>
                  <Text style={styles.comActionDesc}>
                    Cuando ves un caso que dominas, lo marcas como tuyo. El cliente recibe tu perfil y decide si contactarte.
                  </Text>
                </View>
                <View style={styles.comActionCard}>
                  <Ionicons name="megaphone-outline" size={28} color="#8B5CF6" style={{ marginBottom: 10 }} />
                  <Text style={styles.comActionTitle}>Publica tu expertise</Text>
                  <Text style={styles.comActionDesc}>
                    Comparte artículos, explica conceptos legales, responde preguntas. Cada publicación es un anuncio gratuito de tus capacidades.
                  </Text>
                </View>
                <View style={[styles.comActionCard, { backgroundColor: Colors.primary, borderColor: Colors.primary }]}>
                  <Ionicons name="trending-up-outline" size={28} color={Colors.white} style={{ marginBottom: 10 }} />
                  <Text style={[styles.comActionTitle, { color: Colors.white }]}>Crece con el tiempo</Text>
                  <Text style={[styles.comActionDesc, { color: "rgba(255,255,255,0.75)" }]}>
                    Cada interacción suma a tu reputación. En 3 meses de actividad constante, los abogados duplican las consultas recibidas.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── PORTAL CLIENTE ── */}
        <View style={[styles.section, styles.sectionWhite]} onLayout={registerSection("portal")}>
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Portal del cliente"
              title={"Tu cliente siempre\nal tanto de su caso"}
              subtitle="Los clientes acceden a su propio portal: ven el estado de sus procesos, chatean con su abogado y reciben notificaciones en tiempo real."
            />
            <View style={styles.portalGrid}>
              {/* Columna izquierda: beneficios */}
              <View style={styles.portalLeft}>
                {[
                  {
                    icon: "phone-portrait-outline" as const,
                    color: Colors.primary,
                    bg: "#DBEAFE",
                    titulo: "Acceso desde el celular",
                    desc: "Tu cliente descarga la app y ve el estado de su caso en tiempo real — sin llamadas innecesarias.",
                  },
                  {
                    icon: "pulse-outline" as const,
                    color: "#10B981",
                    bg: "#D1FAE5",
                    titulo: "Seguimiento en vivo",
                    desc: "Estado del proceso actualizado: activo, en trámite, finalizado. Tu cliente nunca está en la oscuridad.",
                  },
                  {
                    icon: "chatbubbles-outline" as const,
                    color: "#8B5CF6",
                    bg: "#EDE9FE",
                    titulo: "Chat directo y seguro",
                    desc: "Comunicación dentro de la plataforma — sin exponer tu número personal ni usar WhatsApp.",
                  },
                  {
                    icon: "notifications-outline" as const,
                    color: "#F59E0B",
                    bg: "#FEF3C7",
                    titulo: "Notificaciones automáticas",
                    desc: "El cliente recibe alertas cuando hay cambios en su proceso, nuevos documentos o mensajes.",
                  },
                ].map((item, i) => (
                  <View key={i} style={styles.portalBeneficioCard}>
                    <View style={[styles.portalBeneficioIcon, { backgroundColor: item.bg }]}>
                      <Ionicons name={item.icon} size={22} color={item.color} />
                    </View>
                    <View style={styles.portalBeneficioTextos}>
                      <Text style={styles.portalBeneficioTitulo}>{item.titulo}</Text>
                      <Text style={styles.portalBeneficioDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Columna derecha: mock UI del portal */}
              <View style={styles.portalRight}>
                <View style={styles.portalMockPhone}>
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryLight]}
                    style={styles.portalMockHeader}
                  >
                    <Text style={styles.portalMockHola}>Hola, Juan</Text>
                    <Text style={styles.portalMockSubtitle}>Tus procesos activos</Text>
                  </LinearGradient>
                  {[
                    { nombre: "Proceso laboral #2041", estado: "Activo", color: Colors.success, icon: "pulse" as const },
                    { nombre: "Divorcio contencioso", estado: "En Trámite", color: Colors.warning, icon: "time-outline" as const },
                  ].map((proc, i) => (
                    <View key={i} style={styles.portalMockProcesoCard}>
                      <View style={[styles.portalMockEstadoDot, { backgroundColor: proc.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.portalMockProcesoNombre}>{proc.nombre}</Text>
                        <View style={styles.portalMockEstadoRow}>
                          <Ionicons name={proc.icon} size={12} color={proc.color} />
                          <Text style={[styles.portalMockEstadoText, { color: proc.color }]}>{proc.estado}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                    </View>
                  ))}
                  <View style={styles.portalMockChatBar}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
                    <Text style={styles.portalMockChatText}>Mensaje a tu abogado...</Text>
                    <Ionicons name="send" size={14} color={Colors.primary} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── ROLES ── */}
        <View style={[styles.section, styles.sectionGray]}>
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Para todos"
              title={"Funciona para tu tipo\nde práctica legal"}
            />
            <View style={styles.rolesGrid}>
              <View style={styles.rolCard}>
                <View style={[styles.rolIconWrap, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="person-outline" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.rolTitulo}>Abogado independiente</Text>
                <Text style={styles.rolDesc}>
                  Gestiona tus clientes y procesos sin depender de nadie. Total control sobre tu información y tu privacidad.
                </Text>
                <View style={styles.rolFeatures}>
                  {["Clientes y procesos", "Calendario personal", "Documentos", "Chat con clientes"].map((f) => (
                    <View key={f} style={styles.rolFeatureItem}>
                      <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                      <Text style={styles.rolFeatureText}>{f}</Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  style={({ pressed }) => [styles.rolBtn, pressed && styles.ctaPressed]}
                  onPress={irARegistro}
                >
                  <Text style={styles.rolBtnText}>Empezar como abogado</Text>
                </Pressable>
              </View>

              <View style={[styles.rolCard, styles.rolCardDestacado]}>
                <View style={styles.rolDestacadoBadge}>
                  <Text style={styles.rolDestacadoBadgeText}>Para equipos</Text>
                </View>
                <View style={[styles.rolIconWrap, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                  <Ionicons name="business-outline" size={28} color={Colors.accent} />
                </View>
                <Text style={[styles.rolTitulo, { color: Colors.white }]}>Bufete o firma</Text>
                <Text style={[styles.rolDesc, { color: "rgba(255,255,255,0.75)" }]}>
                  Gestión centralizada del equipo, clientes compartidos y privados, dashboard de rendimiento y control total de la firma.
                </Text>
                <View style={styles.rolFeatures}>
                  {["Todo lo del abogado", "Dashboard del equipo", "Clientes compartidos", "Roles y permisos"].map((f) => (
                    <View key={f} style={styles.rolFeatureItem}>
                      <Ionicons name="checkmark-circle" size={15} color={Colors.accentLight} />
                      <Text style={[styles.rolFeatureText, { color: "rgba(255,255,255,0.85)" }]}>{f}</Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  style={({ pressed }) => [styles.rolBtnLight, pressed && { opacity: 0.85 }]}
                  onPress={irARegistro}
                >
                  <Text style={[styles.rolBtnText, { color: Colors.primaryDark }]}>Registrar mi firma</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* ── CASOS DE USO SEO ── */}
        <View style={[styles.section, styles.sectionWhite]}>
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Casos de uso"
              title={"Software juridico para\ncrecer sin desorden"}
              subtitle="Si alguien busca software para abogados, gestion juridica o portal del cliente, esto es exactamente lo que resuelve ProcesoClaro."
            />
            <View style={styles.useCasesGrid}>
              {CASOS_DE_USO.map((item) => (
                <View key={item.title} style={styles.useCaseCard}>
                  <View style={styles.useCaseIconWrap}>
                    <Ionicons name={item.icon} size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.useCaseTitle}>{item.title}</Text>
                  <Text style={styles.useCaseDescription}>{item.description}</Text>
                  <View style={styles.useCaseBullets}>
                    {item.bullets.map((bullet) => (
                      <View key={bullet} style={styles.useCaseBulletRow}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                        <Text style={styles.useCaseBulletText}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── PLANES ── */}
        <View style={[styles.section, styles.sectionWhite]} onLayout={registerSection("planes")}>
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Planes"
              title={"Precios claros,\nsin sorpresas"}
              subtitle="Empieza gratis y escala cuando lo necesites. Sin contratos, cancela cuando quieras."
            />
            <View style={styles.planesGrid}>
              {PLANES_HIGHLIGHT.map((plan) => (
                <View
                  key={plan.id}
                  style={[styles.planCard, plan.popular && styles.planCardPopular]}
                >
                  {plan.popular && (
                    <View style={styles.planPopularBadge}>
                      <Text style={styles.planPopularBadgeText}>Más popular</Text>
                    </View>
                  )}
                  <Text style={[styles.planNombre, plan.popular && { color: Colors.white }]}>
                    {plan.nombre}
                  </Text>
                  <Text style={[styles.planDesc, plan.popular && { color: "rgba(255,255,255,0.7)" }]}>
                    {plan.desc}
                  </Text>
                  <View style={styles.planPrecioRow}>
                    <Text style={[styles.planPrecio, plan.popular && { color: Colors.accent }]}>
                      ${plan.precio}
                    </Text>
                    {plan.precio !== "0" && (
                      <Text style={[styles.planPrecioPeriodo, plan.popular && { color: "rgba(255,255,255,0.6)" }]}>
                        /mes
                      </Text>
                    )}
                    {plan.precio === "0" && (
                      <Text style={[styles.planPrecioPeriodo, plan.popular && { color: "rgba(255,255,255,0.6)" }]}>
                        COP
                      </Text>
                    )}
                  </View>
                  <View style={styles.planDivider} />
                  {plan.items.map((item) => (
                    <View key={item} style={styles.planItem}>
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={plan.popular ? Colors.accentLight : Colors.success}
                      />
                      <Text style={[styles.planItemText, plan.popular && { color: "rgba(255,255,255,0.85)" }]}>
                        {item}
                      </Text>
                    </View>
                  ))}
                  <Pressable
                    style={({ pressed }) => [
                      styles.planBtn,
                      plan.popular ? styles.planBtnPopular : styles.planBtnBase,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={irARegistro}
                  >
                    <Text style={[styles.planBtnText, !plan.popular && { color: Colors.primary }]}>
                      {plan.precio === "0" ? "Empezar gratis" : "Seleccionar plan"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <Pressable onPress={irAPlanes} style={styles.verTodosPlanes}>
              <Text style={styles.verTodosPlanesText}>Ver todos los planes y comparar →</Text>
            </Pressable>
          </View>
        </View>

        {/* ── FAQ ── */}
        <View style={[styles.section, styles.sectionGray]} onLayout={registerSection("faq")}>
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Preguntas frecuentes"
              title={"Respuestas claras antes\nde empezar"}
              subtitle="Bloque pensado para resolver dudas comerciales y reforzar terminos de busqueda relevantes."
            />
            <View style={styles.faqList}>
              {FAQS.map((item) => (
                <View key={item.question} style={styles.faqCard}>
                  <View style={styles.faqQuestionRow}>
                    <Ionicons name="help-circle-outline" size={20} color={Colors.primary} />
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                  </View>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── EXPLORA MÁS ── */}
        <View style={[styles.section, styles.sectionWhite]}>
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Explora mas"
              title={"Rutas utiles para\nentender el producto"}
              subtitle="Estas paginas ayudan a explorar ProcesoClaro segun la necesidad concreta de cada despacho o abogado."
            />
            <View style={styles.seoLinksGrid}>
              {SEO_LINKS.map((item) => (
                <Pressable
                  key={item.href}
                  onPress={() => router.push(item.href as any)}
                  style={({ pressed }) => [styles.seoLinkCard, pressed && styles.ctaPressed]}
                >
                  <Text style={styles.seoLinkTitle}>{item.title}</Text>
                  <Text style={styles.seoLinkDescription}>{item.description}</Text>
                  <View style={styles.seoLinkAction}>
                    <Text style={styles.seoLinkActionText}>Abrir pagina</Text>
                    <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ── CTA FINAL ── */}
        <LinearGradient
          colors={[Colors.accent, Colors.accentDark]}
          style={[styles.section, styles.ctaFinal]}
        >
          <View style={[styles.sectionInner, { alignItems: "center" }]}>
            <View style={styles.ctaFinalIconCircle}>
              <Ionicons name="rocket-outline" size={36} color={Colors.primaryDark} />
            </View>
            <Text style={styles.ctaFinalH2}>
              Tu práctica legal merece mejores herramientas
            </Text>
            <Text style={styles.ctaFinalSubtitle}>
              Únete a los abogados que ya gestionan sus firmas de manera profesional. Empieza gratis hoy.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.ctaFinalBtn, pressed && { opacity: 0.9 }]}
              onPress={irARegistro}
            >
              <Text style={styles.ctaFinalBtnText}>Crear cuenta gratis</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.accent} />
            </Pressable>
            <Text style={styles.ctaFinalNota}>Sin tarjeta · Activa en 2 minutos</Text>
          </View>
        </LinearGradient>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <View style={styles.footerBrand}>
              <View style={styles.footerLogoCircle}>
                <Ionicons name="scale-outline" size={16} color={Colors.accent} />
              </View>
              <Text style={styles.footerBrandName}>ProcesoClaro</Text>
            </View>
            <Text style={styles.footerDesc}>
              Plataforma de gestión legal para abogados y bufetes en Colombia.
            </Text>
            <View style={styles.footerLinks}>
              <Pressable onPress={irASoftwareAbogados} hitSlop={8}>
                <Text style={styles.footerLink}>Software abogados</Text>
              </Pressable>
              <Text style={styles.footerLinkDivider}>·</Text>
              <Pressable onPress={irASoftwareBufetes} hitSlop={8}>
                <Text style={styles.footerLink}>Software bufetes</Text>
              </Pressable>
              <Text style={styles.footerLinkDivider}>·</Text>
              <Pressable onPress={irAPortalCliente} hitSlop={8}>
                <Text style={styles.footerLink}>Portal cliente</Text>
              </Pressable>
              <Text style={styles.footerLinkDivider}>·</Text>
              <Pressable onPress={irAGestionProcesos} hitSlop={8}>
                <Text style={styles.footerLink}>Procesos legales</Text>
              </Pressable>
              <Text style={styles.footerLinkDivider}>·</Text>
              <Pressable onPress={irASoftwareColombia} hitSlop={8}>
                <Text style={styles.footerLink}>Software juridico CO</Text>
              </Pressable>
              <Text style={styles.footerLinkDivider}>·</Text>
              <Pressable onPress={irAPreciosSoftware} hitSlop={8}>
                <Text style={styles.footerLink}>Precios</Text>
              </Pressable>
              <Text style={styles.footerLinkDivider}>·</Text>
              <Pressable onPress={irAPlanes} hitSlop={8}>
                <Text style={styles.footerLink}>Planes</Text>
              </Pressable>
              <Text style={styles.footerLinkDivider}>·</Text>
              <Pressable onPress={irAFaq} hitSlop={8}>
                <Text style={styles.footerLink}>FAQ</Text>
              </Pressable>
              <Text style={styles.footerLinkDivider}>·</Text>
              <Pressable onPress={irASobreNosotros} hitSlop={8}>
                <Text style={styles.footerLink}>Sobre nosotros</Text>
              </Pressable>
              <Text style={styles.footerLinkDivider}>·</Text>
              <Pressable onPress={irAContacto} hitSlop={8}>
                <Text style={styles.footerLink}>Contacto</Text>
              </Pressable>
              <Text style={styles.footerLinkDivider}>·</Text>
              <Pressable onPress={irARegistro} hitSlop={8}>
                <Text style={styles.footerLink}>Registrarse</Text>
              </Pressable>
              <Text style={styles.footerLinkDivider}>·</Text>
              <Pressable onPress={irALogin} hitSlop={8}>
                <Text style={styles.footerLink}>Iniciar sesión</Text>
              </Pressable>
            </View>
            <Text style={styles.footerCopy}>
              © {new Date().getFullYear()} ProcesoClaro · Hecho en Colombia
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// w(desktop, mobile): retorna mobile si el viewport es < 768px,
// sin importar si es web o nativo. Así funciona en celular real,
// navegador móvil, y simulador.
const w = <T,>(desktop: T, mobile: T): T => (IS_MOBILE_LAYOUT ? mobile : desktop);

// ── Estilos ────────────────────────────────────────────────────────────────────

const SECTION_PX = w(40, 16);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F2640" },
  scroll: { flex: 1, backgroundColor: "#0F2640" },

  // ── Navbar ────────────────────────────────────────────────────────────────
  navbar: {
    position: Platform.OS === "web" ? ("sticky" as const) : w("absolute" as const, "relative" as const),
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: SECTION_PX,
    paddingBottom: w(14, 10),
    paddingTop: 2,
    backgroundColor: "transparent",
    backdropFilter: Platform.OS === "web" ? ("blur(12px)" as any) : undefined,
  },
  navShell: {
    maxWidth: CONTENT_MAX_WIDTH,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "rgba(15, 38, 64, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(117, 152, 191, 0.22)",
    borderRadius: 16,
    paddingHorizontal: w(20, 12),
    paddingVertical: w(14, 10),
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  navInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  navBrandBlock: {
    flex: 1,
    minWidth: 220,
    gap: 4,
  },
  navQuickRow: {
    gap: 10,
    paddingTop: w(12, 10),
    paddingBottom: 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(117, 152, 191, 0.16)",
  },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  navBrandTextWrap: { gap: 2 },
  navLogoCircle: {
    width: w(36, 32),
    height: w(36, 32),
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  navBrandName: {
    fontSize: w(17, 16),
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    letterSpacing: 0.2,
  },
  navBrandSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.62)",
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },
  navPrimaryBtn: {
    minHeight: 44,
    paddingHorizontal: w(16, 14),
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  navPrimaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primaryDark,
  },
  navSecondaryBtn: {
    minHeight: 44,
    paddingHorizontal: w(14, 12),
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  navSecondaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.white,
  },
  navButtonPressed: { opacity: 0.86 },
  navQuickChip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 34,
    paddingHorizontal: w(4, 2),
    paddingVertical: w(7, 6),
    borderRadius: 0,
    backgroundColor: "transparent",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  navQuickChipPressed: {
    opacity: 0.8,
  },
  navQuickChipActive: {
    borderBottomColor: Colors.accent,
  },
  navQuickChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.74)",
  },
  navQuickChipTextActive: {
    color: Colors.white,
    fontFamily: "Inter_600SemiBold",
  },

  // ── Sección base ──────────────────────────────────────────────────────────
  section: { paddingVertical: w(64, 40), paddingHorizontal: SECTION_PX },
  sectionInner: {
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
  },
  sectionWhite: { backgroundColor: Colors.white },
  sectionGray: { backgroundColor: Colors.background },
  sectionDark: {},

  // ── Section Title ─────────────────────────────────────────────────────────
  sectionTitleWrap: { alignItems: "center", marginBottom: w(40, 28), gap: 10 },
  labelPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
  },
  labelPillLight: { backgroundColor: "rgba(255,255,255,0.12)" },
  labelText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  labelTextLight: { color: Colors.accent },
  sectionH2: {
    fontSize: w(36, 24),
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    lineHeight: w(44, 32),
  },
  sectionH2Light: { color: Colors.white },
  sectionSubtitle: {
    fontSize: w(16, 14),
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: w(24, 22),
    maxWidth: 600,
  },
  sectionSubtitleLight: { color: "rgba(255,255,255,0.65)" },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    marginTop: w(-108, -72),
    paddingTop: w(228, 104),
    paddingBottom: 0,
    paddingHorizontal: SECTION_PX,
  },
  heroInner: {
    alignItems: "center",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
    paddingBottom: w(48, 32),
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(212,168,83,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212,168,83,0.3)",
    marginBottom: w(24, 16),
  },
  heroBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  heroH1: {
    fontSize: w(52, 28),
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    textAlign: "center",
    lineHeight: w(62, 36),
    marginBottom: w(20, 14),
  },
  heroH1Accent: { color: Colors.accent },
  heroSubtitle: {
    fontSize: w(18, 15),
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    lineHeight: w(28, 23),
    maxWidth: 580,
    marginBottom: w(36, 24),
    paddingHorizontal: w(0, 4),
  },
  heroCtas: {
    flexDirection: "column",
    gap: 10,
    width: "100%",
    maxWidth: w(420, 9999),
    marginBottom: 16,
  },
  ctaPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  ctaPressed: { opacity: 0.88 },
  ctaPrimaryText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primaryDark,
  },
  ctaSecondary: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  ctaSecondaryPressed: { backgroundColor: "rgba(255,255,255,0.07)" },
  ctaSecondaryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  heroNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    marginTop: 4,
    textAlign: "center",
  },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    width: "100%",
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: w(20, 16),
    paddingHorizontal: 4,
    gap: 4,
  },
  heroStatBorder: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.1)",
  },
  heroStatValor: {
    fontSize: w(22, 18),
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  heroStatLabel: {
    fontSize: w(12, 10),
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },

  // ── Problemas ─────────────────────────────────────────────────────────────
  problemasGrid: {
    flexDirection: w("row" as const, "column" as const),
    flexWrap: w("wrap" as const, "nowrap" as const),
    gap: 12,
  },
  problemaCard: {
    width: w("31%" as any, "100%"),
    flexGrow: IS_MOBILE_LAYOUT ? 0 : 1,
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: w(24, 16),
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  problemaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  problemaTitulo: {
    fontSize: w(17, 15),
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  problemaDesc: {
    fontSize: w(14, 13),
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // ── Solución ──────────────────────────────────────────────────────────────
  solucionGrid: {
    flexDirection: w("row" as const, "column" as const),
    flexWrap: w("wrap" as const, "nowrap" as const),
    gap: 10,
  },
  solucionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    width: w("46%", undefined),
    flexGrow: IS_MOBILE_LAYOUT ? 0 : 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: w(16, 14),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  solucionTexto: {
    flex: 1,
    fontSize: w(15, 14),
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 21,
  },

  // ── Features ──────────────────────────────────────────────────────────────
  featuresGrid: {
    flexDirection: w("row" as const, "column" as const),
    flexWrap: w("wrap" as const, "nowrap" as const),
    gap: 12,
  },
  featureCard: {
    width: w("30%", "100%"),
    flexGrow: IS_MOBILE_LAYOUT ? 0 : 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: w(22, 16),
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureCardDestacado: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  featureDestacadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#FFF7E6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  featureDestacadoBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
  },
  featureIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitulo: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  featureTituloDestacado: { color: Colors.primary },
  featureDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 21,
    flex: 1,
  },
  featureRoles: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 },
  featureRolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 20,
  },
  featureRoleText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },

  // ── Privacidad spotlight ──────────────────────────────────────────────────
  privacidadCard: {
    flexDirection: w("row" as const, "column" as const),
    gap: w(40, 20),
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: w(40, 18),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacidadLeft: {
    flex: w(1, undefined),
    gap: 12,
  },
  privacidadIconBig: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  privacidadH3: {
    fontSize: w(28, 20),
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    lineHeight: w(36, 28),
  },
  privacidadDesc: {
    fontSize: w(15, 13),
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: w(23, 20),
  },
  privacidadBeneficios: { gap: 8, marginTop: 4 },
  privacidadBeneficioItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  privacidadBeneficioTexto: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  privacidadRight: {
    flex: w(1, undefined),
    gap: 10,
    justifyContent: "center",
  },
  privacidadAbogadoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacidadAbogadoInfo: { flex: 1 },
  privacidadAbogadoNombre: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  privacidadAbogadoSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  privacidadPrivadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  privacidadPrivadoText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },

  // ── Roles ─────────────────────────────────────────────────────────────────
  rolesGrid: {
    flexDirection: w("row" as const, "column" as const),
    gap: 20,
  },
  rolCard: {
    flex: w(1, undefined),
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: w(28, 20),
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  rolCardDestacado: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rolDestacadoBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rolDestacadoBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primaryDark,
  },
  rolIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rolTitulo: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  rolDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  rolFeatures: { gap: 8 },
  rolFeatureItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  rolFeatureText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  rolBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  rolBtnLight: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  rolBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },

  // ── Casos de uso SEO ──────────────────────────────────────────────────────
  useCasesGrid: {
    flexDirection: w("row" as const, "column" as const),
    gap: 16,
  },
  useCaseCard: {
    flex: w(1, undefined),
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: w(24, 18),
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  useCaseIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.infoLight,
    alignItems: "center",
    justifyContent: "center",
  },
  useCaseTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    lineHeight: 24,
  },
  useCaseDescription: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  useCaseBullets: {
    gap: 10,
    marginTop: 4,
  },
  useCaseBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  useCaseBulletText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    lineHeight: 19,
  },

  // ── Planes ────────────────────────────────────────────────────────────────
  planesGrid: {
    flexDirection: w("row" as const, "column" as const),
    gap: 16,
    alignItems: w("stretch" as const, undefined),
  },
  planCard: {
    flex: w(1, undefined),
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: w(24, 18),
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  planCardPopular: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  planPopularBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 4,
  },
  planPopularBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primaryDark,
  },
  planNombre: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  planDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  planPrecioRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 4 },
  planPrecio: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  planPrecioPeriodo: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    paddingBottom: 4,
  },
  planDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 8,
  },
  planItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  planItemText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  planBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  planBtnBase: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planBtnPopular: { backgroundColor: Colors.accent },
  planBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  verTodosPlanes: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 8,
  },
  verTodosPlanesText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },

  // ── FAQ ───────────────────────────────────────────────────────────────────
  faqList: {
    gap: 14,
  },
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: w(22, 18),
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  faqQuestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primaryDark,
    lineHeight: 24,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
    paddingLeft: 30,
  },

  // ── Explora mas ───────────────────────────────────────────────────────────
  seoLinksGrid: {
    flexDirection: w("row" as const, "column" as const),
    flexWrap: w("wrap" as const, "nowrap" as const),
    gap: 14,
  },
  seoLinkCard: {
    width: w("31.5%" as any, "100%"),
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: w(20, 18),
    gap: 10,
  },
  seoLinkTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primaryDark,
    lineHeight: 24,
  },
  seoLinkDescription: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  seoLinkAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  seoLinkActionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },

  // ── CTA Final ─────────────────────────────────────────────────────────────
  ctaFinal: { alignItems: "center" },
  ctaFinalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(15,38,64,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  ctaFinalH2: {
    fontSize: w(34, 24),
    fontFamily: "Inter_700Bold",
    color: Colors.primaryDark,
    textAlign: "center",
    lineHeight: w(44, 32),
    maxWidth: 560,
  },
  ctaFinalSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(15,38,64,0.7)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 480,
    marginTop: 4,
  },
  ctaFinalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: w(36, 32),
    marginTop: 16,
    width: w("auto" as any, "100%"),
  },
  ctaFinalBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  ctaFinalNota: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(15,38,64,0.5)",
    marginTop: 12,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: Colors.text,
    paddingVertical: 32,
    paddingHorizontal: SECTION_PX,
  },
  footerInner: {
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  footerBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerLogoCircle: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "rgba(212,168,83,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  footerBrandName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  footerDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    maxWidth: 320,
  },
  footerLinks: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerLink: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
  },
  footerLinkDivider: {
    fontSize: 13,
    color: "rgba(255,255,255,0.25)",
  },
  footerCopy: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    marginTop: 4,
  },

  // ── Comunidad ─────────────────────────────────────────────────────────────
  comunidadGrid: {
    flexDirection: w("row" as const, "column" as const),
    gap: 16,
    marginBottom: 32,
  },
  comunidadCard: {
    flex: w(1, undefined),
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: w(24, 18),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 12,
  },
  comunidadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  comunidadCardTitulo: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  comunidadCardDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    lineHeight: 21,
  },
  comunidadItems: { gap: 10 },
  comunidadItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  comunidadItemTexto: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    lineHeight: 19,
  },
  comunidadFeedMock: {
    gap: 10,
  },
  comunidadFeedLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  comunidadPostCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  comunidadPostTop: { flexDirection: "row", gap: 8 },
  comunidadPostTipoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(212,168,83,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  comunidadPostTipoText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.accentLight,
  },
  comunidadPostTitulo: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 21,
  },
  comunidadPostBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  comunidadPostAutor: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  comunidadPostStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  comunidadPostStatText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },

  // ── Portal cliente ────────────────────────────────────────────────────────
  portalGrid: {
    flexDirection: w("row" as const, "column" as const),
    gap: w(40, 24),
    alignItems: w("flex-start" as const, "stretch" as const),
  },
  portalLeft: {
    flex: w(1, undefined),
    width: w(undefined, "100%" as any),
    gap: 16,
  },
  portalBeneficioCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  portalBeneficioIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  portalBeneficioTextos: { flex: 1, gap: 4 },
  portalBeneficioTitulo: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  portalBeneficioDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  portalRight: {
    flex: w(1, undefined),
    alignItems: "center",
    width: "100%",
  },
  portalMockPhone: {
    width: w(320, "100%" as any),
    maxWidth: w(9999, 400),
    backgroundColor: Colors.white,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  portalMockHeader: {
    padding: 20,
    paddingBottom: 24,
  },
  portalMockHola: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  portalMockSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  portalMockProcesoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  portalMockEstadoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  portalMockProcesoNombre: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  portalMockEstadoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  portalMockEstadoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  portalMockChatBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  portalMockChatText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },

  // ── Comunidad — Stats hero ────────────────────────────────────────────────
  comStatsRow: {
    flexDirection: w("row" as const, "column" as const),
    gap: 16,
    marginTop: 8,
  },
  comStatCard: {
    flex: w(1, undefined),
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: w(24, 18),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    gap: 8,
  },
  comStatIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(212,168,83,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  comStatValor: {
    fontSize: w(22, 18),
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    textAlign: "center",
  },
  comStatLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 18,
  },

  // ── Comunidad — Match diagram ─────────────────────────────────────────────
  matchDiagram: {
    flexDirection: w("row" as const, "column" as const),
    alignItems: w("flex-start" as const, "stretch" as const),
    gap: w(20, 16),
    marginBottom: 40,
  },
  matchSide: {
    flex: w(1, undefined),
  },
  matchArrowCol: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: w(24, 0),
    minWidth: w(120, undefined),
  },
  matchAlgoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  matchAlgoText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  matchArrowLine: {
    width: 2,
    height: 16,
    backgroundColor: "#BFDBFE",
  },
  matchFactorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  matchFactorText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  matchNodeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  matchNodeIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  matchNodeTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  matchPostMini: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: 10,
    gap: 6,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 10,
  },
  matchPostMiniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  matchPostMiniType: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  matchPostMiniText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 17,
    fontStyle: "italic",
  },
  matchAbogadoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  matchRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  matchRankText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  matchAbogadoNombre: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  matchAbogadoArea: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  matchScore: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  matchStepsRow: {
    flexDirection: w("row" as const, "column" as const),
    gap: 16,
  },
  matchStepCard: {
    flex: w(1, undefined),
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: w(24, 18),
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    alignItems: "flex-start",
  },
  matchStepNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  matchStepNum: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  matchStepIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  matchStepTitulo: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  matchStepDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // ── Comunidad — Reputación ────────────────────────────────────────────────
  reputGrid: {
    flexDirection: w("row" as const, "column" as const),
    gap: 16,
  },
  reputCard: {
    flex: w(1, undefined),
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: w(24, 18),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 12,
  },
  reputCardDestacado: {
    backgroundColor: "rgba(15,38,64,0.6)",
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  reputCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reputCardTitulo: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  reputCardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 20,
  },
  reputRankingMock: {
    gap: 6,
    marginTop: 4,
  },
  reputRankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reputRankRowTop: {
    backgroundColor: "rgba(212,168,83,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,168,83,0.3)",
  },
  reputRankPos: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.5)",
    width: 24,
    textAlign: "center",
  },
  reputRankNombre: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  reputRankPts: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
  },
  reputPuntosGrid: {
    flexDirection: w("row" as const, "column" as const),
    flexWrap: w("wrap" as const, "nowrap" as const),
    gap: 8,
  },
  reputPuntoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: w("46%" as any, "100%"),
    flexGrow: IS_MOBILE_LAYOUT ? 0 : 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    padding: 10,
  },
  reputPuntoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reputPuntoAccion: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  reputPuntoPts: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  reputBeneficiosList: {
    gap: 10,
    marginTop: 4,
  },
  reputBeneficioItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reputBeneficioIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(212,168,83,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reputBeneficioTexto: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 19,
  },

  // ── Comunidad — Feed + CTA ────────────────────────────────────────────────
  comFeedLayout: {
    flexDirection: w("row" as const, "column" as const),
    gap: 20,
    alignItems: w("flex-start" as const, "stretch" as const),
  },
  comFeedCol: {
    flex: w(3, undefined),
    gap: 12,
  },
  comFeedCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  comFeedCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  comFeedTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comFeedTypePillUrgente: {
    backgroundColor: "#FEE2E2",
  },
  comFeedTypeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  comFeedTomadoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comFeedTomadoText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#10B981",
  },
  comFeedCardTitulo: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    lineHeight: 21,
  },
  comFeedCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  comFeedCardAutor: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  comFeedCardStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  comFeedStatText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  comActionsCol: {
    flex: w(2, undefined),
    gap: 12,
  },
  comActionCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: w(20, 16),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  comActionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 6,
  },
  comActionDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
