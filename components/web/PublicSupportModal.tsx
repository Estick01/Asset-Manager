import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { createPublicSupportRequest, type PublicSupportSource } from "@/lib/services/publicSupportService";
import { toast } from "sonner-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  source: PublicSupportSource;
  initialEmail?: string;
  title?: string;
  subtitle?: string;
};

export function PublicSupportModal({
  visible,
  onClose,
  source,
  initialEmail = "",
  title = "Hablar con soporte",
  subtitle = "Cuéntanos brevemente qué necesitas y te contactaremos.",
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setEmail(initialEmail);
    }
  }, [initialEmail, visible]);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Completa nombre, email y mensaje.");
      return;
    }

    setLoading(true);
    try {
      const successMessage = await createPublicSupportRequest({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        source,
      });
      toast.success(successMessage);
      setName("");
      setMessage("");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible enviar tu solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mensaje</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe tu duda o problema"
              placeholderTextColor={Colors.textTertiary}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.secondaryBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, loading && styles.disabledBtn]} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Enviar</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.white} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,38,64,0.56)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.infoLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  textarea: {
    minHeight: 120,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  secondaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  disabledBtn: {
    opacity: 0.65,
  },
});
