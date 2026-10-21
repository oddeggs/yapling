import {
  languages,
  sourceLanguage,
  type EnCatalogue,
  type Entry,
  type FeatureCatalogues,
} from './catalogue-types';
import { isLanguage } from './pick-language';
import { requiredCategories } from './plural';

/** A catalogue as the checks read it: any keys, any of them possibly absent. */
export type LooseCatalogue = Readonly<Record<string, Entry | undefined>>;

function texts(entry: Entry): string[] {
  return typeof entry === 'string' ? [entry] : Object.values(entry);
}

/** The sorted `{name}` placeholders of an entry; a plural always takes `count`. */
function paramNames(entry: Entry): string[] {
  const names = new Set<string>(typeof entry === 'string' ? [] : ['count']);
  for (const text of texts(entry))
    for (const m of text.matchAll(/\{(\w+)\}/g)) names.add(m[1] ?? '');
  return [...names].sort();
}

/** Placeholders whose name has a space or punctuation, which `t` would never fill. */
function oddPlaceholders(entry: Entry): string[] {
  return texts(entry).flatMap((text) => text.match(/\{[^}]*[^\w}][^}]*\}/g) ?? []);
}

/** A plural entry's categories against its language's rule: exactly the ones it uses. */
function pluralProblems(key: string, entry: Entry, language: string): string[] {
  if (typeof entry === 'string' || !isLanguage(language)) return [];
  const problems: string[] = [];
  const has = Object.keys(entry);
  const required = requiredCategories(language) as readonly string[];
  const missing = required.filter((c) => !has.includes(c));
  if (missing.length > 0) problems.push(`${key}: plural lacks ${missing.join(', ')}`);
  const unused = has.filter((c) => !required.includes(c));
  if (unused.length > 0) problems.push(`${key}: plural has ${unused.join(', ')}, never used here`);
  return problems;
}

/** Problems with the source catalogue alone: empty text, odd placeholders, plural forms. */
export function findSourceProblems(source: EnCatalogue): string[] {
  const problems: string[] = [];
  for (const [key, entry] of Object.entries(source)) {
    if (texts(entry).some((text) => text.trim() === '')) problems.push(`${key}: empty`);
    for (const p of oddPlaceholders(entry))
      problems.push(`${key}: placeholder ${p} is not a plain name`);
    problems.push(...pluralProblems(key, entry, sourceLanguage));
  }
  return problems;
}

/**
 * Everything wrong with a catalogue measured against the source, one line per problem, each
 * naming its key: a key the catalogue is missing or has extra, an empty entry, a plural in one
 * language only, plural forms its language needs or never uses, placeholders that differ, text
 * that isn't in Unicode's composed form (NFC). An empty list means the catalogue is complete.
 */
export function findCatalogueProblems(
  source: EnCatalogue,
  catalogue: LooseCatalogue,
  language?: string,
): string[] {
  const problems: string[] = [];
  for (const key of Object.keys(catalogue))
    if (!(key in source)) problems.push(`${key}: not in the source catalogue`);
  for (const [key, sourceEntry] of Object.entries(source)) {
    const entry = catalogue[key];
    if (entry === undefined) {
      problems.push(`${key}: missing`);
      continue;
    }
    if (texts(entry).some((text) => text.trim() === '')) {
      problems.push(`${key}: empty`);
      continue;
    }
    if ((typeof entry === 'string') !== (typeof sourceEntry === 'string')) {
      problems.push(`${key}: plural in one language only`);
      continue;
    }
    if (language !== undefined) problems.push(...pluralProblems(key, entry, language));
    const expected = paramNames(sourceEntry);
    const actual = paramNames(entry);
    if (expected.join() !== actual.join())
      problems.push(
        `${key}: placeholders differ ({${expected.join(', ')}} in the source, {${actual.join(', ')}} here)`,
      );
    if (texts(entry).some((text) => text !== text.normalize('NFC')))
      problems.push(`${key}: not in composed Unicode (NFC)`);
  }
  return problems;
}

/**
 * Everything wrong with one feature: its keys must start with the feature's prefix (so features
 * never overwrite each other), the source must be well formed, and every language complete.
 */
export function findFeatureProblems(
  feature: Omit<FeatureCatalogues, 'catalogues'> & {
    readonly catalogues: Readonly<Record<string, LooseCatalogue>>;
  },
  shipped: readonly string[] = languages,
): string[] {
  const source = (feature.catalogues[sourceLanguage] ?? {}) as EnCatalogue;
  const prefix = `${feature.name}.`;
  const problems = [
    ...Object.keys(source)
      .filter((key) => !key.startsWith(prefix))
      .map((key) => `${key}: keys in ${feature.file}.${sourceLanguage}.ts start with "${prefix}"`),
    ...findSourceProblems(source),
    ...shipped
      .filter((l) => l !== sourceLanguage)
      .flatMap((l) =>
        findCatalogueProblems(source, feature.catalogues[l] ?? {}, l).map((p) => `${l}: ${p}`),
      ),
  ];
  return problems.map((p) => `${feature.file}: ${p}`);
}
