import type { StageRequest } from '@yapling/contracts';
import { SETTLING_SCENES } from '@yapling/domain';
import { findScene } from '@yapling/story';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';

import { track } from '../../observability';
import { useLocale } from '../../ui';
import { TooHardSheet, type TooHardChoice } from '../payoff/too-hard-sheet';
import { DeleteButtons, DeleteConfirm } from './delete-confirm';
import { FasterSheet } from './faster-sheet';
import { MeFrame } from './me-frame';
import { memoryGroups, meView, type MeInputs } from './me-model';
import { MeSheet } from './me-sheet';
import { MemoryPage } from './memory-page';
import { SettlingPage } from './settling-page';
import { useRoommate } from './use-roommate';

/** What the Me sheet does with the learner's data; the app's data layer provides each. */
export interface MeActions {
  /** Changes a note's text (`PATCH /api/me/memory/:id`); rejects when it didn't save. */
  readonly updateMemory: (id: string, text: string) => Promise<void>;
  /** Deletes a note (`DELETE /api/me/memory/:id`). */
  readonly deleteMemory: (id: string) => Promise<void>;
  /** Deletes the account (`POST /api/me/delete`) and ends the session; rejects on failure. */
  readonly deleteAccount: () => Promise<void>;
  /** Quiet hours and notifications; iOS's settings for the app until a screen exists. */
  readonly openNotifications?: () => void;
  /** The time capsule, once it exists (Release 3); the row does nothing until then. */
  readonly openProgress?: () => void;
  /** A stage the learner chose (`POST /api/me/stage`), kept on the phone until it lands. */
  readonly requestStage?: (request: StageRequest) => void;
  /** "Nói chậm hơn": the slower pace on the profile. */
  readonly slowDown?: () => void;
}

export interface MeContainerProps {
  /** Null while the profile and progress load. */
  readonly inputs: MeInputs | null;
  readonly actions: MeActions;
}

type Page = 'main' | 'memory' | 'delete' | 'settling';
type Sheet = 'faster' | 'tooHard' | null;

/** The Me sheet, its memory page and the delete confirmation, with navigation to the rest. */
export function MeContainer({ inputs, actions }: MeContainerProps) {
  const router = useRouter();
  const { t } = useLocale();
  const copy = t;
  const [page, setPage] = useState<Page>('main');
  const [sheet, setSheet] = useState<Sheet>(null);
  const { species } = useRoommate();
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteFailed(false);
    try {
      await actions.deleteAccount();
      router.dismissAll();
      router.replace('/');
    } catch {
      setDeleteFailed(true);
    } finally {
      setDeleting(false);
    }
  };

  const closeLabel = t('common.a11y.close');
  if (inputs === null) {
    return (
      <MeFrame onClose={close} closeLabel={closeLabel}>
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      </MeFrame>
    );
  }

  if (page === 'memory') {
    return (
      <MeFrame onClose={close} closeLabel={closeLabel}>
        <MemoryPage
          title={copy('me.memory', { name: inputs.roommateName })}
          groups={memoryGroups(inputs.memory, copy)}
          roommateName={inputs.roommateName}
          copy={copy}
          onBack={() => setPage('main')}
          onUpdate={actions.updateMemory}
          onDelete={actions.deleteMemory}
        />
      </MeFrame>
    );
  }

  if (page === 'delete') {
    return (
      <MeFrame
        onClose={close}
        closeLabel={closeLabel}
        footer={
          <DeleteButtons
            copy={copy}
            busy={deleting}
            onKeep={() => setPage('main')}
            onDelete={() => void deleteAccount()}
          />
        }
      >
        <DeleteConfirm
          roommateName={inputs.roommateName}
          copy={copy}
          busy={deleting}
          failed={deleteFailed}
        />
      </MeFrame>
    );
  }

  if (page === 'settling') {
    const done = new Set(inputs.settlingDone ?? []);
    const next = SETTLING_SCENES.findIndex((_, i) => !done.has(i + 1)) + 1;
    return (
      <MeFrame onClose={close} closeLabel={closeLabel}>
        <SettlingPage
          title={copy('me.settling.replay')}
          chapters={SETTLING_SCENES.map((scene, i) => ({
            chapter: i + 1,
            title: findScene(scene)?.title ?? '',
            played: done.has(i + 1),
            open: done.has(i + 1) || i + 1 === next,
          }))}
          copy={copy}
          onBack={() => setPage('main')}
          onPlay={(chapter) => {
            const scene = SETTLING_SCENES[chapter - 1];
            if (scene) router.push({ pathname: '/(call)/call', params: { scene } });
          }}
        />
      </MeFrame>
    );
  }

  const onTooHard = (choice: TooHardChoice) => {
    setSheet(null);
    track('too_hard_chosen', {
      place: 'me',
      stage: inputs.stage,
      choice: choice === 'slower' ? 'slower' : 'practise_with_linh',
    });
    if (choice === 'slower') actions.slowDown?.();
    else if (inputs.stage === 'visitor') setPage('settling');
    else {
      actions.requestStage?.({ to: 'visitor', reason: 'too_hard' });
      setPage('settling');
    }
  };

  return (
    <MeFrame
      onClose={close}
      closeLabel={closeLabel}
      overlay={
        sheet === 'faster' ? (
          <FasterSheet
            roommateSpecies={species}
            onClose={() => setSheet(null)}
            onConfirm={() => {
              setSheet(null);
              actions.requestStage?.({ to: 'newcomer', reason: 'too_easy' });
            }}
          />
        ) : sheet === 'tooHard' ? (
          <TooHardSheet
            stage={inputs.stage}
            onClose={() => {
              setSheet(null);
              track('too_hard_chosen', { place: 'me', stage: inputs.stage, choice: 'closed' });
            }}
            onChoose={onTooHard}
          />
        ) : null
      }
    >
      <MeSheet
        view={meView(inputs, copy)}
        species={species}
        fasterOpen={sheet === 'faster'}
        onReplay={() => setPage('settling')}
        onFaster={() => setSheet('faster')}
        onTooHard={() => {
          setSheet('tooHard');
          track('too_hard_opened', { place: 'me', stage: inputs.stage });
        }}
        onPlus={() => router.push('/plus')}
        onMinutes={() => undefined}
        onProgress={() => actions.openProgress?.()}
        onMemory={() => setPage('memory')}
        onNotifications={() => (actions.openNotifications ?? (() => void Linking.openSettings()))()}
        onHelp={() => router.push('/safety')}
        onAiExplainer={() => router.push('/ai')}
        onDeleteData={() => {
          setDeleteFailed(false);
          setPage('delete');
        }}
      />
    </MeFrame>
  );
}
