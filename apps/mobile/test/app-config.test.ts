import { describe, expect, it } from '@jest/globals';

import { BACKGROUND, USAGE, buildConfig, resolveVariant } from '../app.config';

const unset = { easProjectId: undefined, apiBase: undefined };

describe('app variants', () => {
  it('defaults to dev when APP_VARIANT is unset or empty', () => {
    expect(resolveVariant(undefined)).toBe('dev');
    expect(resolveVariant('')).toBe('dev');
  });

  it('rejects an unknown variant', () => {
    expect(() => resolveVariant('staging')).toThrow('APP_VARIANT');
  });

  it('installs dev and the store app side by side under their own names, bundle ids and schemes', () => {
    const dev = buildConfig({}, 'dev', unset);
    const prd = buildConfig({}, 'prd', unset);
    expect(dev.name).toBe('Yapling Dev');
    expect(prd.name).toBe('Yapling');
    expect(dev.ios?.bundleIdentifier).toBe('studio.oddeggs.yapling.dev');
    expect(prd.ios?.bundleIdentifier).toBe('studio.oddeggs.yapling');
    expect(prd.scheme).toBe('yapling');
    expect(dev.scheme).not.toBe(prd.scheme);
  });

  it('runs on iPhone only, portrait, on the app background', () => {
    for (const variant of ['dev', 'prd'] as const) {
      const config = buildConfig({}, variant, unset);
      expect(config.platforms).toEqual(['ios']);
      expect(config.orientation).toBe('portrait');
      expect(config.ios?.supportsTablet).toBe(false);
      expect(config.backgroundColor).toBe(BACKGROUND);
      expect(config.plugins).toContainEqual([
        'expo-splash-screen',
        { backgroundColor: BACKGROUND },
      ]);
    }
  });

  it('explains the microphone and speech recognition before iOS asks', () => {
    for (const variant of ['dev', 'prd'] as const) {
      const plist = buildConfig({}, variant, unset).ios?.infoPlist;
      expect(plist?.['NSMicrophoneUsageDescription']).toBe(USAGE.microphone);
      expect(plist?.['NSSpeechRecognitionUsageDescription']).toBe(USAGE.speechRecognition);
    }
  });

  it('turns updates off and leaves EAS unlinked until a project id is given', () => {
    const unlinked = buildConfig({}, 'prd', unset);
    expect(unlinked.updates?.enabled).toBe(false);
    expect(unlinked.extra?.['eas']).toBeUndefined();

    const id = '00000000-0000-4000-8000-000000000000';
    const linked = buildConfig({}, 'prd', { ...unset, easProjectId: id });
    expect(linked.updates?.url).toBe(`https://u.expo.dev/${id}`);
    expect(linked.extra?.['eas']).toEqual({ projectId: id });
  });

  it('points at API_BASE when set, and at the variant default when it is empty', () => {
    const phone = buildConfig({}, 'dev', { ...unset, apiBase: 'http://192.168.1.20:8787/api' });
    expect(phone.extra?.['apiBase']).toBe('http://192.168.1.20:8787/api');
    const empty = buildConfig({}, 'dev', { ...unset, apiBase: '' });
    expect(empty.extra?.['apiBase']).toBe('http://127.0.0.1:8787/api');
    expect(buildConfig({}, 'prd', unset).extra?.['apiBase']).toBeUndefined();
  });
});

describe('the call audio', () => {
  it('keeps a live call running in the background and leaves the mic string to the app', () => {
    for (const variant of ['dev', 'prd'] as const) {
      const config = buildConfig({}, variant, unset);
      expect(config.plugins).toContainEqual([
        'react-native-audio-api',
        { iosBackgroundMode: true, androidForegroundService: false, androidPermissions: [] },
      ]);
    }
  });
});
