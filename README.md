# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

## @eliware/mysql [![npm version](https://img.shields.io/npm/v/@eliware/mysql.svg)](https://www.npmjs.com/package/@eliware/mysql)[![license](https://img.shields.io/github/license/eliware/mysql.svg)](LICENSE)[![build status](https://github.com/eliware/mysql/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eliware/mysql/actions)

> A simple, dependency-injectable MySQL connection pool utility for Node.js, supporting ESM.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [ESM Example](#esm-example)
- [API](#api)
- [TypeScript](#typescript)
- [License](#license)

## Features

- Simple async function to create a MySQL connection pool
- Supports ESM
- Dependency injection for testability (mock MySQL, logger, or env)
- TypeScript type definitions included
- Helpful error logging
- Supports optional pool config via environment variables
- Supports TLS, timeouts, pool overrides, health checks, and graceful close helpers

## Installation

```bash
npm install @eliware/mysql
```

## Usage

### ESM Example

```js
import { createDb } from '@eliware/mysql';

(async () => {
  const db = await createDb();
  // Use db.query, db.execute, etc.
  await db.end();
})();
```

## API

### createDb(options?)

Creates and returns a MySQL connection pool.

**Parameters:**

- `options.env` (object, optional): Environment variables (default: `process.env`)
- `options.mysqlLib` (object, optional): mysql2/promise module (default: static import/require, must have createPool)
- `options.log` (object, optional): Logger instance (default: `@eliware/log`)
- `options.poolOptions` (object, optional): Explicit mysql2 pool options; these override environment-derived values.

**Returns:**

- `Promise<Pool>`: A MySQL connection pool instance. Call `closeDb(pool)` or `pool.end()` when finished. Use `verifyConnection(pool)` for a health check.

**Throws:**

- If required environment variables are missing
- If `mysqlLib.createPool` is missing
- If pool creation fails

The connection password is never included in debug log output.

**Environment Variables:**

Required:

- `MYSQL_HOST` - MySQL server host
- `MYSQL_USER` - MySQL username
- `MYSQL_PASSWORD` - MySQL password
- `MYSQL_DATABASE` - MySQL database name

Optional:

- `MYSQL_WAIT_FOR_CONNECTIONS` - true|false|1|0|yes|no|off (default: true)
- `MYSQL_CONNECTION_LIMIT` - Max connections in pool (default: 10)
- `MYSQL_QUEUE_LIMIT` - Max queued connection requests (default: 0)
- `MYSQL_PORT` - MySQL server port (default: 3306)
- `MYSQL_CONNECT_TIMEOUT` - Connection timeout in milliseconds (default: 10000)
- `MYSQL_ACQUIRE_TIMEOUT` - Pool acquire timeout in milliseconds (default: 10000)
- `MYSQL_SSL` - JSON TLS options, or `insecure` for development

**Example:**

```js
const db = await createDb({
  env: {
    MYSQL_HOST: 'localhost',
    MYSQL_USER: 'root',
    MYSQL_PASSWORD: 'password',
    MYSQL_DATABASE: 'test',
    MYSQL_PORT: '3306',
    MYSQL_WAIT_FOR_CONNECTIONS: 'true',
    MYSQL_CONNECTION_LIMIT: '20',
    MYSQL_QUEUE_LIMIT: '5',
  },
  mysqlLib: mysql2Promise,
  log: console,
});
```

## TypeScript

Type definitions are included:

```ts
export interface CreateDbOptions {
  /** Environment variables (default: process.env) */
  env?: Record<string, string | number | boolean | undefined>;
  /** mysql2/promise-compatible module used to create the pool */
  mysqlLib?: { createPool: (options: import('mysql2/promise').PoolOptions) => import('mysql2/promise').Pool };
  /** Logger implementing debug and error */
  log?: { debug: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
}

export function createDb(options?: CreateDbOptions): Promise<import('mysql2/promise').Pool>;
```

## Support

For help, questions, or to chat with the author and community, visit:

[![Discord](https://eliware.org/logos/discord_96.png)](https://discord.gg/M6aTR9eTwN)[![eliware.org](https://eliware.org/logos/eliware_96.png)](https://discord.gg/M6aTR9eTwN)

**[eliware.org on Discord](https://discord.gg/M6aTR9eTwN)**

## License

[MIT © 2025 Eli Sterling, eliware.org](LICENSE)

## Links

- [Home Page](https://eliware.org)
- [GitHub](https://github.com/eliware/mysql)
- [npm](https://www.npmjs.com/package/@eliware/mysql)
- [Discord](https://discord.gg/M6aTR9eTwN)
