// Call socket frames (spike). Up: binary frames are raw PCM16LE 16 kHz mono (20 ms = 640 bytes);
// text frames are JSON controls. Down: JSON text frames only (TTS audio is base64 inside).

export type CallConfig = {
  commit: "smart" | "turn_prediction" | "vad" | "manual";
  specMs: number;
  holdMs: number;
  holdLongMs: number;
  vadSecs: number;
  ttsModel: string;
  ttsStrategy: "schedule" | "auto" | "flush1" | "flush_early";
  sttRegion: "sg" | "global";
  outputFormat: string;
  merge: boolean;
  speed: number;
  prewarm: boolean;
  filler: boolean;
  hedge: number;
};

export type ClientControl = { type: "end_turn" } | { type: "hangup" } | { type: "mark"; name: "speech_end" };

// DO-clock epoch ms for each stage of one reply.
export type TurnTimings = {
  speechEnd: number;
  commit: number;
  llmStart?: number;
  llmFirstToken?: number;
  ttsReady?: number;
  ttsFirstText?: number;
  ttsFirstAudio?: number;
  release?: number;
  firstAudioOut?: number;
  llmDone?: number;
  ttsDone?: number;
};

export type ServerFrame =
  | {
      type: "ready";
      sttRegion: "sg" | "global";
      sttConnectMs: number;
      sttFallbackReason?: string;
      config: CallConfig;
      colo: string;
    }
  | { type: "partial"; text: string; t: number }
  | { type: "final"; turn: number; text: string; reason: "fresh" | "merged" | "overlap"; t: number }
  | { type: "words"; words: unknown; t: number }
  | { type: "mark"; turn: number; name: "first_audio"; t: number; timings: TurnTimings }
  | { type: "tts_audio"; turn: number; seq: number; audio: string; alignment: unknown; t: number }
  | { type: "play_rec"; turn: number; id: string; t: number }
  | { type: "turn_aborted"; turn: number; reason: string; audioSent: boolean; t: number }
  | {
      type: "turn_done";
      turn: number;
      user: string;
      pip: string;
      timings: TurnTimings;
      usage: { input: number; cacheRead: number; cacheWrite: number; output: number; ttsChars: number };
      t: number;
    }
  | { type: "call_summary"; reason: string; totals: Record<string, number> }
  | { type: "info"; what: string; ms: number; requestId: string }
  | { type: "error"; where: string; detail: string };
