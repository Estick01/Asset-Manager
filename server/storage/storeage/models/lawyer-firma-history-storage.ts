import {
    LawyerFirmaHistory,
    InsertLawyerFirmaHistory,
    lawyerFirmaHistory,
    LawyerProfile,
    lawyerProfiles
} from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";

export type LawyerFirmaHistoryEstado =
    | "activo"
    | "retirado"
    | "suspendido"
    | "transferido";

export class LawyerFirmaHistoryStorage {
    constructor(private db: any) { }

    // ============================
    // Obtener por ID
    // ============================
    async getById(id: string): Promise<LawyerFirmaHistory | undefined> {
        const result = await this.db
            .select()
            .from(lawyerFirmaHistory)
            .where(eq(lawyerFirmaHistory.id, id))
            .limit(1);

        return result[0];
    }

    // ============================
    // Obtener historial por lawyerId
    // ============================
    async getByLawyerId(lawyerId: string): Promise<LawyerFirmaHistory[]> {
        return await this.db
            .select()
            .from(lawyerFirmaHistory)
            .where(eq(lawyerFirmaHistory.lawyerId, lawyerId))
            .orderBy(desc(lawyerFirmaHistory.fechaIngreso));
    }

    // ============================
    // Obtener historial por firmaId
    // ============================
    async getByFirmaId(firmaId: string): Promise<LawyerFirmaHistory[]> {
        return await this.db
            .select()
            .from(lawyerFirmaHistory)
            .where(eq(lawyerFirmaHistory.firmaId, firmaId))
            .orderBy(desc(lawyerFirmaHistory.fechaIngreso));
    }

    // ============================
    // Obtener registro activo por lawyerId
    // ============================
    async getActiveByLawyerId(
        lawyerId: string
    ): Promise<LawyerFirmaHistory | undefined> {
        const result = await this.db
            .select()
            .from(lawyerFirmaHistory)
            .where(
                and(
                    eq(lawyerFirmaHistory.lawyerId, lawyerId),
                    eq(lawyerFirmaHistory.estado, "activo")
                )
            )
            .limit(1);

        return result[0];
    }

    // ============================
    // Obtener miembros activos de una firma
    // ============================
    async getActiveMembersByFirmaId(firmaId: string): Promise<(LawyerFirmaHistory & { lawyer: LawyerProfile })[]> {
        const results = await this.db
            .select({
                // LawyerFirmaHistory fields
                id: lawyerFirmaHistory.id,
                lawyerId: lawyerFirmaHistory.lawyerId,
                firmaId: lawyerFirmaHistory.firmaId,
                fechaIngreso: lawyerFirmaHistory.fechaIngreso,
                fechaSalida: lawyerFirmaHistory.fechaSalida,
                motivoSalida: lawyerFirmaHistory.motivoSalida,
                estado: lawyerFirmaHistory.estado,
                createdBy: lawyerFirmaHistory.createdBy,
                notas: lawyerFirmaHistory.notas,
                createdAt: lawyerFirmaHistory.createdAt,
                // LawyerProfile fields
                lawyerProfileId: lawyerProfiles.id,
                firstName: lawyerProfiles.firstName,
                lastName: lawyerProfiles.lastName,
                phone: lawyerProfiles.phone,
                specialization: lawyerProfiles.specialization,
                licenseNumber: lawyerProfiles.licenseNumber,
                isIndependent: lawyerProfiles.isIndependent,
                firmId: lawyerProfiles.firmId,
                userId: lawyerProfiles.userId,
            })
            .from(lawyerFirmaHistory)
            .innerJoin(lawyerProfiles, eq(lawyerFirmaHistory.lawyerId, lawyerProfiles.id))
            .where(
                and(
                    eq(lawyerFirmaHistory.firmaId, firmaId),
                    eq(lawyerFirmaHistory.estado, "activo")
                )
            )
            .orderBy(desc(lawyerFirmaHistory.fechaIngreso));

        return results.map((r: any) => ({
            id: r.id,
            lawyerId: r.lawyerId,
            firmaId: r.firmaId,
            fechaIngreso: r.fechaIngreso,
            fechaSalida: r.fechaSalida ?? null,
            motivoSalida: r.motivoSalida ?? null,
            estado: r.estado,
            createdBy: r.createdBy ?? null,
            notas: r.notas ?? null,
            createdAt: r.createdAt,
            lawyer: {
                id: r.lawyerProfileId,
                userId: r.userId,
                firmId: r.firmId,
                firstName: r.firstName,
                lastName: r.lastName,
                phone: r.phone ?? null,
                address: null,
                specialization: r.specialization ?? null,
                licenseNumber: r.licenseNumber ?? null,
                isIndependent: r.isIndependent,
                createdAt: r.createdAt,
                updatedAt: r.createdAt,
            },
        }));
    }

