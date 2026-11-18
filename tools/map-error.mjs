import fs from 'node:fs';
import { SourceMapConsumer } from 'source-map';

const lineArg = process.argv[2];
const columnArg = process.argv[3];

if (lineArg === undefined) {
    console.error('Usage: npm run map:error -- <line> [column]');
    console.error('Example: npm run map:error -- 123 45');
    process.exit(1);
}

const line = Number(lineArg);
const column = columnArg === undefined ? 0 : Number(columnArg);

if (!Number.isInteger(line) || line < 1) {
    console.error('Line must be a positive integer.');
    process.exit(1);
}
if (!Number.isInteger(column) || column < 0) {
    console.error('Column must be a non-negative integer.');
    process.exit(1);
}

const bundlePath = new URL('../scripts/main.js', import.meta.url);
const code = fs.readFileSync(bundlePath, 'utf8');
const match = /\/\/# sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/.exec(code);

if (match === null) {
    console.error('scripts/main.js does not contain an inline source map.');
    console.error('Build with `npm run build:debug` or run `npm run watch:debug` first.');
    process.exit(1);
}

const rawMap = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
const consumer = await new SourceMapConsumer(rawMap);

// Minecraft reports 1-based lines and usually 1-based columns. Source maps use
// 1-based lines and 0-based columns, so subtract one from the column.
const original = consumer.originalPositionFor({
    line,
    column: Math.max(0, column - 1)
});

if (original.source === null || original.line === null) {
    console.log(`No mapping found for main.js:${line}:${column}.`);
    consumer.destroy?.();
    process.exit(0);
}

const source = original.source.replace(/^\.\.\//, '');
console.log(`${source}:${original.line}:${original.column ?? 0}`);

consumer.destroy?.();
