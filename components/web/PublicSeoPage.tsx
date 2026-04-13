import { createElement, useEffect } from "react";
import {
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
import Colors from "@/constants/colors";

type PublicSeoPageProps = {
  title: string;
  description: string;
  canonicalPath: string;
  breadcrumbLabel?: string;
  eyebrow: string;
  heroTitle: string;
  heroBody: string;
  bullets: string[];
  sections: {
    title: string;
    body: string;
  }[];
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  faq?: {
    question: string;
    answer: string;
  }[];
  extraSchemas?: Record<string, unknown>[];
};

export function PublicSeoPage({
  title,
  description,
  canonicalPath,
  breadcrumbLabel,
  eyebrow,
  heroTitle,
  heroBody,
  bullets,
  sections,
  primaryCtaLabel = "Crear cuenta",
  primaryCtaHref = "/(auth)/register-type",
  secondaryCtaLabel = "Ver planes",
  secondaryCtaHref = "/planes",
  faq = [],
  extraSchemas = [],
}: PublicSeoPageProps) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const canonicalUrl = `https://procesoclaro.co${canonicalPath}`;
    const currentLabel = breadcrumbLabel ?? title;
    const baseSchemas: Record<string, unknown>[] = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "ProcesoClaro",
        url: "https://procesoclaro.co",
        sameAs: ["https://procesoclaro.co"],
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ProcesoClaro",
        url: "https://procesoclaro.co",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://procesoclaro.co/{search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description,
        url: canonicalUrl,
        isPartOf: {
          "@type": "WebSite",
          name: "ProcesoClaro",
          url: "https://procesoclaro.co",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: "https://procesoclaro.co/landing",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: currentLabel,
            item: canonicalUrl,
          },
        ],
      },
      ...(faq.length > 0
        ? [
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.answer,
                },
              })),
            },
          ]
        : []),
      ...extraSchemas,
    ];

    document.title = title;

    const ensureTag = (selector: string, attributes: Record<string, string>) => {
      let element = document.head.querySelector(selector) as HTMLElement | null;
      if (!element) {
        element = document.createElement(attributes.rel ? "link" : "meta");
        document.head.appendChild(element);
      }
      Object.entries(attributes).forEach(([key, value]) => {
        element?.setAttribute(key, value);
      });
    };

    ensureTag('meta[name="description"]', {
      name: "description",
      content: description,
    });
    ensureTag('meta[property="og:title"]', {
      property: "og:title",
      content: title,
    });
    ensureTag('meta[property="og:description"]', {
      property: "og:description",
      content: description,
    });
    ensureTag('link[rel="canonical"]', {
      rel: "canonical",
      href: canonicalUrl,
    });

    const schemaId = `jsonld-${canonicalPath.replace(/[^\w-]/g, "-") || "home"}`;
    let schemaTag = document.head.querySelector(`#${schemaId}`) as HTMLScriptElement | null;
    if (!schemaTag) {
      schemaTag = document.createElement("script");
      schemaTag.id = schemaId;
      schemaTag.type = "application/ld+json";
      document.head.appendChild(schemaTag);
    }
    schemaTag.text = JSON.stringify(baseSchemas);
  }, [breadcrumbLabel, canonicalPath, description, extraSchemas, faq, title]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <LinearGradient colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]} style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.topNav}>
              <Pressable
                style={({ pressed }) => [styles.backButton, pressed && styles.topNavPressed]}
                onPress={() => router.push("/landing")}
                accessibilityRole="button"
                accessibilityLabel="Volver a la landing principal"
              >
                <Ionicons name="arrow-back" size={16} color={Colors.white} />
                <Text style={styles.backButtonText}>Volver</Text>
              </Pressable>

              <View style={styles.topNavLinks}>
                {[
                  { label: "Landing", href: "/landing" },
                  { label: "Planes", href: "/planes" },
                  { label: "FAQ", href: "/faq" },
                  { label: "Contacto", href: "/contacto" },
                ].map((item) => (
                  <Pressable
                    key={item.href}
                    style={({ pressed }) => [styles.topNavLink, pressed && styles.topNavPressed]}
                    onPress={() => router.push(item.href as any)}
                    accessibilityRole="link"
                    accessibilityLabel={`Ir a ${item.label}`}
                  >
                    <Text style={styles.topNavLinkText}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.eyebrow}>
              <Text style={styles.eyebrowText}>{eyebrow}</Text>
            </View>
            {Platform.OS === "web"
              ? createElement("h1", { style: { ...StyleSheet.flatten(styles.heroTitle), margin: 0 } }, heroTitle)
              : <Text style={styles.heroTitle}>{heroTitle}</Text>}
            <Text style={styles.heroDescription}>{heroBody}</Text>
            <View style={styles.ctaRow}>
              <Pressable style={styles.primaryCta} onPress={() => router.push(primaryCtaHref as any)}>
                <Text style={styles.primaryCtaText}>{primaryCtaLabel}</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.primaryDark} />
              </Pressable>
              <Pressable style={styles.secondaryCta} onPress={() => router.push(secondaryCtaHref as any)}>
                <Text style={styles.secondaryCtaText}>{secondaryCtaLabel}</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.mainSection}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Por que esta pagina existe</Text>
            <Text style={styles.cardBody}>{description}</Text>
            <View style={styles.bulletList}>
              {bullets.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.grid}>
            {sections.map((section) => (
              <View key={section.title} style={styles.gridCard}>
                <Text style={styles.gridTitle}>{section.title}</Text>
                <Text style={styles.gridBody}>{section.body}</Text>
              </View>
            ))}
          </View>

          {faq.length > 0 ? (
            <View style={styles.faqSection}>
              <Text style={styles.faqHeading}>Preguntas frecuentes</Text>
              {faq.map((item) => (
                <View key={item.question} style={styles.faqCard}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.bottomCtaCard}>
            <Text style={styles.bottomCtaTitle}>{heroTitle}</Text>
            <Text style={styles.bottomCtaBody}>
              Evalua si ProcesoClaro encaja con tu forma de operar y con el tipo de clientes que atiende tu despacho.
            </Text>
            <View style={styles.ctaRow}>
              <Pressable style={styles.primaryCta} onPress={() => router.push(primaryCtaHref as any)}>
                <Text style={styles.primaryCtaText}>{primaryCtaLabel}</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.primaryDark} />
              </Pressable>
              <Pressable style={styles.secondaryCtaDark} onPress={() => router.push(secondaryCtaHref as any)}>
                <Text style={styles.secondaryCtaDarkText}>{secondaryCtaLabel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 36,
  },
  heroInner: {
    maxWidth: 980,
    width: "100%",
    alignSelf: "center",
    gap: 14,
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  topNavLinks: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  topNavLink: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
  },
  topNavLinkText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  topNavPressed: {
    opacity: 0.82,
  },
  eyebrow: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,168,83,0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eyebrowText: {
    color: Colors.accentLight,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  heroTitle: {
    color: Colors.white,
    fontSize: 34,
    lineHeight: 2,
    fontFamily: "Inter_700Bold",
    maxWidth: 760,
  },
  heroDescription: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 16,
    lineHeight: 25,
    fontFamily: "Inter_400Regular",
    maxWidth: 760,
  },
  ctaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryCtaText: {
    color: Colors.primaryDark,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryCta: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  secondaryCtaText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  mainSection: {
    maxWidth: 980,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 18,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 22,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.primaryDark,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  bulletList: {
    gap: 10,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  grid: {
    gap: 14,
  },
  gridCard: {
    backgroundColor: "#F1F5F9",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  gridTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  gridBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  faqSection: {
    gap: 12,
  },
  faqHeading: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    color: Colors.primaryDark,
  },
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 8,
  },
  faqQuestion: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  bottomCtaCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 22,
    padding: 24,
    gap: 12,
  },
  bottomCtaTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  bottomCtaBody: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
  },
  secondaryCtaDark: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  secondaryCtaDarkText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
