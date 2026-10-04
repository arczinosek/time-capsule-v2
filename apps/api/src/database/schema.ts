import {
  FAMILY_MEMBER_KINDS,
  MILESTONE_CATEGORIES,
} from '@time-capsule/shared';
import {
  bigint,
  date,
  index,
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

export const milestones = mysqlTable(
  'milestones',
  {
    id: serial('id').primaryKey(),
    date: date('date', { mode: 'string' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    // Nullable; the slugs come from the shared contract (a new slug needs a migration).
    category: mysqlEnum('category', MILESTONE_CATEGORIES),
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

export type Milestone = typeof milestones.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
