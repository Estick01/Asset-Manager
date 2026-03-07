/**
 * Input Validation Middleware
 * 
 * Uses Zod for schema validation of request inputs.
 * Provides type-safe validation for all endpoints.
 */

import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

// Common validation schemas

/**
 * Email validation
 */
export const emailSchema = z.string().email("Correo electrónico inválido");

/**
 * Password validation (minimum security requirements)
 */
export const passwordSchema = z
  .string()
  .min(6, "La contraseña debe tener al menos 6 caracteres");

/**
 * UUID validation
 */
export const uuidSchema = z
  .string()
  .uuid("ID inválido");

/**
 * Pagination schemas
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Auth schemas

/**
 * Lawyer login validation
 */
export const abogadoLoginSchema = z.object({
  correo: emailSchema,
  password: z.string().min(1, "La contraseña es requerida"),
});

/**
 * Client login validation
 */
export const clienteLoginSchema = z.object({
  documento: z.string().min(1, "El documento es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

/**
 * Lawyer registration validation
 */
export const abogadoRegisterSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  correo: emailSchema,
  password: passwordSchema,
  despacho: z.string().min(2, "El despacho es requerido"),
  telefono: z.string().optional(),
});

/**
 * Client registration validation
 */
export const clienteRegisterSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  correo: emailSchema.optional(),
  documento: z.string().min(5, "El documento debe tener al menos 5 caracteres"),
  password: passwordSchema,
  telefono: z.string().optional(),
  abogadoId: uuidSchema,
});

// Client schemas

/**
 * Update client validation
 */
export const updateClienteSchema = z.object({
  nombre: z.string().min(2).optional(),
  correo: emailSchema.optional(),
  telefono: z.string().optional(),
  password: passwordSchema.optional(),
  activo: z.boolean().optional(),
});

// Proceso schemas

/**
 * Create proceso validation
 */
export const createProcesoSchema = z.object({
  tipoProcesoId: z.number().int().positive().optional(),
  radicado: z.string().min(3, "El radicado debe tener al menos 3 caracteres"),
  juzgado: z.string().min(2, "El juzgado es requerido"),
  estadoId: z.number().int().positive("Estado requerido"),
  descripcion: z.string().optional(),
  clienteId: uuidSchema,
});

/**
 * Update proceso validation
 */
export const updateProcesoSchema = z.object({
  tipoProcesoId: z.number().int().positive().optional(),
  radicado: z.string().min(3).optional(),
  juzgado: z.string().min(2).optional(),
  estadoId: z.number().int().positive().optional(),
  descripcion: z.string().optional(),
});

/**
 * Proceso filter validation
 */
export const procesoFilterSchema = z.object({
  estadoCodigo: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Middleware factory

/**
 * Creates a validation middleware for a given Zod schema
 */
export function validate<T extends z.ZodType>(schema: T, source: "body" | "query" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        res.status(400).json({
          error: "Validation failed",
          details: errors,
        });
        return;
      }
      next(error);
    }
  };
}

// Convenience validators

export const validateAbogadoLogin = validate(abogadoLoginSchema);
export const validateClienteLogin = validate(clienteLoginSchema);
export const validateAbogadoRegister = validate(abogadoRegisterSchema);
export const validateClienteRegister = validate(clienteRegisterSchema);
export const validateUpdateCliente = validate(updateClienteSchema);
export const validateCreateProceso = validate(createProcesoSchema);
export const validateUpdateProceso = validate(updateProcesoSchema);
export const validateProcesoFilter = validate(procesoFilterSchema, "query");
export const validatePagination = validate(paginationSchema, "query");
export const validateUuid = validate(uuidSchema, "params");
