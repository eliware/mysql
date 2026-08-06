# Release Notes

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
