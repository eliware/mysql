# AGENTS.md

## Project

`@eliware/mysql` is an ESM-only Node.js utility for creating and managing injectable `mysql2/promise` connection pools.

## Development

- Use Node.js 26.
- Keep the public API ESM-compatible.
- Preserve dependency injection for the MySQL module, logger, environment, and pool options.
- Never log database passwords or private TLS key material.
- Keep TLS opt-in; do not enable `require_secure_transport` from this library.
- Prefer `verifyConnection()` for health checks and `closeDb()` for lifecycle cleanup.

## Validation

Run before committing:

```bash
npm test
npm run lint
npm run test:gaps
```

Tests should maintain 100% coverage without Istanbul ignore directives. Add or update tests with every behavior change.

## Changes

- Update `index.d.ts` whenever the public API changes.
- Update `README.md` and `example.mjs` for user-facing behavior.
- Do not bump versions, create release notes, tag, or publish unless explicitly requested.
- Do not make destructive database changes in tests or examples; use read-only health queries such as `SELECT 1`.
- Do not over-engineer simple tasks.
- Do not guess when confused.
- Do not make random, pointless changes.
- Check your own work before saying you're done.
