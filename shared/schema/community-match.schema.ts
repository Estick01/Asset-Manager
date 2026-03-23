/**
 * Community Post Matching Schema
 * Tracks which lawyers were matched/notified for each community post.
 */

import { mysqlTable, varchar, tinyint, timestamp, index, uniqueIndex } from "drizzle-orm/mysql-core";

export const communityPostMatches = mysqlTable(
  "community_post_matches",
  {
    id:        varchar("id",        { length: 36 }).primaryKey(),
    postId:    varchar("post_id",   { length: 36 }).notNull(),
    lawyerId:  varchar("lawyer_id", { length: 36 }).notNull(), // lawyer_profiles.id
    score:     tinyint("score").notNull().default(0),           // 1–10
    notified:  tinyint("notified").notNull().default(0),        // 1 = sent
    seen:      tinyint("seen").notNull().default(0),            // 1 = opened
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_post_lawyer").on(t.postId, t.lawyerId),
    index("idx_match_lawyer").on(t.lawyerId),
    index("idx_match_post").on(t.postId),
  ]
);

// ── TypeScript interfaces ─────────────────────────────────────────────────

export interface PostMatch {
  id:        string;
  postId:    string;
  lawyerId:  string;
  score:     number;
  notified:  number;
  seen:      number;
  createdAt: Date;
}

export interface LawyerFeedDTO {
  urgent:      import("./community.schema").PostDTO[];
  recommended: import("./community.schema").PostDTO[];
  recent:      import("./community.schema").PostDTO[];
}
