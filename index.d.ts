/**
 * TypeScript type definitions for the createDb function
 */
export interface CreateDbOptions {
    /** Environment variables (default: process.env) */
    env?: Record<string, string>;
    /** mysql2/promise module (default: static import/require, must have createPool) */
    mysqlLib?: any;
    /** Logger instance (default: log) */
    log?: any;
}

/**
 * Creates and returns a MySQL connection pool, allowing dependency injection for testability.
 *
 * @param options - Options for pool creation
 * @returns Promise<import('mysql2/promise').Pool>
 */
export function createDb(options?: CreateDbOptions): Promise<any>;
