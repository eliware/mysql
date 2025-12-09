import { createDb } from '@eliware/mysql';
import { jest, test, expect, describe } from '@jest/globals';

describe('createDb (ESM)', () => {
    test('creates pool with valid env', async () => {
        const fakePool = { end: jest.fn() };
        const fakeMysqlLib = { createPool: jest.fn(() => fakePool) };
        const env = {
            MYSQL_HOST: 'localhost',
            MYSQL_USER: 'root',
            MYSQL_PASSWORD: 'password',
            MYSQL_DATABASE: 'test',
            MYSQL_PORT: '3307', // optional port override
        };
        const log = { error: jest.fn(), debug: jest.fn() };
        const db = await createDb({ env, mysqlLib: fakeMysqlLib, log });
        expect(fakeMysqlLib.createPool).toHaveBeenCalledWith(expect.objectContaining({ host: 'localhost' }));
        expect(fakeMysqlLib.createPool).toHaveBeenCalledWith(expect.objectContaining({ user: 'root' }));
        expect(fakeMysqlLib.createPool).toHaveBeenCalledWith(expect.objectContaining({ password: 'password' }));
        expect(fakeMysqlLib.createPool).toHaveBeenCalledWith(expect.objectContaining({ database: 'test' }));
        expect(fakeMysqlLib.createPool).toHaveBeenCalledWith(expect.objectContaining({ port: 3307 }));
        expect(db).toBe(fakePool);
    });

    test('throws if env is missing', async () => {
        await expect(createDb({ env: {} })).rejects.toThrow('Database environment variables are not set');
    });

    test('logs and throws on pool creation error', async () => {
        const fakeMysqlLib = { createPool: jest.fn(() => { throw new Error('fail'); }) };
        const env = {
            MYSQL_HOST: 'localhost',
            MYSQL_USER: 'root',
            MYSQL_PASSWORD: 'password',
            MYSQL_DATABASE: 'test',
        };
        const log = { error: jest.fn(), debug: jest.fn() };
        await expect(createDb({ env, mysqlLib: fakeMysqlLib, log })).rejects.toThrow('fail');
        expect(log.error).toHaveBeenCalledWith('Failed to create MySQL connection pool', 'fail');
    });
});
