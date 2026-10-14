#!/usr/bin/env node
import { readFileSync } from 'node:fs';

import { checkPrivacy, formatReport } from '../src/check.mjs';

const HELP = `privacy-check — catch missing iOS privacy usage descriptions before review

Usage:
  privacy-check <App.ipa>

Scans the app binary for privacy-sensitive APIs (camera, mic, photos, location, contacts,
tracking, …) and checks that every required Info.plist usage-description key is declared.

Exit: 0 clean · 1 blocking issue(s) · 2 bad input.
`;

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  process.stdout.write(HELP);
  process.exit(args.length === 0 ? 2 : 0);
}

const file = args[0];
let buf;
try {
  buf = readFileSync(file);
} catch (e) {
  process.stderr.write(`cannot read ${file}: ${e.message}\n`);
  process.exit(2);
}

const report = checkPrivacy(buf);
process.stdout.write(formatReport(report, file) + '\n');
process.exit(report.ok ? 0 : 1);
