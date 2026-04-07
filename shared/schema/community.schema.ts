/**
 * Community Schema
 * Tables for the community feed: posts, comments, likes, bookmarks, tags, reports.
 */

import { relations } from "drizzle-orm";
import {
  mysqlTable,
  varchar,
  text,
  int,
  tinyint,
  boolean,
  timestamp,
  mysqlEnum,
  index,
  primaryKey,
} from "drizzle-orm/mysql-core";
import { users } from "./user.schema";

// ============================================================
// posts
// ============================================================
export const posts = mysqlTable(
  "posts",
  {
    id:         varchar("id",      { length: 36 }).primaryKey(),
    userId:     varchar("user_id", { length: 36 }).notNull(),
    title:      varchar("title",   { length: 255 }).notNull(),
    content:    text("content").notNull(),
    visibility: mysqlEnum("visibility", ["public", "anonymous"]).notNull().default("public"),
    caseType:   varchar("case_type", { length: 50 }),
    isUrgent:   tinyint("is_urgent").notNull().default(0),
    city:       varchar("city", { length: 100 }),
    viewCount:       int("view_count").notNull().default(0),
    status:          mysqlEnum("status", ["open", "in_progress", "closed"]).notNull().default("open"),
    disabled:        boolean("disabled").notNull().default(false),
    takenByLawyerId: varchar("taken_by_lawyer_id", { length: 36 }),
    takenByUserId:   varchar("taken_by_user_id",   { length: 36 }),
    takenAt:         timestamp("taken_at"),
    takenExpiresAt:  timestamp("taken_expires_at"),
    clientAccepted:  tinyint("client_accepted"),
    procesoId:       varchar("proceso_id", { length: 36 }),
    createdAt:       timestamp("created_at").notNull().defaultNow(),
    updatedAt:       timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("idx_posts_user").on(t.userId), index("idx_posts_created").on(t.createdAt), index("idx_posts_status").on(t.status)]
);

// ============================================================
// comments
// ============================================================
export const comments = mysqlTable(
  "comments",
  {
    id:        varchar("id",        { length: 36 }).primaryKey(),
    postId:    varchar("post_id",   { length: 36 }).notNull(),
    userId:    varchar("user_id",   { length: 36 }).notNull(),
    content:   text("content").notNull(),
    parentId:  varchar("parent_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("idx_comments_post").on(t.postId),
    index("idx_comments_parent").on(t.parentId),
  ]
);

// ============================================================
// post_likes
// ============================================================
export const postLikes = mysqlTable(
  "post_likes",
  {
    id:        varchar("id",      { length: 36 }).primaryKey(),
    postId:    varchar("post_id", { length: 36 }).notNull(),
    userId:    varchar("user_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_likes_post").on(t.postId)]
);

// ============================================================
// post_bookmarks
// ============================================================
export const postBookmarks = mysqlTable(
  "post_bookmarks",
  {
    id:        varchar("id",      { length: 36 }).primaryKey(),
    postId:    varchar("post_id", { length: 36 }).notNull(),
    userId:    varchar("user_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_bookmarks_user").on(t.userId)]
);

// ============================================================
// tags
// ============================================================
export const tags = mysqlTable("tags", {
  id:   varchar("id",   { length: 36 }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull(),
});

// ============================================================
// post_tags  (many-to-many)
// ============================================================
export const postTags = mysqlTable(
  "post_tags",
  {
    postId: varchar("post_id", { length: 36 }).notNull(),
    tagId:  varchar("tag_id",  { length: 36 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })]
);

// ============================================================
// post_views  (1 row per user per post)
// ============================================================
export const postViews = mysqlTable(
  "post_views",
  {
    postId:   varchar("post_id",  { length: 36 }).notNull(),
    userId:   varchar("user_id",  { length: 36 }).notNull(),
    viewedAt: timestamp("viewed_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })]
);

// ============================================================
// post_reports
// ============================================================
export const postReports = mysqlTable(
  "post_reports",
  {
    id:             varchar("id",               { length: 36 }).primaryKey(),
    postId:         varchar("post_id",          { length: 36 }),
    commentId:      varchar("comment_id",       { length: 36 }),
    reporterUserId: varchar("reporter_user_id", { length: 36 }).notNull(),
    reason:         varchar("reason",           { length: 50 }).notNull(),
    detail:         text("detail"),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_reports_post").on(t.postId),
    index("idx_reports_comment").on(t.commentId),
  ]
);

// ============================================================
// Relations
// ============================================================
export const postsRelations = relations(posts, ({ one, many }) => ({
  author:    one(users, { fields: [posts.userId], references: [users.id] }),
  comments:  many(comments),
  likes:     many(postLikes),
  bookmarks: many(postBookmarks),
  postTags:  many(postTags),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post:   one(posts,    { fields: [comments.postId],    references: [posts.id] }),
  author: one(users,    { fields: [comments.userId],    references: [users.id] }),
  parent: one(comments, { fields: [comments.parentId],  references: [comments.id], relationName: "replies" }),
  replies: many(comments, { relationName: "replies" }),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag:  one(tags,  { fields: [postTags.tagId],  references: [tags.id] }),
}));

// ============================================================
// TypeScript interfaces
// ============================================================

export type PostVisibility = "public" | "anonymous";
export type CaseStatus     = "open" | "in_progress" | "closed";

export interface Post {
  id:              string;
  userId:          string;
  title:           string;
  content:         string;
  visibility:      PostVisibility;
  caseType:        string | null;
  isUrgent:        number;
  city:            string | null;
  viewCount:       number;
  status:          CaseStatus;
  disabled:        boolean;
  takenByLawyerId: string | null;
  takenByUserId:   string | null;
  takenAt:         Date | null;
  takenExpiresAt:  Date | null;
  clientAccepted:  number | null;  // NULL=pendiente, 1=aceptó, 0=rechazó
  procesoId:       string | null;  // ID del proceso creado a partir de este post
  createdAt:  Date;
  updatedAt:  Date;
}

export interface Comment {
  id:        string;
  postId:    string;
  userId:    string;
  content:   string;
  parentId:  string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id:   string;
  name: string;
  slug: string;
}

export interface InsertPost {
  id?:         string;
  userId:      string;
  title:       string;
  content:     string;
  visibility?: PostVisibility;
  caseType?:   string | null;
  isUrgent?:   number;
  city?:       string | null;
}

export interface InsertComment {
  id?:       string;
  postId:    string;
  userId:    string;
  content:   string;
  parentId?: string | null;
}

/** Post enriched with author info, counts and user state */
export interface PostDTO extends Post {
  author:       { id: string; name: string; email: string; rol?: string } | null;
  commentCount: number;
  likeCount:    number;
  isLiked:      boolean;
  isBookmarked: boolean;
  tags:         Tag[];
  takenByName:  string | null;  // nombre del abogado que tomó el caso (solo en getPostDTO)
}

/** Comment enriched with author info and nested replies */
export interface CommentDTO extends Comment {
  author:  { id: string; name: string; email: string };
  replies: CommentDTO[];
}
