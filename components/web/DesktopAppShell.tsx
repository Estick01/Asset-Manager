import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getDesktopMetrics } from "@/lib/ui/breakpoints";

export interface DesktopNavItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  badgeCount?: number;
  disabled?: boolean;
}

export interface DesktopActionItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badgeCount?: number;
  onPress: () => void;
}

function Badge({ count }: { count?: number }) {
  if (!count || count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
}

export function DesktopAppShell({
  brand,
  title,
  subtitle,
  navItems,
  activeKey,
  actions = [],
  onNavigate,
  children,
}: {
  brand: string;
  title: string;
  subtitle?: string;
  navItems: DesktopNavItem[];
  activeKey: string;
  actions?: DesktopActionItem[];
  onNavigate: (href: string) => void;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const metrics = getDesktopMetrics(width);

  return (
    <View style={styles.root}>
      <View style={[styles.sidebar, { width: metrics.sidebarWidth, padding: metrics.gutter }]}>
        <View style={styles.brandBlock}>
          <View style={styles.brandMark}>
            <Ionicons name="sparkles-outline" size={18} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandText}>{brand}</Text>
            <Text style={styles.brandHint}>Workspace web</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.navList} showsVerticalScrollIndicator={false}>
          {navItems.map((item) => {
            const active = item.key === activeKey;
            return (
              <Pressable
                key={item.key}
                onPress={() => onNavigate(item.href)}
                style={({ pressed }) => [
                  styles.navItem,
                  active && styles.navItemActive,
                  item.disabled && styles.navItemDisabled,
                  pressed && styles.navItemPressed,
                ]}
              >
                <View style={styles.navIconWrap}>
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={active ? Colors.white : item.disabled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.72)"}
                  />
                  <Badge count={item.badgeCount} />
                </View>
                <Text style={[styles.navText, active && styles.navTextActive, item.disabled && styles.navTextDisabled]}>
                  {item.label}
                </Text>
                {item.disabled ? <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.45)" /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.main}>
        <View
          style={[
            styles.topbar,
            {
              height: metrics.topbarHeight,
              paddingHorizontal: metrics.gutter,
            },
          ]}
        >
          <View style={styles.topbarCopy}>
            <Text style={styles.topbarTitle}>{title}</Text>
            {subtitle ? <Text style={styles.topbarSubtitle}>{subtitle}</Text> : null}
          </View>

          <View style={styles.topbarActions}>
            {actions.map((action) => (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.82 }]}
              >
                <Ionicons name={action.icon} size={18} color={Colors.text} />
                <Badge count={action.badgeCount} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.contentViewport, { padding: metrics.gutter }]}>
          <View style={styles.contentSurface}>{children}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#E9EEF5",
  },
  sidebar: {
    backgroundColor: Colors.primaryDark,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
    gap: 24,
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 6,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  brandHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  navList: {
    gap: 8,
    paddingBottom: 24,
  },
  navItem: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
  },
  navItemActive: {
    backgroundColor: Colors.primaryLight,
    shadowColor: "#071321",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  navItemPressed: {
    opacity: 0.84,
  },
  navItemDisabled: {
    opacity: 0.72,
  },
  navIconWrap: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.72)",
  },
  navTextActive: {
    color: Colors.white,
    fontFamily: "Inter_700Bold",
  },
  navTextDisabled: {
    color: "rgba(255,255,255,0.4)",
  },
  main: {
    flex: 1,
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,38,64,0.08)",
  },
  topbarCopy: {
    gap: 3,
  },
  topbarTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  topbarSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  topbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,38,64,0.08)",
  },
  contentViewport: {
    flex: 1,
    backgroundColor: "#EEF3F8",
  },
  contentSurface: {
    flex: 1,
    minHeight: 0,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
});
