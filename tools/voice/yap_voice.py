#!/usr/bin/env python3
"""Yapling recorded-line pipeline (ElevenLabs).

  yap_voice.py estimate [prefix ...]  characters per voice, rough credit cost; with
                                     prefixes (or "pending"), list each matching line
  yap_voice.py design [char ...]     3 voice-design previews per undecided character
  yap_voice.py pick <char> <n>       save preview n as that character's voice
  yap_voice.py render [id ...]       render lines (mp3 + timing json); skips existing.
                                     Pending lines render only when named by id
  yap_voice.py audition <takes.json> render the takes listed in an audition file next to it
  yap_voice.py pace [--max N] [path ...]
                                     words per minute from timing files (default: the
                                     recorded lines at speed 0.7 or slower); fails any
                                     English take of 3+ words over N (default 100)
  yap_voice.py sfx                   render sound effects

lines.json has two lists: "lines" (recorded; each has its mp3 and timing file) and
"pending" (written, not yet recorded). Move a pending line into "lines" once it is rendered.

Needs ELEVENLABS_API_KEY in the environment. Stdlib only.
"""
import base64, json, os, re, sys, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "audio"
CAST = AUDIO / "cast-voices.json"
LINES = AUDIO / "season-1" / "lines.json"
OUT = AUDIO / "season-1" / "lines"
AUDITIONS = AUDIO / "auditions"
API = "https://api.elevenlabs.io"


def load(p):
    return json.loads(p.read_text())


def save(p, data):
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def call(path, body, raw=False):
    req = urllib.request.Request(
        API + path, data=json.dumps(body).encode(),
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"{path}: HTTP {e.code} {e.read().decode()[:400]}")
    return data if raw else json.loads(data)


def plain(text):
    return re.sub(r"\s+", " ", re.sub(r"\[[^\]]*\]", "", text)).strip()


def all_lines():
    data = load(LINES)
    return data["lines"], data.get("pending", [])


def estimate(prefixes):
    recorded, pending = all_lines()
    if prefixes:
        pool = pending if prefixes == ["pending"] else [
            l for l in recorded + pending if any(l["id"].startswith(p) for p in prefixes)]
        for l in pool:
            lang = l.get("lang", "en")
            print(f"{l['id']:24} {l['char']:5} {lang} {l.get('speed', '-'):>4} {len(l['text']):4}  {plain(l['text'])}")
        lines = pool
    else:
        lines = recorded + pending
    per = {}
    for l in lines:
        per[l["char"]] = per.get(l["char"], 0) + len(l["text"])
    for c, n in sorted(per.items(), key=lambda kv: -kv[1]):
        print(f"{c:6} {n:5} chars")
    total = sum(per.values())
    print(f"total  {total:5} chars in {len(lines)} lines (about {total} credits on Eleven v4, one take)")


def design(chars):
    cast, lines = load(CAST), load(LINES)["lines"]
    for c, info in cast["characters"].items():
        if chars and c not in chars or info.get("voice_id") or not info.get("design"):
            continue
        sample = " ".join(plain(l["text"]) for l in lines if l["char"] == c)[:1000]
        body = {"voice_description": info["design"], "model_id": "eleven_ttv_v3"}
        if len(sample) >= 100:
            body["text"] = sample
        else:
            body["auto_generate_text"] = True
        res = call("/v1/text-to-voice/design?output_format=mp3_44100_128", body)
        d = AUDITIONS / c
        d.mkdir(parents=True, exist_ok=True)
        ids = []
        for i, p in enumerate(res["previews"], 1):
            (d / f"preview-{i}.mp3").write_bytes(base64.b64decode(p["audio_base_64"]))
            ids.append(p["generated_voice_id"])
        save(d / "previews.json", {"text": res["text"], "generated_voice_ids": ids})
        print(f"{c}: {len(ids)} previews in {d}")


def pick(char, n):
    cast = load(CAST)
    info = cast["characters"][char]
    gid = load(AUDITIONS / char / "previews.json")["generated_voice_ids"][int(n) - 1]
    res = call("/v1/text-to-voice", {
        "voice_name": f"Yapling {char.capitalize()}",
        "voice_description": info["design"],
        "generated_voice_id": gid})
    info["voice_id"] = res["voice_id"]
    info["_voice_name"] = f"Yapling {char.capitalize()} (designed, preview {n})"
    save(CAST, cast)
    print(f"{char} -> {res['voice_id']}")


