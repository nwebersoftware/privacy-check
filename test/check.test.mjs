import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';

import { checkPrivacy, formatReport } from '../src/check.mjs';

function makeZip(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const data = Buffer.from(f.data);
    const crc = crc32(data) >>> 0;
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(data.length, 18);
    lfh.writeUInt32LE(data.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    parts.push(lfh, nameBuf, data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += lfh.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBuf, eocd]);
}

function infoPlist({ keys = {} } = {}) {
  const entries = Object.entries(keys)
    .map(([k, v]) => `  <key>${k}</key><string>${v}</string>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key><string>com.example.demo</string>
  <key>CFBundleExecutable</key><string>Demo</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundleVersion</key><string>7</string>
${entries}
</dict></plist>`;
}

const binary = (...symbols) => Buffer.from('\x00' + symbols.join('\x00') + '\x00');

function ipa({ plist, bin }) {
  const files = [{ name: 'Payload/Demo.app/Info.plist', data: plist }];
  if (bin) files.push({ name: 'Payload/Demo.app/Demo', data: bin });
  return makeZip(files);
}

test('passes when a used API is declared', () => {
  const report = checkPrivacy(
    ipa({
      plist: infoPlist({ keys: { NSCameraUsageDescription: 'To take photos.' } }),
      bin: binary('AVCaptureDevice'),
    }),
  );
  assert.equal(report.ok, true);
});

test('fails when a used API is not declared', () => {
  const report = checkPrivacy(
    ipa({
      plist: infoPlist({ keys: { NSCameraUsageDescription: 'To take photos.' } }),
      bin: binary('AVCaptureDevice', 'CLLocationManager'),
    }),
  );
  assert.equal(report.ok, false);
  assert.ok(report.failed.some((c) => c.id === 'NSLocationWhenInUseUsageDescription'));
});

test('warns about a declared-but-unused key', () => {
  const report = checkPrivacy(
    ipa({
      plist: infoPlist({
        keys: { NSCameraUsageDescription: 'x', NSPhotoLibraryUsageDescription: 'y' },
      }),
      bin: binary('AVCaptureDevice'),
    }),
  );
  assert.equal(report.ok, true);
  assert.ok(report.warned.some((c) => c.id === 'NSPhotoLibraryUsageDescription:unused'));
});

test('degrades gracefully without a binary', () => {
  const report = checkPrivacy(ipa({ plist: infoPlist({ keys: {} }) }));
  assert.ok(report.warned.some((c) => c.id === 'binary'));
});

test('tracking API requires the ATT key', () => {
  const report = checkPrivacy(ipa({ plist: infoPlist({ keys: {} }), bin: binary('ATTrackingManager') }));
  assert.equal(report.ok, false);
  assert.ok(report.failed.some((c) => c.id === 'NSUserTrackingUsageDescription'));
});

test('report renders', () => {
  const text = formatReport(checkPrivacy(ipa({ plist: infoPlist({ keys: {} }), bin: binary('AVCaptureDevice') })), 'Demo.ipa');
  assert.match(text, /privacy-check/);
  assert.match(text, /FAIL/);
});

test('rejects non-ipa input', () => {
  const report = checkPrivacy(Buffer.from('nope'));
  assert.equal(report.ok, false);
  assert.ok(report.failed.some((c) => c.id === 'ipa'));
});
