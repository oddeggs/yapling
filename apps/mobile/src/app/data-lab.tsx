import { colours, layout } from '@yapling/theme';
import { Redirect } from 'expo-router';
import { useState } from 'react';
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
 */
export default function DataLab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Lab />;
}

function Lab() {
  const insets = useSafeAreaInsets();
  const data = useData();
  const session = useSession();
  const { online, pendingWrites } = useConnectivity();
  const profile = useProfile();
  const progress = useProgress();
  const week = useWeek();
  const memory = useMemory();
  const [last, setLast] = useState('—');

  const run = (label: string, action: () => Promise<unknown>) => () => {
    setLast(`${label}…`);
    action().then(
      () => setLast(`${label}: ok`),
      (error: unknown) => setLast(`${label}: ${isDataError(error) ? error.kind : String(error)}`),
    );
  };

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
        <Chip
          label="Save profile"
          onPress={run('save', () =>
            profile.saveProfile({
              displayName: 'Lan',
              firstLanguage: 'vi',
              roommate: { species: 'redpanda', name: 'Pip' },
              track: 'life',
              quietHours: { start: '22:00', end: '08:00' },
              timezone: deviceTimeZone(),
              notificationsAllowed: false,
            }),
          )}
        />
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
