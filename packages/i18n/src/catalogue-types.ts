import type { en } from './catalogues.generated';

/**
 * The languages the app's chrome ships in, as BCP 47 tags. Vietnamese is the primary chrome (the
 * app is made for Vietnam first); English is the source every key is written in first, and the
 * shape (placeholders, plural forms) every other language follows. Learning content is English
 * whatever the chrome, and lives in `@yapling/story`.
 */
export const languages = ['vi', 'en'] as const;
export type Language = (typeof languages)[number];

/** Each language's name in itself, as a language picker lists it. */
export const languageNames: { readonly [L in Language]: string } = {
  vi: 'Tiếng Việt',
  en: 'English',
};

/** The source language: every key exists in it first. */
export const sourceLanguage = 'en' satisfies Language;

/** The CLDR plural categories a whole number can select. */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * A string that changes with a number, picked by `params.count`. `other` is always present; a
 * language adds the categories its plural rule uses (`plural.ts`): English `one`, Vietnamese
 * nothing more.
 */
export type PluralForms = { readonly other: string } & {
  readonly [Category in Exclude<PluralCategory, 'other'>]?: string;
};

export type Entry = string | PluralForms;

/** What every English feature catalogue satisfies: keys to strings or plural forms. */
export type EnCatalogue = Readonly<Record<string, Entry>>;

/**
 * Another language's feature catalogue, typed against its English file: every English key (a
 * missing, extra or misspelt key is a type error, and the completeness test names it), a string
 * where English has a string, plural forms where English has them.
 */
export type Translation<Source extends EnCatalogue> = {
  readonly [Key in keyof Source]: Source[Key] extends string ? string : PluralForms;
};

/** One feature's catalogues, as the generated index lists them. */
export interface FeatureCatalogues {
  /** The key prefix and the stem of the export names: `call` for `call.en.ts`. */
  readonly name: string;
  /** The file stem. */
  readonly file: string;
  readonly catalogues: { readonly [L in Language]: Readonly<Record<string, Entry | undefined>> };
}

export type StringKey = keyof typeof en;

type ParamNames<Text extends string> = Text extends `${string}{${infer Name}}${infer Rest}`
  ? Name | ParamNames<Rest>
  : never;

type EntryParamNames<E> = E extends string
  ? ParamNames<E>
  : E extends PluralForms
    ? 'count' | ParamNames<Extract<E[keyof E], string>>
    : never;

/** The parameters a key needs, read from the `{name}` placeholders of its English text. */
export type ParamsOf<Key extends StringKey> = {
  readonly [Name in EntryParamNames<(typeof en)[Key]>]: Name extends 'count'
    ? number
    : string | number;
};

/** Keys with no placeholders take no params argument; the others require it. */
export type ParamsArgument<Key extends StringKey> = [keyof ParamsOf<Key>] extends [never]
  ? []
  : [params: ParamsOf<Key>];
