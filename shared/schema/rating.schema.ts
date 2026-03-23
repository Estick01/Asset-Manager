/**
 * Rating Schema
 * Clients rate lawyers and firms after a completed proceso.
 */

import { mysqlTable, varchar, text, timestamp, mysqlEnum, int, index } from "drizzle-orm/mysql-core";
import { users } from "./user.schema";
import { procesos } from "./proceso.schema";

export type RatingTargetType = "lawyer" | "firm";

export const ratings = mysqlTable(
  "ratings",
  {
    id:           varchar("id",             { length: 36 }).primaryKey(),
    fromUserId:   varchar("from_user_id",   { length: 36 }).notNull(),
    targetUserId: varchar("target_user_id", { length: 36 }).notNull(),
    targetType:   mysqlEnum("target_type",  ["lawyer", "firm"]).notNull(),
    score:        int("score").notNull(),
    comment:      text("comment"),
    procesoId:    varchar("proceso_id",     { length: 36 }).notNull(),
    createdAt:    timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ratings_target").on(table.targetUserId, table.targetType),
    index("idx_ratings_from").on(table.fromUserId),
  ]
);

// ─── TypeScript interfaces ───────────────────────────────────────────────────

export interface Rating {
  id: string;
  fromUserId: string;
  targetUserId: string;
  targetType: RatingTargetType;
  score: number;
  comment: string | null;
  procesoId: string;
  createdAt: Date;
}

export interface InsertRating {
  id?: string;
  fromUserId: string;
  targetUserId: string;
  targetType: RatingTargetType;
  score: number;
  comment?: string | null;
  procesoId: string;
}

/** Rating with author info */
export interface RatingDTO extends Rating {
  fromUser: { id: string; name: string };
}

/** Aggregated summary */
export interface RatingSummary {
  avg: number;
  count: number;
}
