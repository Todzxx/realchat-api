/**
 * Koneksi database PostgreSQL via drizzle-orm + postgres-js.
 * Diekspor sebagai singleton dan dipakai semua repository.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

// prepare: true mengaktifkan prepared statement untuk performa query berulang.
const queryClient = postgres(env.databaseUrl, { prepare: true });
const db = drizzle(queryClient, { schema });

export default db;
