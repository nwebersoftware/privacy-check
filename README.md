# privacy-check

[![npm](https://img.shields.io/npm/v/%40njweber%2Fprivacy-check)](https://www.npmjs.com/package/@njweber/privacy-check) [![downloads](https://img.shields.io/npm/dm/%40njweber%2Fprivacy-check)](https://www.npmjs.com/package/@njweber/privacy-check) [![CI](https://github.com/nwebersoftware/privacy-check/actions/workflows/ci.yml/badge.svg)](https://github.com/nwebersoftware/privacy-check/actions/workflows/ci.yml)


**Catch a missing iOS privacy usage description before App Store review does.** `privacy-check` scans
the app binary for privacy-sensitive APIs, then checks that every required `Info.plist` key is
declared.

```bash
npx @njweber/privacy-check ./build/YourApp.ipa
```

```
privacy-check — iOS privacy usage audit
artifact: ./build/YourApp.ipa

✓ binary  scanned Demo
✓ NSCameraUsageDescription  camera used (AVCaptureDevice); NSCameraUsageDescription declared
✗ NSUserTrackingUsageDescription  tracking (App Tracking Transparency) used (ATTrackingManager) but
    NSUserTrackingUsageDescription is MISSING — the app will crash on first use and the build will be rejected

FAIL — 1 blocking issue.
```

## Why

Missing usage-description keys are one of the most common App Store rejections **and** a guaranteed
runtime crash the moment the API is touched. They're trivial to check and easy to overlook — especially
in React Native / Expo apps where a dependency pulls in the API, not your own code.

## What it maps

| API detected in the binary | Required `Info.plist` key |
|---|---|
| `AVCaptureDevice` / `AVCaptureSession` | `NSCameraUsageDescription` |
| `AVAudioRecorder` | `NSMicrophoneUsageDescription` |
| `PHPhotoLibrary` / `UIImagePickerController` | `NSPhotoLibraryUsageDescription` |
| `CLLocationManager` | `NSLocationWhenInUseUsageDescription` |
| `CNContactStore` | `NSContactsUsageDescription` |
| `EKEventStore` | `NSCalendarsUsageDescription` |
| `CMMotionManager` / `CMPedometer` | `NSMotionUsageDescription` |
| `SFSpeechRecognizer` | `NSSpeechRecognitionUsageDescription` |
| `HKHealthStore` | `NSHealthShareUsageDescription` |
| `MPMediaLibrary` | `NSAppleMusicUsageDescription` |
| `ATTrackingManager` | `NSUserTrackingUsageDescription` |
| `CBCentralManager` / `CBPeripheralManager` | `NSBluetoothAlwaysUsageDescription` |
| `LAContext` | `NSFaceIDUsageDescription` *(warn)* |
| `NWBrowser` / `NetService` | `NSLocalNetworkUsageDescription` *(warn)* |

It also flags **declared-but-unused** keys.

## Honest limits

It's a **heuristic**: it looks for API symbols in the binary. A symbol can be linked without the code
path being reachable (false positive → an extra warning), and a statically-analysed call can hide
(false negative). Treat it as a fast pre-flight, not a legal audit.

## Exit codes

`0` clean · `1` blocking issue(s) · `2` bad input.

## Family

`app-check` · `store-check` · `ipa-check` · `icon-check`

## License

MIT.
