#!/usr/bin/env python3
"""Yapling recorded-line pipeline (ElevenLabs).

  yap_voice.py estimate [prefix ...]  characters per voice, rough credit cost; with
                                     prefixes (or "pending"), list each matching line
  yap_voice.py design [char ...]     3 voice-design previews per undecided character
  yap_voice.py pick <char> <n>       save preview n as that character's voice
  yap_voice.py render [id ...]       render lines (mp3 + timing json); skips existing.
                                     Pending lines render only when named by id, or all
                                     unrendered ones with "pending"; a rendered pending
                                     line gets "mp3" and "timing" fields
  yap_voice.py audition <takes.json> render the takes listed in an audition file next to it
  yap_voice.py pace [--max N] [pending | path ...]
                                     words per minute from timing files (default: the
                                     recorded lines at speed 0.7 or slower; "pending":
                                     the rendered pending lines, those faster than 0.7
                                     reported as fast on purpose); fails any English
                                     take of 3+ words over N (default 100)
  yap_voice.py heard [pending | id ...]
                                     speech-to-text (Scribe) of each take into heard.json;
                                     flags takes whose words differ from the text (names
                                     may drift); --redo transcribes again
  yap_voice.py page                  write season-1/settling-in.html: every pending line
                                     with its take, wpm and what speech-to-text heard
  yap_voice.py promote               move rendered pending lines into "lines"
  yap_voice.py credits               credits used and left this cycle
  yap_voice.py sfx                   render sound effects

lines.json has two lists: "lines" (recorded; each has its mp3 and timing file) and
"pending" (written, not yet recorded). Move a pending line into "lines" once it is rendered.

Needs ELEVENLABS_API_KEY in the environment. Stdlib only.
"""
import base64, difflib, hashlib, html, json, os, re, shutil, subprocess, sys, unicodedata, urllib.error, urllib.request, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "audio"
CAST = AUDIO / "cast-voices.json"
LINES = AUDIO / "season-1" / "lines.json"
OUT = AUDIO / "season-1" / "lines"
HEARD = AUDIO / "season-1" / "heard.json"
PAGE = AUDIO / "season-1" / "settling-in.html"
AUDITIONS = AUDIO / "auditions"
API = "https://api.elevenlabs.io"


def load(p):
    return json.loads(p.read_text())


def save(p, data):
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def call(path, body, raw=False, content_type="application/json"):
    data = body if isinstance(body, bytes) else (None if body is None else json.dumps(body).encode())
    req = urllib.request.Request(
        API + path, data=data,
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": content_type})
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


def line_mp3(l):
    return OUT / f"{l['id']}-{l['char']}.mp3"


def render(ids):
    cast, data = load(CAST), load(LINES)
    recorded, pending = data["lines"], data.get("pending", [])
    OUT.mkdir(parents=True, exist_ok=True)
    if ids == ["pending"]:
        ids = [p["id"] for p in pending if not line_mp3(p).exists()]
        if not ids:
            return print("every pending line is rendered")
    for l in recorded + [p for p in pending if p["id"] in ids]:
        if ids and l["id"] not in ids:
            continue
        mp3 = line_mp3(l)
        if mp3.exists() and not ids:
            continue
        if speak(cast, l, mp3) and l in pending:
            l["mp3"], l["timing"] = mp3.name, mp3.with_suffix(".timing.json").name
            save(LINES, data)


def promote():
    data = load(LINES)
    done = [p for p in data.get("pending", []) if line_mp3(p).exists()]
    data["lines"] += [{k: v for k, v in p.items() if k not in ("mp3", "timing")} for p in done]
    data["pending"] = [p for p in data["pending"] if p not in done]
    save(LINES, data)
    print(f"moved {len(done)} lines; {len(data['pending'])} still pending")


def credits():
    req = urllib.request.Request(API + "/v1/user/subscription",
                                 headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"]})
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read())
    print(f"{d['character_count']} used of {d['character_limit']} this cycle "
          f"({d['character_limit'] - d['character_count']} left)")


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
    files, ungated = [], set()
    if args == ["pending"]:
        cast = load(CAST)
        for l in all_lines()[1]:
            t = line_mp3(l).with_suffix(".timing.json")
            if t.exists():
                files.append(t)
                if not l.get("lang") and l.get("speed", cast["default_speed"]) > 0.7:
                    ungated.add(t.name)
    elif args:
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
        if f.name in ungated:
            flag = "  fast on purpose (not gated)"
        elif lang != "vi" and words < 3:
            flag = "  short (not gated)"
        elif lang != "vi" and wpm > limit:
            flag, _ = "  OVER", over.append(f.name)
        print(f"{f.name:44} {wpm:6.0f} {unit:8} {words:3} words {span:5.2f}s{flag}")
    if default_max is not None and over:
        sys.exit(f"{len(over)} take(s) over {limit:.0f} wpm")

# Speech-to-text check: names may come back spelled another way; every other word must match.
DRIFT = {"linh", "mei", "pip", "bea", "natterwick", "lah", "kaya", "ooh"}
SAME = {"ok": "okay", "cafe": "café"}
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen " \
       "fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def number_words(n):
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    return str(n)


def tokens(text, lang):
    text = unicodedata.normalize("NFC", plain(text)).lower().replace("’", "'")
    text = re.sub(r"\$(\d+)", r"\1 dollars", text)
    text = re.sub(r"\d+", lambda m: number_words(int(m.group())), text)
    words = re.findall(r"[^\W_]+(?:'[^\W_]+)*", text)
    if lang != "vi":
        words = ["".join(c for c in unicodedata.normalize("NFKD", w) if not unicodedata.combining(c))
                 for w in words]
        words = [SAME.get(w, w) for w in words]
    return words


def word_diff(expected, heard, lang):
    """Differences that matter, as 'want -> got' strings; names in DRIFT may change freely."""
    a, b = tokens(expected, lang), tokens(heard, lang)
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == "equal":
            continue
        want, got = a[i1:i2], b[j1:j2]
        if want and all(w.split("'")[0] in DRIFT for w in want) and len(got) <= len(want):
            continue
        out.append(f"{' '.join(want) or '∅'} -> {' '.join(got) or '∅'}")
    return out


def spoken_span(timing):
    """Start of the first and end of the last spoken character (tags skipped)."""
    a, inside, idx = timing["alignment"], False, []
    for i, ch in enumerate(a["characters"]):
        if ch in "[]":
            inside = ch == "["
        elif not inside and ch.isalnum():
            idx.append(i)
    return a["character_start_times_seconds"][idx[0]], a["character_end_times_seconds"][idx[-1]]


def stray_sound(mp3):
    """Sound well before the first aligned word or after the last (a repeated word, usually);
    a [sighs] tag explains sound before. Needs ffmpeg; empty without it."""
    if not shutil.which("ffmpeg"):
        return []
    log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp3), "-af",
                          "silencedetect=noise=-35dB:d=0.12", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    h, m, sec = re.search(r"Duration: (\d+):(\d+):([\d.]+)", log).groups()
    end = int(h) * 3600 + int(m) * 60 + float(sec)
    quiet = list(zip([float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)],
                     [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)] + [end]))
    sounds, t = [], 0.0
    for a, b in sorted(quiet):
        if a > t + 0.02:
            sounds.append((t, a))
        t = b
    if end > t + 0.02:
        sounds.append((t, end))
    first, last = spoken_span(load(mp3.with_suffix(".timing.json")))
    return [f"{a:.2f}-{b:.2f}s {'before' if b < first else 'after'} the words" for a, b in sounds
            if b - a > 0.15 and (b < first - 0.1 or a > last + 0.25)]


