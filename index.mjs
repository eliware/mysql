import logger from '@eliware/log';
import * as mysql2Promise from 'mysql2/promise';

const REQUIRED_ENV = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);

const parseBoolean = (value, fallback) => value === undefined ? fallback : typeof value === 'boolean' ? value : typeof value === 'string' ? !FALSE_VALUES.has(value.trim().toLowerCase()) : Boolean(value);
const parseInteger = (value, fallback, minimum = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : fallback;
};
const parseSsl = (value) => {
  if (!value) return undefined;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return { rejectUnauthorized: value !== 'insecure' }; }
};

const readOnlyStatement = (sql) => {
  if (typeof sql !== 'string') return false;
  let statement = sql.trim();
  while (statement.startsWith('--') || statement.startsWith('#') || statement.startsWith('/*')) {
    if (statement.startsWith('/*')) {
      const end = statement.indexOf('*/', 2);
      if (end < 0) return false;
      statement = statement.slice(end + 2).trim();
    } else {
      const end = statement.indexOf('\n');
      if (end < 0) return false;
      statement = statement.slice(end + 1).trim();
    }
  }
  if (!/^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i.test(statement) || /;/.test(statement)) return false;
  return !/\b(FOR\s+UPDATE|LOCK\s+IN\s+SHARE\s+MODE|INTO\s+(OUTFILE|DUMPFILE)|CALL)\b/i.test(statement);
};

const shouldUseReadPool = (args) => readOnlyStatement(typeof args[0] === 'string' ? args[0] : args[0]?.sql);

const createRoutingPool = (writePool, readPool) => new Proxy(writePool, {
  get(target, property) {
    if (property === 'query' || property === 'execute') {
      return (...args) => (shouldUseReadPool(args) ? readPool : writePool)[property](...args);
    }
    if (property === 'end') return async () => { await Promise.all([writePool.end(), readPool.end()]); };
    return Reflect.get(target, property);
  },
});

const poolConfig = (env, poolOptions) => {
  const config = {
    host: env.MYSQL_HOST, user: env.MYSQL_USER, password: env.MYSQL_PASSWORD, database: env.MYSQL_DATABASE,
    port: parseInteger(env.MYSQL_PORT, 3306, 1), waitForConnections: parseBoolean(env.MYSQL_WAIT_FOR_CONNECTIONS, true),
    connectionLimit: parseInteger(env.MYSQL_CONNECTION_LIMIT, 10, 1), queueLimit: parseInteger(env.MYSQL_QUEUE_LIMIT, 0),
    ...poolOptions,
  };
  if (env.MYSQL_CONNECT_TIMEOUT !== undefined && poolOptions.connectTimeout === undefined) config.connectTimeout = parseInteger(env.MYSQL_CONNECT_TIMEOUT, 10000, 0);
  if (env.MYSQL_ACQUIRE_TIMEOUT !== undefined && poolOptions.acquireTimeout === undefined) config.acquireTimeout = parseInteger(env.MYSQL_ACQUIRE_TIMEOUT, 10000, 0);
  const ssl = poolOptions.ssl ?? parseSsl(env.MYSQL_SSL);
  if (ssl !== undefined) config.ssl = ssl;
  return config;
};

/** Create a MySQL connection pool. */
export async function createDb({ env = process.env, mysqlLib, log = logger, poolOptions = {} } = {}) {
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length) throw new Error(`Database environment variables are not set: ${missing.join(', ')}. Please check your .env file.`);
  const config = poolConfig(env, poolOptions);
  const mysqlModule = mysqlLib ?? mysql2Promise;
  try {
    log.debug('Creating MySQL pool with config', { ...config, password: undefined });
    if (typeof mysqlModule.createPool !== 'function') throw new Error('Provided mysqlLib does not have a createPool method.');
    const writePool = mysqlModule.createPool(config);
    if (!env.MYSQL_READPORT) {
      log.debug('MySQL pool created');
      return writePool;
    }
    const readConfig = { ...config, host: env.MYSQL_READHOST || env.MYSQL_HOST, port: parseInteger(env.MYSQL_READPORT, 3307, 1) };
    const readPool = mysqlModule.createPool(readConfig);
    const db = createRoutingPool(writePool, readPool);
    log.debug('MySQL pool created');
    return db;
  } catch (error) {
    log.error('Failed to create MySQL connection pool', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) log.debug('Stack trace:', error.stack);
    throw error;
  }
}

/** Verify a pool can execute a simple query. */
export async function verifyConnection(pool) {
  if (!pool || typeof pool.query !== 'function') throw new TypeError('A MySQL pool with a query method is required.');
  await pool.query('SELECT 1');
  return true;
}

/** Close a pool during application shutdown. */
export async function closeDb(pool) {
  if (!pool || typeof pool.end !== 'function') throw new TypeError('A MySQL pool with an end method is required.');
  await pool.end();
}
