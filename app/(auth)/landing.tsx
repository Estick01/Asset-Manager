import React, { useRef } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_WEB = Platform.OS === "web";
const CONTENT_MAX_WIDTH = 1100;

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Navbar({ onLogin }: { onLogin: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.navbar, { paddingTop: insets.top + 12 }]}>
      <View style={styles.navInner}>
        <View style={styles.navBrand}>
          <View style={styles.navLogoCircle}>
            <Ionicons name="scale-outline" size={20} color={Colors.accent} />
          </View>
          <Text style={styles.navBrandName}>LexTrack</Text>
        </View>
        <Pressable style={styles.navLoginBtn} onPress={onLogin} hitSlop={8}>
          <Text style={styles.navLoginText}>Iniciar sesión</Text>
        </Pressable>
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
    icon: "lock-open-outline" as const,
    titulo: "Sin privacidad real",
    desc: "Cualquier colega en tu firma puede ver los clientes de otro. La confidencialidad queda expuesta.",
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

// ── Pantalla principal ─────────────────────────────────────────────────────────

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const irARegistro = () => router.push("/(auth)/register-type");
  const irALogin = () => router.push("/(auth)/login");
  const irAPlanes = () => router.push("/planes");

  return (
    <View style={styles.root}>
      <Navbar onLogin={irALogin} />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
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
        <View style={[styles.section, styles.sectionWhite]}>
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
              title={"LexTrack centraliza\ntodo tu trabajo legal"}
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
        <View style={[styles.section, styles.sectionGray]}>
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

        {/* ── COMUNIDAD ── */}
        <LinearGradient
          colors={["#0F2640", "#1B3A5C"]}
          style={[styles.section, styles.sectionDark]}
        >
          <View style={styles.sectionInner}>
            <SectionTitle
              label="Comunidad LexTrack"
              title={"Consigue clientes.\nExpande tu red."}
              subtitle="El directorio legal donde clientes encuentran abogados — y abogados construyen su reputación profesional."
              light
            />
            <View style={styles.comunidadGrid}>
              {/* Card izquierda: para abogados */}
              <View style={styles.comunidadCard}>
                <View style={[styles.comunidadIconCircle, { backgroundColor: "rgba(212,168,83,0.15)" }]}>
                  <Ionicons name="megaphone-outline" size={28} color={Colors.accent} />
                </View>
                <Text style={styles.comunidadCardTitulo}>Para abogados</Text>
                <Text style={styles.comunidadCardDesc}>
                  Publica sobre tus especialidades, comparte casos resueltos (de forma anónima) y deja que los clientes te encuentren antes de que te busquen.
                </Text>
                <View style={styles.comunidadItems}>
                  {[
                    { icon: "create-outline" as const, texto: "Publica artículos y casos de tu especialidad" },
                    { icon: "star-outline" as const,   texto: "Construye reputación con likes y respuestas" },
                    { icon: "eye-outline" as const,    texto: "Publicaciones anónimas cuando lo necesites" },
                    { icon: "people-outline" as const, texto: "Red de contactos con otros abogados" },
                  ].map((item, i) => (
                    <View key={i} style={styles.comunidadItem}>
                      <Ionicons name={item.icon} size={16} color={Colors.accentLight} />
                      <Text style={styles.comunidadItemTexto}>{item.texto}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Card derecha: para clientes */}
              <View style={styles.comunidadCard}>
                <View style={[styles.comunidadIconCircle, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                  <Ionicons name="search-outline" size={28} color="#10B981" />
                </View>
                <Text style={styles.comunidadCardTitulo}>Para clientes</Text>
                <Text style={styles.comunidadCardDesc}>
                  Encuentra el abogado indicado según tu caso. Lee su experiencia, sus publicaciones y contacta directamente desde la plataforma.
                </Text>
                <View style={styles.comunidadItems}>
                  {[
                    { icon: "filter-outline" as const,        texto: "Filtra por ciudad, especialidad y tipo de caso" },
                    { icon: "chatbubble-outline" as const,     texto: "Contacta directamente al abogado" },
                    { icon: "document-text-outline" as const,  texto: "Lee su experiencia antes de contratar" },
                    { icon: "shield-outline" as const,         texto: "Perfiles verificados de abogados activos" },
                  ].map((item, i) => (
                    <View key={i} style={styles.comunidadItem}>
                      <Ionicons name={item.icon} size={16} color="#34D399" />
                      <Text style={styles.comunidadItemTexto}>{item.texto}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Mock feed */}
            <View style={styles.comunidadFeedMock}>
              <Text style={styles.comunidadFeedLabel}>Vista previa del feed</Text>
              {[
                { tipo: "Derecho laboral", urgente: false, titulo: "Despido sin justa causa — caso resuelto con indemnización completa", autor: "Dr. Ramírez · Bogotá", likes: 34, replies: 8 },
                { tipo: "Derecho de familia", urgente: true, titulo: "Necesito asesoría urgente: custodia compartida con menor en otra ciudad", autor: "Anónimo · Medellín", likes: 12, replies: 5 },
                { tipo: "Derecho penal", urgente: false, titulo: "Cómo funciona la preclusión y cuándo solicitarla", autor: "Dra. Morales · Cali", likes: 67, replies: 21 },
              ].map((post, i) => (
                <View key={i} style={styles.comunidadPostCard}>
                  <View style={styles.comunidadPostTop}>
                    <View style={[styles.comunidadPostTipoPill, post.urgente && { backgroundColor: "#FEE2E2" }]}>
                      {post.urgente && <Ionicons name="flash" size={11} color="#EF4444" />}
                      <Text style={[styles.comunidadPostTipoText, post.urgente && { color: "#EF4444" }]}>
                        {post.tipo}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.comunidadPostTitulo}>{post.titulo}</Text>
                  <View style={styles.comunidadPostBottom}>
                    <Text style={styles.comunidadPostAutor}>{post.autor}</Text>
                    <View style={styles.comunidadPostStats}>
                      <Ionicons name="heart-outline" size={13} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.comunidadPostStatText}>{post.likes}</Text>
                      <Ionicons name="chatbubble-outline" size={13} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.comunidadPostStatText}>{post.replies}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* ── PORTAL CLIENTE ── */}
        <View style={[styles.section, styles.sectionWhite]}>
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

        {/* ── PLANES ── */}
        <View style={[styles.section, styles.sectionWhite]}>
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

        {/* ── CTA FINAL ── */}
        <LinearGradient
          colors={[Colors.accent, Colors.accentDark]}
          style={[styles.section, styles.ctaFinal]}
        >
          <View style={styles.sectionInner}>
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
              <Text style={styles.footerBrandName}>LexTrack</Text>
            </View>
            <Text style={styles.footerDesc}>
              Plataforma de gestión legal para abogados y bufetes en Colombia.
            </Text>
            <View style={styles.footerLinks}>
              <Pressable onPress={irAPlanes} hitSlop={8}>
                <Text style={styles.footerLink}>Planes</Text>
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
              © {new Date().getFullYear()} LexTrack · Hecho en Colombia
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const SECTION_PX = IS_WEB ? 40 : 20;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },

  // ── Navbar ────────────────────────────────────────────────────────────────
  navbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: SECTION_PX,
    paddingBottom: 14,
    backgroundColor: "rgba(15,38,64,0.95)",
  },
  navInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
  },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  navLogoCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(212,168,83,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  navBrandName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    letterSpacing: 0.5,
  },
  navLoginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  navLoginText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.white,
  },

  // ── Sección base ──────────────────────────────────────────────────────────
  section: { paddingVertical: 64, paddingHorizontal: SECTION_PX },
  sectionInner: {
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
  },
  sectionWhite: { backgroundColor: Colors.white },
  sectionGray: { backgroundColor: Colors.background },
  sectionDark: {},

  // ── Section Title ─────────────────────────────────────────────────────────
  sectionTitleWrap: { alignItems: "center", marginBottom: 40, gap: 12 },
  labelPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
  },
  labelPillLight: { backgroundColor: "rgba(255,255,255,0.12)" },
  labelText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  labelTextLight: { color: Colors.accent },
  sectionH2: {
    fontSize: IS_WEB ? 36 : 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    lineHeight: IS_WEB ? 44 : 36,
  },
  sectionH2Light: { color: Colors.white },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 600,
  },
  sectionSubtitleLight: { color: "rgba(255,255,255,0.65)" },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    paddingTop: 120,
    paddingBottom: 0,
    paddingHorizontal: SECTION_PX,
  },
  heroInner: {
    alignItems: "center",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
    paddingBottom: 48,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(212,168,83,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212,168,83,0.3)",
    marginBottom: 24,
  },
  heroBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  heroH1: {
    fontSize: IS_WEB ? 52 : 36,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    textAlign: "center",
    lineHeight: IS_WEB ? 62 : 44,
    marginBottom: 20,
  },
  heroH1Accent: { color: Colors.accent },
  heroSubtitle: {
    fontSize: IS_WEB ? 18 : 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    lineHeight: IS_WEB ? 28 : 24,
    maxWidth: 580,
    marginBottom: 36,
  },
  heroCtas: {
    flexDirection: IS_WEB ? "row" : "column",
    gap: 12,
    width: "100%",
    maxWidth: 420,
    marginBottom: 16,
  },
  ctaPrimary: {
    flex: IS_WEB ? 1 : undefined,
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
    flex: IS_WEB ? 1 : undefined,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  ctaSecondaryPressed: { backgroundColor: "rgba(255,255,255,0.07)" },
  ctaSecondaryText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  heroNote: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    marginTop: 4,
  },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 8,
    gap: 4,
  },
  heroStatBorder: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.1)",
  },
  heroStatValor: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  heroStatLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },

  // ── Problemas ─────────────────────────────────────────────────────────────
  problemasGrid: {
    flexDirection: IS_WEB ? "row" : "column",
    gap: 16,
  },
  problemaCard: {
    flex: IS_WEB ? 1 : undefined,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  problemaIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  problemaTitulo: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  problemaDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 21,
  },

  // ── Solución ──────────────────────────────────────────────────────────────
  solucionGrid: {
    flexDirection: IS_WEB ? "row" : "column",
    flexWrap: "wrap",
    gap: 14,
  },
  solucionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    width: IS_WEB ? "46%" : "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  solucionTexto: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 22,
  },

  // ── Features ──────────────────────────────────────────────────────────────
  featuresGrid: {
    flexDirection: IS_WEB ? "row" : "column",
    flexWrap: "wrap",
    gap: 16,
  },
  featureCard: {
    width: IS_WEB ? "30%" : "100%",
    flexGrow: IS_WEB ? 1 : undefined,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 22,
    gap: 10,
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
    flexDirection: IS_WEB ? "row" : "column",
    gap: 40,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: IS_WEB ? 40 : 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacidadLeft: {
    flex: IS_WEB ? 1 : undefined,
    gap: 14,
  },
  privacidadIconBig: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  privacidadH3: {
    fontSize: IS_WEB ? 28 : 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    lineHeight: IS_WEB ? 36 : 30,
  },
  privacidadDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 23,
  },
  privacidadBeneficios: { gap: 8, marginTop: 4 },
  privacidadBeneficioItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  privacidadBeneficioTexto: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  privacidadRight: {
    flex: IS_WEB ? 1 : undefined,
    gap: 12,
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
    flexDirection: IS_WEB ? "row" : "column",
    gap: 20,
  },
  rolCard: {
    flex: IS_WEB ? 1 : undefined,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 28,
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

  // ── Planes ────────────────────────────────────────────────────────────────
  planesGrid: {
    flexDirection: IS_WEB ? "row" : "column",
    gap: 16,
    alignItems: IS_WEB ? "stretch" : undefined,
  },
  planCard: {
    flex: IS_WEB ? 1 : undefined,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
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
    fontSize: IS_WEB ? 34 : 26,
    fontFamily: "Inter_700Bold",
    color: Colors.primaryDark,
    textAlign: "center",
    lineHeight: IS_WEB ? 44 : 34,
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
    gap: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 36,
    marginTop: 16,
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
    flexDirection: IS_WEB ? "row" : "column",
    gap: 16,
    marginBottom: 32,
  },
  comunidadCard: {
    flex: IS_WEB ? 1 : undefined,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 24,
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
    flexDirection: IS_WEB ? "row" : "column",
    gap: 40,
    alignItems: "flex-start",
  },
  portalLeft: {
    flex: IS_WEB ? 1 : undefined,
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
    flex: IS_WEB ? 1 : undefined,
    alignItems: "center",
  },
  portalMockPhone: {
    width: IS_WEB ? 320 : "100%",
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
});
