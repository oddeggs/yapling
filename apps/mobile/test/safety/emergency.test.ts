import { describe, expect, it } from '@jest/globals';

import { translator } from '@yapling/i18n';
import { countryOf, emergencyFor } from '../../src/features/safety/emergency';
import { safetyView } from '../../src/features/safety/safety-model';

describe('the emergency number', () => {
  it('is 115 in Vietnam', () => {
    expect(emergencyFor('VN')).toMatchObject({ number: '115', countryKey: 'safety.country.vn' });
    expect(emergencyFor('vn')?.number).toBe('115');
  });

  it('is never guessed for a country without a verified one', () => {
    expect(emergencyFor('US')).toBeNull();
    expect(emergencyFor('ID')).toBeNull();
    expect(emergencyFor(null)).toBeNull();
    expect(emergencyFor('toString')).toBeNull();
  });

  it('follows where the phone is, then its region, then the launch country', () => {
    expect(countryOf({ timeZone: 'Asia/Ho_Chi_Minh', locale: 'en-US' })).toBe('VN');
    expect(countryOf({ timeZone: 'Asia/Saigon' })).toBe('VN');
    expect(countryOf({ timeZone: 'Asia/Jakarta', locale: 'id-ID' })).toBe('ID');
    expect(countryOf({ timeZone: 'Europe/London', locale: 'en_GB' })).toBe('GB');
    expect(countryOf({ locale: 'zh-Hant-TW' })).toBe('TW');
    expect(countryOf({ timeZone: 'UTC', locale: 'vi' })).toBe('VN');
    expect(countryOf({})).toBe('VN');
  });
});

describe('the safety sheet', () => {
  it('offers the country’s number to call, in the chrome’s language', () => {
    const vi = safetyView(emergencyFor('VN'), 'Pip', translator('vi'));
    expect(vi.emergency).toEqual({
      title: 'Cấp cứu',
      sub: 'Nếu bạn đang gặp nguy hiểm · Việt Nam',
      call: { label: 'Gọi 115', number: '115', a11y: 'Gọi 115' },
    });
    expect(vi.body).toContain('Pip là AI');
  });

  it('asks for the local emergency number where it has none to offer', () => {
    const en = safetyView(emergencyFor('US'), 'Mochi', translator('en'));
    expect(en.emergency.call).toBeNull();
    expect(en.emergency.sub).toBe('If you are in danger now, call your local emergency number.');
    expect(en.body).toContain('Mochi is an AI');
    expect(en.trusted.title).toBe('Message someone you trust');
    expect(en.later).toBe('Back to Natterwick later');
  });
});
