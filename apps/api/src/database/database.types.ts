import type { MySql2Database } from 'drizzle-orm/mysql2';
import type * as schema from './schema.js';

export const DRIZZLE = Symbol('DRIZZLE');

export type Database = MySql2Database<typeof schema>;
