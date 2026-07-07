// Compiles the extension SCSS sources to the public stylesheet.
//
// Pipeline mirrors the TYPO3 core CSS build: sass -> postcss (autoprefixer +
// cssnano). Output lands in Resources/Public/Css/Styles.css where the backend
// controller references it via addCssFile().
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import * as sass from 'sass';

const buildDir = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(buildDir, 'Sources', 'Sass', 'styles.scss');
const destDir = join(buildDir, '..', 'Resources', 'Public', 'Css');
const dest = join(destDir, 'Styles.css');

const banner = `/*
 * This file is part of the web-vision/kanban_workspaces TYPO3 extension.
 *
 * Generated from Build/Sources/Sass/styles.scss - do not edit directly, change
 * the SCSS source and re-run "npm run build:css" instead.
 */
`;

console.log('Compiling SCSS -> Resources/Public/Css/Styles.css ...');
const compiled = sass.compile(src, {
  style: 'expanded',
  loadPaths: [join(buildDir, 'Sources', 'Sass')],
});

const processed = await postcss([
  autoprefixer(),
  cssnano({ preset: ['default', { normalizeWhitespace: false }] }),
]).process(compiled.css, { from: src, to: dest });

// Drop the leading `@charset` rule cssnano emits: it would be preceded by the
// license banner comment and therefore ignored anyway; the backend serves the
// stylesheet as UTF-8 regardless.
const css = processed.css.replace(/^@charset "[^"]+";\s*/, '');

mkdirSync(destDir, { recursive: true });
writeFileSync(dest, banner + css + '\n');

console.log('Done: Styles.css written.');
