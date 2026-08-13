import { jest, test, expect, describe } from '@jest/globals';
import { createDb, verifyConnection, closeDb } from '../index.mjs';

const env = { MYSQL_HOST: 'localhost', MYSQL_USER: 'root', MYSQL_PASSWORD: 'secret', MYSQL_DATABASE: 'test' };
const logger = () => ({ debug: jest.fn(), error: jest.fn() });

describe('createDb', () => {
  test('uses process defaults', async () => {
    const names = { MYSQL_HOST: 'localhost', MYSQL_USER: 'root', MYSQL_PASSWORD: 'secret', MYSQL_DATABASE: 'test' };
    const previous = Object.fromEntries(Object.keys(names).map((name) => [name, process.env[name]]));
    Object.assign(process.env, names);
    try {
      const pool = await createDb();
      await pool.end();
      const alternate = await createDb({ env: names, mysqlLib: null, log: logger() });
      await alternate.end();
    } finally {
      for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[name]; else process.env[name] = value;
      }
    }
  });

  test('creates a configured pool', async () => {
    const pool = {};
    const mysqlLib = { createPool: jest.fn(() => pool) };
    const log = logger();
    expect(await createDb({ env: { ...env, MYSQL_PORT: '3307', MYSQL_WAIT_FOR_CONNECTIONS: 'no', MYSQL_CONNECTION_LIMIT: '2', MYSQL_QUEUE_LIMIT: '3' }, mysqlLib, log })).toBe(pool);
    expect(mysqlLib.createPool).toHaveBeenCalledWith({ host: 'localhost', user: 'root', password: 'secret', database: 'test', port: 3307, waitForConnections: false, connectionLimit: 2, queueLimit: 3 });
    expect(log.debug).toHaveBeenCalledWith('Creating MySQL pool with config', expect.objectContaining({ password: undefined }));
  });

  test('uses defaults and accepts boolean/numeric values', async () => {
    const mysqlLib = { createPool: jest.fn(() => ({})) };
    await createDb({ env: { ...env, MYSQL_WAIT_FOR_CONNECTIONS: true, MYSQL_PORT: 3308 }, mysqlLib, log: logger() });
    expect(mysqlLib.createPool).toHaveBeenCalledWith(expect.objectContaining({ port: 3308, waitForConnections: true, connectionLimit: 10, queueLimit: 0 }));
    await createDb({ env: { ...env, MYSQL_WAIT_FOR_CONNECTIONS: 0, MYSQL_PORT: 'bad', MYSQL_CONNECTION_LIMIT: 'bad', MYSQL_QUEUE_LIMIT: 'bad' }, mysqlLib, log: logger() });
    await createDb({ env: { ...env, MYSQL_WAIT_FOR_CONNECTIONS: 'yes' }, mysqlLib, log: logger() });
  });

  test('rejects missing settings and invalid libraries', async () => {
    await expect(createDb({ env: {} })).rejects.toThrow('MYSQL_HOST');
    await expect(createDb({ env, mysqlLib: {}, log: logger() })).rejects.toThrow('createPool');
  });

  test('logs Error failures including stack', async () => {
    const error = new Error('fail');
    const mysqlLib = { createPool: jest.fn(() => { throw error; }) };
    const log = logger();
    await expect(createDb({ env, mysqlLib, log })).rejects.toBe(error);
    expect(log.error).toHaveBeenCalledWith('Failed to create MySQL connection pool', 'fail');
    expect(log.debug).toHaveBeenCalledWith('Stack trace:', error.stack);
  });

  test('logs non-Error failures', async () => {
    const mysqlLib = { createPool: jest.fn(() => { throw 'fail'; }) };
    const log = logger();
    await expect(createDb({ env, mysqlLib, log })).rejects.toBe('fail');
    expect(log.error).toHaveBeenCalledWith('Failed to create MySQL connection pool', 'fail');
  });
});

test('supports pool overrides, TLS, timeouts, health checks, and close', async () => {
  const pool = { query: jest.fn(async () => [[]]), end: jest.fn(async () => undefined) };
  const mysqlLib = { createPool: jest.fn(() => pool) };
  await createDb({ env: { ...env, MYSQL_SSL: '{"rejectUnauthorized":true}', MYSQL_CONNECT_TIMEOUT: '5000', MYSQL_ACQUIRE_TIMEOUT: '6000' }, mysqlLib, poolOptions: { connectionLimit: 4 }, log: logger() });
  expect(mysqlLib.createPool).toHaveBeenCalledWith(expect.objectContaining({ connectionLimit: 4, connectTimeout: 5000, acquireTimeout: 6000, ssl: { rejectUnauthorized: true } }));
  await expect(verifyConnection(pool)).resolves.toBe(true);
  await expect(closeDb(pool)).resolves.toBeUndefined();
});

