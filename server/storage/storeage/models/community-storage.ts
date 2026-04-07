import { randomUUID } from "crypto";
import { eq, and, desc, sql, like, inArray, isNull } from "drizzle-orm";
import {
  posts, comments, postLikes, postBookmarks, tags, postTags, postViews, postReports,
  type Post, type Comment, type Tag,
  type InsertPost, type InsertComment,
  type PostDTO, type CommentDTO,
} from "@/shared/schema";
import { users } from "@/shared/schema/user.schema";
import { roles } from "@/shared/schema/rol.schema";
import { lawyerProfiles } from "@/shared/schema/lawyer-profile.schema";
import { firmProfiles } from "@/shared/schema/firm-profile.schema";
import { procesos } from "@/shared/schema/proceso.schema";
import { ratings } from "@/shared/schema/rating.schema";
import type { Database } from "../database-storage";

export interface CommunityUserProfile {
  user: { id: string; name: string; email: string };
  role: string;
  lawyerInfo: { specialization: string | null; licenseNumber: string | null; firmName: string | null } | null;
  firmInfo:   { nit: string; address: string | null; phone: string | null } | null;
  posts: PostDTO[];
}

export type BadgeKey =
  | "primer_caso"
  | "comprometido"
  | "alta_conversion"
  | "respuesta_rapida"
  | "valorado";

export interface LawyerCommunityStats {
  casesTaken:      number;  // posts taken from community
  processesLinked: number;  // procesos with communityPostId = this lawyer
  conversionRate:  number;  // 0-100
  avgRating:       number;  // 0-5
  ratingCount:     number;
  badges:          BadgeKey[];
}

export interface PostsFilter {
  search?:         string;
  tagSlug?:        string;
  sort?:           "recent" | "popular" | "liked";
  city?:           string;
  userId?:         string;    // for bookmarks — set to requesting user
  ids?:            string[];  // filter by explicit post ID list (used by lawyer-feed)
  authorId?:       string;    // filter posts by author userId
  unlinkedOnly?:   boolean;   // only posts where procesoId IS NULL
  clientAccepted?: boolean;   // only posts where clientAccepted = 1
  includeDisabled?: boolean;
}

export class CommunityStorage {
  constructor(private db: Database) {}

  // ── helpers ──────────────────────────────────────────────────────────────

  private async enrichPost(row: any, userId?: string): Promise<PostDTO> {
    const [likeCountRow, likedRow, bookmarkedRow, postTagRows] = await Promise.all([
      this.db.select({ c: sql<number>`COUNT(*)` }).from(postLikes).where(eq(postLikes.postId, row.id)),
      userId
        ? this.db.select().from(postLikes).where(and(eq(postLikes.postId, row.id), eq(postLikes.userId, userId))).limit(1)
        : Promise.resolve([]),
      userId
        ? this.db.select().from(postBookmarks).where(and(eq(postBookmarks.postId, row.id), eq(postBookmarks.userId, userId))).limit(1)
        : Promise.resolve([]),
      this.db
        .select({ id: tags.id, name: tags.name, slug: tags.slug })
        .from(postTags)
        .innerJoin(tags, eq(tags.id, postTags.tagId))
        .where(eq(postTags.postId, row.id)),
    ]);

    return {
      id:              row.id,
      userId:          row.userId,
      title:           row.title,
      content:         row.content,
      visibility:      row.visibility,
      caseType:        (row as any).caseType ?? null,
      isUrgent:        (row as any).isUrgent ?? 0,
      city:            (row as any).city ?? null,
      viewCount:       row.viewCount ?? 0,
      status:          (row as any).status ?? "open",
      disabled:        (row as any).disabled ?? false,
      takenByLawyerId: (row as any).takenByLawyerId ?? null,
      takenByUserId:   (row as any).takenByUserId ?? null,
      takenAt:         (row as any).takenAt ?? null,
      takenExpiresAt:  (row as any).takenExpiresAt ?? null,
      clientAccepted:  (row as any).clientAccepted ?? null,
      procesoId:       (row as any).procesoId ?? null,
      createdAt:       row.createdAt,
      updatedAt:       row.updatedAt,
      author:          row.visibility === "anonymous"
        ? null
        : { id: row.userId, name: row.authorName ?? "", email: row.authorEmail ?? "", rol: row.authorRole ?? "" },
      commentCount:    Number(row.commentCount ?? 0),
      likeCount:       Number(likeCountRow[0]?.c ?? 0),
      isLiked:         likedRow.length > 0,
      isBookmarked:    bookmarkedRow.length > 0,
      tags:            postTagRows,
      takenByName:     (row as any).takenByName ?? null,
    };
  }

