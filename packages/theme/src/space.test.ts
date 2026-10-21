import { describe, expect, it } from 'vitest';

import { controls, corners, layout, pill, radii, spacing } from './space';
import {
  allStyles,
  brandBoard,
  decl,
  phoneStyles,
  pxValues,
  readDesign,
  week1,
} from './test/design';

/** The phone's styles without the mocked iOS chrome (status bar, island, home indicator). */
const styles = phoneStyles(week1).filter(
  (s) =>
    !/statusC|background:#000/.test(s) && !s.startsWith('position:absolute;inset:0;z-index:50'),
);
const prototype = readDesign(week1);

const isPill = (style: string, radius: number) => {
  const h = pxValues(decl(style, 'height') ?? '')[0];
  const w = pxValues(decl(style, 'width') ?? '')[0];
  return radius === (h ?? -1) / 2 || radius === (w ?? -1) / 2;
};

describe('spacing', () => {
  const used = new Set(
    styles.flatMap((s) =>
      ['gap', 'padding', 'padding-left', 'padding-top'].flatMap((p) => pxValues(decl(s, p) ?? '')),
    ),
  );

  it('has every gap and padding the screens use, and nothing else', () => {
    expect([...used].sort((a, b) => a - b)).toEqual([...spacing]);
  });
});

describe('radii', () => {
  const single = styles.flatMap((s) => {
    const v = pxValues(decl(s, 'border-radius') ?? '');
    return v.length === 1 && v[0] !== undefined && !isPill(s, v[0]) ? [v[0]] : [];
  });

  it('name every corner that is not a pill or a circle, and nothing else', () => {
    expect([...new Set(single)].sort((a, b) => a - b)).toEqual(
      [...new Set(Object.values(radii))].sort((a, b) => a - b),
    );
  });

  it('name every uneven corner set', () => {
    const sets = [...styles, ...allStyles(brandBoard)].flatMap((s) => {
      const v = pxValues(decl(s, 'border-radius') ?? '');
      return v.length === 4 ? [v.join(' ')] : [];
    });
    expect([...new Set(sets)].sort()).toEqual(
      Object.values(corners)
        .map((c) => c.join(' '))
        .sort(),
    );
  });

  it('make a pill from its height', () => {
    expect(pill(controls.button.height)).toBe(28);
  });
});

describe('controls', () => {
  it('match the primary button: 56 tall, a pill, a 3-point ink outline on a 4-point shadow', () => {
    expect(prototype).toContain(
      'height:56px;border-radius:28px;border:3px solid #17131C;background:#EFA3F4;color:#17131C;font:800 17px Lexend,sans-serif;box-shadow:0 4px 0 #17131C',
    );
    expect(controls.button).toEqual({ height: 56, outline: 3, shadow: 4 });
  });

  it('match the equal pair, the glass secondary and the move-in button', () => {
    expect(prototype).toContain('height:54px;border-radius:27px;border:3px solid #17131C');
    expect(prototype).toContain(
      'height:48px;border-radius:24px;border:1px solid rgba(255,255,255,.9);background:rgba(255,255,255,.8)',
    );
    expect(prototype).toContain('box-shadow:0 4px 0 #17131C;cursor:pointer;height:60px');
    expect(prototype).toContain('flex:1;height:52px;border-radius:26px');
  });

  it('match the call bar, the mic, the back button and the top pill', () => {
    expect(prototype).toContain('height:104px;border-radius:52px');
    expect(prototype).toContain('height:50px;width:96px;border-radius:25px');
    expect(prototype).toContain('width:72px;height:72px;border-radius:50%');
    expect(prototype).toContain('top:58px;left:14px;z-index:30;width:40px;height:40px');
    expect(prototype).toContain('height:40px;padding:0 14px 0 5px;border-radius:20px');
    expect(prototype).toContain('width:30px;height:30px;border-radius:15px');
    expect(controls.callBar.height).toBe(104);
    expect(controls.mic).toEqual({ size: 72, outline: 3 });
  });

  it('match the toggle, the choices, the chips and the timer', () => {
    expect(prototype).toContain('width:46px;height:28px;border-radius:14px');
    expect(prototype).toContain('width:20px;height:20px;border-radius:10px');
    expect(prototype).toContain('height:38px;padding:0 13px;border-radius:19px;border:2px solid');
    expect(prototype).toContain('height:34px;padding:0 12px;border-radius:17px');
    expect(prototype).toContain('width:96px;height:96px');
    expect(controls.toggle).toEqual({ width: 46, height: 28, knob: 20 });
  });
});

describe('layout', () => {
  it('is the prototype phone', () => {
    expect(prototype).toContain('width:390px;height:844px');
    expect(layout.screen).toEqual({ width: 390, height: 844 });
  });

  it('puts the top bar at 58 and bottom sheets 10 from the edges', () => {
    expect(prototype.match(/top:58px/g)?.length).toBeGreaterThanOrEqual(4);
    expect(prototype.match(/left:10px;right:10px;bottom:10px/g)?.length).toBeGreaterThanOrEqual(6);
    expect(prototype).toContain('left:8px;right:8px;top:{{ s.inf.sheetTop }};bottom:8px');
    expect(prototype).toContain('left:14px;right:14px;bottom:24px');
    expect(layout).toMatchObject({
      topBar: 58,
      sheetInset: 10,
      infoSheetInset: 8,
      callBarBottom: 24,
    });
  });
});
