#!/usr/bin/env node
// load-test/build.mjs
// Bundles all load-test entry points with esbuild for k6.

import { build } from 'esbuild';
import { readdirSync } from 'fs';
import { join } from 'path';

const dir = new URL('.', import.meta.url).pathname;
const entries = readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.includes('helpers') && f !== 'build.mjs')
  .map((f) => join(dir, f));

await build({
  entryPoints: entries,
  bundle: true,
  outdir: join(dir, 'dist'),
  format: 'esm',
  target: 'es2020',
  external: ['k6', 'k6/*'],
  tsconfig: join(dir, 'tsconfig.json'),
  logLevel: 'info',
});
