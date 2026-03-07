/**
 * Lawyer Service
 * Frontend service for managing lawyer profiles and data
 */

import { apiRequest } from "../query-client";
import { Cliente } from "../../shared/schema";

export interface LawyerProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  specialization?: string;
  licenseNumber?: string;
  isIndependent: boolean;
  firmId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateLawyerProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  specialization?: string;
  licenseNumber?: string;
}

// --- Lawyer Profile ---

/**
 * Get current lawyer profile
 */
export async function getLawyerProfile(): Promise<LawyerProfile | null> {
  try {
    const response = await apiRequest("GET", "/api/lawyer-profile");
    if (!response.ok) {
      console.error("Failed to fetch lawyer profile");
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching lawyer profile:", error);
    return null;
  }
}

/**
 * Update lawyer profile
 */
export async function updateLawyerProfile(
  data: UpdateLawyerProfile
): Promise<LawyerProfile | null> {
  try {
    const response = await apiRequest("PUT", "/api/lawyer-profile", data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al actualizar perfil");
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating lawyer profile:", error);
    throw error;
  }
}

// --- Lawyer Clients ---

/**
 * Get clients for a lawyer
 */
export async function getLawyerClients(
  lawyerId: string,
  limit: number = 10,
  offset: number = 0,
  search?: string
): Promise<Cliente[]> {
  try {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    if (search) params.append("search", search);

    const response = await apiRequest(
      "GET",
      `/api/clientes?${params.toString()}`
    );
    if (!response.ok) {
      console.error("Failed to fetch lawyer clients");
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching lawyer clients:", error);
    return [];
  }
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string): Promise<boolean> {
  try {
    const response = await apiRequest("DELETE", `/api/clientes/${clientId}`);
    return response.ok;
  } catch (error) {
    console.error("Error deleting client:", error);
    return false;
  }
}
