/**
 * Heuristic map: a symbol found in the app binary → the Info.plist usage-description key
 * Apple requires when that API is used.
 *
 * severity 'fail' = the key is mandatory when the API is present (missing it crashes at runtime
 * AND gets the build rejected). severity 'warn' = usually required, but context-dependent.
 */
export const API_USAGE = [
  { key: 'NSCameraUsageDescription', label: 'camera', severity: 'fail', symbols: ['AVCaptureDevice', 'AVCaptureSession', 'AVCapturePhotoOutput'] },
  { key: 'NSMicrophoneUsageDescription', label: 'microphone', severity: 'fail', symbols: ['AVAudioRecorder'] },
  { key: 'NSPhotoLibraryUsageDescription', label: 'photo library', severity: 'fail', symbols: ['PHPhotoLibrary', 'UIImagePickerController'] },
  { key: 'NSLocationWhenInUseUsageDescription', label: 'location', severity: 'fail', symbols: ['CLLocationManager'] },
  { key: 'NSContactsUsageDescription', label: 'contacts', severity: 'fail', symbols: ['CNContactStore'] },
  { key: 'NSCalendarsUsageDescription', label: 'calendar', severity: 'fail', symbols: ['EKEventStore'] },
  { key: 'NSMotionUsageDescription', label: 'motion & fitness', severity: 'fail', symbols: ['CMMotionManager', 'CMPedometer'] },
  { key: 'NSSpeechRecognitionUsageDescription', label: 'speech recognition', severity: 'fail', symbols: ['SFSpeechRecognizer'] },
  { key: 'NSHealthShareUsageDescription', label: 'health data', severity: 'fail', symbols: ['HKHealthStore'] },
  { key: 'NSAppleMusicUsageDescription', label: 'media library', severity: 'fail', symbols: ['MPMediaLibrary'] },
  { key: 'NSUserTrackingUsageDescription', label: 'tracking (App Tracking Transparency)', severity: 'fail', symbols: ['ATTrackingManager'] },
  { key: 'NSBluetoothAlwaysUsageDescription', label: 'Bluetooth', severity: 'fail', symbols: ['CBCentralManager', 'CBPeripheralManager'] },
  { key: 'NSFaceIDUsageDescription', label: 'Face ID', severity: 'warn', symbols: ['LAContext'] },
  { key: 'NSLocalNetworkUsageDescription', label: 'local network', severity: 'warn', symbols: ['NWBrowser', 'NetService'] },
];