def transcribe(mp3, lang):
    boundary = uuid.uuid4().hex
    fields = {"model_id": "scribe_v1", "tag_audio_events": "false"}
    if lang:
        fields["language_code"] = lang
    body = b"".join(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
                    for k, v in fields.items())
    body += (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{mp3.name}"\r\n'
             f"Content-Type: audio/mpeg\r\n\r\n").encode() + mp3.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    return call("/v1/speech-to-text", body, content_type=f"multipart/form-data; boundary={boundary}")["text"]


def settling_lines():
    recorded, pending = all_lines()
    return [l for l in recorded + pending if l["id"].startswith(("s1-set", "s1-e1-visitor"))]


def heard(args):
    redo = "--redo" in args
    args = [a for a in args if a != "--redo"]
    pool = settling_lines() if args in ([], ["pending"]) else [
        l for l in sum(all_lines(), []) if l["id"] in args]
    cache = load(HEARD) if HEARD.exists() else {}
    flagged = []
    for l in pool:
        mp3 = line_mp3(l)
        if not mp3.exists():
            continue
        digest = hashlib.sha1(mp3.read_bytes()).hexdigest()
        entry = cache.get(l["id"])
        if redo or not entry or entry.get("sha1") != digest:
            entry = {"sha1": digest, "heard": transcribe(mp3, l.get("lang", "en"))}
        entry["diff"] = word_diff(l["text"], entry["heard"], l.get("lang", "en"))
        entry["stray"] = [] if "[sighs]" in l["text"] else stray_sound(mp3)
        cache[l["id"]] = entry
        save(HEARD, dict(sorted(cache.items())))
        mark = "; ".join([f"WRONG {d}" for d in entry["diff"]] + [f"STRAY {x}" for x in entry["stray"]]) or "ok"
        if entry["diff"] or entry["stray"]:
            flagged.append(l["id"])
        print(f"{l['id']:24} {mark:40} heard: {entry['heard']}")
    print(f"{len(flagged)} take(s) with wrong words or stray sound" + (f": {' '.join(flagged)}" if flagged else ""))


