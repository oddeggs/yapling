#!/usr/bin/env python3
"""Yapling recorded-line pipeline (ElevenLabs).

  yap_voice.py estimate            characters per voice, rough credit cost
  yap_voice.py design [char ...]   3 voice-design previews per undecided character
  yap_voice.py pick <char> <n>     save preview n as that character's voice
  yap_voice.py render [id ...]     render lines (mp3 + timing json); skips existing
  yap_voice.py sfx                 render sound effects

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


def estimate():
    lines = load(LINES)["lines"]
    per = {}
    for l in lines:
        per[l["char"]] = per.get(l["char"], 0) + len(l["text"])
    for c, n in sorted(per.items(), key=lambda kv: -kv[1]):
        print(f"{c:6} {n:5} chars")
    print(f"total  {sum(per.values()):5} chars in {len(lines)} lines")


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


def render(ids):
    cast, lines = load(CAST), load(LINES)["lines"]
    OUT.mkdir(parents=True, exist_ok=True)
    for l in lines:
        if ids and l["id"] not in ids:
            continue
        mp3 = OUT / f"{l['id']}-{l['char']}.mp3"
        if mp3.exists() and not ids:
            continue
        vid = cast["characters"][l["char"]].get("voice_id")
        if not vid:
            print(f"skip {l['id']}: no voice for {l['char']}")
            continue
        res = call(f"/v1/text-to-speech/{vid}/with-timestamps?output_format={cast['output_format']}", {
            "text": l["text"],
            "model_id": cast["model_id"],
            "voice_settings": {"speed": l.get("speed", cast["default_speed"])}})
        mp3.write_bytes(base64.b64decode(res["audio_base64"]))
        save(mp3.with_suffix(".timing.json"), {
            "id": l["id"], "char": l["char"], "text": l["text"], "caption": plain(l["text"]),
            "alignment": res.get("normalized_alignment") or res.get("alignment")})
        print(f"ok {mp3.name}")


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
    {"estimate": lambda: estimate(), "design": lambda: design(args),
     "pick": lambda: pick(*args), "render": lambda: render(args),
     "sfx": lambda: sfx()}.get(cmd, lambda: print(__doc__))()
