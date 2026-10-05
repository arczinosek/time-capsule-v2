import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MAX_FAMILY_MEMBER_MEDIA,
  MAX_MEDIA_SIZE_BYTES,
  MAX_MILESTONE_MEDIA,
  MEDIA_CONTENT_TYPES,
  messages,
  type CreateMediaRequest,
  type MediaTarget,
  type UpdateFamilyMemberMediaRequest,
  type UpdateMilestoneMediaRequest,
} from '@time-capsule/shared';
import { and, asc, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { ConflictError } from '../common/conflict.error.js';
import { FieldValidationError } from '../common/field-validation.error.js';
import { NotFoundError } from '../common/not-found.error.js';
import {
  DRIZZLE,
  type Database,
  type Transaction,
} from '../database/database.types.js';
import {
  familyMemberMedia,
  familyMembers,
  media,
  milestoneMedia,
  milestones,
  type Media,
} from '../database/schema.js';
import {
  StorageService,
  type PresignedUpload,
} from '../storage/storage.service.js';

/** A media row with its presigned read URL: what responses are mapped from. */
export type MediaRow = Media & { url: string };

export type CreatedMedia = PresignedUpload & { mediaId: number };

/** A pending upload older than this is abandoned: its row, link and object are purged. */
const STALE_PENDING_HOURS = 24;

/**
 * The two owners differ only in tables and limits. Kept as plain data rather than a generic
 * table abstraction: there are exactly two, and every query below names its columns.
 */
const owners = {
  milestone: {
    table: milestones,
    links: milestoneMedia,
    ownerId: milestoneMedia.milestoneId,
    cap: MAX_MILESTONE_MEDIA,
    capMessage: messages.mediaCapMilestone,
    label: 'Milestone',
  },
  family_member: {
    table: familyMembers,
    links: familyMemberMedia,
    ownerId: familyMemberMedia.familyMemberId,
    cap: MAX_FAMILY_MEMBER_MEDIA,
    capMessage: messages.mediaCapFamilyMember,
    label: 'Family member',
  },
} as const;

/**
 * The media library and its links to milestones and family members. Lock order on every path
 * (upload, PUT, owner delete): the owner row, then link rows, then media rows, each FOR UPDATE
 * when the transaction may delete it later (no shared-to-exclusive upgrades). S3 objects are
 * deleted after the commit.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly storage: StorageService,
  ) {}

  /**
   * Reserves a slot on the owner (pending uploads count against the cap) and presigns the
   * upload. The media stays pending, and hidden, until confirm finds the object.
   */
  async create(request: CreateMediaRequest): Promise<CreatedMedia> {
    await this.purgeStalePending();

    const { target, contentType, size } = request;
    const owner = owners[target.type];
    const storageKey = `media/${randomUUID()}`;
    // Offline signing, before the transaction: a failure leaves nothing behind.
    const upload = await this.storage.createUpload(storageKey, contentType);

    const mediaId = await this.db.transaction(async (tx) => {
      // The owner lock serializes concurrent uploads, so the count below can't go stale.
      await this.lockOwner(tx, target);

      const [{ count, maxPosition }] = await tx
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
          maxPosition:
            sql<number>`coalesce(max(${owner.links.position}), -1)`.mapWith(
              Number,
            ),
        })
        .from(owner.links)
        .where(eq(owner.ownerId, target.id));

      if (count >= owner.cap) throw new ConflictError(owner.capMessage);

      const [{ id }] = await tx
        .insert(media)
        .values({ storageKey, contentType, sizeBytes: size })
        .$returningId();
      await this.insertLinks(tx, target, [
        { mediaId: id, position: maxPosition + 1 },
      ]);

      return id;
    });

    return { mediaId, ...upload };
  }

  /**
   * Marks an upload ready once storage holds exactly what was declared. Anything else (no
   * object, another size or type) deletes the object and the row and answers 400 on `file`.
   */
  async confirm(id: number): Promise<MediaRow> {
    const [row] = await this.db.select().from(media).where(eq(media.id, id));

    if (!row) throw new NotFoundError(`Media ${id} not found`);
    if (row.status === 'ready') return this.withUrl(row);

    const stored = await this.storage.head(row.storageKey);
    const valid =
      stored !== null &&
      stored.size === row.sizeBytes &&
      stored.size >= 1 &&
      stored.size <= MAX_MEDIA_SIZE_BYTES &&
      stored.contentType === row.contentType &&
      MEDIA_CONTENT_TYPES.some((type) => type === stored.contentType);

    if (!valid) {
      await this.storage.deleteMany([row.storageKey]);
      await this.db.delete(media).where(eq(media.id, id));
      throw new FieldValidationError({ file: messages.mediaUploadInvalid });
    }

    // affectedRows counts matched rows (mysql2 sets FOUND_ROWS), so 0 means the row is gone:
    // the media or its owner was deleted during the upload. Its object would be orphaned.
    const [result] = await this.db
      .update(media)
      .set({ status: 'ready' })
      .where(eq(media.id, id));

    if (result.affectedRows === 0) {
      await this.storage.deleteMany([row.storageKey]);
      throw new NotFoundError(`Media ${id} not found`);
    }

    return this.withUrl({ ...row, status: 'ready' });
  }

  /** Deletes the media everywhere: its links (by cascade), its row and its object. Idempotent. */
  async remove(id: number): Promise<number> {
    const [row] = await this.db
      .select({ storageKey: media.storageKey })
      .from(media)
      .where(eq(media.id, id));

    if (!row) return 0;

    const [result] = await this.db.delete(media).where(eq(media.id, id));
    await this.storage.deleteMany([row.storageKey]);
    return result.affectedRows;
  }

  /** The library: every ready media, newest first. */
  async findLibrary(): Promise<MediaRow[]> {
    const rows = await this.db
      .select()
      .from(media)
      .where(eq(media.status, 'ready'))
      .orderBy(desc(media.createdAt), desc(media.id));

    return Promise.all(rows.map((row) => this.withUrl(row)));
  }

  /** The ready media of each milestone, in gallery order. */
  async findForMilestones(
    milestoneIds: number[],
  ): Promise<Map<number, MediaRow[]>> {
    const byMilestone = new Map<number, MediaRow[]>();

    if (milestoneIds.length === 0) return byMilestone;

    const rows = await this.db
      .select({ ownerId: milestoneMedia.milestoneId, media })
      .from(milestoneMedia)
      .innerJoin(media, eq(media.id, milestoneMedia.mediaId))
      .where(
        and(
          inArray(milestoneMedia.milestoneId, milestoneIds),
          eq(media.status, 'ready'),
        ),
      )
      .orderBy(asc(milestoneMedia.position), asc(media.id));

    for (const { ownerId, media: row } of rows) {
      byMilestone.set(ownerId, [
        ...(byMilestone.get(ownerId) ?? []),
        await this.withUrl(row),
      ]);
    }

    return byMilestone;
  }

  /** The ready media of a family member, in gallery order. */
  async findForFamilyMember(familyMemberId: number): Promise<MediaRow[]> {
    return this.findForOwner(this.db, {
      type: 'family_member',
      id: familyMemberId,
    });
  }

  /**
   * PUT /<owner>/:id/media: `mediaIds` become the owner's ready media, in that order. Links of
   * uploads still in flight (pending) are left alone, so a PUT never cancels an upload. Media
   * unlinked here and linked nowhere else are deleted, row and object. `baseMediaIds` must be
   * the owner's ready media as they are now (in order), else 409 `mediaStale` and nothing
   * changes: a PUT built from a stale view would delete photos the client never saw.
   */
  async replaceOwnerMedia(
    target: MediaTarget,
    {
      mediaIds,
      baseMediaIds,
    }: UpdateMilestoneMediaRequest | UpdateFamilyMemberMediaRequest,
  ): Promise<MediaRow[]> {
    const owner = owners[target.type];

    const orphanKeys = await this.db.transaction(async (tx) => {
      await this.lockOwner(tx, target);

      // The owner's links, locked, in gallery order; pending ones stay, ready ones are
      // replaced. Then the status of those and of the requested media, FOR UPDATE: none of
      // them can be deleted (or confirmed) before this transaction commits, and
      // deleteOrphans' later FOR UPDATE on the same rows is no shared-to-exclusive upgrade
      // (two PUTs unlinking the same photo would deadlock on that).
      const linkedIds = (
        await tx
          .select({ mediaId: owner.links.mediaId })
          .from(owner.links)
          .where(eq(owner.ownerId, target.id))
          .orderBy(asc(owner.links.position), asc(owner.links.mediaId))
          .for('update')
      ).map(({ mediaId }) => mediaId);
      const ids = [...new Set([...linkedIds, ...mediaIds])];
      const statuses =
        ids.length === 0
          ? []
          : await tx
              .select({ id: media.id, status: media.status })
              .from(media)
              .where(inArray(media.id, ids))
              .for('update');
      const statusOf = new Map(statuses.map(({ id, status }) => [id, status]));
      const currentReady = linkedIds.filter(
        (id) => statusOf.get(id) === 'ready',
      );

      if (
        currentReady.length !== baseMediaIds.length ||
        currentReady.some((id, index) => id !== baseMediaIds[index])
      ) {
        throw new ConflictError(messages.mediaStale);
      }

      if (mediaIds.some((id) => !statusOf.has(id))) {
        throw new FieldValidationError({ mediaIds: messages.mediaNotFound });
      }
      if (mediaIds.some((id) => statusOf.get(id) !== 'ready')) {
        throw new FieldValidationError({ mediaIds: messages.mediaNotReady });
      }

      const pendingCount = linkedIds.filter(
        (id) => statusOf.get(id) === 'pending',
      ).length;

      if (mediaIds.length + pendingCount > owner.cap) {
        throw new ConflictError(owner.capMessage);
      }

      // Replace the ready links: delete them all, then insert the new order.
      if (currentReady.length > 0) {
        await tx
          .delete(owner.links)
          .where(
            and(
              eq(owner.ownerId, target.id),
              inArray(owner.links.mediaId, currentReady),
            ),
          );
      }
      await this.insertLinks(
        tx,
        target,
        mediaIds.map((mediaId, position) => ({ mediaId, position })),
      );

      const removed = currentReady.filter((id) => !mediaIds.includes(id));
      return this.deleteOrphans(tx, removed);
    });

    await this.storage.deleteMany(orphanKeys);
    return this.findForOwner(this.db, target);
  }

  /**
   * Deletes the rows of the given media that no owner links any more, and returns their
   * storage keys: the caller deletes the objects after its transaction commits. Locking reads
   * only (a plain read would see the transaction's old snapshot and miss a new link).
   */
  async deleteOrphans(tx: Transaction, mediaIds: number[]): Promise<string[]> {
    if (mediaIds.length === 0) return [];

    const rows = await tx
      .select({ id: media.id, storageKey: media.storageKey })
      .from(media)
      .where(inArray(media.id, mediaIds))
      .for('update');
    const [milestoneLinks, familyMemberLinks] = [
      await tx
        .select({ mediaId: milestoneMedia.mediaId })
        .from(milestoneMedia)
        .where(inArray(milestoneMedia.mediaId, mediaIds))
        .for('share'),
      await tx
        .select({ mediaId: familyMemberMedia.mediaId })
        .from(familyMemberMedia)
        .where(inArray(familyMemberMedia.mediaId, mediaIds))
        .for('share'),
    ];
    const linked = new Set(
      [...milestoneLinks, ...familyMemberLinks].map(({ mediaId }) => mediaId),
    );
    const orphans = rows.filter(({ id }) => !linked.has(id));

    if (orphans.length === 0) return [];

    await tx.delete(media).where(
      inArray(
        media.id,
        orphans.map(({ id }) => id),
      ),
    );
    return orphans.map(({ storageKey }) => storageKey);
  }

  /** Deletes objects after a commit (best-effort, see StorageService.deleteMany). */
  deleteObjects(keys: string[]): Promise<void> {
    return this.storage.deleteMany(keys);
  }

  private async lockOwner(tx: Transaction, target: MediaTarget): Promise<void> {
    const owner = owners[target.type];
    const [locked] = await tx
      .select({ id: owner.table.id })
      .from(owner.table)
      .where(eq(owner.table.id, target.id))
      .for('update');

    if (!locked) {
      throw new NotFoundError(`${owner.label} ${target.id} not found`);
    }
  }

  private async insertLinks(
    tx: Transaction,
    target: MediaTarget,
    links: { mediaId: number; position: number }[],
  ): Promise<void> {
    // insert().values([]) throws: nothing to link when the set was cleared.
    if (links.length === 0) return;

    if (target.type === 'milestone') {
      await tx
        .insert(milestoneMedia)
        .values(links.map((link) => ({ ...link, milestoneId: target.id })));
    } else {
      await tx
        .insert(familyMemberMedia)
        .values(links.map((link) => ({ ...link, familyMemberId: target.id })));
    }
  }

  private async findForOwner(
    db: Database | Transaction,
    target: MediaTarget,
  ): Promise<MediaRow[]> {
    const owner = owners[target.type];
    const rows = await db
      .select({ media })
      .from(owner.links)
      .innerJoin(media, eq(media.id, owner.links.mediaId))
      .where(and(eq(owner.ownerId, target.id), eq(media.status, 'ready')))
      .orderBy(asc(owner.links.position), asc(media.id));

    return Promise.all(rows.map(({ media: row }) => this.withUrl(row)));
  }

  /**
   * Deletes pending uploads older than a day, which hold a cap slot each. Best-effort: runs
   * before an upload is reserved, and a failure never blocks that upload. Row by row, each
   * delete still requiring `pending`: an object is deleted only when its row was (a confirm
   * that won the race keeps its photo). Objects go after the deletes have committed.
   */
  private async purgeStalePending(): Promise<void> {
    try {
      const candidates = await this.db
        .select({ id: media.id, storageKey: media.storageKey })
        .from(media)
        .where(
          and(
            eq(media.status, 'pending'),
            // Database time, like created_at's default.
            lt(
              media.createdAt,
              sql`now() - interval ${sql.raw(String(STALE_PENDING_HOURS))} hour`,
            ),
          ),
        );

      const purgedKeys: string[] = [];

      for (const { id, storageKey } of candidates) {
        const [result] = await this.db
          .delete(media)
          .where(and(eq(media.id, id), eq(media.status, 'pending')));

        if (result.affectedRows > 0) purgedKeys.push(storageKey);
      }

      await this.storage.deleteMany(purgedKeys);
    } catch (error) {
      this.logger.warn(`Purging stale uploads failed: ${String(error)}`);
    }
  }

  private async withUrl(row: Media): Promise<MediaRow> {
    return {
      ...row,
      url: await this.storage.getReadUrl(row.storageKey, row.contentType),
    };
  }
}
