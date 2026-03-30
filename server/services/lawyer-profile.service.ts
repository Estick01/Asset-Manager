/**
 * Lawyer Profile Service
 * Business logic for lawyer profile operations
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { LawyerProfile, lawyerProfiles } from "@/shared/schema/lawyer-profile.schema";
import { users } from "@/shared/schema/user.schema";
import { hashPassword } from "@/server/auth";
import { storage } from "../storage/storeage/database-storage";
import { InsertFirmProfile } from "../storage";
import { LawyerDTO } from "@/shared/model.schema";
import { randomUUID } from "node:crypto";
import { profile } from "node:console";

export class LawyerProfileService {
    async getAll() {
        return db.select().from(lawyerProfiles);
    }

    async getById(id: string) {
        const result = await db.select().from(lawyerProfiles).where(eq(lawyerProfiles.id, id));
        return result[0];
    }

    async getByEmail(email: string) {
        const userResult = await db.select().from(users).where(eq(users.email, email));
        if (!userResult[0]) return null;

        const result = await db.select().from(lawyerProfiles).where(eq(lawyerProfiles.userId, userResult[0].id));
        return result[0];
    }

    async getByUserId(userId: string) {
        const result = await db.select().from(lawyerProfiles).where(eq(lawyerProfiles.userId, userId));
        return result[0];
    }

    async create(data: any) {
        await db.insert(lawyerProfiles).values(data);
        return data;
    }

    async update(id: string, data: any) {
        const { createdAt, ...updateData } = data;
        await db.update(lawyerProfiles).set({ ...updateData, updatedAt: new Date() }).where(eq(lawyerProfiles.id, id));
        return this.getById(id);
    }

    async delete(id: string) {
        await db.delete(lawyerProfiles).where(eq(lawyerProfiles.id, id));
    }

    async createAbogado(insertCliente: LawyerDTO, password: string, lawyerId?: string): Promise<LawyerProfile> {
        const hashedPassword = await hashPassword(password);
        const cliente = await storage.createLawyerWithUser(
            {
                id: randomUUID(),
                email: insertCliente.correo!,
                passwordHash: hashedPassword,
                rolId: 4,
            },
            {
                ...insertCliente.profile,
            }
        );

        return cliente;
    }
}

export const lawyerProfileService = new LawyerProfileService();
