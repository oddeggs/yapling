import { colours, layout } from '@yapling/theme';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isDataError,
  useConnectivity,
  useData,
  useMemory,
  useProfile,
  useProgress,
  useSession,
  useWeek,
} from '../data';
import { apiBase } from '../data/config';
import { deviceTimeZone } from '../data/week';
import { Chip } from '../ui/chip';
import { Txt } from '../ui/text';

/**
 * The data layer's lab, for development builds only (`yapling-dev://data-lab`): the session, the
 * connection, the cached profile and progress, and buttons that write through the real API.
 * `?auto=save` saves the sample profile once the session is ready, when there is none yet.
 */
export default function DataLab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Lab />;
}

function Lab() {
  const session = useSession();
  // No learner on this phone yet: the guest is made by onboarding's age check, nothing else.
  if (session.session === null && ['awaiting_age', 'signed_out'].includes(session.status))
    return <NoLearner status={session.status} />;
  return <LabWithLearner />;
}

/** Before onboarding has made a guest: nothing to read or write yet. */
function NoLearner({ status }: { status: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colours.background,
        paddingTop: insets.top + 8,
        paddingHorizontal: layout.marginScreen,
        gap: 8,
      }}
    >
      <Txt variant="screenTitle">data lab</Txt>
      <Txt variant="note" colour={colours.text} testID="lab-session">{`session: ${status}`}</Txt>
      <Txt variant="note" colour={colours.textMuted}>
        No learner on this phone yet. Run onboarding first: its age check makes the guest.
      </Txt>
      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <Chip label="Start onboarding" onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}

function LabWithLearner() {
  const insets = useSafeAreaInsets();
  const data = useData();
  const session = useSession();
  const { online, pendingWrites } = useConnectivity();
  const profile = useProfile();
  const progress = useProgress();
  const week = useWeek();
  const memory = useMemory();
  const [last, setLast] = useState('—');
  const { auto } = useLocalSearchParams<{ auto?: string }>();
  const autoSaved = useRef(false);

  const run = (label: string, action: () => Promise<unknown>) => () => {
    setLast(`${label}…`);
    action().then(
      () => setLast(`${label}: ok`),
      (error: unknown) => setLast(`${label}: ${isDataError(error) ? error.kind : String(error)}`),
    );
  };

  const save = run('save', () =>
    profile.saveProfile({
      displayName: 'Lan',
      firstLanguage: 'vi',
      roommate: { species: 'redpanda', name: 'Pip' },
      track: 'life',
      quietHours: { start: '22:00', end: '08:00' },
      timezone: deviceTimeZone(),
      notificationsAllowed: false,
    }),
  );

  useEffect(() => {
    if (auto !== 'save' || autoSaved.current) return;
    if (session.status !== 'ready' || profile.source !== 'server' || profile.profile) return;
    autoSaved.current = true;
    save();
  });

  const line = (label: string, value: string) => (
    <Txt variant="note" colour={colours.text} testID={`lab-${label}`}>{`${label}: ${value}`}</Txt>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colours.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: layout.marginScreen,
        gap: 6,
      }}
    >
      <Txt variant="screenTitle">data lab</Txt>
      {line('api', apiBase())}
      {line(
        'session',
        `${session.status} ${session.session?.kind ?? ''} ${session.session?.userId ?? ''}`,
      )}
      {line('online', `${String(online)} · queued writes ${pendingWrites}`)}
      {line(
        'profile',
        `${profile.status} from ${profile.source}${profile.error ? ` (last error ${profile.error})` : ''}`,
      )}
      {line(
        'learner',
        profile.profile
          ? `${profile.profile.displayName} · ${profile.profile.roommate.name} · rev ${profile.profile.revision}`
          : '(no profile)',
      )}
      {line(
        'progress',
        progress.progress
          ? `rev ${progress.progress.revision} from ${progress.source} · installed ${progress.progress.installedOn}`
          : `${progress.status}`,
      )}
      {line(
        'week',
        week
          ? `week ${week.week} day ${week.dayIndex} · ${week.ring.slots.map((s) => s.status).join(' ')}`
          : '—',
      )}
      {line('memory', `${memory.items.length} items from ${memory.source}`)}
      {line('last', last)}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Chip label="Save profile" onPress={save} />
        <Chip
          label="Rename Pip"
          onPress={run('rename', () =>
            profile.updateProfile({
              roommate: {
                species: 'redpanda',
                name: profile.profile?.roommate.name === 'Pip' ? 'Mochi' : 'Pip',
              },
            }),
          )}
        />
        <Chip
          label="Remember"
          onPress={run('remember', () =>
            memory.addMemory({ text: `Note ${memory.items.length + 1}`, category: 'about_you' }),
          )}
        />
        <Chip label="Refresh" onPress={run('refresh', () => data.resume())} />
      </View>
    </ScrollView>
  );
}
