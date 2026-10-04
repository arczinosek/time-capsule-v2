import type { MySql2Database } from 'drizzle-orm/mysql2';
import type * as schema from './schema.js';

export const DRIZZLE = Symbol('DRIZZLE');

export type Database = MySql2Database<typeof schema>;

/** The `tx` handed to `db.transaction(async (tx) => …)`. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
