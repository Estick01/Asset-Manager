import { type User, type InsertUser, users, type Cliente, type InsertCliente, clientes } from "../shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getClientes(abogadoId: string): Promise<Cliente[]>;
  createCliente(cliente: InsertCliente): Promise<Cliente>;
}

export class DrizzleStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    const connection = mysql.createPool({
      uri: process.env.DATABASE_URL,
    });
    this.db = drizzle(connection, {
      schema: { users, clientes },
      mode: "default",
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.username, username),
    });
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const newUser = { ...insertUser, id };
    await this.db.insert(users).values(newUser);
    return newUser;
  }

  async getClientes(abogadoId: string): Promise<Cliente[]> {
    const result = await this.db.query.clientes.findMany({
      where: eq(clientes.abogadoId, abogadoId),
    });
    return result;
  }

  async createCliente(insertCliente: InsertCliente): Promise<Cliente> {
    const id = randomUUID();
    const newCliente = { ...insertCliente, id };
    await this.db.insert(clientes).values(newCliente);
    return newCliente;
  }
}

export const storage = new DrizzleStorage();
