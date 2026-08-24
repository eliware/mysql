import type { Pool, PoolOptions } from 'mysql2/promise';

export interface CreateDbOptions {
  env?: Record<string, string | number | boolean | object | undefined>;
  mysqlLib?: { createPool: (options: PoolOptions) => Pool };
  log?: { debug: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  poolOptions?: Partial<PoolOptions>;
}
export function createDb(options?: CreateDbOptions): Promise<Pool>;
export function verifyConnection(pool: Pick<Pool, 'query'>): Promise<boolean>;
export function closeDb(pool: Pick<Pool, 'end'>): Promise<void>;
