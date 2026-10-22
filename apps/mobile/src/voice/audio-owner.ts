/*
 * Who holds the app's one audio session. A call and the story's line players each set the shared
 * AVAudioSession up for themselves (play-and-record for a call, playback for a story); whoever
 * set it up last owns it. Only the owner may deactivate it: a story screen that unmounts after a
 * call has started, or a call torn down after the next one began, must leave the session alone,
 * or the newer player's audio graph stops under it and its clock stands still.
 */

export type AudioUse = 'call' | 'listen';

export interface AudioClaim {
  readonly use: AudioUse;
  readonly id: number;
}

let next = 0;
let owner: AudioClaim | null = null;

/** Takes the session for a player that is about to set it up. */
export function claimAudio(use: AudioUse): AudioClaim {
  next += 1;
  owner = { use, id: next };
  return owner;
}

/** The claim still owns the session (nobody set it up since). */
export function ownsAudio(claim: AudioClaim | null): boolean {
  return claim !== null && owner?.id === claim.id;
}

/**
 * Gives the session up. True when the claim still owned it, so the caller should deactivate it;
 * false when someone else has it now, so the caller must leave it alone.
 */
export function releaseAudio(claim: AudioClaim | null): boolean {
  if (!ownsAudio(claim)) return false;
  owner = null;
  return true;
}

/** Who owns the session now, for diagnostics. */
export function audioOwner(): AudioClaim | null {
  return owner;
}
