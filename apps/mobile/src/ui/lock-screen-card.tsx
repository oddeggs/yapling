import { colours, fontFor, glass, motion, radii, withAlpha, palette } from '@yapling/theme';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { CritterSlot } from './critter-slot';
import { useKeyframes } from './motion/play';
import { Press } from './press';
import { GlassView } from './surface';
import { Txt } from './text';
import { typeExtras } from './type-extras';

export interface LockScreenCardProps {
  /** Who knocks ("Pip"). */
  readonly from: string;
  /** When ("bây giờ"). */
  readonly time: string;
  /** What they say, in their voice. */
  readonly body: string;
  /** The app icon (the roommate's face from `@yapling/art`); a placeholder until then. */
  readonly icon?: ReactNode;
  readonly onPress?: () => void;
  /** Plays the card sliding up into place, as on the lock screen. */
  readonly arrive?: boolean;
}

const ICON = 42;

/**
 * A notification as iOS shows it on the lock screen, for in-app previews (the notifications
 * screen, the knocks list). The real lock screen is the system's.
 */
export function LockScreenCard({
  from,
  time,
  body,
  icon,
  onPress,
  arrive = false,
}: LockScreenCardProps) {
  const up = useKeyframes(motion.screens.lockNotification, { active: arrive });
  return (
    <Press
      onPress={onPress}
      disabled={onPress === undefined}
      accessibilityLabel={`${from}, ${time}. ${body}`}
      style={arrive ? up : null}
    >
      <GlassView
        glass={glass.notification}
        radius={radii.notification}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 }}
      >
        <View
          style={{
            width: ICON,
            height: ICON,
            borderRadius: radii.appIcon,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: withAlpha(palette.white, 0.7),
          }}
        >
          {icon ?? <CritterSlot kind="face" size={ICON - 3} />}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Txt variant="speaker" colour={colours.textOnInk} numberOfLines={1}>
              {from}
            </Txt>
            <Text
              style={[
                fontFor(typeExtras.notificationTime),
                { color: colours.textOnInk, opacity: 0.8 },
              ]}
            >
              {time}
            </Text>
          </View>
          <Txt variant="notification" colour={colours.textOnInk}>
            {body}
          </Txt>
        </View>
      </GlassView>
    </Press>
  );
}
