import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';

import { useLocale } from '../../ui';
import { DeleteButtons, DeleteConfirm } from './delete-confirm';
import { MeFrame } from './me-frame';
import { memoryGroups, meView, type MeInputs } from './me-model';
import { MeSheet } from './me-sheet';
import { MemoryPage } from './memory-page';

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
}

export interface MeContainerProps {
  /** Null while the profile and progress load. */
  readonly inputs: MeInputs | null;
  readonly actions: MeActions;
}

type Page = 'main' | 'memory' | 'delete';

/** The Me sheet, its memory page and the delete confirmation, with navigation to the rest. */
export function MeContainer({ inputs, actions }: MeContainerProps) {
  const router = useRouter();
  const { t } = useLocale();
  const copy = t;
  const [page, setPage] = useState<Page>('main');
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

  return (
    <MeFrame onClose={close} closeLabel={closeLabel}>
      <MeSheet
        view={meView(inputs, copy)}
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
