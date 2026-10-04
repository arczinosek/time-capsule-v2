import { MILESTONE_CATEGORIES } from '@time-capsule/shared';
import {
  date,
  index,
  mysqlEnum,
  mysqlTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

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

export type Milestone = typeof milestones.$inferSelect;