  // ── Posts ─────────────────────────────────────────────────────────────────

  async createPost(data: Omit<InsertPost, "id">): Promise<Post> {
    const id = randomUUID();
    await this.db.insert(posts).values({ id, ...data });
    const result = await this.db.select().from(posts).where(eq(posts.id, id)).limit(1);
    return result[0]!;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const result = await this.db.select().from(posts).where(and(eq(posts.id, id), eq(posts.disabled, false))).limit(1);
    return result[0];
  }

  async getPosts(limit = 20, offset = 0, filter: PostsFilter = {}, userId?: string): Promise<PostDTO[]> {
    let query = this.db
      .select({
        id:              posts.id,
        userId:          posts.userId,
        title:           posts.title,
        content:         posts.content,
        visibility:      posts.visibility,
        caseType:        posts.caseType,
        isUrgent:        posts.isUrgent,
        city:            posts.city,
        viewCount:       posts.viewCount,
        status:          posts.status,
        disabled:        posts.disabled,
        takenByLawyerId: posts.takenByLawyerId,
        takenByUserId:   posts.takenByUserId,
        takenAt:         posts.takenAt,
        takenExpiresAt:  posts.takenExpiresAt,
        clientAccepted:  posts.clientAccepted,
        procesoId:       posts.procesoId,
        createdAt:       posts.createdAt,
        updatedAt:       posts.updatedAt,
        authorName:      users.name,
        authorEmail:     users.email,
        authorRole:      roles.nombre,
        commentCount:    sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(roles, eq(users.rolId, roles.id));

    // If filtering by tag slug, join post_tags + tags
    let tagId: string | null = null;
    if (filter.tagSlug) {
      const tagRow = await this.db.select().from(tags).where(eq(tags.slug, filter.tagSlug)).limit(1);
      tagId = tagRow[0]?.id ?? null;
    }

    // Build WHERE conditions
    const conditions: ReturnType<typeof eq>[] = [];
    if (!filter.includeDisabled) conditions.push(eq(posts.disabled, false));
    if (filter.authorId)       conditions.push(eq(posts.userId,      filter.authorId));
    if (filter.unlinkedOnly)   conditions.push(isNull(posts.procesoId));
    if (filter.clientAccepted) conditions.push(eq(posts.clientAccepted, 1));
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as typeof query;
    }

    const rows = await (filter.sort === "popular"
      ? query.orderBy(desc(posts.viewCount))
      : filter.sort === "liked"
        ? query.orderBy(desc(sql`(SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = ${posts.id})`))
        : query.orderBy(desc(posts.createdAt))
    ).limit(limit).offset(offset);

    let filtered = rows;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)
      );
    }
    if (filter.city) {
      const c = filter.city.toLowerCase();
      filtered = filtered.filter(r => (r.city ?? "").toLowerCase() === c);
    }
    if (tagId) {
      const taggedPostIds = await this.db
        .select({ postId: postTags.postId })
        .from(postTags)
        .where(eq(postTags.tagId, tagId));
      const ids = new Set(taggedPostIds.map(r => r.postId));
      filtered = filtered.filter(r => ids.has(r.id));
    }
    if (filter.ids && filter.ids.length > 0) {
      const allowed = new Set(filter.ids);
      filtered = filtered.filter(r => allowed.has(r.id));
    }

    return Promise.all(filtered.map(row => this.enrichPost(row, userId)));
  }

  async getPostDTO(id: string, userId?: string): Promise<PostDTO | undefined> {
    const rows = await this.db
      .select({
        id:              posts.id,
        userId:          posts.userId,
        title:           posts.title,
        content:         posts.content,
        visibility:      posts.visibility,
        caseType:        posts.caseType,
        isUrgent:        posts.isUrgent,
        city:            posts.city,
        viewCount:       posts.viewCount,
        status:          posts.status,
        disabled:        posts.disabled,
        takenByLawyerId: posts.takenByLawyerId,
        takenByUserId:   posts.takenByUserId,
        takenAt:         posts.takenAt,
        takenExpiresAt:  posts.takenExpiresAt,
        clientAccepted:  posts.clientAccepted,
        procesoId:       posts.procesoId,
        createdAt:       posts.createdAt,
        updatedAt:       posts.updatedAt,
        authorName:   users.name,
        authorEmail:  users.email,
        authorRole:   roles.nombre,
        takenByName:  sql<string>`(SELECT name FROM users WHERE id = ${posts.takenByUserId})`,
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(roles, eq(users.rolId, roles.id))
      .where(and(eq(posts.id, id), eq(posts.disabled, false)))
      .limit(1);
    const row = rows[0];
    if (!row) return undefined;
    return this.enrichPost(row, userId);
  }

  async updatePost(id: string, data: { title?: string; content?: string; caseType?: string | null; isUrgent?: number; city?: string | null }): Promise<void> {
    await this.db.update(posts).set(data).where(eq(posts.id, id));
  }

  async deletePost(id: string): Promise<void> {
    await this.db.delete(posts).where(eq(posts.id, id));
  }

  /** Link a community post to a proceso (bidirectional). */
  async setPostProceso(postId: string, procesoId: string): Promise<void> {
    await this.db.update(posts).set({ procesoId }).where(eq(posts.id, postId));
  }

  /** Atomically claim a post. Returns false if already taken or not found. */
  async takePost(postId: string, lawyerProfileId: string, lawyerUserId: string): Promise<boolean> {
    const open = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.status, "open"), eq(posts.disabled, false)))
      .limit(1);
    if (open.length === 0) return false;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h window
    await this.db
      .update(posts)
      .set({
        status:          "in_progress",
        takenByLawyerId: lawyerProfileId,
        takenByUserId:   lawyerUserId,
        takenAt:         new Date(),
        takenExpiresAt:  expiresAt,
        clientAccepted:  null,
      })
      .where(and(eq(posts.id, postId), eq(posts.status, "open"), eq(posts.disabled, false)));
    return true;
  }

  async setPostDisabled(postId: string, disabled: boolean): Promise<void> {
    await this.db.update(posts).set({ disabled }).where(eq(posts.id, postId));
  }

  /** Client rejects the lawyer — post goes back to open. */
  async rejectTake(postId: string, clientUserId: string): Promise<boolean> {
    const row = await this.db
      .select({ id: posts.id, takenByUserId: posts.takenByUserId })
      .from(posts)
      .where(and(
        eq(posts.id, postId),
        eq(posts.userId, clientUserId),
        eq(posts.status, "in_progress"),
      ))
      .limit(1);
    if (row.length === 0) return false;
    await this.db
      .update(posts)
      .set({
        status:          "open",
        takenByLawyerId: null,
        takenByUserId:   null,
        takenAt:         null,
        takenExpiresAt:  null,
        clientAccepted:  0,
      })
      .where(eq(posts.id, postId));
    return true;
  }

  /** Client accepts — marks clientAccepted=1 (post stays in_progress). */
  async acceptTake(postId: string, clientUserId: string): Promise<boolean> {
    const row = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(and(
        eq(posts.id, postId),
        eq(posts.userId, clientUserId),
        eq(posts.status, "in_progress"),
      ))
      .limit(1);
    if (row.length === 0) return false;
    await this.db
      .update(posts)
      .set({ clientAccepted: 1 })
      .where(eq(posts.id, postId));
    return true;
  }

  /**
   * Reset all in_progress posts whose 48h window expired without client response.
   * Returns expired post data for notification purposes.
   */
  async expireStale(): Promise<{ id: string; title: string; userId: string; takenByUserId: string | null }[]> {
    const expired = await this.db
      .select({
        id:            posts.id,
        title:         posts.title,
        userId:        posts.userId,
        takenByUserId: posts.takenByUserId,
      })
      .from(posts)
      .where(and(
        eq(posts.status, "in_progress"),
        sql`${posts.clientAccepted} IS NULL`,
        sql`${posts.takenExpiresAt} < NOW()`,
      ));
    if (expired.length === 0) return [];
    const ids = expired.map(r => r.id);
    await this.db
      .update(posts)
      .set({
        status:          "open",
        takenByLawyerId: null,
        takenByUserId:   null,
        takenAt:         null,
        takenExpiresAt:  null,
        clientAccepted:  null,
      })
      .where(inArray(posts.id, ids));
    return expired as any[];
  }

  /** Let the post author mark their own case as closed/resolved. */
  async closePost(postId: string, userId: string): Promise<void> {
    await this.db
      .update(posts)
      .set({ status: "closed" })
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.db.update(posts).set({ viewCount: sql`view_count + 1` }).where(eq(posts.id, id));
  }

  /** Returns true if this is the first time this user views the post (view was recorded). */
  async recordUserView(postId: string, userId: string): Promise<boolean> {
    const existing = await this.db
      .select()
      .from(postViews)
      .where(and(eq(postViews.postId, postId), eq(postViews.userId, userId)))
      .limit(1);
    if (existing.length > 0) return false;
    await this.db.insert(postViews).values({ postId, userId });
    await this.db.update(posts).set({ viewCount: sql`view_count + 1` }).where(eq(posts.id, postId));
    return true;
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async createComment(data: Omit<InsertComment, "id">): Promise<Comment> {
    const id = randomUUID();
    await this.db.insert(comments).values({ id, ...data });
    const result = await this.db.select().from(comments).where(eq(comments.id, id)).limit(1);
    return result[0]!;
  }

  async getComment(id: string): Promise<Comment | undefined> {
    const result = await this.db.select().from(comments).where(eq(comments.id, id)).limit(1);
    return result[0];
  }

  async updateComment(id: string, content: string): Promise<void> {
    await this.db.update(comments).set({ content }).where(eq(comments.id, id));
  }

  async deleteComment(id: string): Promise<void> {
    await this.db.delete(comments).where(eq(comments.id, id));
  }

  async getCommentsByPost(postId: string): Promise<CommentDTO[]> {
    const rows = await this.db
      .select({
        id:          comments.id,
        postId:      comments.postId,
        userId:      comments.userId,
        content:     comments.content,
        parentId:    comments.parentId,
        createdAt:   comments.createdAt,
        updatedAt:   comments.updatedAt,
        authorName:  users.name,
        authorEmail: users.email,
        authorRole:  roles.nombre,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .leftJoin(roles, eq(users.rolId, roles.id))
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);

    const all: CommentDTO[] = rows.map(row => ({
      id:        row.id,
      postId:    row.postId,
      userId:    row.userId,
      content:   row.content,
      parentId:  row.parentId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author:    { id: row.userId, name: row.authorName ?? "", email: row.authorEmail ?? "", rol: row.authorRole ?? "" },
      replies:   [],
    }));

    const map = new Map(all.map(c => [c.id, c]));
    const roots: CommentDTO[] = [];
    for (const c of all) {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.replies.push(c);
      } else {
        roots.push(c);
      }
    }
    return roots;
  }

  // ── Likes ─────────────────────────────────────────────────────────────────

  async togglePostLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const existing = await this.db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      await this.db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    } else {
      await this.db.insert(postLikes).values({ id: randomUUID(), postId, userId });
    }

    const countRow = await this.db
      .select({ c: sql<number>`COUNT(*)` })
      .from(postLikes)
      .where(eq(postLikes.postId, postId));
    return { liked: existing.length === 0, likeCount: Number(countRow[0]?.c ?? 0) };
  }

  // ── Bookmarks ─────────────────────────────────────────────────────────────

  async toggleBookmark(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
    const existing = await this.db
      .select()
      .from(postBookmarks)
      .where(and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      await this.db.delete(postBookmarks).where(and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, userId)));
      return { bookmarked: false };
    }
    await this.db.insert(postBookmarks).values({ id: randomUUID(), postId, userId });
    return { bookmarked: true };
  }

  async getBookmarkedPosts(userId: string): Promise<PostDTO[]> {
    const bookmarkRows = await this.db
      .select({ postId: postBookmarks.postId })
      .from(postBookmarks)
      .where(eq(postBookmarks.userId, userId))
      .orderBy(desc(postBookmarks.createdAt));

    if (bookmarkRows.length === 0) return [];
    const ids = bookmarkRows.map(r => r.postId);

    const rows = await this.db
      .select({
        id:           posts.id,
        userId:       posts.userId,
        title:        posts.title,
        content:      posts.content,
        visibility:   posts.visibility,
        caseType:     posts.caseType,
        isUrgent:     posts.isUrgent,
        city:         posts.city,
        viewCount:    posts.viewCount,
        createdAt:    posts.createdAt,
        updatedAt:    posts.updatedAt,
        authorName:   users.name,
        authorEmail:  users.email,
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(inArray(posts.id, ids));

    return Promise.all(rows.map(row => this.enrichPost(row, userId)));
  }

  // ── Tags ──────────────────────────────────────────────────────────────────

  async getAllTags(): Promise<Tag[]> {
    return this.db.select().from(tags).orderBy(tags.name);
  }

  async setPostTags(postId: string, tagIds: string[]): Promise<void> {
    await this.db.delete(postTags).where(eq(postTags.postId, postId));
    if (tagIds.length > 0) {
      await this.db.insert(postTags).values(tagIds.map(tagId => ({ postId, tagId })));
    }
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async createReport(data: {
    reporterUserId: string;
    postId?: string;
    commentId?: string;
    reason: string;
    detail?: string;
  }): Promise<void> {
    await this.db.insert(postReports).values({ id: randomUUID(), ...data });
  }

  // ── User Profile ──────────────────────────────────────────────────────────

  async getUserProfile(userId: string, viewerUserId?: string): Promise<CommunityUserProfile | null> {
    const userRows = await this.db
      .select({ id: users.id, name: users.name, email: users.email, rolId: users.rolId, rolNombre: roles.nombre })
      .from(users)
      .leftJoin(roles, eq(users.rolId, roles.id))
      .where(eq(users.id, userId))
      .limit(1);

    const userRow = userRows[0];
    if (!userRow) return null;

    const rolNombre = userRow.rolNombre ?? "cliente";

    let lawyerInfo: CommunityUserProfile["lawyerInfo"] = null;
    let firmInfo:   CommunityUserProfile["firmInfo"]   = null;

    if (rolNombre === "abogado") {
      const lawyerRows = await this.db
        .select({ specialization: lawyerProfiles.specialization, licenseNumber: lawyerProfiles.licenseNumber, firmName: firmProfiles.name })
        .from(lawyerProfiles)
        .leftJoin(firmProfiles, eq(lawyerProfiles.firmId, firmProfiles.id))
        .where(eq(lawyerProfiles.userId, userId))
        .limit(1);
      if (lawyerRows[0]) {
        lawyerInfo = { specialization: lawyerRows[0].specialization ?? null, licenseNumber: lawyerRows[0].licenseNumber ?? null, firmName: lawyerRows[0].firmName ?? null };
      }
    } else if (rolNombre === "bufete") {
      const firmRows = await this.db
        .select({ nit: firmProfiles.nit, address: firmProfiles.address, phone: firmProfiles.phone })
        .from(firmProfiles).where(eq(firmProfiles.userId, userId)).limit(1);
      if (firmRows[0]) {
        firmInfo = { nit: firmRows[0].nit, address: firmRows[0].address ?? null, phone: firmRows[0].phone ?? null };
      }
    }

    const userPosts = await this.db
      .select({
        id: posts.id, userId: posts.userId, title: posts.title, content: posts.content,
        visibility: posts.visibility, caseType: posts.caseType, isUrgent: posts.isUrgent,
        city: posts.city, viewCount: posts.viewCount, createdAt: posts.createdAt,
        updatedAt: posts.updatedAt, authorName: users.name, authorEmail: users.email,
        status:          posts.status,
        disabled:        posts.disabled,
        takenByLawyerId: posts.takenByLawyerId,
        takenByUserId:   posts.takenByUserId,
        takenAt:         posts.takenAt,
        takenExpiresAt:  posts.takenExpiresAt,
        clientAccepted:  posts.clientAccepted,
        procesoId:       posts.procesoId,
        takenByName:     sql<string>`(SELECT name FROM users WHERE id = ${posts.takenByUserId})`,
        commentCount:    sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(and(eq(posts.userId, userId), eq(posts.disabled, false)))
      .orderBy(desc(posts.createdAt))
      .limit(50);

    const userPostDTOs = await Promise.all(userPosts.map(row => this.enrichPost(row, viewerUserId)));

    return {
      user:       { id: userRow.id, name: userRow.name ?? "", email: userRow.email },
      role:       rolNombre,
      lawyerInfo,
      firmInfo,
      posts:      userPostDTOs,
    };
  }

  // ── Community stats for a lawyer ─────────────────────────────────────────

  async getLawyerCommunityStats(lawyerUserId: string): Promise<LawyerCommunityStats> {
    // 1. Posts taken by this lawyer (all time)
    const takenRow = await this.db
      .select({ c: sql<number>`COUNT(*)` })
      .from(posts)
      .where(eq(posts.takenByUserId, lawyerUserId));
    const casesTaken = Number(takenRow[0]?.c ?? 0);

    // 2. Procesos created from community (linked to a post) by this lawyer
    const linkedRow = await this.db
      .select({ c: sql<number>`COUNT(*)` })
      .from(procesos)
      .innerJoin(
        posts,
        and(
          eq(posts.procesoId, procesos.id),
          eq(posts.takenByUserId, lawyerUserId),
        )
      )
      .where(sql`${procesos.communityPostId} IS NOT NULL`);
    const processesLinked = Number(linkedRow[0]?.c ?? 0);

    // 3. Rating summary
    const ratingRows = await this.db
      .select({
        avg:   sql<number>`AVG(${ratings.score})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(ratings)
      .where(and(eq(ratings.targetUserId, lawyerUserId), eq(ratings.targetType, "lawyer")));
    const avgRating  = Math.round((Number(ratingRows[0]?.avg ?? 0)) * 10) / 10;
    const ratingCount = Number(ratingRows[0]?.count ?? 0);

    // 4. Conversion rate
    const conversionRate = casesTaken > 0
      ? Math.round((processesLinked / casesTaken) * 100)
      : 0;

    // 5. Badges
    const badges: BadgeKey[] = [];
    if (processesLinked >= 1)           badges.push("primer_caso");
    if (processesLinked >= 5)           badges.push("comprometido");
    if (conversionRate >= 80 && casesTaken >= 3) badges.push("alta_conversion");
    if (avgRating >= 4.5 && ratingCount >= 3)    badges.push("valorado");

    return { casesTaken, processesLinked, conversionRate, avgRating, ratingCount, badges };
  }
}
