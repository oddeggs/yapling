import type { CallKind, FirstLanguage, HangupReason, Pace, Stage } from '@yapling/contracts';
import { findLine, type Scene } from '@yapling/story';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { useLocale } from '../../ui/locale';
import { callPropertiesOf, track, type TooHardChoice } from '../../observability';
import type { CallState } from '../../voice/call-state';
import type { VoiceEngine } from '../../voice/engine';
import { TooHardSheet, type TooHardChoice as SheetChoice } from '../payoff/too-hard-sheet';
import { ExitSheet } from './exit-sheet';
import { scaffoldView, type ScaffoldView } from './scaffold';
import { PaceToast, ReplayRow, SayCards, TaskCard } from './scaffold-cards';
import type { TrackerEvent, TrackerState } from './tracker';

/*
 * The call screen's beginner help, wired: the say-this cards and the task card, "Nói lại" /
 * "Chậm thôi" / "Gợi ý" / "Bỏ qua" over the bar, and the way out through "Rời cuộc gọi?" with its
 * "Khó quá" (slower from the next line, or practise with Linh first, ending the call as too hard so
 * the scene keeps its place).
 */

export interface CallHelpInput {
  readonly engine: VoiceEngine | null;
  readonly state: CallState;
  readonly tracker: TrackerState;
  readonly dispatch: (event: TrackerEvent) => void;
  readonly scene: Scene;
  readonly kind: CallKind;
  readonly stage: Stage;
  readonly firstLanguage: FirstLanguage;
  /** The call is live and its scene still going. */
  readonly live: boolean;
  readonly hintShown: boolean;
  /** The pace the call started at. */
  readonly pace: Pace | null;
  /** The place line for "Rời cuộc gọi?" ("Quán Lantern"). */
  readonly place: string;
  /** Where the slower-voices toast drops in, under the speaker pill. */
  readonly toastTop: number;
  /** Leaves the call as the bar's exit always has (`too_hard`: to practise with Linh first). */
  readonly leave: (reason?: HangupReason) => void;
  /** The learner slowed the voices: kept on the profile for the calls after. */
  readonly onPace?: ((pace: Pace) => void) | undefined;
}

/** "02:40": minutes and seconds into the call. */
const elapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1_000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const choiceOf = (choice: SheetChoice): TooHardChoice =>
  choice === 'slower' ? 'slower' : 'practise_with_linh';

export interface CallHelp {
  readonly view: ScaffoldView;
  /** Above the learner's caption: the task card. */
  readonly task: ReactNode;
  /** Below it: the say-this cards. */
  readonly cards: ReactNode;
  /** Right over the call bar: the pills. */
  readonly pills: ReactNode;
  /** Over everything: "Rời cuộc gọi?", "Khó quá" and the slower-voices toast. */
  readonly overlay: ReactNode;
  readonly onExit: () => void;
}

export function useCallHelp(input: CallHelpInput): CallHelp {
  const { engine, state, tracker, dispatch, scene, kind, stage, live } = input;
  const { t } = useLocale();
  const [pace, setPace] = useState<Pace | null>(input.pace);
  const [sheet, setSheet] = useState<'exit' | 'tooHard' | null>(null);
  const [slowedAt, setSlowedAt] = useState<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (live && startedAt.current === null) startedAt.current = Date.now();
  }, [live]);
  // The scene ended or the call dropped with a sheet up: the sheet goes.
  useEffect(() => {
    if (!live) setSheet(null);
  }, [live]);

  const view = scaffoldView({
    call: state,
    tracker,
    scene,
    stage,
    firstLanguage: input.firstLanguage,
    live,
    hintShown: input.hintShown,
    pace,
  });

  const replay = useCallback(
    (slower: boolean) => {
      if (!engine?.requestReplay(slower)) return;
      track('replay_tapped', { ...callPropertiesOf(kind, scene.id, state.turnMode), slower });
    },
    [engine, kind, scene.id, state.turnMode],
  );
  const hear = useCallback(
    (lineId: string) => {
      const line = findLine(lineId);
      if (line) engine?.playRecordedLocally(lineId, line.character);
    },
    [engine],
  );

  const onExit = () => {
    if (!live || !engine) {
      input.leave();
      return;
    }
    setNow(Date.now());
    setSheet('exit');
  };
  const openTooHard = () => {
    setSheet('tooHard');
    track('too_hard_opened', { place: 'call_exit', stage });
  };
  const choose = (choice: SheetChoice) => {
    track('too_hard_chosen', { place: 'call_exit', stage, choice: choiceOf(choice) });
    setSheet(null);
    if (choice === 'slower') {
      engine?.changePace('slower');
      setPace('slower');
      setSlowedAt(Date.now());
      input.onPace?.('slower');
      return;
    }
    // Practise with Linh first: the call ends as too hard, and the scene keeps its place.
    input.leave('too_hard');
  };

  const where = t('call.exit.where', {
    place: input.place,
    time: elapsed(now - (startedAt.current ?? now)),
  });
  const overlay = (
    <>
      {slowedAt !== null ? (
        <PaceToast
          key={slowedAt}
          text={t('call.paceSlower')}
          style={{ position: 'absolute', left: 0, right: 0, top: input.toastTop }}
        />
      ) : null}
      {sheet === 'exit' ? (
        <ExitSheet
          where={where}
          onTooHard={openTooHard}
          onStay={() => setSheet(null)}
          onLeave={() => {
            setSheet(null);
            input.leave();
          }}
        />
      ) : sheet === 'tooHard' ? (
        <TooHardSheet
          stage={stage}
          onChoose={choose}
          onClose={() => {
            track('too_hard_chosen', { place: 'call_exit', stage, choice: 'closed' });
            setSheet(null);
          }}
          copy={{
            slowerSub: t('call.tooHard.slowerSub'),
            practiseSub: t('call.tooHard.linhSub'),
            back: t('call.tooHard.back'),
          }}
        />
      ) : null}
    </>
  );

  return {
    view,
    task: view.task ? (
      <TaskCard
        text={view.task.text}
        trigger={view.task.key}
        onOk={() => dispatch({ type: 'task_dismissed' })}
      />
    ) : null,
    cards: view.cards ? <SayCards view={view.cards} canHear={view.canHear} onHear={hear} /> : null,
    pills: (
      <ReplayRow
        replay={view.replay}
        hint={view.hint}
        skip={view.skip}
        onReplay={replay}
        onHint={() => void engine?.requestHint()}
        onSkip={() => {
          if (engine?.skipTurn()) dispatch({ type: 'skip_requested' });
        }}
      />
    ),
    overlay,
    onExit,
  };
}
