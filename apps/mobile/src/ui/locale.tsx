import { defaultLanguage, translator, type Language, type Translate } from '@yapling/i18n';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface Locale {
  readonly language: Language;
  readonly t: Translate;
  /** Sets the chrome's language for this session (the splash's first-language choice, the kit). */
  readonly setLanguage: (language: Language) => void;
}

const LocaleContext = createContext<Locale | null>(null);

/**
 * The language the chrome is written in. Vietnamese unless `language` (from the learner's profile,
 * once it loads) or an override says otherwise; an override wins until cleared by a new profile
 * language.
 */
export function LocaleProvider({
  language,
  children,
}: {
  /** The profile's first language; undefined until there is a profile. */
  readonly language?: Language | undefined;
  readonly children: ReactNode;
}) {
  const [override, setOverride] = useState<{ for: Language | undefined; to: Language } | null>(
    null,
  );
  const fromProfile = language ?? defaultLanguage;
  // An override made before the profile language changed gives way to the new profile language.
  const current = override !== null && override.for === language ? override.to : fromProfile;
  const value = useMemo<Locale>(
    () => ({
      language: current,
      t: translator(current),
      setLanguage: (to) => setOverride({ for: language, to }),
    }),
    [current, language],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** The chrome's language and its translator: `const { t } = useLocale(); t('call.holdOn')`. */
export function useLocale(): Locale {
  const locale = useContext(LocaleContext);
  if (locale === null) throw new Error('useLocale needs a LocaleProvider');
  return locale;
}

/** Overrides the chrome's language: `useLanguageOverride()('en')`. */
export function useLanguageOverride(): (language: Language) => void {
  return useLocale().setLanguage;
}
