import { storage } from "../storage/storeage/database-storage.js";
import type { RatingTargetType } from "@/shared/schema";

export const ratingService = {
  async getProfile(targetUserId: string) {
    return storage.community.getUserProfile(targetUserId);
  },

  async getRatings(targetUserId: string, targetType: RatingTargetType) {
    return storage.ratings.getRatings(targetUserId, targetType);
  },

  async getRatingSummary(targetUserId: string, targetType: RatingTargetType) {
    return storage.ratings.getRatingSummary(targetUserId, targetType);
  },

  async canRate(fromUserId: string, targetUserId: string, targetType: RatingTargetType) {
    if (fromUserId === targetUserId) return false;
    return storage.ratings.canClientRate(fromUserId, targetUserId, targetType);
  },

  async hasRated(fromUserId: string, targetUserId: string, targetType: RatingTargetType) {
    const existing = await storage.ratings.getRating(fromUserId, targetUserId, targetType);
    return !!existing;
  },

  async createRating(
    fromUserId:   string,
    targetUserId: string,
    targetType:   RatingTargetType,
    score:        number,
    comment:      string | null
  ) {
    if (score < 1 || score > 5) throw new Error("La calificación debe estar entre 1 y 5");
    if (fromUserId === targetUserId) throw new Error("No puedes calificarte a ti mismo");

    // Auto-find qualifying proceso
    const procesoId = await storage.ratings.findQualifyingProceso(fromUserId, targetUserId, targetType);
    if (!procesoId) throw new Error("Solo puedes calificar si tienes un proceso finalizado con este usuario");

    // No duplicates
    const existing = await storage.ratings.getRating(fromUserId, targetUserId, targetType);
    if (existing) throw new Error("Ya has calificado a este usuario");

    return storage.ratings.createRating({ fromUserId, targetUserId, targetType, score, comment, procesoId });
  },
};
