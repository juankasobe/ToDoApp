import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const sourceRoot = 'src';
const focusedTestPattern = /\b(fit|fdescribe)\s*\(/;
const matches = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }

    if (!entry.name.endsWith('.spec.ts')) {
      continue;
    }

    const content = await readFile(path, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (focusedTestPattern.test(line)) {
        matches.push(`${path}:${index + 1}`);
      }
    });
  }
}

await walk(sourceRoot);

if (matches.length > 0) {
  console.error('Focused Jasmine tests are not allowed:');
  matches.forEach((match) => console.error(`- ${match}`));
  process.exit(1);
}
