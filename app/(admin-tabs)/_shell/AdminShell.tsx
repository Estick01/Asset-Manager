// app/(admin-tabs)/_shell/AdminShell.tsx
import { View, StyleSheet, ScrollView } from "react-native";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "@/lib/auth-context";

interface Props {
  children:   React.ReactNode;
  title:      string;
  scrollable?: boolean;   // false si la pantalla maneja su propio scroll
}

export function AdminShell({ children, title, scrollable = true }: Props) {
  const { user } = useAuth();
  const rol = user?.user?.rol?.nombre ?? "";

  return (
    <View style={styles.root}>
      <Sidebar rol={rol} />
      <View style={styles.main}>
        <Topbar title={title} />
        {scrollable ? (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  main: {
    flex: 1,
    flexDirection: "column",
    overflow: "hidden" as any,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    padding: 28,
    gap: 20,
  },
});
