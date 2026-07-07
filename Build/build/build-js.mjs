// Compiles the extension TypeScript sources to browser ES modules.
//
// TYPO3 resolves the extension modules through the backend import map
// (`@web-vision/kanban-workspaces/` -> Resources/Public/JavaScript/), so a
// plain 1:1 `tsc` transpile is enough: import specifiers are preserved and end
// up resolvable at runtime, `@typo3/*` imports stay external. This mirrors the
// TYPO3 core approach (tsc per-file transpile) without the bundling machinery.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const buildDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(buildDir, '..', 'Resources', 'Public', 'JavaScript');

const banner = `/*
 * This file is part of the web-vision/kanban_workspaces TYPO3 extension.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2 of the
 * License, or any later version.
 *
 * Generated from Build/Sources/TypeScript/ - do not edit directly, change the
 * TypeScript source and re-run "npm run build:js" instead.
 */
`;

function walk(dir, callback) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, callback);
    } else {
      callback(full);
    }
  }
}

// Remove previously generated artifacts so renamed/removed sources do not linger.
if (existsSync(outDir)) {
  walk(outDir, (file) => {
    if (file.endsWith('.js') || file.endsWith('.js.map')) {
      rmSync(file);
    }
  });
}

console.log('Compiling TypeScript -> Resources/Public/JavaScript ...');
execFileSync(
  join(buildDir, 'node_modules', '.bin', 'tsc'),
  ['--project', join(buildDir, 'tsconfig.json')],
  { stdio: 'inherit', cwd: buildDir },
);

// Prepend the license/generated banner to every emitted module.
let count = 0;
walk(outDir, (file) => {
  if (!file.endsWith('.js')) {
    return;
  }
  const contents = readFileSync(file, 'utf8');
  if (!contents.startsWith(banner)) {
    writeFileSync(file, banner + contents);
  }
  count += 1;
});

console.log(`Done: ${count} JavaScript module(s) written.`);
