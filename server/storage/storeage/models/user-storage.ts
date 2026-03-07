import { InsertUser, User, users, lawyerProfiles } from "@/shared/schema";
import { eq, like, or, and } from "drizzle-orm";


export class UserStorage {
  constructor(private db: any) { }

  // ============================
  // Buscar por Email
  // ============================
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0];
  }

  // ============================
  // Buscar por ID
  // ============================
  async getUserById(id: string) {
    return await this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        rol: true,
      },
    });
  }

  // ============================
  // Crear Usuario
  // ============================

  async createUser(user: InsertUser, tx?: any): Promise<User> {
    const dbInstance = tx ?? this.db;

    const newUser = {
      ...user,
      isActive: user.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await dbInstance.insert(users).values(newUser);
    const existing = await this.getUserByEmail(user.email);

    if (existing) {
      throw new Error("El correo ya existe");
    }

    return newUser as User;
  }

  // ============================
  // Buscar Lawyers (abogados disponibles)
  // ============================
  async searchLawyers(search: string): Promise<any[]> {
    // First get users with role 'abogado' (rolId = 3)
    const results = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .innerJoin(lawyerProfiles, eq(users.id, lawyerProfiles.userId))
      .where(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      )
      .limit(20);

    return results;
  }


  // ============================
  // Actualizar Usuario
  // ============================
  async updateUser(
    id: string,
    updates: Partial<User>
  ): Promise<User | undefined> {
    await this.db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return this.getUserById(id);
  }

  // ============================
  // Activar / Desactivar
  // ============================
  async setUserActiveStatus(
    id: string,
    isActive: boolean
  ): Promise<User | undefined> {
    await this.db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return this.getUserById(id);
  }

  // ============================
  // Obtener usuario con rol
  // ============================
  async getUserWithRole(id: string) {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        rol: true, // depende de que tengas relación definida en schema
      },
    });
  }
}