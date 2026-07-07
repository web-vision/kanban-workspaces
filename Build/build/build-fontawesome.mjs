// Publishes the Font Awesome Free artifacts from the npm package into the
// extension's public folder. This replaces the previously hand-committed vendor
// files: the stylesheet and the woff2 webfonts are now reproducible from the
// pinned @fortawesome/fontawesome-free dependency.
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const buildDir = dirname(dirname(fileURLToPath(import.meta.url)));
const faDir = join(buildDir, 'node_modules', '@fortawesome', 'fontawesome-free');
const publicDir = join(buildDir, '..', 'Resources', 'Public');
const cssDest = join(publicDir, 'Css', 'Fontawesome.min.css');
const fontsSrc = join(faDir, 'webfonts');
const fontsDest = join(publicDir, 'webfonts');

console.log('Publishing Font Awesome -> Resources/Public ...');

// Stylesheet: the "all" bundle carries the @font-face declarations and every
// icon class; it references the sibling ../webfonts/ directory.
mkdirSync(dirname(cssDest), { recursive: true });
copyFileSync(join(faDir, 'css', 'all.min.css'), cssDest);

// Webfonts: ship woff2 only (matches the previously committed set and all
// supported TYPO3 backend browsers load woff2).
mkdirSync(fontsDest, { recursive: true });
for (const file of readdirSync(fontsDest)) {
  if (file.endsWith('.woff2')) {
    rmSync(join(fontsDest, file));
  }
}
let count = 0;
for (const file of readdirSync(fontsSrc)) {
  if (file.endsWith('.woff2')) {
    copyFileSync(join(fontsSrc, file), join(fontsDest, file));
    count += 1;
  }
}

console.log(`Done: Fontawesome.min.css + ${count} webfont(s) written.`);
