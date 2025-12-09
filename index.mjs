import logger from '@eliware/log';
import * as mysql2Promise from 'mysql2/promise';
/**
 * Creates and returns a MySQL connection pool, allowing dependency injection for testability.
 *
 * @param {Object} [options]
 * @param {Object} [options.env] - Environment variables (default: process.env)
 * @param {Object} [options.mysqlLib] - mysql2/promise module (default: static import, must have createPool)
 * @param {Object} [options.log] - Logger instance (default: log from @eliware/log)
 * @returns {Promise<import('mysql2/promise').Pool>} MySQL pool instance (see mysql2 docs)
 * @throws {Error} If required environment variables are missing or mysqlLib is invalid
 *
 * Example usage:
 *   const pool = await createDb();
 *   // ... use pool.query(...)
 *   // pool.end() to close
 *
 * Default connection options:
 *   waitForConnections: true (unless MYSQL_WAIT_FOR_CONNECTIONS is 'false', '0', 'no', 'off')
 *   connectionLimit: 10 (from MYSQL_CONNECTION_LIMIT)
 *   queueLimit: 0 (from MYSQL_QUEUE_LIMIT)
 */
export async function createDb({ env = process.env, mysqlLib, log = logger } = {}) {
  const requiredVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  const missing = requiredVars.filter((v) => !env[v]);
  if (missing.length) {
    throw new Error(`Database environment variables are not set: ${missing.join(', ')}. Please check your .env file.`);
  }

  // Parse boolean and numeric env vars robustly
  const parseBool = (val, def = true) => {
    if (val === undefined) return def;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const falsy = ['false', '0', 'no', 'off'];
      return !falsy.includes(val.trim().toLowerCase());
    }
    return Boolean(val);
  };
  const parseIntEnv = (val, def) => {
    const n = parseInt(val, 10);
    return Number.isNaN(n) ? def : n;
  };
  // Parse port env var (default to 3306)
  const port = parseIntEnv(env.MYSQL_PORT, 3306);

  let db;
  try {
    log.debug('Loading mysql2/promise module...');
    let mysqlModule = mysqlLib || mysql2Promise;
    if (typeof mysqlModule.createPool !== 'function') {
      throw new Error('Provided mysqlLib does not have a createPool method.');
    }
    log.debug('Creating MySQL pool with config', {
      host: env.MYSQL_HOST,
      user: env.MYSQL_USER,
      database: env.MYSQL_DATABASE,
      port: port,
      waitForConnections: parseBool(env.MYSQL_WAIT_FOR_CONNECTIONS, true),
      connectionLimit: parseIntEnv(env.MYSQL_CONNECTION_LIMIT, 10),
      queueLimit: parseIntEnv(env.MYSQL_QUEUE_LIMIT, 0)
    });
    db = mysqlModule.createPool({
      host: env.MYSQL_HOST,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      database: env.MYSQL_DATABASE,
      port: port,
      waitForConnections: parseBool(env.MYSQL_WAIT_FOR_CONNECTIONS, true),
      connectionLimit: parseIntEnv(env.MYSQL_CONNECTION_LIMIT, 10),
      queueLimit: parseIntEnv(env.MYSQL_QUEUE_LIMIT, 0)
    });
    log.debug('MySQL pool created');
  } catch (err) {
    log.error('Failed to create MySQL connection pool', err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) {
      log.debug('Stack trace:', err.stack);
    }
    throw err;
  }
  return db;
}

// To close the pool: await pool.end();
