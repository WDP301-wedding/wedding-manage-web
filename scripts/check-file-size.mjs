import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const maximum = 450;
const extensions = /\.(?:[cm]?[jt]sx?|css|scss)$/u;
const failures = [];
let checked = 0;

async function inspect(file) {
  if (!extensions.test(file)) return;
  const lines = (await readFile(file, 'utf8')).split(/\r?\n/u).length;
  checked++;
  if (lines > maximum) failures.push({ file: relative(root, file), lines });
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.isFile()) await inspect(file);
  }
}

for (const directory of ['app', 'src', 'scripts']) await walk(resolve(root, directory));
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile()) await inspect(resolve(root, entry.name));
}

if (failures.length) {
  console.error(`Files exceeding ${maximum} lines:`);
  for (const item of failures) console.error(`  ${item.file}: ${item.lines}`);
  process.exitCode = 1;
} else {
  console.log(`${checked} code/style files checked; every file is at most ${maximum} lines.`);
}
