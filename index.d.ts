import type { Pool, PoolOptions } from 'mysql2/promise';

export interface CreateDbOptions {
  /** Environment variables (defaults to process.env). */
  env?: Record<string, string | number | boolean | undefined>;
  /** mysql2/promise-compatible module used to create the pool. */
  mysqlLib?: { createPool: (options: PoolOptions) => Pool };
  /** Logger implementing debug and error. */
  log?: { debug: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
}

/** Create a MySQL connection pool from environment variables. */
export function createDb(options?: CreateDbOptions): Promise<Pool>;
