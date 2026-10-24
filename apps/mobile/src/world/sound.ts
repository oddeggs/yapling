/* eslint-disable @typescript-eslint/no-require-imports -- bundled sounds are required assets */
import { PLACES, type PlaceId, type Weather } from '@yapling/scene';
import {
  AudioContext,
  AudioManager,
  type AudioBuffer,
  type AudioBufferSourceNode,
  type GainNode,
} from 'react-native-audio-api';

import { VoiceSession } from '../../modules/voice-session';
import { claimAudio, ownsAudio, releaseAudio, type AudioClaim } from '../voice/audio-owner';

/*
 * Every place sounds like itself: its music and its ambience (made with ElevenLabs), and the rain
 * or the wind on top. Off until the learner taps once. Between conversations it plays in its own
 * playback graph; during one it plays through the call's graph, so echo cancellation hears it and
 * keeps it out of the microphone, and the music dips while a character speaks.
 */

const ASSETS: Readonly<Record<string, () => number>> = {
  'a-cinema': () => require('../../assets/sound/a-cinema.mp3'),
  'a-field': () => require('../../assets/sound/a-field.mp3'),
  'a-laundry': () => require('../../assets/sound/a-laundry.mp3'),
  'a-library': () => require('../../assets/sound/a-library.mp3'),
  'a-office': () => require('../../assets/sound/a-office.mp3'),
  'a-platform': () => require('../../assets/sound/a-platform.mp3'),
  'a-room': () => require('../../assets/sound/a-room.mp3'),
  'a-sea': () => require('../../assets/sound/a-sea.mp3'),
  'a-stall': () => require('../../assets/sound/a-stall.mp3'),
  'a-street': () => require('../../assets/sound/a-street.mp3'),
  'a-wind': () => require('../../assets/sound/a-wind.mp3'),
  'm-bus': () => require('../../assets/sound/m-bus.mp3'),
  'm-cafe': () => require('../../assets/sound/m-cafe.mp3'),
  'm-cinema': () => require('../../assets/sound/m-cinema.mp3'),
  'm-field': () => require('../../assets/sound/m-field.mp3'),
  'm-harbour': () => require('../../assets/sound/m-harbour.mp3'),
  'm-interview': () => require('../../assets/sound/m-interview.mp3'),
  'm-laundry': () => require('../../assets/sound/m-laundry.mp3'),
  'm-library': () => require('../../assets/sound/m-library.mp3'),
  'm-noodles': () => require('../../assets/sound/m-noodles.mp3'),
  'm-platform': () => require('../../assets/sound/m-platform.mp3'),
  'm-roof': () => require('../../assets/sound/m-roof.mp3'),
  'm-room': () => require('../../assets/sound/m-room.mp3'),
  'w-rain': () => require('../../assets/sound/w-rain.mp3'),
  'w-wind': () => require('../../assets/sound/w-wind.mp3'),
  'bus-arrive': () => require('../../assets/sound/bus-arrive.mp3'),
  'bus-leave': () => require('../../assets/sound/bus-leave.mp3'),
};

type Layer = 'music' | 'ambience' | 'weather';

const LEVEL: Readonly<Record<Layer, number>> = { music: 0.42, ambience: 0.36, weather: 0.3 };
/** The music under a character's voice. */
const DUCKED = 0.16;

interface Playing {
  readonly key: string;
  readonly node: AudioBufferSourceNode;
  readonly gain: GainNode;
}

export class Sound {
  private own: AudioContext | null = null;
  private call: AudioContext | null = null;
  private claim: AudioClaim | null = null;
  private readonly buffers = new Map<AudioContext, Map<string, Promise<AudioBuffer>>>();
  private playing: Partial<Record<Layer, Playing>> = {};
  private ctxInUse: AudioContext | null = null;
  private on = false;
  private place: PlaceId = 'room';
  private weather: Weather = 'clear';
  private ducked = false;
  private busy: Promise<void> = Promise.resolve();

  /** Turns music and ambience on or off. */
  setOn(on: boolean): void {
    if (this.on === on) return;
    this.on = on;
    this.queue();
  }

  setPlace(place: PlaceId, weather: Weather): void {
    if (this.place === place && this.weather === weather) return;
    this.place = place;
    this.weather = weather;
    this.queue();
  }

  /** A conversation's graph took the audio (or gave it back with null). */
  setCallContext(ctx: AudioContext | null): void {
    if (this.call === ctx) return;
    this.call = ctx;
    this.queue();
  }

  /** A character is speaking: the music dips under the voice. */
  setDucked(ducked: boolean): void {
    if (this.ducked === ducked) return;
    this.ducked = ducked;
    const m = this.playing.music;
    const ctx = this.ctxInUse;
    if (m && ctx) m.gain.gain.setTargetAtTime(this.level('music'), ctx.currentTime, 0.35);
  }

