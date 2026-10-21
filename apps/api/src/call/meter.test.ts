import { describe, expect, it } from 'vitest';

import type { ChargeResult, TalkKind } from '../user';
import { Meter } from './meter';

function ledger(allowance: number) {
  const charges: [number, TalkKind][] = [];
  let used = 0;
  const charge = (seconds: number, kind: TalkKind): Promise<ChargeResult> => {
    charges.push([seconds, kind]);
    used += seconds;
    const left = Math.max(0, allowance - used);
    return Promise.resolve({ secondsLeft: left, wrappingUp: left <= 60, exhausted: left === 0 });
  };
  return { charges, charge };
}

describe('the call meter', () => {
  it('charges learner and character talk in whole seconds once a few have built up', async () => {
    const { charges, charge } = ledger(600);
    const meter = new Meter(charge);
    meter.addLearner(3_000);
    expect(await meter.flush()).toBeNull();
    meter.addLearner(2_400);
    meter.addCharacter(7_200);
    expect(await meter.flush()).toMatchObject({ secondsLeft: 588 });
    expect(charges).toEqual([
      [5, 'learner'],
      [7, 'character'],
    ]);
  });

  it('charges the rest when the call ends, and survives a restart', async () => {
    const { charges, charge } = ledger(600);
    const meter = new Meter(charge);
    meter.addLearner(6_000);
    await meter.flush();
    meter.addLearner(1_400);
    const restored = new Meter(charge);
    restored.restore(meter.state());
    expect(await restored.flush(true)).toMatchObject({ secondsLeft: 593 });
    expect(charges).toEqual([
      [6, 'learner'],
      [1, 'learner'],
    ]);
    expect(restored.learnerSeconds).toBe(7);
  });

  it('reports the wrap-up and the end of the minutes', async () => {
    const { charge } = ledger(70);
    const meter = new Meter(charge);
    meter.addLearner(15_000);
    expect(await meter.flush()).toEqual({ secondsLeft: 55, wrappingUp: true, exhausted: false });
    meter.addCharacter(60_000);
    expect(await meter.flush()).toMatchObject({ secondsLeft: 0, exhausted: true });
  });
});
