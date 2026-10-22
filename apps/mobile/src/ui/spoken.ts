/**
 * Lines read aloud one after another (VoiceOver labels): each closes with a full stop unless it
 * already ends a sentence, so "help you." and its meaning never read as "help you..".
 */
export function sentences(...parts: readonly (string | null | undefined)[]): string {
  return parts
    .map((p) => p?.trim() ?? '')
    .filter((p) => p !== '')
    .map((p, i, all) => (i === all.length - 1 || /[.!?…:;]["”’)]*$/u.test(p) ? p : `${p}.`))
    .join(' ');
}
