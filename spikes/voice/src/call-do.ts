// CallDO: one per live call. Phone <-> DO over one WebSocket; DO -> Scribe v2 Realtime (STT),
// Claude Haiku 5.5 (turn text), ElevenLabs stream-input (TTS + alignment) -> phone.
// Frame shapes are in protocol.ts. Timings are DO-clock ms (Date.now advances on I/O).
import { DurableObject } from "cloudflare:workers";
import Anthropic from "@anthropic-ai/sdk";
import { PIP_SYSTEM } from "./persona";
import { hedged } from "./hedge";
import { frameRms, holdFor, joinSegments, pickFiller } from "./endpointing";
import { b64, isDialogue, openTts, openUpstream, sttUrl, ttsTextFrame } from "./upstream";
import { parseConfig } from "./config";
import type { CallConfig, ClientControl, ServerFrame, TurnTimings } from "./protocol";

export interface Env {
  CALL: DurableObjectNamespace<CallDO>;
  ANTHROPIC_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  SPIKE_TOKEN: string;
}

const LLM_MODEL = "claude-haiku-5-5";
type Turn = {
  id: number;
  userText: string;
  ctrl: AbortController;
  tts: WebSocket | null;
  audioSent: boolean;
  aborted: boolean;
  // Smart endpointing: audio is generated speculatively and held until the silence is long enough.
  gated: boolean;
  held: string[];
  ttsFinal: boolean;
  // Recorded reaction ("Ooh,") played from the app bundle at release while the reply streams in.
  filler: string | null;
  pipText: string;
  ttsChars: number;
  t: TurnTimings;
  usage: { input: number; cacheRead: number; cacheWrite: number; output: number };
};

