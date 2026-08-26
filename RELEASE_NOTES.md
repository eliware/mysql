# Release Notes

## 2.0.0 — 2026-08-26

- **Breaking:** Corrected the TypeScript declaration for `createDb()` to return
  `Promise<Pool>`, matching the runtime API.
- **Breaking:** Replaced the Jest/Oxlint baseline with the shared
  `@eliware/test` harness and current cross-platform CI conventions.
- Added production dependency auditing, explicit public publish metadata,
  package-level release notes, and a runnable example.
- Added cleanup when optional read-pool creation fails and redacted TLS private
  keys and passphrases from debug configuration logs.

## 1.1.6 — 2026-08-13

- Added optional read-pool routing with `MYSQL_READPORT` and `MYSQL_READHOST`.
- Routes conservative single-statement `SELECT`, `SHOW`, `DESCRIBE`, `DESC`, and `EXPLAIN` queries to the read pool.
- Keeps mutations, transactions, locks, procedure calls, and ambiguous queries on the write pool.
- Expanded routing safety tests and raised coverage to 100% across all metrics.
- Updated README configuration and routing documentation.

## 1.1.4 — 2026-08-07

- Standardized package layout, validation scripts, TypeScript checking, CI, and package contents.
- Updated `@eliware/log` to 1.1.11.
- Added safer examples and expanded operational, troubleshooting, development, and security documentation.

## 1.1.3 — 2026-08-07

- Updated the runtime dependency on `@eliware/log` to `^1.1.10`.

## 1.1.2 — 2026-08-06

- Modernized the package as an ESM-first MySQL pool utility.
- Removed obsolete CommonJS entrypoints and tests.
- Added injectable MySQL module, logger, environment, and pool options.
- Added validated pool configuration for ports, connection limits, queue limits, and timeouts.
- Added opt-in TLS/SSL configuration through environment variables and pool options.
- Added `verifyConnection(pool)` for read-only health checks.
- Added `closeDb(pool)` for graceful pool shutdown.
- Improved redacted structured configuration logging and error reporting.
- Updated TypeScript declarations, README documentation, and example usage.
- Expanded tests to 100% coverage.
- Added project contribution guidance in `AGENTS.md`.
- Standardized Node.js 26 CI, linting, coverage commands, dependency maintenance, and repository housekeeping.

## 1.1.1 — 2025-12-09

- Refreshed package metadata, dependencies, and lockfile.
