import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Switch, Text } from 'react-native';

import { useStore } from '../../data/store';
import { useLocale } from '../../ui/locale';
import { app } from '../../world/app';
import { Group, Row, SheetPage } from '../../world/sheet';
import { C } from '../../world/theme';

/** Your language under their lines, sound, what the town remembers, and deleting everything. */
export default function Settings() {
  const { t } = useLocale();
  const router = useRouter();
  const { world } = app();
  const settings = useStore(world.store, (s) => s.settings);
  const sw = (on: boolean, set: (v: boolean) => void) => (
    <Switch
      value={on}
      onValueChange={set}
      trackColor={{ true: C.bone, false: 'rgba(255,255,255,0.16)' }}
      thumbColor="#fff"
      ios_backgroundColor="rgba(255,255,255,0.16)"
    />
  );
  return (
    <SheetPage title={t('world.menu.settings')}>
      <Group>
        <Row
          first
          label={t('world.settings.gloss')}
          right={sw(settings.gloss, (v) => world.setSetting('gloss', v))}
        />
        <Row
          label={t('world.settings.sound')}
          right={sw(settings.sound, (v) => world.setSetting('sound', v))}
        />
      </Group>
      <Group>
        <Row first label={t('world.settings.memory')} onPress={() => router.push('/menu/memory')} />
      </Group>
      <Group>
        <Row
          first
          danger
          label={t('world.settings.delete')}
          onPress={() =>
            Alert.alert(t('world.settings.delete'), t('world.settings.deleteConfirm'), [
              { text: t('world.settings.cancel'), style: 'cancel' },
              {
                text: t('world.settings.deleteYes'),
                style: 'destructive',
                onPress: () => {
                  app().talk.leave();
                  void world.deleteEverything().then(() => {
                    router.dismissAll();
                    void world.start();
                  });
                },
              },
            ])
          }
        />
      </Group>
      <Text style={styles.fine}>{t('world.settings.ai')}</Text>
    </SheetPage>
  );
}

const styles = StyleSheet.create({
  fine: { color: C.faint, fontSize: 12, textAlign: 'center', marginHorizontal: 18, lineHeight: 17 },
});
