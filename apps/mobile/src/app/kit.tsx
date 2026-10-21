import { colours, layout } from '@yapling/theme';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '../ui/chip';
import { KitCatalogue } from '../ui/kit/catalogue';
import { KitFrame, frameIds, type FrameId } from '../ui/kit/frames';
import { useLanguageOverride, useLocale } from '../ui/locale';
import { ReduceMotionProvider } from '../ui/motion/reduce-motion';
import { Txt } from '../ui/text';

/**
 * The component kit, for development builds only: every shared component in its states
 * (`yapling-dev://kit`), or one prototype screen's components in place for comparison with its
 * render (`yapling-dev://kit?frame=call`). `motion=reduce` previews Reduce Motion.
 */
export default function Kit() {
  const params = useLocalSearchParams<{ frame?: string; motion?: string }>();
  const [reduceToggle, setReduce] = useState(false);
  const reduce = reduceToggle || params.motion === 'reduce';
  const [quiet, setQuiet] = useState(true);
  const frame = frameIds.find((id) => id === params.frame);
  return (
    <ReduceMotionProvider forced={reduce || undefined}>
      {frame ? (
        // Keyed by the link, so opening another link replays the frame's entrances.
        <KitFrame
          key={`${frame}:${params.motion ?? ''}`}
          id={frame}
          quiet={quiet}
          onQuiet={setQuiet}
        />
      ) : (
        <Catalogue reduce={reduce} onReduce={setReduce} />
      )}
    </ReduceMotionProvider>
  );
}

function Catalogue({ reduce, onReduce }: { reduce: boolean; onReduce: (on: boolean) => void }) {
  const insets = useSafeAreaInsets();
  const { language } = useLocale();
  const setLanguage = useLanguageOverride();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colours.background }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}
    >
      <View style={{ paddingHorizontal: layout.marginScreen, gap: 8 }}>
        <Txt variant="screenTitle">kit</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip
            label={language === 'vi' ? 'vi → en' : 'en → vi'}
            onPress={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
          />
          <Chip
            label={reduce ? 'Reduce Motion: on' : 'Reduce Motion: off'}
            onPress={() => onReduce(!reduce)}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {frameIds.map((id: FrameId) => (
            <Txt key={id} variant="note" colour={colours.textMuted}>{`?frame=${id}`}</Txt>
          ))}
        </View>
      </View>
      <KitCatalogue />
    </ScrollView>
  );
}
