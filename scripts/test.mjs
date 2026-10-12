import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

// Reuse Vite's TypeScript transform without adding a second test toolchain.
const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  root,
  configFile: false,
  logLevel: 'error',
  build: {
    ssr: 'tests/core.test.mjs',
    outDir: '.cache/tests',
    emptyOutDir: true,
    minify: false,
    rolldownOptions: { output: { entryFileNames: 'core.test.mjs' } },
  },
});
const result = spawnSync(process.execPath, ['--test', '.cache/tests/core.test.mjs'], {
  cwd: root,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
