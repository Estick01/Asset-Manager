// storage/firm-invitation.storage.ts
import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { firmInvitations, LawyerProfile, lawyerProfiles } from "@/shared/schema";
import { Database } from "../database-storage";
import { FirmInvitation, FirmInvitationWithDetails, InsertFirmInvitation } from "@/shared/schema";

export class FirmInvitationStorage {
    constructor(private db: Database) { }

    async create(data: Omit<InsertFirmInvitation, "id">): Promise<FirmInvitation> {
        const id = randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // expira en 7 días

        await this.db.insert(firmInvitations).values({
            ...data,
            id,
            expiresAt,
        });

        return this.getById(id) as Promise<FirmInvitation>;
    }

    async getById(id: string): Promise<FirmInvitationWithDetails | undefined> {
        return this.db.query.firmInvitations.findFirst({
            where: eq(firmInvitations.id, id),
            with: {
                firm: true,
                lawyer: true,
                invitadoPorUser: {
                    columns: { id: true, email: true, name: true },
                },
            },
        });
    }

    // Invitaciones pendientes recibidas por un abogado
    async getPendingByLawyerId(lawyerId: string): Promise<FirmInvitationWithDetails[]> {
        return this.db.query.firmInvitations.findMany({
            where: and(
                eq(firmInvitations.lawyerId, lawyerId),
                eq(firmInvitations.status, "pendiente")
            ),
            with: {
                firm: true,
                invitadoPorUser: {
                    columns: { id: true, email: true, name: true },
                },
            },
            orderBy: desc(firmInvitations.createdAt),
        });
    }

    // Invitaciones enviadas por una firma
    async getByFirmId(firmId: string): Promise<FirmInvitationWithDetails[]> {
        return this.db.query.firmInvitations.findMany({
            where: eq(firmInvitations.firmId, firmId),
            with: {
                lawyer: true,
                invitadoPorUser: {
                    columns: { id: true, email: true, name: true },
                },
            },
            orderBy: desc(firmInvitations.createdAt),
        });
    }

    // Verificar si ya existe invitación pendiente
    async getExistingPending(firmId: string, lawyerId: string): Promise<FirmInvitation | undefined> {
        return this.db.query.firmInvitations.findFirst({
            where: and(
                eq(firmInvitations.firmId, firmId),
                eq(firmInvitations.lawyerId, lawyerId),
                eq(firmInvitations.status, "pendiente")
            ),
        });
    }

    async accept(id: string): Promise<FirmInvitation | undefined> {
        await this.db.update(firmInvitations).set({
            status: "aceptada",
            respondedAt: new Date(),
        }).where(eq(firmInvitations.id, id));

        return this.getById(id);
    }

    async reject(id: string, motivoRechazo?: string): Promise<FirmInvitation | undefined> {
        await this.db.update(firmInvitations).set({
            status: "rechazada",
            motivoRechazo: motivoRechazo ?? null,
            respondedAt: new Date(),
        }).where(eq(firmInvitations.id, id));

        return this.getById(id);
    }

    async cancel(id: string): Promise<void> {
        await this.db.update(firmInvitations).set({
            status: "cancelada",
        }).where(eq(firmInvitations.id, id));
    }

    async countPending(lawyerId: string): Promise<number> {
        const result = await this.db
            .select({ count: sql<number>`COUNT(*)` })
            .from(firmInvitations)
            .where(
                and(
                    eq(firmInvitations.lawyerId, lawyerId),
                    eq(firmInvitations.status, "pendiente")
                )
            );
        return Number(result[0]?.count ?? 0);
    }
    async searchAvailableLawyers(search: string, firmId: string): Promise<LawyerProfile[]> {
        const searchTerm = `%${search}%`;

        return this.db
            .select()
            .from(lawyerProfiles)
            .where(
                and(
                    or(
                        isNull(lawyerProfiles.firmId), // no pertenece a ningún bufete
                        ne(lawyerProfiles.firmId, firmId) // pertenece a otro bufete
                    ),
                    or(
                        sql`LOWER(${lawyerProfiles.firstName}) LIKE LOWER(${searchTerm})`,
                        sql`LOWER(${lawyerProfiles.lastName}) LIKE LOWER(${searchTerm})`,
                        sql`LOWER(${lawyerProfiles.licenseNumber}) LIKE LOWER(${searchTerm})`,
                        sql`LOWER(${lawyerProfiles.specialization}) LIKE LOWER(${searchTerm})`
                    )
                )
            )
            .limit(10);
    }
}