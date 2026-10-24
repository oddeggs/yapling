import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { C } from './theme';

/*
 * The control's few icons, drawn from the design's own paths (24-unit boxes): filled shapes and
 * round-capped strokes in bone.
 */

const ICONS = {
  speaker: {
    fill: [
      'M4 9.2h3.2L11.6 5c.5-.5 1.4-.1 1.4.6v12.8c0 .7-.9 1.1-1.4.6l-4.4-4.2H4c-.6 0-1-.4-1-1v-3.6c0-.6.4-1 1-1Z',
    ],
    stroke: ['M16.2 8.8a4.6 4.6 0 0 1 0 6.4', 'M18.8 6.4a8.2 8.2 0 0 1 0 11.2'],
  },
  again: { fill: [], stroke: ['M4.6 12.4a7.4 7.4 0 1 0 2.2-5.6', 'M5.6 3.6v4h4'] },
  pause: {
    fill: [
      'M7.9 5h1c.8 0 1.4.6 1.4 1.4v11.2c0 .8-.6 1.4-1.4 1.4h-1c-.8 0-1.4-.6-1.4-1.4V6.4c0-.8.6-1.4 1.4-1.4Z',
      'M15.1 5h1c.8 0 1.4.6 1.4 1.4v11.2c0 .8-.6 1.4-1.4 1.4h-1c-.8 0-1.4-.6-1.4-1.4V6.4c0-.8.6-1.4 1.4-1.4Z',
    ],
    stroke: [],
  },
  menu: {
    fill: [
      'M6 13.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z',
      'M12 13.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z',
      'M18 13.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z',
    ],
    stroke: [],
  },
  play: {
    fill: ['M8 5.8v12.4c0 .8.9 1.3 1.6.9l9.8-6.2c.6-.4.6-1.4 0-1.8L9.6 4.9C8.9 4.5 8 5 8 5.8Z'],
    stroke: [],
  },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 22,
  color = C.bone,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const paths = useMemo(() => {
    const i = ICONS[name];
    return {
      fill: i.fill.map((d) => Skia.Path.MakeFromSVGString(d)).filter((p) => p !== null),
      stroke: i.stroke.map((d) => Skia.Path.MakeFromSVGString(d)).filter((p) => p !== null),
    };
  }, [name]);
  const k = size / 24;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale: k }]}>
        {paths.fill.map((p, i) => (
          <Path key={`f${i}`} path={p} color={color} />
        ))}
        {paths.stroke.map((p, i) => (
          <Path
            key={`s${i}`}
            path={p}
            color={color}
            style="stroke"
            strokeWidth={2}
            strokeCap="round"
            strokeJoin="round"
          />
        ))}
      </Group>
    </Canvas>
  );
}
