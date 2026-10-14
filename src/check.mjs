import { readZip, readEntry } from '@njweber/ipa-check/src/zip.mjs';
import { parsePlist } from '@njweber/ipa-check/src/plist.mjs';

import { API_USAGE } from './api.mjs';

const INFO_RE = /^Payload\/[^/]+\.app\/Info\.plist$/;
const APP_FILE_RE = /^Payload\/[^/]+\.app\/([^/]+)$/;

function finish(checks) {
  const failed = checks.filter((c) => c.severity === 'fail' && !c.ok);
  const warned = checks.filter((c) => c.severity === 'warn' && !c.ok);
  return { ok: failed.length === 0, checks, failed, warned };
}

function lookup(infoPath, zip, execName) {
  const appDir = infoPath.replace(/\/Info\.plist$/, '');
  if (execName) {
    try {
      const buf = readEntry(zip, `${appDir}/${execName}`);
      if (buf) return { name: execName, buf };
    } catch {
      /* fall through to the extensionless scan */
    }
  }
  const cand = zip.entries.map((e) => e.name).find((n) => APP_FILE_RE.test(n) && !n.split('/').pop().includes('.'));
  if (!cand) return null;
  try {
    const buf = readEntry(zip, cand);
    if (buf) return { name: cand.split('/').pop(), buf };
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Audit an .ipa: find the privacy-sensitive APIs the binary actually references, then check that
 * every required usage-description key is declared in Info.plist.
 */
export function checkPrivacy(buf) {
  const checks = [];
  const add = (id, severity, ok, detail) => checks.push({ id, severity, ok, detail });

  let zip;
  try {
    zip = readZip(buf);
  } catch (e) {
    add('ipa', 'fail', false, `not a valid .ipa: ${e.message}`);
    return finish(checks);
  }

  const infoPath = zip.entries.map((e) => e.name).find((n) => INFO_RE.test(n));
  if (!infoPath) {
    add('info-plist', 'fail', false, 'no Payload/*.app/Info.plist found (is this an .ipa?)');
    return finish(checks);
  }

  let info;
  try {
    info = parsePlist(readEntry(zip, infoPath));
  } catch (e) {
    add('info-plist', 'fail', false, `could not parse Info.plist: ${e.message}`);
    return finish(checks);
  }

  const bin = lookup(infoPath, zip, info.CFBundleExecutable);
  if (!bin) {
    add('binary', 'warn', false, 'could not locate the app binary — API scan skipped (only declarations checked)');
  } else {
    add('binary', 'fail', true, `scanned ${bin.name}`);
  }

  const declared = (key) => typeof info[key] === 'string' && info[key].trim().length > 0;
  const found = new Set();

  if (bin) {
    for (const entry of API_USAGE) {
      const hit = entry.symbols.find((s) => bin.buf.includes(s));
      if (!hit) continue;
      found.add(entry.key);
      const ok = declared(entry.key);
      add(
        entry.key,
        entry.severity,
        ok,
        ok
          ? `${entry.label} used (${hit}); ${entry.key} declared`
          : `${entry.label} used (${hit}) but ${entry.key} is MISSING — the app will crash on first use and the build will be rejected`,
      );
    }
  }

  for (const entry of API_USAGE) {
    if (found.has(entry.key)) continue;
    if (declared(entry.key)) {
      add(`${entry.key}:unused`, 'warn', false, `${entry.key} is declared but no matching API was found — likely unnecessary`);
    }
  }

  return finish(checks);
}

export function formatReport(report, label = '') {
  const out = ['privacy-check — iOS privacy usage audit'];
  if (label) out.push(`artifact: ${label}`);
  out.push('');
  if (report.checks.length === 0) {
    out.push('No privacy-sensitive APIs detected.');
    return out.join('\n');
  }
  for (const c of report.checks) {
    out.push(`${c.ok ? '✓' : c.severity === 'fail' ? '✗' : '!'} ${c.id}  ${c.detail}`);
  }
  out.push('');
  if (report.ok) out.push(report.warned.length ? `PASS (${report.warned.length} warning${report.warned.length > 1 ? 's' : ''})` : 'PASS — every detected API is declared.');
  else out.push(`FAIL — ${report.failed.length} blocking issue${report.failed.length > 1 ? 's' : ''}.`);
  return out.join('\n');
}
