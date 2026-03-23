import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  Modal, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import { createRating, type RatingTargetType } from "@/lib/services/ratingService";

const NAVY  = "#0F2640";
const TEAL  = "#2196A6";
const WHITE = "#FFFFFF";
const BG    = "#F4F6F8";
const TEXT  = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const AMBER = "#F5A623";

interface Props {
  visible: boolean;
  targetUserId: string;
  targetType: RatingTargetType;
  targetName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RatingModal({
  visible, targetUserId, targetType, targetName, onClose, onSuccess,
}: Props) {
  const [score,       setScore]       = useState(0);
  const [comment,     setComment]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  const handleSubmit = async () => {
    if (score === 0) {
      toast.error("Selecciona una calificación");
      return;
    }
    setSubmitting(true);
    const result = await createRating({
      targetUserId,
      targetType,
      score,
      comment: comment.trim() || null,
    });
    setSubmitting(false);

    if (result) {
      toast.success("¡Calificación enviada!");
      setScore(0);
      setComment("");
      onSuccess();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Calificar</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={TEXT2} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            ¿Cómo fue tu experiencia con{" "}
            <Text style={{ color: NAVY, fontFamily: "Inter_700Bold" }}>{targetName}</Text>?
          </Text>

          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setScore(n)}
                style={({ pressed }) => [styles.starBtn, pressed && { opacity: 0.7 }]}
                hitSlop={6}
              >
                <Ionicons
                  name={n <= score ? "star" : "star-outline"}
                  size={36}
                  color={n <= score ? AMBER : TEXT3}
                />
              </Pressable>
            ))}
          </View>

          {score > 0 && (
            <Text style={styles.scoreLabel}>{SCORE_LABELS[score - 1]}</Text>
          )}

          {/* Comment */}
          <TextInput
            style={styles.commentInput}
            placeholder="Deja un comentario (opcional)"
            placeholderTextColor={TEXT3}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={1000}
          />

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              (score === 0 || submitting) && styles.submitBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleSubmit}
            disabled={score === 0 || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <Text style={styles.submitText}>Enviar calificación</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const SCORE_LABELS = [
  "Muy malo",
  "Malo",
  "Regular",
  "Bueno",
  "Excelente",
];

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: TEXT,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT2,
    lineHeight: 22,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
  },
  starBtn: {
    padding: 4,
  },
  scoreLabel: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: TEAL,
    marginTop: -8,
  },
  commentInput: {
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E5EA",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT,
    minHeight: 90,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  submitBtnDisabled: {
    backgroundColor: TEXT3,
  },
  submitText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: WHITE,
  },
});