  /** A short sound of the town (the bus arriving), when sound is on. */
  effect(key: 'bus-arrive' | 'bus-leave', volume = 0.7): void {
    const ctx = this.ctxInUse;
    if (!this.on || !ctx) return;
    void this.buffer(ctx, key).then((buffer) => {
      if (!buffer || this.ctxInUse !== ctx) return;
      const node = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = volume;
      node.buffer = buffer;
      node.connect(gain);
      gain.connect(ctx.destination);
      node.start(ctx.currentTime + 0.02);
    });
  }

  async dispose(): Promise<void> {
    this.on = false;
    await this.apply();
    await this.closeOwn();
  }

  private level(layer: Layer): number {
    if (layer === 'music' && this.ducked) return DUCKED;
    if (layer === 'weather' && PLACES[this.place].interior) return 0.14;
    return LEVEL[layer];
  }

  private wanted(): Partial<Record<Layer, string>> {
    if (!this.on) return {};
    const p = PLACES[this.place];
    const out: Partial<Record<Layer, string>> = {
      music: `m-${p.music}`,
      ambience: `a-${p.ambience}`,
    };
    if (this.weather === 'rain') out.weather = 'w-rain';
    if (this.weather === 'wind' || this.weather === 'snow') out.weather = 'w-wind';
    return out;
  }

  /** One change at a time: the graph, then the layers. */
  private queue(): void {
    this.busy = this.busy.then(() => this.apply()).catch(() => undefined);
  }

  private async apply(): Promise<void> {
    const want = this.wanted();
    const anything = Object.keys(want).length > 0;
    const ctx = !anything ? null : (this.call ?? (await this.ownContext()));
    if (ctx !== this.ctxInUse) {
      this.fadeAll(this.ctxInUse);
      this.ctxInUse = ctx;
    }
    if (this.call !== null || !anything) await this.closeOwn();
    if (!ctx) return;
    for (const layer of ['music', 'ambience', 'weather'] as const) {
      const key = want[layer];
      const cur = this.playing[layer];
      if (cur?.key === key) continue;
      if (cur) this.fade(cur, ctx);
      delete this.playing[layer];
      if (!key) continue;
      const buffer = await this.buffer(ctx, key);
      if (!buffer || this.ctxInUse !== ctx || this.wanted()[layer] !== key) continue;
      const node = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      node.buffer = buffer;
      node.loop = true;
      node.connect(gain);
      gain.connect(ctx.destination);
      node.start(ctx.currentTime + 0.02);
      gain.gain.setTargetAtTime(this.level(layer), ctx.currentTime, 0.9);
      this.playing[layer] = { key, node, gain };
    }
  }

  private fade(p: Playing, ctx: AudioContext): void {
    try {
      p.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      p.node.stop(ctx.currentTime + 2.5);
    } catch {
      // the graph is gone
    }
  }

  private fadeAll(ctx: AudioContext | null): void {
    for (const layer of ['music', 'ambience', 'weather'] as const) {
      const p = this.playing[layer];
      if (p && ctx) this.fade(p, ctx);
      delete this.playing[layer];
    }
  }

  private buffer(ctx: AudioContext, key: string): Promise<AudioBuffer | null> {
    let byKey = this.buffers.get(ctx);
    if (!byKey) {
      byKey = new Map();
      this.buffers.set(ctx, byKey);
    }
    const asset = ASSETS[key];
    if (!asset) return Promise.resolve(null);
    let p = byKey.get(key);
    if (!p) {
      p = ctx.decodeAudioData(asset());
      byKey.set(key, p);
    }
    return p.catch(() => {
      byKey.delete(key);
      return null;
    });
  }

  /** The playback graph between conversations, on a playback session that mixes with nothing. */
  private async ownContext(): Promise<AudioContext> {
    if (this.own && ownsAudio(this.claim)) return this.own;
    this.claim = claimAudio('listen');
    VoiceSession?.setVoiceProcessing(false);
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playback',
      iosMode: 'default',
      iosOptions: [],
    });
    await AudioManager.setAudioSessionActivity(true);
    if (this.own) {
      await this.own.suspend().catch(() => undefined);
      await this.own.resume().catch(() => undefined);
      return this.own;
    }
    const ctx = new AudioContext();
    await ctx.resume();
    this.own = ctx;
    return ctx;
  }

  private async closeOwn(): Promise<void> {
    const own = this.own;
    if (!own) return;
    this.own = null;
    this.buffers.delete(own);
    setTimeout(() => void own.close().catch(() => undefined), 2_600);
    if (releaseAudio(this.claim))
      await AudioManager.setAudioSessionActivity(false).catch(() => false);
    this.claim = null;
  }
}
