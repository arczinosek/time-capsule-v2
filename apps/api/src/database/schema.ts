import {
  FAMILY_MEMBER_KINDS,
  MEDIA_CONTENT_TYPES,
  MILESTONE_CATEGORIES,
} from '@time-capsule/shared';
import {
  bigint,
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
  type AnyMySqlColumn,
} from 'drizzle-orm/mysql-core';

/**
 * A column that references a `serial` id. serial is BIGINT UNSIGNED, and MySQL rejects a
 * foreign key between columns of different types (error 3780).
 */
const fkId = (name: string) => bigint(name, { mode: 'number', unsigned: true });

/** A named point on the map. */
export const locations = mysqlTable('locations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  // Decimal degrees with 6 decimals (about 10 cm), read as JS numbers. Finer input is rounded.
  latitude: decimal('latitude', {
    precision: 9,
    scale: 6,
    mode: 'number',
  }).notNull(),
  longitude: decimal('longitude', {
    precision: 9,
    scale: 6,
    mode: 'number',
  }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * A named, described spot. Its location is optional and UNIQUE (a location has at most one
 * place; MySQL allows any number of NULLs). Deleting the location leaves the place without one.
 */
export const places = mysqlTable('places', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  locationId: fkId('location_id')
    .unique()
    .references(() => locations.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const milestones = mysqlTable(
  'milestones',
  {
    id: serial('id').primaryKey(),
    date: date('date', { mode: 'string' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    // Nullable; the slugs come from the shared contract (a new slug needs a migration).
    category: mysqlEnum('category', MILESTONE_CATEGORIES),
    // Where it happened; the place is derived (the place that owns this location). Deleting the
    // location clears it.
    locationId: fkId('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index('milestones_date_idx').on(table.date)],
);

export const familyMembers = mysqlTable('family_members', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  kind: mysqlEnum('kind', FAMILY_MEMBER_KINDS).notNull(),
  description: text('description'),
  birthDate: date('birth_date', { mode: 'string' }),
  deathDate: date('death_date', { mode: 'string' }),
  // Self-references need the explicit return type. Deleting a parent leaves the child with an
  // unknown parent.
  motherId: fkId('mother_id').references(
    (): AnyMySqlColumn => familyMembers.id,
    { onDelete: 'set null' },
  ),
  fatherId: fkId('father_id').references(
    (): AnyMySqlColumn => familyMembers.id,
    { onDelete: 'set null' },
  ),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/** Milestone participants. Deleting either side removes the link. */
export const milestoneFamilyMembers = mysqlTable(
  'milestone_family_members',
  {
    milestoneId: fkId('milestone_id')
      .notNull()
      .references(() => milestones.id, { onDelete: 'cascade' }),
    familyMemberId: fkId('family_member_id')
      .notNull()
      .references(() => familyMembers.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.milestoneId, table.familyMemberId] }),
    // The primary key covers lookups by milestone; this one covers the reverse direction.
    index('milestone_family_members_family_member_id_idx').on(
      table.familyMemberId,
    ),
  ],
);

/**
 * Upload state, api-internal (never on the wire): `pending` from POST /media until confirm
 * finds the object in storage, then `ready`. Only ready media are shown or linkable.
 */
const MEDIA_STATUSES = ['pending', 'ready'] as const;

/** A photo in the media library. The object lives in S3-compatible storage under storageKey. */
export const media = mysqlTable(
  'media',
  {
    id: serial('id').primaryKey(),
    // 'media/<uuid>'. Never in a response: read URLs are presigned from it.
    storageKey: varchar('storage_key', { length: 255 }).notNull().unique(),
    contentType: mysqlEnum('content_type', MEDIA_CONTENT_TYPES).notNull(),
    // The declared size; confirm requires the stored object to match it.
    sizeBytes: int('size_bytes', { unsigned: true }).notNull(),
    status: mysqlEnum('status', MEDIA_STATUSES).notNull().default('pending'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  // For the purge of stale pending uploads.
  (table) => [
    index('media_status_created_at_idx').on(table.status, table.createdAt),
  ],
);

/** A milestone's photos, in gallery order. Deleting either side removes the link. */
export const milestoneMedia = mysqlTable(
  'milestone_media',
  {
    milestoneId: fkId('milestone_id')
      .notNull()
      .references(() => milestones.id, { onDelete: 'cascade' }),
    mediaId: fkId('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    position: int('position', { unsigned: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.milestoneId, table.mediaId] }),
    index('milestone_media_media_id_idx').on(table.mediaId),
  ],
);

/** A family member's photos, in gallery order. Deleting either side removes the link. */
export const familyMemberMedia = mysqlTable(
  'family_member_media',
  {
    familyMemberId: fkId('family_member_id')
      .notNull()
      .references(() => familyMembers.id, { onDelete: 'cascade' }),
    mediaId: fkId('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    position: int('position', { unsigned: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.familyMemberId, table.mediaId] }),
    index('family_member_media_media_id_idx').on(table.mediaId),
  ],
);

export type Location = typeof locations.$inferSelect;
export type Place = typeof places.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type Media = typeof media.$inferSelect;
