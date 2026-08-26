import { readFile } from 'node:fs/promises';

const report = JSON.parse(await readFile('coverage/coverage-summary.json', 'utf8'));
const failures = Object.entries(report)
  .filter(([file]) => file !== 'total')
  .flatMap(([file, metrics]) => Object.entries(metrics)
    .filter(([, value]) => value.pct !== 100)
    .map(([metric, value]) => `${file}: ${metric} ${value.pct}%`));

if (failures.length) {
  console.error(`Coverage gaps found:\n${failures.join('\n')}`);
  process.exit(1);
}
