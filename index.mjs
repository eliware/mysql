import logger from '@eliware/log';
import * as mysql2Promise from 'mysql2/promise';

const REQUIRED_ENV = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);

const parseBoolean = (value, fallback) => value === undefined
  ? fallback
  : typeof value === 'boolean'
    ? value
    : typeof value === 'string'
      ? !FALSE_VALUES.has(value.trim().toLowerCase())
      : Boolean(value);

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/** Create a MySQL connection pool. */
export async function createDb({ env = process.env, mysqlLib, log = logger } = {}) {
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Database environment variables are not set: ${missing.join(', ')}. Please check your .env file.`);
  }

  const config = {
    host: env.MYSQL_HOST,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    port: parseInteger(env.MYSQL_PORT, 3306),
    waitForConnections: parseBoolean(env.MYSQL_WAIT_FOR_CONNECTIONS, true),
    connectionLimit: parseInteger(env.MYSQL_CONNECTION_LIMIT, 10),
    queueLimit: parseInteger(env.MYSQL_QUEUE_LIMIT, 0),
  };
  const mysqlModule = mysqlLib ?? mysql2Promise;

  try {
    log.debug('Creating MySQL pool with config', { ...config, password: undefined });
    if (typeof mysqlModule.createPool !== 'function') {
      throw new Error('Provided mysqlLib does not have a createPool method.');
    }
    const db = mysqlModule.createPool(config);
    log.debug('MySQL pool created');
    return db;
  } catch (error) {
    log.error('Failed to create MySQL connection pool', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) log.debug('Stack trace:', error.stack);
    throw error;
  }
}
