import type { ParamsArgument, StringKey, Translate } from '@yapling/i18n';

/**
 * Words a view model carries without knowing the reader's language: a catalogue key with its
 * params (chrome), or text that is already final (an English phrase or line from the story).
 * Screens turn it into a string with the locale's `t`.
 */
export type Copy =
  | { readonly kind: 'key'; readonly key: StringKey; readonly params: ParamsArgument<StringKey> }
  | { readonly kind: 'text'; readonly text: string };

/** Chrome from the catalogues, typed against the key's placeholders. */
export const copy = <Key extends StringKey>(key: Key, ...params: ParamsArgument<Key>): Copy => ({
  kind: 'key',
  key,
  params: params as ParamsArgument<StringKey>,
});

/** Text that is already in its final language (learning content is always English). */
export const text = (value: string): Copy => ({ kind: 'text', text: value });

/** The string for a copy in the reader's language. */
export const render = (t: Translate, c: Copy): string =>
  c.kind === 'text'
    ? c.text
    : (t as (key: StringKey, ...p: unknown[]) => string)(c.key, ...c.params);
