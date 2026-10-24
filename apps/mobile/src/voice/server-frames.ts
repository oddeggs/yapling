import type { CallServerFrame } from '@yapling/contracts';

import type { CallState } from './call-state';
import type { CallPlayer } from './player';
import type { ReplyWatcher } from './reply-watch';

/*
 * What each frame from the call does on the phone: lines to the player, the rest to the call
 * screen's state. The engine buffers line frames until its player exists.
 */

export interface FrameHost {
  readonly player: CallPlayer | null;
  readonly replies: ReplyWatcher;
  patch(p: Partial<CallState>): void;
  log(message: string): void;
  /** A reply failed: the turn is the learner's again. */
  giveTurnBack(): void;
  socketClosed(): boolean;
  /** `ended` arrived: the hang-up has its answer. */
  ended(): void;
  teardown(): void;
}

export function applyServerFrame(frame: CallServerFrame, host: FrameHost): void {
  switch (frame.type) {
    case 'say_start':
      host.player?.startLive(frame.streamId, frame.character, frame.codec, frame.sampleRateHz);
      break;
    case 'alignment':
      host.player?.pushAlignment(frame.streamId, frame.chars, frame.startMs, frame.endMs);
      break;
    case 'say_end':
      host.player?.endLive(frame.streamId);
      break;
    case 'play_rec':
      host.player?.playRecorded(frame.streamId, frame.lineId, frame.character);
      break;
    case 'partial':
      host.patch({ learnerText: frame.text, learnerFinal: false });
      break;
    case 'not_heard':
      // No real words in the turn: nothing is coming, the turn is the learner's again.
      host.log('not heard: no words in the turn');
      host.replies.on({ type: 'settled' });
      host.patch({ awaitingReply: false, serverThinking: false, notice: 'not_heard' });
      break;
    case 'heard':
      host.replies.on({ type: 'answering', atMs: Date.now() });
      host.patch({ learnerText: frame.text, learnerFinal: true, awaitingReply: true });
      break;
    case 'beat':
      host.patch({ beat: frame });
      break;
    case 'hint':
      host.patch({ hint: frame });
      break;
    case 'correction':
      host.patch({ correction: frame });
      break;
    case 'correction_resolved':
      host.patch({ correction: null });
      break;
    case 'meaning':
      host.patch({ meaning: frame });
      break;
    case 'gloss':
      host.patch({ gloss: { streamId: frame.streamId, text: frame.text } });
      break;
    case 'minutes':
      host.patch({ secondsLeft: frame.secondsLeft, wrappingUp: frame.wrappingUp });
      break;
    case 'safety':
      host.patch({ safety: frame.kind, safetyResourcesKey: frame.resourcesKey });
      break;
    case 'thinking':
      if (frame.state === 'start') host.replies.on({ type: 'answering', atMs: Date.now() });
      host.patch({ serverThinking: frame.state === 'start' });
      break;
    case 'error':
      host.log(`error ${frame.code}${frame.fatal ? ' (fatal)' : ''}`);
      if (frame.fatal) {
        host.patch({ error: frame.code });
        if (host.socketClosed()) host.teardown();
      } else {
        // A reply (or the listening) failed: the turn is the learner's again.
        host.patch({ warning: frame.code });
        host.giveTurnBack();
      }
      break;
    case 'ended':
      host.ended();
      host.patch({
        endReason: frame.reason,
        summaryPending: frame.summaryPending,
        callRecordId: frame.callRecordId,
      });
      host.teardown();
      break;
    case 'ready':
    case 'unknown':
      break;
  }
}
