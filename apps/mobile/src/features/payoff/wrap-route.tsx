import { localDateOf } from '@yapling/domain';
import { SEASON_1 } from '@yapling/story';
import { colours } from '@yapling/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAppNow, useCalls, useProgress, useWeek } from '../../data';
import { useLocale, useToast } from '../../ui';
import { Face } from '../burrow/art';
import { PREVIEW_LEARNER } from './preview';
import { PREVIEW_TIMEZONE, previewWeek } from './preview-weeks';
import { PAYOFF_ROUTES, useLearner } from './routes';
import { SeasonScreen } from './season-screen';
import { thenAndNow } from './then-now-model';
import { closesSeason, hasSeasonKeepsake, seasonKeepsake, weekWrap } from './wrap-model';
import { ThenNowScreen, WrapScreen } from './wrap-screen';

/*
 * The week's wrap on the app's data, on the last day of a week (the burrow brings the learner here
 * on day 7): the wrap, then at the season's end then and now and the season keepsake. Read from
 * progress, the story week's start and the call records. `?preview=1` (development builds only)
 * shows a sample learner on the last day of week `week`.
 */

type Phase = 'wrap' | 'thenNow' | 'season';

export function WrapRoute({ week }: { week: number }) {
  const router = useRouter();
  const { t } = useLocale();
  const toast = useToast();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const sample = useMemo(
    () => (__DEV__ && preview !== undefined ? previewWeek(week) : null),
    [preview, week],
  );
  const { progress: liveProgress, refresh, keepSeasonKeepsake } = useProgress();
  const { calls: liveCalls } = useCalls();
  const current = useWeek();
  const { learner, species, timezone } = useLearner();
  const zone = sample ? PREVIEW_TIMEZONE : (timezone ?? 'Asia/Ho_Chi_Minh');
  const now = useAppNow(zone);
  const [phase, setPhase] = useState<Phase>('wrap');

  useEffect(() => {
    if (!sample) void refresh().catch(() => undefined);
    // Once, as the wrap opens: progress may have moved since the burrow read it.
  }, []);

  const progress = sample?.progress ?? liveProgress;
  const calls = sample?.calls ?? liveCalls;
  const startedOn = sample?.startedOn ?? current?.startedOn ?? null;
  const today = sample?.today ?? localDateOf(now, zone);
  const who = sample ? { ...learner, name: PREVIEW_LEARNER } : learner;

  const wrap = useMemo(
    () =>
      progress && startedOn
        ? weekWrap({ week, progress, startedOn, timezone: zone, today }, t)
        : null,
    [progress, startedOn, week, zone, today, t],
  );
  // Whether the season keepsake was already kept when the wrap opened (read once, so keeping it
  // now doesn't take the season's end away mid-way): then this wrap is an ordinary week's.
  const keptAtOpen = useRef<boolean | null>(null);
  if (keptAtOpen.current === null && progress !== null)
    keptAtOpen.current = sample === null && hasSeasonKeepsake(progress);
  const closes =
    wrap !== null &&
    closesSeason({ week, seasonDone: wrap.seasonDone, kept: keptAtOpen.current ?? false });
  const thenNow = useMemo(
    () => (closes ? thenAndNow(calls, 'season', t) : null),
    [closes, calls, t],
  );
  const season = useMemo(
    () => (closes && progress ? seasonKeepsake(progress.weeks, who, zone, t) : null),
    [closes, progress, who, zone, t],
  );

  // Earned: kept on the server at once, so the burrow wall hangs it on any phone. Offline (or a
  // server that hasn't caught up) it is asked for again the next time the wrap opens.
  const earned = season !== null && !sample;
  const asked = useRef(false);
  useEffect(() => {
    if (!earned || asked.current) return;
    asked.current = true;
    void keepSeasonKeepsake(SEASON_1.number).catch(() => undefined);
  }, [earned, keepSeasonKeepsake]);

  const home = () => router.replace(PAYOFF_ROUTES.home);
  if (!wrap) return null;

  if (phase === 'thenNow' && thenNow)
    return (
      <ThenNowScreen
        view={thenNow}
        species={species}
        cta={season ? t('common.continue') : t('payoff.afterCall.cta')}
        onContinue={() => (season ? setPhase('season') : home())}
      />
    );
  if (phase === 'season' && season)
    return (
      <SeasonScreen
        keepsake={season}
        species={species}
        onBack={home}
        onHang={() => {
          toast({
            text: season.hungToast,
            art: (
              <Face
                character="pip"
                species={species}
                mood="proud"
                size={34}
                background={colours.accentSoft}
              />
            ),
          });
          home();
        }}
      />
    );
  return (
    <WrapScreen
      wrap={closes && (thenNow || season) ? wrap : { ...wrap, cta: t('payoff.afterCall.cta') }}
      onBack={home}
      onContinue={() => {
        if (thenNow) setPhase('thenNow');
        else if (season) setPhase('season');
        else home();
      }}
    />
  );
}
