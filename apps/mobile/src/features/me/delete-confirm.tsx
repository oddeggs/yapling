import { colours } from '@yapling/theme';
import { View } from 'react-native';

import { StickerButton, Txt } from '../../ui';
import type { MeCopy } from './copy';

export interface DeleteConfirmProps {
  readonly roommateName: string;
  readonly copy: MeCopy;
  readonly busy: boolean;
  readonly failed: boolean;
}

/** What deleting removes, said plainly. The buttons sit in the frame's footer (`DeleteButtons`). */
export function DeleteConfirm({ roommateName, copy, failed }: DeleteConfirmProps) {
  return (
    <View style={{ gap: 10, paddingTop: 8 }}>
      <Txt variant="sheetTitle" accessibilityRole="header">
        {copy('me.delete.title')}
      </Txt>
      <Txt variant="body" colour={colours.textBody}>
        {copy('me.delete.body', { name: roommateName })}
      </Txt>
      {failed ? (
        <Txt variant="noteStrong" colour={colours.textHand} accessibilityLiveRegion="polite">
          {copy('me.delete.failed')}
        </Txt>
      ) : null}
    </View>
  );
}

/** Keeping and deleting, side by side and the same size. */
export function DeleteButtons({
  copy,
  busy,
  onKeep,
  onDelete,
}: {
  copy: MeCopy;
  busy: boolean;
  onKeep: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <StickerButton
        label={copy('me.delete.cancel')}
        tone="secondary"
        size="pair"
        style={{ flex: 1 }}
        onPress={onKeep}
      />
      <StickerButton
        label={copy('me.delete.confirm')}
        tone="dark"
        size="pair"
        style={{ flex: 1 }}
        disabled={busy}
        onPress={onDelete}
      />
    </View>
  );
}