def speak(cast, l, mp3):
    """Render one line (id, char, text, optional speed and lang) to mp3 + timing json."""
    vid = cast["characters"][l["char"]].get("voice_id")
    if not vid:
        print(f"skip {l['id']}: no voice for {l['char']}")
        return False
    body = {"text": l["text"], "model_id": cast["model_id"],
            "voice_settings": {"speed": l.get("speed", cast["default_speed"])}}
    if l.get("lang"):
        body["language_code"] = l["lang"]
    res = call(f"/v1/text-to-speech/{vid}/with-timestamps?output_format={cast['output_format']}", body)
    mp3.write_bytes(base64.b64decode(res["audio_base64"]))
    timing = {"id": l["id"], "char": l["char"], "text": l["text"], "caption": plain(l["text"]),
              "alignment": res.get("normalized_alignment") or res.get("alignment")}
    if l.get("lang"):
        timing["lang"] = l["lang"]
    save(mp3.with_suffix(".timing.json"), timing)
    print(f"ok {mp3.name}")
    return True


def render(ids):
    cast = load(CAST)
    recorded, pending = all_lines()
    OUT.mkdir(parents=True, exist_ok=True)
    for l in recorded + [p for p in pending if p["id"] in ids]:
        if ids and l["id"] not in ids:
            continue
        mp3 = OUT / f"{l['id']}-{l['char']}.mp3"
        if mp3.exists() and not ids:
            continue
        speak(cast, l, mp3)


def audition(spec_path):
    cast, spec = load(CAST), Path(spec_path).resolve()
    d = spec.parent
    for t in load(spec)["takes"]:
        mp3 = d / f"{t['id']}.mp3"
        if mp3.exists():
            continue
        speak(cast, t, mp3)
    pace([str(d)], None)


def words_per_minute(timing):
    """Words a minute over the spoken span: first to last spoken character, tags skipped,
    pauses inside the line included. Vietnamese counts syllables (one per written word)."""
    a = timing["alignment"]
    spoken, inside = [], False
    for i, ch in enumerate(a["characters"]):
        if ch == "[":
            inside = True
        elif ch == "]":
            inside = False
        elif not inside and ch.isalnum():
            spoken.append(i)
    if not spoken:
        return 0.0, 0, 0.0
    span = a["character_end_times_seconds"][spoken[-1]] - a["character_start_times_seconds"][spoken[0]]
    words = len(re.findall(r"[^\W_]+(?:['’-][^\W_]+)*", timing["caption"]))
    return (60 * words / span if span > 0 else 0.0), words, span


def pace(args, default_max=100.0):
    limit = default_max if default_max is not None else 100.0
    if "--max" in args:
        i = args.index("--max")
        limit = float(args[i + 1])
        args = args[:i] + args[i + 2:]
    files = []
    if args:
        for a in args:
            p = Path(a)
            files += sorted(p.glob("*.timing.json")) if p.is_dir() else [p]
    else:
        recorded, _ = all_lines()
        cast = load(CAST)
        slow = {l["id"] for l in recorded if l.get("speed", cast["default_speed"]) <= 0.7 and not l.get("lang")}
        files = [OUT / f"{l['id']}-{l['char']}.timing.json" for l in recorded if l["id"] in slow]
    over = []
    for f in files:
        t = load(f)
        wpm, words, span = words_per_minute(t)
        lang = t.get("lang", "en")
        unit = "syll/min" if lang == "vi" else "wpm"
        flag = ""
        if lang != "vi" and words < 3:
            flag = "  short (not gated)"
        elif lang != "vi" and wpm > limit:
            flag, _ = "  OVER", over.append(f.name)
        print(f"{f.name:44} {wpm:6.0f} {unit:8} {words:3} words {span:5.2f}s{flag}")
    if default_max is not None and over:
        sys.exit(f"{len(over)} take(s) over {limit:.0f} wpm")


def sfx():
    cast = load(CAST)
    d = AUDIO / "season-1" / "sfx"
    d.mkdir(parents=True, exist_ok=True)
    for s in cast["sfx"]:
        out = d / f"{s['id']}.mp3"
        if out.exists():
            continue
        out.write_bytes(call("/v1/sound-generation", {
            "text": s["prompt"], "duration_seconds": s["seconds"]}, raw=True))
        print(f"ok {out.name}")


if __name__ == "__main__":
    cmd, args = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ("help", [])
    {"estimate": lambda: estimate(args), "design": lambda: design(args),
     "pick": lambda: pick(*args), "render": lambda: render(args),
     "audition": lambda: audition(*args), "pace": lambda: pace(args),
     "sfx": lambda: sfx()}.get(cmd, lambda: print(__doc__))()
