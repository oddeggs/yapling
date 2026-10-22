import { localDateOf, localTimeOf } from '@yapling/domain';
import { colours } from '@yapling/theme';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { useLocale } from '../../ui/locale';
import { StickerButton } from '../../ui/sticker-button';
import { Txt } from '../../ui/text';
import { costServer, dollars, duration, fetchCosts, type CostList } from './cost-api';
import { deviceTimeZone } from './test-learner';

/*
 * The test menu's cost page: the learner's last live calls from the dev Worker, each with its
 * estimated cost and reply latency, and the totals above them. Read again on "Refresh".
 */

type Load =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly reason: string }
  | { readonly status: 'ready'; readonly list: CostList };

function Block({ children }: { readonly children: ReactNode }) {
  return <View style={{ gap: 4 }}>{children}</View>;
}

export function CostPage({ onBack }: { readonly onBack: () => void }) {
  const { t } = useLocale();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const timezone = deviceTimeZone();

  const refresh = useCallback(() => {
    setLoad({ status: 'loading' });
    fetchCosts().then(
      (list) => setLoad({ status: 'ready', list }),
      (error: unknown) =>
        setLoad({ status: 'failed', reason: error instanceof Error ? error.message : 'error' }),
    );
  }, []);
  useEffect(refresh, [refresh]);

  const ms = (value: number | null) => (value === null ? t('devmenu.cost.none') : `${value}`);

  return (
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt variant="sheetTitle" accessibilityRole="header">
          {t('devmenu.cost.title')}
        </Txt>
        <StickerButton label={t('devmenu.cost.back')} tone="glass" size="small" onPress={onBack} />
      </View>
      <Txt variant="note" colour={colours.textMuted}>
        {t('devmenu.cost.server', { server: costServer() })}
      </Txt>

      {load.status === 'loading' ? (
        <Txt variant="note" colour={colours.textMuted}>
          {t('devmenu.cost.loading')}
        </Txt>
      ) : null}
      {load.status === 'failed' ? (
        <Txt variant="note" colour={colours.accent}>
          {t('devmenu.cost.failed', { reason: load.reason })}
        </Txt>
      ) : null}
      {load.status === 'ready' && load.list.calls.length === 0 ? (
        <Txt variant="note" colour={colours.textMuted}>
          {t('devmenu.cost.empty')}
        </Txt>
      ) : null}

      {load.status === 'ready' && load.list.calls.length > 0 ? (
        <>
          <Block>
            <Txt variant="noteStrong" colour={colours.textMuted}>
              {t('devmenu.cost.totalsHeading', { count: load.list.totals.calls })}
            </Txt>
            <Txt variant="body">
              {t('devmenu.cost.total', {
                usd: dollars(load.list.totals.usd),
                minutes: load.list.totals.minutes,
                perMinute:
                  load.list.totals.usdPerMinute === null
                    ? t('devmenu.cost.none')
                    : dollars(load.list.totals.usdPerMinute),
              })}
            </Txt>
            <Txt variant="note" colour={colours.textBody}>
              {t('devmenu.cost.talk', { minutes: load.list.totals.learnerMinutes })}
            </Txt>
            <Txt variant="note" colour={colours.textBody}>
              {t('devmenu.cost.latency', {
                p50: ms(load.list.totals.replyP50Ms),
                p90: ms(load.list.totals.replyP90Ms),
                turns: load.list.totals.turns,
              })}
            </Txt>
            <Txt variant="note" colour={colours.textBody}>
              {t('devmenu.cost.phone', {
                p50: ms(load.list.totals.phoneP50Ms),
                p90: ms(load.list.totals.phoneP90Ms),
              })}
            </Txt>
          </Block>

          <Block>
            <Txt variant="noteStrong" colour={colours.textMuted}>
              {t('devmenu.cost.callsHeading')}
            </Txt>
            {load.list.calls.map((call) => (
              <View key={call.callId} style={{ gap: 2, paddingVertical: 6 }}>
                <Txt variant="noteStrong">
                  {t('devmenu.cost.call', {
                    when: `${localDateOf(call.startedAt, timezone)} ${localTimeOf(call.startedAt, timezone)}`,
                    kind: call.kind,
                    duration: duration((call.endedAt - call.startedAt) / 1_000),
                    reason: call.endReason,
                  })}
                </Txt>
                <Txt variant="note" colour={colours.textBody}>
                  {t('devmenu.cost.callCost', {
                    usd: dollars(call.usd.total),
                    stt: dollars(call.usd.stt),
                    tts: dollars(call.usd.tts),
                    llm: dollars(call.usd.llm),
                    summary: dollars(call.usd.summary),
                  })}
                </Txt>
                <Txt variant="note" colour={colours.textBody}>
                  {t('devmenu.cost.callLatency', {
                    p50: ms(call.replyP50Ms),
                    p90: ms(call.replyP90Ms),
                    turns: call.turns,
                    learner: call.learnerSeconds,
                  })}
                </Txt>
              </View>
            ))}
          </Block>
        </>
      ) : null}

      <StickerButton
        label={t('devmenu.cost.refresh')}
        tone="secondary"
        disabled={load.status === 'loading'}
        onPress={refresh}
      />
    </View>
  );
}
