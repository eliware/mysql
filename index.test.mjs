import { jest, test, expect, describe } from '@jest/globals';
import { createDb } from './index.mjs';

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
