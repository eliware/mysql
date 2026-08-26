import log from '@eliware/log';
import { closeDb, createDb, verifyConnection } from '../index.mjs';

const db = await createDb({
  log,
  // poolOptions override environment-derived settings when needed.
  poolOptions: {
    connectionLimit: 10,
    // Enable opt-in TLS when the CA is available:
    // ssl: { ca: process.env.MYSQL_CA, rejectUnauthorized: true },
  },
});

try {
  await verifyConnection(db);
  log.info('MySQL connection verified');
  const [rows] = await db.query('SELECT 1 AS smoke_test');
  log.info('Query succeeded', { rows });
} finally {
  await closeDb(db);
  log.info('MySQL pool closed');
}
