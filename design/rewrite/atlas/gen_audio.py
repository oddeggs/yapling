"""Renders the atlas's music and ambience with ElevenLabs. Usage: python3 -I gen_atlas.py <out_dir> [only_name ...]"""
import json, os, sys, urllib.request, urllib.error, pathlib
K = os.environ["ELEVENLABS_API_KEY"]; out = pathlib.Path(sys.argv[1]); only = set(sys.argv[2:])
SEAMLESS = " Instrumental only, no vocals. Seamless loop with no intro and no ending, steady and quiet enough to sit under speech."
MUSIC = {
  "cafe": "A slow late-night café trio: brushed snare, warm upright bass, soft Rhodes chords, 68 bpm, intimate and a little wistful, like a lit window on a rainy street.",
  "harbour": "A slow, misty harbour piece: a low cello drone, a few sparse harp notes, distant bell buoy tones, wide and calm, grey-blue sea at dusk, 56 bpm.",
  "noodles": "A cosy late-night stall tune: plucked nylon guitar, soft brushed shaker, a gentle music-box melody, warm and unhurried, 74 bpm, steam and lantern light.",
  "field": "A sparse winter field: glass harmonica and a slow music box, long silences, cold clear air, lonely but tender, very slow.",
  "cinema": "An old soft cinema organ waltz, slow 3/4, slightly warped and faded like an old film reel, nostalgic and gentle, empty theatre.",
  "laundry": "A sleepy midnight lo-fi beat that feels like a tumble dryer: soft kick on a rolling rhythm, muted electric piano, warm tape hiss, 80 bpm.",
  "roof": "An airy, floating ambient piece: soft synth pads, faint wind chimes, open night sky over a small town, weightless and calm, slow.",
  "platform": "A wistful muted jazz trumpet over a soft, steady train-rhythm pulse of brushes and upright bass, dusk on an empty station, 70 bpm.",
  "library": "Hushed celesta and soft felt piano with the gentle tick of a clock, slow and careful, a quiet library after closing, warm lamplight.",
  "interview": "Minimal, patient felt piano, a few sustained notes and gentle pauses, focused and warm, encouraging, slow.",
}
AMB = {
  "a-street": "Quiet town street at night ambience: distant traffic hush, soft footsteps far away, a café door bell once, faint murmur through glass.",
  "a-sea": "Calm harbour ambience: gentle waves lapping on wooden posts, rope creaks, distant gulls, soft wind over water.",
  "a-stall": "Night food stall ambience: a pot simmering and bubbling, soft sizzle, a ladle tapping, distant city hum.",
  "a-cinema": "Empty cinema ambience: a film projector whirring and clicking softly, faint room tone, an old seat creak.",
  "a-laundry": "Laundromat at night ambience: washing machines humming and tumbling, a fluorescent light buzz, soft room tone.",
  "a-wind": "Gentle steady wind across a rooftop at night, soft fabric flapping on a line, distant town hum.",
  "a-platform": "Train station platform ambience: low rail hum, distant announcement chime with no words, wind under a canopy.",
  "a-library": "Quiet library after hours: a slow clock ticking, a page turning, soft room tone, distant rain on a window.",
  "a-office": "Quiet office room tone: faint air conditioning, a clock ticking, the soft hum of a building.",
  "w-rain": "Steady gentle rain falling on a town at night, soft drips from gutters, no thunder.",
}
def call(path, body):
    req = urllib.request.Request("https://api.elevenlabs.io" + path, data=json.dumps(body).encode(), headers={"xi-api-key": K, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r: return r.read()
    except urllib.error.HTTPError as e: print(path, e.code, e.read()[:300].decode(errors="ignore")); return None
for name, prompt in MUSIC.items():
    f = out / f"m-{name}.mp3"
    if f.exists() or (only and f"m-{name}" not in only): continue
    data = call("/v1/music", {"prompt": prompt + SEAMLESS, "music_length_ms": 30000})
    if data: f.write_bytes(data); print("ok", f.name, len(data), flush=True)
for name, prompt in AMB.items():
    f = out / f"{name}.mp3"
    if f.exists() or (only and name not in only): continue
    body = {"text": prompt, "duration_seconds": 20, "model_id": "eleven_text_to_sound_v2", "prompt_influence": 0.45, "loop": True}
    data = call("/v1/sound-generation", body) or call("/v1/sound-generation", {k: v for k, v in body.items() if k != "loop"})
    if data: f.write_bytes(data); print("ok", f.name, len(data), flush=True)
