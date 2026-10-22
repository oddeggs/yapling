import { describe, expect, it, jest } from '@jest/globals';

import { menuShown, openMenuOnce } from '../../src/features/devmenu/menu-once';

describe('the test menu opens once', () => {
  it('opens nothing more while it is up, and again once it has closed', () => {
    const push = jest.fn();
    expect(openMenuOnce(push)).toBe(true);
    const closed = menuShown();
    expect(openMenuOnce(push)).toBe(false);
    expect(openMenuOnce(push)).toBe(false);
    expect(push).toHaveBeenCalledTimes(1);
    closed();
    expect(openMenuOnce(push)).toBe(true);
    expect(push).toHaveBeenCalledTimes(2);
    menuShown()();
  });

  it('counts a menu on its way up as open', () => {
    const push = jest.fn();
    openMenuOnce(push);
    openMenuOnce(push);
    expect(push).toHaveBeenCalledTimes(1);
    menuShown()();
  });
});
