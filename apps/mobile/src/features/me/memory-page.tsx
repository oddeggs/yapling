import type { MemoryItem } from '@yapling/contracts';
import { colours, fontFor, outline, type, type TypeStyle } from '@yapling/theme';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { BackButton, Press, StickerButton, Txt } from '../../ui';
import type { MeCopy } from './copy';
import { RowsCard } from './me-frame';
import type { MemoryGroup } from './me-model';

const memoryType = {
  title: { ...type.cardTitle, size: 24, lineHeight: 1 },
  section: { ...type.section, size: 12, uppercase: true },
  text: { ...type.item, size: 14, lineHeight: 1.3 },
  action: { ...type.note, weight: 800 },
} as const satisfies Record<string, TypeStyle>;

/** The longest a note can be (contracts `MemoryItem.text`). */
const MAX_TEXT = 500;

export interface MemoryPageProps {
  readonly title: string;
  readonly groups: readonly MemoryGroup[];
  readonly roommateName: string;
  readonly copy: MeCopy;
  readonly onBack: () => void;
  /** Resolves when saved; rejects when it didn't. */
  readonly onUpdate: (id: string, text: string) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
}

/** "What Pip remembers": every note, by section, each one editable and deletable. */
export function MemoryPage({
  title,
  groups,
  roommateName,
  copy,
  onBack,
  onUpdate,
  onDelete,
}: MemoryPageProps) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton onPress={onBack} accessibilityLabel={copy('common.a11y.back')} />
        <Txt variant={memoryType.title} accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </Txt>
      </View>
      <Txt variant="body" colour={colours.textBody}>
        {copy('me.memory.body', { name: roommateName })}
      </Txt>
      {groups.length === 0 ? (
        <Txt variant="body" colour={colours.textMuted}>
          {copy('me.memory.empty', { name: roommateName })}
        </Txt>
      ) : null}
      {groups.map((g) => (
        <View key={g.category} style={{ gap: 8 }}>
          <Txt variant={memoryType.section} accessibilityRole="header">
            {g.name}
          </Txt>
          <RowsCard>
            {g.items.map((item, i) => (
              <Note
                key={item.id}
                item={item}
                first={i === 0}
                editing={editing === item.id}
                copy={copy}
                onEdit={() => setEditing(item.id)}
                onDone={() => setEditing(null)}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </RowsCard>
        </View>
      ))}
    </>
  );
}

interface NoteProps {
  readonly item: MemoryItem;
  readonly first: boolean;
  readonly editing: boolean;
  readonly copy: MeCopy;
  readonly onEdit: () => void;
  readonly onDone: () => void;
  readonly onUpdate: (id: string, text: string) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
}

function Note({ item, first, editing, copy, onEdit, onDone, onUpdate, onDelete }: NoteProps) {
  const [draft, setDraft] = useState(item.text);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const trimmed = draft.trim();

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try {
      await work();
      onDone();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 8,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colours.divider,
      }}
    >
      {editing ? (
        <>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            maxLength={MAX_TEXT}
            accessibilityLabel={copy('me.memory.edit')}
            style={[
              fontFor(memoryType.text),
              {
                color: colours.text,
                padding: 10,
                borderRadius: 12,
                borderWidth: outline.thin,
                borderColor: colours.outline,
                backgroundColor: colours.surface,
              },
            ]}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StickerButton
              label={copy('me.memory.cancel')}
              tone="secondary"
              size="small"
              onPress={() => {
                setDraft(item.text);
                onDone();
              }}
            />
            <StickerButton
              label={copy('me.memory.save')}
              size="small"
              disabled={busy || trimmed === '' || trimmed === item.text}
              onPress={() => void run(() => onUpdate(item.id, trimmed))}
            />
          </View>
        </>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Txt variant={memoryType.text} style={{ flex: 1 }}>
            {item.text}
          </Txt>
          <Action label={copy('me.memory.edit')} onPress={onEdit} disabled={busy} />
          <Action
            label={copy('me.memory.delete')}
            accessibilityLabel={copy('me.memory.a11y.delete', { text: item.text })}
            onPress={() => void run(() => onDelete(item.id))}
            disabled={busy}
          />
        </View>
      )}
      {failed ? (
        <Txt variant="note" colour={colours.textHand} accessibilityLiveRegion="polite">
          {copy('me.memory.failed')}
        </Txt>
      ) : null}
    </View>
  );
}

function Action({
  label,
  accessibilityLabel,
  onPress,
  disabled,
}: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Txt
        variant={memoryType.action}
        colour={disabled ? colours.textDisabled : colours.textMuted}
        style={{ textDecorationLine: 'underline' }}
      >
        {label}
      </Txt>
    </Press>
  );
}