def page():
    cast, cache = load(CAST), (load(HEARD) if HEARD.exists() else {})
    groups = [("s1-set1-", "Chapter 1 · Hello"), ("s1-set2-", "Chapter 2 · Boxes"),
              ("s1-set3-", "Chapter 3 · Again, please"), ("s1-set4-", "Chapter 4 · Bus 45"),
              ("s1-set5-", "Chapter 5 · Mei's café"), ("s1-set6-", "Chapter 6 · All about you"),
              ("s1-set-", "Shared lines"), ("s1-e1-visitor-", "Week 1 · Visitor lines")]
    e = html.escape
    lines, sections, stats = settling_lines(), [], {"lines": 0, "over": 0, "wrong": 0, "missing": 0}
    for prefix, title in groups:
        items = []
        for l in [l for l in lines if l["id"].startswith(prefix)]:
            stats["lines"] += 1
            mp3, lang = line_mp3(l), l.get("lang", "en")
            speed = l.get("speed", cast["default_speed"])
            if not mp3.exists():
                stats["missing"] += 1
                items.append(f'<li><span class="who">{e(l["char"].capitalize())}</span><code>{e(l["id"])}</code>'
                             f'<p>{e(l["text"])}</p><div class="h">not rendered yet</div></li>')
                continue
            wpm, words, span = words_per_minute(load(mp3.with_suffix(".timing.json")))
            unit = "syllables/min" if lang == "vi" else "wpm"
            if lang == "vi":
                badge, cls = "Vietnamese · not gated", "n"
            elif speed > 0.7:
                badge, cls = f"fast on purpose · speed {speed}", "n"
            elif words < 3:
                badge, cls = "short · not gated", "n"
            elif wpm > 100:
                badge, cls = "over 100", "over"
                stats["over"] += 1
            else:
                badge, cls = "passes", "ok"
            h = cache.get(l["id"], {})
            if not h:
                said = '<div class="h">speech recognition: not run</div>'
            else:
                stats["wrong"] += bool(h.get("diff") or h.get("stray"))
                problems = [f"words differ: {d}" for d in h.get("diff", [])] + [
                    f"sound {x}" for x in h.get("stray", [])]
                check = (f'<b class="over">{e("; ".join(problems))}</b>' if problems
                         else '<b class="ok">words match</b>')
                said = f'<div class="h">Speech recognition heard: “{e(h["heard"])}” · {check}</div>'
            items.append(
                f'<li><div class="lab"><span class="who">{e(l["char"].capitalize())}</span><code>{e(l["id"])}</code>'
                f'<span class="w {cls}">{wpm:.0f} {unit} · {badge}</span></div><p>{e(l["text"])}</p>'
                f'<audio controls preload="none" src="lines/{e(mp3.name)}"></audio>'
                f'<div class="h">{words} words in {span:.2f} s · speed {speed}'
                f'{" · language_code vi" if lang == "vi" else ""}</div>{said}</li>')
        sections.append(f"<section><h2>{e(title)}</h2><ol>{''.join(items)}</ol></section>")
    summary = (f'{stats["lines"]} lines · {stats["over"]} over 100 wpm · {stats["wrong"]} with words that differ or stray sound'
               + (f' · {stats["missing"]} not rendered' if stats["missing"] else ""))
    PAGE.write_text(f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Settling in voices</title>
<style>:root{{--bg:#faf7ff;--ink:#1d1730;--card:#fff;--line:#e3dcf5;--muted:#6b6385;--accent:#7b5cff;--ok:#1d7a46;--bad:#b3261e}}@media (prefers-color-scheme:dark){{:root{{--bg:#16131f;--ink:#f2eefc;--card:#211c2e;--line:#3a3250;--muted:#a69fbd;--accent:#a996ff;--ok:#6fd39a;--bad:#ff8a80}}}}
body{{background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,system-ui,sans-serif;margin:0 auto;padding:24px 16px;max-width:760px}}
section{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:14px 0}}h2{{margin:0 0 8px}}ol{{list-style:none;padding:0;margin:0}}li{{border-top:1px solid var(--line);padding:10px 0}}
.lab{{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline}}.who{{font-weight:700}}code{{color:var(--muted);font-size:13px}}.w{{margin-left:auto;font-size:13px;font-weight:600}}
.ok{{color:var(--ok)}}.over{{color:var(--bad)}}.n{{color:var(--muted)}}.h{{color:var(--muted);font-size:13px}}p{{margin:2px 0 6px}}audio{{width:100%}}</style></head>
<body><h1>Yapling · Settling in voices</h1><p>Eleven v4 · {summary}. Words in [brackets] are delivery tags, not spoken. English Visitor lines render at speed 0.7 and must measure <b>100 words a minute or slower</b> over the spoken span (pauses included); one- and two-word lines, Linh's Vietnamese and the two lines that are fast on purpose are shown but not gated. Speech recognition (ElevenLabs Scribe) checks what was actually said; names may come back spelled differently. <a href="index.html">Season 1 lines</a></p>
{''.join(sections)}
</body></html>
""")
    print(f"wrote {PAGE.relative_to(ROOT)}: {summary}")


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
     "heard": lambda: heard(args), "page": lambda: page(),
     "promote": lambda: promote(), "credits": lambda: credits(),
     "sfx": lambda: sfx()}.get(cmd, lambda: print(__doc__))()
