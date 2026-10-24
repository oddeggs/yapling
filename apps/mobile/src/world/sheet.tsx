import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../ui/haptics';
import { app } from './app';
import type { PaintingSpec } from './stage';
import { C, F } from './theme';

/*
 * The menu sheet's parts: a page with its title and a back or close button, grouped rows, and a
 * framed thumbnail re-painted live from any place and hour (kept for the session).
 */

export function SheetPage({
  title,
  sub,
  root = false,
  children,
}: {
  title: string;
  sub?: string;
  root?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={root ? styles.rootTitle : styles.title}>{title}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={root ? 'Close' : 'Back'}
          hitSlop={10}
          style={styles.x}
          onPress={() => {
            haptics.play('tap');
            if (root || !router.canGoBack()) router.dismiss();
            else router.back();
          }}
        >
          <Text style={styles.xText}>{root ? '✕' : '‹'}</Text>
        </Pressable>
      </View>
      {children}
    </ScrollView>
  );
}

export function Group({ children, style }: { children: ReactNode; style?: ViewProps['style'] }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

export function Row({
  label,
  detail,
  onPress,
  danger = false,
  right,
  first = false,
}: {
  label: string;
  detail?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
  first?: boolean;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        haptics.play('tap');
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, !first && styles.rowLine, pressed && styles.pressed]}
    >
      <Text style={[styles.rowLabel, danger && { color: C.danger }]}>{label}</Text>
      <View style={styles.rowRight}>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        {right}
        {onPress && !right ? <Text style={styles.chev}>›</Text> : null}
      </View>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

const thumbs = new Map<string, string>();

/** A framed painting of a place at an hour, painted by the stage and kept for the session. */
export function Thumb({
  spec,
  width,
  ratio = 1.25,
}: {
  spec: PaintingSpec;
  width: number;
  ratio?: number;
}) {
  const key = `${spec.place}|${spec.v}|${Math.round(spec.hour * 4)}|${spec.wx}|${width}`;
  const [uri, setUri] = useState(thumbs.get(key) ?? null);
  useEffect(() => {
    if (thumbs.has(key)) {
      setUri(thumbs.get(key) ?? null);
      return;
    }
    let live = true;
    void app()
      .stage?.render(spec, width, Math.round(width * ratio))
      .then((data) => {
        if (!data) return;
        thumbs.set(key, data);
        if (live) setUri(data);
      });
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={[styles.frame, { width, height: Math.round(width * ratio) }]}>
      {uri ? <Image source={{ uri }} style={styles.frameImg} /> : <View style={styles.frameImg} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#141217' },
  content: { paddingHorizontal: 18, paddingTop: 22, gap: 18 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 4 },
  rootTitle: {
    color: C.bone,
    fontFamily: F.serif,
    fontStyle: 'italic',
    paddingHorizontal: 4,
    fontSize: 30,
    lineHeight: 34,
  },
  title: { color: C.bone, fontSize: 20, fontWeight: '600', letterSpacing: -0.3, marginTop: 4 },
  sub: { color: C.dim, fontSize: 13.5, marginTop: 4 },
  x: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xText: { color: C.bone, fontSize: 17, fontWeight: '500', marginTop: -1 },
  group: { borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  pressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  rowLabel: { color: C.bone, fontSize: 16, flexShrink: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detail: { color: C.dim, fontSize: 15 },
  chev: { color: C.faint, fontSize: 22, marginTop: -2 },
  section: {
    color: C.faint,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: -6,
    marginLeft: 4,
  },
  frame: {
    backgroundColor: '#0b0a0d',
    padding: 3,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
  frameImg: { flex: 1, backgroundColor: '#1b1820' },
});
