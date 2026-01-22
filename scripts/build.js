// Build script using esbuild
import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const commonConfig = {
  bundle: true,
  minify: false,
  sourcemap: true,
  target: ['chrome100'],
  format: 'esm',
};

async function build() {
  try {
    // Build content script (IIFE format - no imports needed)
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/content/content-script.ts'],
      outfile: 'dist/content/content-script.js',
      format: 'iife', // Content scripts need IIFE, not ESM
    });
    console.log('✓ Content script built');

    // Build popup
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/popup/popup.ts'],
      outfile: 'dist/popup/popup.js',
      format: 'iife',
    });
    console.log('✓ Popup built');

    // Build service worker
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/background/service-worker.ts'],
      outfile: 'dist/background/service-worker.js',
      format: 'esm', // Service workers support ESM
    });
    console.log('✓ Service worker built');

    console.log('\\n🎉 Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

async function watch() {
  const contexts = await Promise.all([
    esbuild.context({
      ...commonConfig,
      entryPoints: ['src/content/content-script.ts'],
      outfile: 'dist/content/content-script.js',
      format: 'iife',
    }),
    esbuild.context({
      ...commonConfig,
      entryPoints: ['src/popup/popup.ts'],
      outfile: 'dist/popup/popup.js',
      format: 'iife',
    }),
    esbuild.context({
      ...commonConfig,
      entryPoints: ['src/background/service-worker.ts'],
      outfile: 'dist/background/service-worker.js',
      format: 'esm',
    }),
  ]);

  await Promise.all(contexts.map(ctx => ctx.watch()));
  console.log('👀 Watching for changes...');
}

if (isWatch) {
  watch();
} else {
  build();
}