    // ============================
    // Crear registro de historial
    // ============================
    async create(
        data: InsertLawyerFirmaHistory
    ): Promise<LawyerFirmaHistory> {
        const newRecord = {
            ...data,
            id: data.id || crypto.randomUUID(),
            fechaIngreso: data.fechaIngreso || new Date(),
            estado: data.estado || "activo",
            createdAt: new Date(),
        };

        await this.db.insert(lawyerFirmaHistory).values(newRecord);

        const created = await this.getById(newRecord.id);
        if (!created) {
            throw new Error("No se pudo crear el historial de firma");
        }

        return created;
    }

    // ============================
    // Actualizar registro
    // ============================
    async update(
        id: string,
        updates: Partial<LawyerFirmaHistory>
    ): Promise<LawyerFirmaHistory | undefined> {
        await this.db
            .update(lawyerFirmaHistory)
            .set({
                ...updates,
            })
            .where(eq(lawyerFirmaHistory.id, id));

        return this.getById(id);
    }

    // ============================
    // Retirar abogado de la firma
    // ============================
    async retireLawyer(
        id: string,
        motivoSalida: string,
        notas?: string
    ): Promise<LawyerFirmaHistory | undefined> {
        return await this.update(id, {
            fechaSalida: new Date(),
            motivoSalida,
            estado: "retirado",
            notas,
        });
    }

    // ============================
    // Suspender abogado en la firma
    // ============================
    async suspendLawyer(
        id: string,
        notas?: string
    ): Promise<LawyerFirmaHistory | undefined> {
        return await this.update(id, {
            estado: "suspendido",
            notas,
        });
    }

    // ============================
    // Reactivar abogado en la firma
    // ============================
    async reactivateLawyer(
        id: string,
        notas?: string
    ): Promise<LawyerFirmaHistory | undefined> {
        return await this.update(id, {
            estado: "activo",
            notas,
        });
    }

    // ============================
    // Transferir abogado a otra firma
    // ============================
    async transferLawyer(
        id: string,
        nuevaFirmaId: string,
        createdBy: string,
        notas?: string
    ): Promise<LawyerFirmaHistory | undefined> {
        // 1. Cerrar el registro actual
        await this.update(id, {
            fechaSalida: new Date(),
            estado: "transferido",
            notas,
        });

        // 2. Crear nuevo registro en la nueva firma
        const lawyerRecord = await this.getById(id);
        if (!lawyerRecord) {
            throw new Error("No se encontró el registro de historial");
        }

        return await this.create({
            lawyerId: lawyerRecord.lawyerId,
            firmaId: nuevaFirmaId,
            createdBy,
            estado: "activo",
            notas: `Transferido desde firma anterior. ${notas || ""}`,
        });
    }

    // ============================
    // Eliminar registro
    // ============================
    async delete(id: string): Promise<void> {
        await this.db
            .delete(lawyerFirmaHistory)
            .where(eq(lawyerFirmaHistory.id, id));
    }

    // ============================
    // Obtener historial completo de un abogado con detalles de firma
    // ============================
    async getLawyerHistoryWithFirms(
        lawyerId: string
    ): Promise<(LawyerFirmaHistory & { firmaNombre?: string })[]> {
        // Esta consulta simple no incluye relaciones, para hacerlo completo
        // se necesitaría una consulta con joins
        return await this.db
            .select()
            .from(lawyerFirmaHistory)
            .where(eq(lawyerFirmaHistory.lawyerId, lawyerId))
            .orderBy(desc(lawyerFirmaHistory.fechaIngreso));
    }

    // ============================
    // Contar miembros activos de una firma
    // ============================
    async countActiveMembers(firmaId: string): Promise<number> {
        const result = await this.db
            .select({ count: lawyerFirmaHistory.id })
            .from(lawyerFirmaHistory)
            .where(
                and(
                    eq(lawyerFirmaHistory.firmaId, firmaId),
                    eq(lawyerFirmaHistory.estado, "activo")
                )
            );

        return result.length;
    }
}
