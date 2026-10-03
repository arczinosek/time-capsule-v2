import {
  date,
  index,
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
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index('milestones_date_idx').on(table.date)],
);

export type Milestone = typeof milestones.$inferSelect;
