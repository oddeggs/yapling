import type { MemoryItem } from '@yapling/contracts';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLocale } from '../../ui/locale';
import { app } from '../../world/app';
import { SheetPage } from '../../world/sheet';
import { C } from '../../world/theme';

/** Everything the characters remember about the learner: visible, and forgettable any time. */
export default function Memory() {
  const { t } = useLocale();
  const { world } = app();
  const [items, setItems] = useState<MemoryItem[] | null>(null);
  useEffect(() => {
    void world
      .memory()
      .then(setItems)
      .catch(() => setItems([]));
  }, [world]);
  const forget = (id: string) => {
    setItems((xs) => (xs ? xs.filter((x) => x.id !== id) : xs));
    void world.api.forget(id).catch(() => undefined);
  };
  return (
    <SheetPage title={t('world.settings.memory')} sub={t('world.settings.memoryLede')}>
      {items !== null && items.length === 0 && (
        <Text style={styles.empty}>{t('world.settings.memoryEmpty')}</Text>
      )}
      <View style={styles.group}>
        {(items ?? []).map((m, i) => (
          <View key={m.id} style={[styles.row, i > 0 && styles.line]}>
            <Text style={styles.text}>{m.text}</Text>
            <Pressable style={styles.forget} onPress={() => forget(m.id)}>
              <Text style={styles.forgetText}>{t('world.settings.forget')}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </SheetPage>
  );
}

const styles = StyleSheet.create({
  empty: { color: C.dim, fontSize: 15, textAlign: 'center', marginTop: 30 },
  group: { borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 12,
  },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  text: { flex: 1, color: C.bone, fontSize: 15.5, lineHeight: 21 },
  forget: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  forgetText: { color: C.dim, fontSize: 12, fontWeight: '600' },
});
