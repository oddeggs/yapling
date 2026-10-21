// The app's chrome. Feature catalogues are collected by the generated index
// (`catalogues.generated.ts`), so adding a feature never edits this file.
export { languageNames, languages, sourceLanguage } from './catalogue-types';
export type {
  Entry,
  EnCatalogue,
  Language,
  ParamsArgument,
  ParamsOf,
  PluralCategory,
  PluralForms,
  StringKey,
  Translation,
} from './catalogue-types';
export { defaultLanguage, isLanguage, languageOfLocale, pickLanguage } from './pick-language';
export { pluralCategory } from './plural';
export { t, translator } from './translate';
export type { Translate } from './translate';
