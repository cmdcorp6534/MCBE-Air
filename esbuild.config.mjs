import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const debug = process.argv.includes('--debug');

const options = {
    entryPoints: ['src/main.ts'],
    bundle: true,
    format: 'esm',
    external: ['@minecraft/server'],
    outfile: 'scripts/main.js',
    logLevel: 'info',
    ...(debug ? {
        sourcemap: 'inline',
        sourcesContent: false
    } : {})
};

if (watch) {
    const context = await esbuild.context(options);
    await context.watch();
}
else {
    await esbuild.build(options);
}