test('supports insecure TLS and validates lifecycle helpers', async () => {
  const mysqlLib = { createPool: jest.fn(() => ({})) };
  await createDb({ env: { ...env, MYSQL_SSL: 'insecure' }, mysqlLib, log: logger() });
  await createDb({ env, mysqlLib, poolOptions: { ssl: { rejectUnauthorized: false } }, log: logger() });
  await createDb({ env: { ...env, MYSQL_SSL: { rejectUnauthorized: true } }, mysqlLib, log: logger() });
  await expect(verifyConnection()).rejects.toThrow(TypeError);
  await expect(closeDb()).rejects.toThrow(TypeError);
});

test('routes conservative read-only queries to the optional read pool', async () => {
  const writePool = { query: jest.fn(async () => [['write']]), execute: jest.fn(async () => [['write']]), end: jest.fn(async () => undefined) };
  const readPool = { query: jest.fn(async () => [['read']]), execute: jest.fn(async () => [['read']]), end: jest.fn(async () => undefined) };
  const pools = [writePool, readPool];
  const mysqlLib = { createPool: jest.fn(() => pools.shift()) };
  const db = await createDb({ env: { ...env, MYSQL_READPORT: '3307' }, mysqlLib, log: logger() });
  await db.query('SELECT 1');
  await db.execute('SHOW STATUS');
  await db.query('UPDATE users SET name = ?', ['name']);
  await db.query('SELECT * FROM users FOR UPDATE');
  await db.query('/* comment */ DESCRIBE users');
  expect(readPool.query).toHaveBeenCalledTimes(2);
  expect(readPool.execute).toHaveBeenCalledTimes(1);
  expect(writePool.query).toHaveBeenCalledTimes(2);
  await db.end();
  expect(writePool.end).toHaveBeenCalled();
  expect(readPool.end).toHaveBeenCalled();
  expect(mysqlLib.createPool).toHaveBeenNthCalledWith(2, expect.objectContaining({ host: 'localhost', port: 3307 }));
});

test('routes all supported read forms and explicit read host', async () => {
  const writePool = { query: jest.fn(), execute: jest.fn(), end: jest.fn(async () => undefined) };
  const readPool = { query: jest.fn(), execute: jest.fn(), end: jest.fn(async () => undefined) };
  const mysqlLib = { createPool: jest.fn().mockReturnValueOnce(writePool).mockReturnValueOnce(readPool) };
  const db = await createDb({ env: { ...env, MYSQL_READPORT: 'not-a-port', MYSQL_READHOST: 'reader' }, mysqlLib, log: logger() });
  for (const sql of ['SELECT 1', 'SHOW TABLES', 'DESCRIBE users', 'DESC users', 'EXPLAIN SELECT 1', '# comment\nSELECT 1', '-- comment\nSHOW STATUS']) await db.query(sql);
  expect(readPool.query).toHaveBeenCalledTimes(7);
  expect(mysqlLib.createPool).toHaveBeenNthCalledWith(2, expect.objectContaining({ host: 'reader', port: 3307 }));
  await db.end();
});

test('keeps ambiguous and mutating statements on the write pool', async () => {
  const writePool = { query: jest.fn(), execute: jest.fn(), end: jest.fn(async () => undefined) };
  const readPool = { query: jest.fn(), execute: jest.fn(), end: jest.fn(async () => undefined) };
  const mysqlLib = { createPool: jest.fn().mockReturnValueOnce(writePool).mockReturnValueOnce(readPool) };
  const db = await createDb({ env: { ...env, MYSQL_READPORT: '3307' }, mysqlLib, log: logger() });
  for (const sql of ['SELECT 1;', 'SELECT 1; SELECT 2', '/* unclosed SELECT 1', 'SELECT 1 INTO OUTFILE "/tmp/x"', 'SELECT 1 LOCK IN SHARE MODE', 'CALL proc()', 'INSERT INTO users VALUES (?)']) await db.execute(sql, [1]);
  expect(writePool.execute).toHaveBeenCalledTimes(7);
  expect(readPool.execute).not.toHaveBeenCalled();
  await db.end();
});

test('keeps non-string and unsupported query arguments on the write pool', async () => {
  const writePool = { query: jest.fn(), execute: jest.fn(), end: jest.fn(async () => undefined) };
  const readPool = { query: jest.fn(), execute: jest.fn(), end: jest.fn(async () => undefined) };
  const mysqlLib = { createPool: jest.fn().mockReturnValueOnce(writePool).mockReturnValueOnce(readPool) };
  const db = await createDb({ env: { ...env, MYSQL_READPORT: '3307' }, mysqlLib, log: logger() });
  await db.query({ sql: 'SELECT 1' });
  await db.query({});
  await db.query('-- comment without newline');
  await db.query('WITH rows AS (SELECT 1) SELECT * FROM rows');
  expect(writePool.query).toHaveBeenCalledTimes(3);
  expect(readPool.query).toHaveBeenCalledTimes(1);
  await db.end();
});
