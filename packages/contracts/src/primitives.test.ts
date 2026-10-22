import * as primitives from './primitives';
import { describeSchemas } from './schema-runner.test-data';

describeSchemas('primitives', primitives, {
  Id: [
    ['s1-e1', 'past_ed', 's1-e1.b03', 'order-and-change'],
    ['', 'Has-Caps', 'has space', '-leading', 'x'.repeat(65)],
  ],
  OpaqueId: [
    ['usr_01J9ZK3', 'c-9f2a'],
    ['', 'a/b', 'x'.repeat(65)],
  ],
  Token: [['t'.repeat(16)], ['short', 't'.repeat(2_049)]],
  EpochMs: [
    [0, 1_792_000_000_000],
    [-1, 1.5, '0'],
  ],
  LocalDate: [['2026-10-22'], ['2026-13-01', '22/10/2026', '2026-10-22T00:00:00Z']],
  LocalTime: [
    ['00:00', '22:00', '08:30', '23:59'],
    ['24:00', '8:00', '22:60', '22:00:00'],
  ],
  TimeZone: [
    ['Asia/Ho_Chi_Minh', 'America/Argentina/Buenos_Aires', 'UTC', 'Etc/GMT+7'],
    ['', 'Asia Ho Chi Minh', '+07:00'],
  ],
  ClientVersion: [
    ['1.0.0', '1.12.3+42'],
    ['1.0', 'v1.0.0', '1.0.0-beta'],
  ],
  Ms: [
    [0, 1_500],
    [-1, 0.5],
  ],
  Seconds: [
    [0, 600],
    [-1, 1.5],
  ],
  Phrase: [['Could we push that to Friday?'], ['', 'x'.repeat(201)]],
  Text: [['Hi! I am Lan.'], ['', 'x'.repeat(2_001)]],
  CharacterId: [
    ['pip', 'linh', 'mei', 'sol', 'hank', 'nell', 'bea', 'dex', 'arjun', 'mags', 'office'],
    ['Pip', 'sari', ''],
  ],
  RoommateSpecies: [
    ['redpanda', 'capybara', 'cat'],
    ['red_panda', 'otter'],
  ],
  Stage: [
    ['newcomer', 'neighbour', 'regular', 'local', 'voice'],
    ['neighbor', 'b1'],
  ],
  Track: [['life', 'work', 'both'], ['play']],
  Pace: [
    ['slower', 'faster'],
    ['both', 'normal'],
  ],
  FirstLanguage: [
    ['vi', 'id', 'th', 'pt', 'es', 'ja', 'ko', 'tr', 'other'],
    ['en', 'vi-VN', ''],
  ],
  CallKind: [
    ['placement', 'episode', 'real_week', 'practice', 'voicemail_reply'],
    ['real-week', 'camera'],
  ],
  RingSlotKind: [['episode', 'real_week', 'practice'], ['placement']],
  PhraseState: [
    ['seed', 'sprout', 'leaf', 'bloom'],
    ['met', 'wilted'],
  ],
  Plan: [
    ['free', 'plus'],
    ['pro', 'lifetime'],
  ],
});
