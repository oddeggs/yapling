/*
 * The voice engine: everything the phone does in a live call. The call screen creates a
 * `VoiceEngine`, reads `engine.state` with `useStore` and runs `useLipsyncClock(engine.lipsync)`;
 * captions read `lipsync.charIndex` and mouths `lipsync.mouth` on the UI thread.
 */
export { VoiceEngine, storyRecordedLines, type VoiceEngineOptions } from './engine';
export { micPermissionStatus, requestMicPermission, type MicPermission } from './audio-session';
export {
  CALL_PHASES,
  type CallNotice,
  type CallPhase,
  type CallState,
  type CaptionLine,
  type LatencySample,
} from './call-state';
export {
  useLipsyncClock,
  lipsyncAt,
  type Lipsync,
  type LipsyncFrame,
  type LipsyncSource,
} from './lipsync';
export {
  MOUTHS,
  localVisemeTrack,
  mouthAt,
  type Mouth,
  type VisemeTrack,
  type VisemeTrackFn,
} from './visemes';
export { charIndexAt, trackFromTiming, type CaptionTrack } from './caption-clock';
export { Store, useStore } from './store';
export type { HelloFields, SocketFactory, SocketLike } from './call-socket';