export class CallDO extends DurableObject<Env> {
  private client: WebSocket | null = null;
  private stt: WebSocket | null = null;
  private sttQueue: Uint8Array[] = [];
  private cfg!: CallConfig;
  private llm!: Anthropic;
  private history: Anthropic.MessageParam[] = [];
  private pendingUser = "";
  private turn: Turn | null = null;
  private turnSeq = 0;
  private ttsSpare: Promise<WebSocket> | null = null;
  private speechEndAt = 0;
  private lastCommitAt = 0;
  private lastCommittedText = "";
  private debug = false;
  // Smart endpointing state (DO-side energy VAD over the PCM frames).
  private vad = { voicedRun: 0, silenceMs: 0, inSpeech: false, committed: true };
  private totals = { audioBytes: 0, ttsChars: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, turns: 0 };

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    const pair = new WebSocketPair();
    const [clientSide, server] = [pair[0], pair[1]];
    server.accept();
    // Newer compatibility dates deliver binary frames as Blob unless asked otherwise.
    server.binaryType = "arraybuffer";
    this.client = server;
    this.cfg = parseConfig(new URL(request.url));
    this.debug = new URL(request.url).searchParams.get("debug") === "1";
    this.llm = new Anthropic({ apiKey: this.env.ANTHROPIC_API_KEY, maxRetries: 1 });
    server.addEventListener("message", (e) => this.onClientMessage(e.data));
    server.addEventListener("close", () => this.hangup("client_closed"));
    this.ctx.waitUntil(this.start());
    return new Response(null, { status: 101, webSocket: clientSide });
  }

  private send(frame: ServerFrame): void {
    try {
      this.client?.send(JSON.stringify(frame));
    } catch {
      /* client gone */
    }
  }

  private async start(): Promise<void> {
    const t0 = Date.now();
    const colo = fetch("https://www.cloudflare.com/cdn-cgi/trace")
      .then((r) => r.text())
      .then((t) => /colo=(\w+)/.exec(t)?.[1] ?? "?")
      .catch(() => "?");
    if (this.cfg.prewarm) this.ctx.waitUntil(this.prewarmLlm());
    let region: "sg" | "global" = this.cfg.sttRegion;
    let sttError: string | undefined;
    try {
      this.stt = await this.openStt(region);
    } catch (err) {
      sttError = String(err);
      if (region !== "sg") {
        this.send({ type: "error", where: "stt_connect", detail: sttError });
        return;
      }
      // The Singapore residency host upgrades the socket but rejects keys from the global region.
      region = "global";
      try {
        this.stt = await this.openStt(region);
      } catch (err2) {
        this.send({ type: "error", where: "stt_connect", detail: `${sttError} | ${String(err2)}` });
        return;
      }
    }
    const sttConnectMs = Date.now() - t0;
    this.stt.addEventListener("message", (e) => this.onSttMessage(String(e.data)));
    this.stt.addEventListener("close", (e) =>
      this.send({ type: "error", where: "stt_closed", detail: `${e.code} ${e.reason}` }),
    );
    for (const chunk of this.sttQueue) this.sendAudio(chunk, false);
    this.sttQueue = [];
    this.ttsSpare = openTts(this.cfg, this.env.ELEVENLABS_API_KEY);
    this.send({
      type: "ready",
      sttRegion: region,
      sttConnectMs,
      ...(sttError ? { sttFallbackReason: sttError } : {}),
      config: this.cfg,
      colo: await colo,
    });
  }

  // Resolves once Scribe confirms the session, so auth errors after the upgrade count as failures.
  private async openStt(region: "sg" | "global"): Promise<WebSocket> {
    const ws = await openUpstream(sttUrl(this.cfg, region), this.env.ELEVENLABS_API_KEY);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("no session_started in 5 s")), 5000);
      const onMsg = (e: MessageEvent): void => {
        const msg = JSON.parse(String(e.data)) as { message_type: string; error?: string };
        clearTimeout(timer);
        ws.removeEventListener("message", onMsg);
        if (msg.message_type === "session_started") resolve();
        else reject(new Error(`${msg.message_type}: ${msg.error ?? ""}`));
      };
      ws.addEventListener("message", onMsg);
    }).catch((err: unknown) => {
      try {
        ws.close(1000, "fallback");
      } catch {
        /* closed */
      }
      throw err;
    });
    return ws;
  }

  private async prewarmLlm(): Promise<void> {
    // Writes the system prompt to the cache and warms the TLS connection before the first turn.
    try {
      const t0 = Date.now();
      const { response } = await this.llm.messages
        .create({
          model: LLM_MODEL,
          max_tokens: 0,
          system: [{ type: "text", text: PIP_SYSTEM, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: "(call connected)" }],
        })
        .withResponse();
      this.send({
        type: "info",
        what: "llm_prewarm",
        ms: Date.now() - t0,
        requestId: response.headers.get("request-id") ?? "?",
      });
    } catch (err) {
      this.send({ type: "error", where: "llm_prewarm", detail: String(err).slice(0, 300) });
    }
  }

  // ---- client frames ----

  private onClientMessage(data: string | ArrayBuffer): void {
    if (typeof data !== "string") {
      const bytes = new Uint8Array(data);
      this.totals.audioBytes += bytes.length;
      if (this.stt) this.sendAudio(bytes, false);
      else this.sttQueue.push(bytes);
      if (this.cfg.commit === "smart") this.vadStep(bytes);
      return;
    }
    let msg: ClientControl;
    try {
      msg = JSON.parse(data) as ClientControl;
    } catch {
      return;
    }
    if (msg.type === "end_turn") {
      // Hold-to-talk release: commit whatever Scribe has buffered.
      this.speechEndAt = Date.now();
      this.sendAudio(new Uint8Array(320), true);
    } else if (msg.type === "mark" && msg.name === "speech_end") {
      this.speechEndAt = Date.now();
    } else if (msg.type === "hangup") {
      this.hangup("hangup");
    }
  }

  private sendAudio(bytes: Uint8Array, commit: boolean): void {
    try {
      this.stt?.send(
        JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: b64(bytes), commit, sample_rate: 16000 }),
      );
    } catch (err) {
      this.send({ type: "error", where: "stt_send", detail: String(err) });
    }
  }

  // ---- STT ----

  private onSttMessage(raw: string): void {
    if (this.debug) console.log("stt<", raw.slice(0, 120));
    let msg: { message_type: string; text?: string; words?: unknown; error?: string };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const now = Date.now();
    switch (msg.message_type) {
      case "session_started":
        return;
      case "partial_transcript": {
        const text = (msg.text ?? "").trim();
        if (!text) return;
        this.send({ type: "partial", text, t: now });
        // The learner is still (or again) talking: drop a reply that has not reached the phone yet.
        const turn = this.turn;
        if (
          this.cfg.commit !== "smart" &&
          this.cfg.merge &&
          turn &&
          !turn.audioSent &&
          !turn.aborted &&
          text !== this.lastCommittedText
        ) {
          this.abortTurn(turn, "learner_resumed");
        }
        return;
      }
      case "committed_transcript":
      case "committed_transcript_with_timestamps": {
        const text = (msg.text ?? "").trim();
        // Both messages arrive for one commit; act on the first, forward words from the second.
        if (msg.message_type === "committed_transcript_with_timestamps") {
          if (text && text === this.lastCommittedText && now - this.lastCommitAt < 1500) {
            this.send({ type: "words", words: msg.words ?? null, t: now });
            return;
          }
        } else if (text && text === this.lastCommittedText && now - this.lastCommitAt < 1500) {
          return;
        }
        if (!text) return;
        this.lastCommittedText = text;
        this.lastCommitAt = now;
        this.onCommit(text, now);
        return;
      }
      default:
        this.send({ type: "error", where: `stt_${msg.message_type}`, detail: msg.error ?? raw.slice(0, 300) });
    }
  }

  private onCommit(text: string, at: number): void {
    if (this.cfg.commit === "smart" && this.vad.inSpeech) {
      // The learner started talking again before this segment's text came back: wait for the rest.
      this.pendingUser = joinSegments(this.pendingUser, text);
      this.send({ type: "turn_aborted", turn: 0, reason: "learner_resumed_before_final", audioSent: false, t: at });
      return;
    }
    const cur = this.turn;
    let reason: "fresh" | "merged" | "overlap" = "fresh";
    if (cur && !cur.aborted) {
      if (!cur.audioSent && this.cfg.merge) {
        this.abortTurn(cur, "merged_with_next_commit");
        reason = "merged";
      } else {
        this.abortTurn(cur, "learner_spoke_over_reply");
        reason = "overlap";
        this.pendingUser = "";
      }
    } else if (this.pendingUser) {
      reason = "merged";
    }
    this.pendingUser = joinSegments(this.pendingUser, text);
    void this.runTurn(this.pendingUser, at, reason);
  }

  // ---- smart endpointing ----

  private vadStep(bytes: Uint8Array): void {
    const rms = frameRms(bytes);
    const frameMs = bytes.byteLength / 32;
    const v = this.vad;
    if (rms > 400) {
      v.voicedRun++;
      v.silenceMs = 0;
    } else {
      v.voicedRun = 0;
      v.silenceMs += frameMs;
    }
    if (v.voicedRun >= 2 && !v.inSpeech) {
      v.inSpeech = true;
      v.committed = false;
      const turn = this.turn;
      // Speech resumed before the reply reached the phone: drop it, keep the learner's words.
      if (turn && !turn.audioSent && !turn.aborted) this.abortTurn(turn, "learner_resumed");
    }
    if (v.inSpeech && v.silenceMs >= this.cfg.specMs && !v.committed) {
      // Commit early and start the reply speculatively; release decides later.
      v.inSpeech = false;
      v.committed = true;
      this.sendAudio(new Uint8Array(320), true);
    }
    const turn = this.turn;
    if (turn && turn.gated && !turn.aborted && !v.inSpeech && v.silenceMs >= holdFor(turn.userText, this.cfg)) {
      this.release(turn);
    }
  }

  private release(turn: Turn): void {
    turn.gated = false;
    turn.t.release = Date.now();
    if (turn.filler && turn.held.length === 0) {
      this.send({ type: "play_rec", turn: turn.id, id: turn.filler, t: Date.now() });
    } else {
      turn.filler = null;
    }
    for (const frame of turn.held) this.forwardAudio(turn, frame);
    turn.held = [];
    if (turn.ttsFinal) this.finishTurn(turn);
  }

  private abortTurn(turn: Turn, reason: string): void {
    turn.aborted = true;
    turn.ctrl.abort();
    try {
      turn.tts?.close(1000, "aborted");
    } catch {
      /* already closed */
    }
    if (this.turn === turn) this.turn = null;
    if (!this.ttsSpare) this.ttsSpare = openTts(this.cfg, this.env.ELEVENLABS_API_KEY);
    this.send({ type: "turn_aborted", turn: turn.id, reason, audioSent: turn.audioSent, t: Date.now() });
  }

  // ---- one reply ----

  private async runTurn(userText: string, commitAt: number, reason: "fresh" | "merged" | "overlap"): Promise<void> {
    const turn: Turn = {
      id: ++this.turnSeq,
      userText,
      ctrl: new AbortController(),
      tts: null,
      audioSent: false,
      aborted: false,
      gated: this.cfg.commit === "smart",
      filler: this.cfg.commit === "smart" && this.cfg.filler ? pickFiller(userText, this.turnSeq) : null,
      held: [],
      ttsFinal: false,
      pipText: "",
      ttsChars: 0,
      t: { speechEnd: this.speechEndAt, commit: commitAt },
      usage: { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 },
    };
    this.turn = turn;
    this.send({ type: "final", turn: turn.id, text: userText, reason, t: commitAt });

    const spare = this.ttsSpare;
    this.ttsSpare = null;
    const ttsPromise = (spare ?? openTts(this.cfg, this.env.ELEVENLABS_API_KEY)).catch((err: unknown) => {
      this.send({ type: "error", where: "tts_connect", detail: String(err) });
      return null;
    });
    const messages: Anthropic.MessageParam[] = [...this.history, { role: "user", content: userText }];
    if (turn.filler) {
      // The phone plays a recorded reaction the moment the hold ends; the reply continues from it.
      messages.push({
        role: "system",
        content: `Pip has already said "${turn.filler}" out loud to start this reply. Continue right after it: do not start with Ooh, Oh, Mm or Hmm.`,
      });
    }
    turn.t.llmStart = Date.now();
    let buf = "";
    let tts: WebSocket | null = null;
    let flushedOnce = false;
    const pushText = (piece: string, flush = false): void => {
      if (!tts || turn.aborted || !piece) return;
      turn.t.ttsFirstText ??= Date.now();
      turn.ttsChars += piece.length;
      tts.send(JSON.stringify(ttsTextFrame(this.cfg, piece, flush)));
    };
    const drain = (final: boolean): void => {
      if (this.cfg.ttsStrategy === "auto") {
        // auto_mode wants whole phrases: cut at clause punctuation.
        const re = /[.!?,;:]\s/g;
        let last = -1;
        for (let m = re.exec(buf); m; m = re.exec(buf)) last = m.index + m[0].length;
        if (last > 0) {
          pushText(buf.slice(0, last));
          buf = buf.slice(last);
        }
      } else {
        const i = buf.lastIndexOf(" ");
        if (i >= 0) {
          const piece = buf.slice(0, i + 1);
          buf = buf.slice(i + 1);
          // flush1: force generation as soon as the first clause is complete, then let the
          // server schedule the rest.
          const sent = turn.ttsChars + piece.length;
          const clauseEnd = /[.!?,;:]\s$/.test(piece) && sent >= 12;
          // flush_early also cuts after about four words when no clause has ended yet.
          const early = this.cfg.ttsStrategy === "flush_early" && sent >= 20;
          const flush =
            (this.cfg.ttsStrategy === "flush1" || this.cfg.ttsStrategy === "flush_early") &&
            !flushedOnce &&
            (clauseEnd || early);
          if (flush) flushedOnce = true;
          pushText(piece, flush);
        }
      }
      if (final && buf) {
        pushText(`${buf} `);
        buf = "";
      }
    };

    try {
      const params: Anthropic.MessageStreamParams = {
        model: LLM_MODEL,
        max_tokens: 200,
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
        cache_control: { type: "ephemeral" },
        system: [{ type: "text", text: PIP_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages,
      };
      const stream = hedged((signal) => this.llm.messages.stream(params, { signal }), this.cfg.hedge, turn.ctrl.signal);
      for await (const ev of stream) {
        if (turn.aborted) break;
        if (ev.type === "message_start") {
          const u = ev.message.usage;
          turn.usage.input = u.input_tokens;
          turn.usage.cacheRead = u.cache_read_input_tokens ?? 0;
          turn.usage.cacheWrite = u.cache_creation_input_tokens ?? 0;
        } else if (ev.type === "message_delta") {
          turn.usage.output = ev.usage.output_tokens;
        } else if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
          if (turn.t.llmFirstToken === undefined) {
            turn.t.llmFirstToken = Date.now();
            tts = await ttsPromise;
            turn.tts = tts;
            if (turn.aborted) {
              tts?.close(1000, "aborted");
              return;
            }
            if (tts) this.wireTts(turn, tts);
            turn.t.ttsReady = Date.now();
          }
          turn.pipText += ev.delta.text;
          buf += ev.delta.text;
          drain(false);
        }
      }
      if (turn.aborted) return;
      turn.t.llmDone = Date.now();
      drain(true);
      if (tts) tts.send(JSON.stringify(isDialogue(this.cfg) ? { close_socket: true } : { text: "" }));
    } catch (err) {
      if (turn.aborted) return;
      this.send({ type: "error", where: "llm", detail: String(err).slice(0, 400) });
      this.abortTurn(turn, "llm_error");
    }
  }

  private wireTts(turn: Turn, tts: WebSocket): void {
    let seq = 0;
    tts.addEventListener("message", (e) => {
      if (turn.aborted) return;
      let msg: {
        audio?: string | null;
        alignment?: unknown;
        isFinal?: boolean;
        is_final?: boolean;
        is_final_audio_for_turn?: boolean;
        error?: string;
        message?: string;
      };
      try {
        msg = JSON.parse(String(e.data));
      } catch {
        return;
      }
      if (msg.audio) {
        turn.t.ttsFirstAudio ??= Date.now();
        const frame = JSON.stringify({
          type: "tts_audio",
          turn: turn.id,
          seq: seq++,
          audio: msg.audio,
          alignment: msg.alignment ?? null,
          t: Date.now(),
        } satisfies ServerFrame);
        if (turn.gated) turn.held.push(frame);
        else this.forwardAudio(turn, frame);
      } else if (msg.isFinal || msg.is_final) {
        turn.ttsFinal = true;
        if (!turn.gated) this.finishTurn(turn);
      } else if (msg.is_final_audio_for_turn) {
        return;
      } else if (msg.error || msg.message) {
        this.send({ type: "error", where: "tts", detail: String(msg.error ?? msg.message) });
      }
    });
    tts.addEventListener("close", (e) => {
      if (!turn.aborted && this.turn === turn) {
        if (e.code !== 1000) this.send({ type: "error", where: "tts_closed", detail: `${e.code} ${e.reason}` });
        turn.ttsFinal = true;
        if (!turn.gated) this.finishTurn(turn);
      }
    });
  }

  private forwardAudio(turn: Turn, frame: string): void {
    if (!turn.audioSent) {
      turn.audioSent = true;
      turn.t.firstAudioOut = Date.now();
      // The reply is now on its way to the phone: commit the learner's text to history.
      this.pendingUser = "";
      this.send({ type: "mark", turn: turn.id, name: "first_audio", t: Date.now(), timings: turn.t });
    }
    try {
      this.client?.send(frame);
    } catch {
      /* client gone */
    }
  }

  private finishTurn(turn: Turn): void {
    if (this.turn !== turn) return;
    turn.t.ttsDone = Date.now();
    this.turn = null;
    this.history.push(
      { role: "user", content: turn.userText },
      { role: "assistant", content: `${turn.filler ? `${turn.filler} ` : ""}${turn.pipText.trim()}` || "..." },
    );
    this.totals.turns++;
    this.totals.ttsChars += turn.ttsChars;
    this.totals.input += turn.usage.input;
    this.totals.cacheRead += turn.usage.cacheRead;
    this.totals.cacheWrite += turn.usage.cacheWrite;
    this.totals.output += turn.usage.output;
    this.send({
      type: "turn_done",
      turn: turn.id,
      user: turn.userText,
      pip: turn.pipText.trim(),
      timings: turn.t,
      usage: { ...turn.usage, ttsChars: turn.ttsChars },
      t: Date.now(),
    });
    if (!this.ttsSpare) this.ttsSpare = openTts(this.cfg, this.env.ELEVENLABS_API_KEY);
  }

  // ---- TTS ----

  private hangup(reason: string): void {
    if (this.turn) this.abortTurn(this.turn, reason);
    this.send({
      type: "call_summary",
      reason,
      totals: { ...this.totals, audioSeconds: this.totals.audioBytes / 32000 },
    });
    for (const ws of [this.stt, this.client]) {
      try {
        ws?.close(1000, reason);
      } catch {
        /* closed */
      }
    }
    void this.ttsSpare?.then((ws) => ws.close(1000, "hangup")).catch(() => undefined);
    this.stt = null;
    this.client = null;
  }
}
