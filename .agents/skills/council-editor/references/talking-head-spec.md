# edit-spec.json for talking_head.py

The editor writes the judgment calls here; `scripts/talking_head.py` turns them into the
cut, the shots, the captions, the graphics, and the mix. Every anchor is an exact phrase from
the transcript, so a new transcript or a changed cut re-times everything.

```json
{
  "name": "c2690-v4",                       // render file name (renders/<name>.mp4)
  "source": "source/C2690.MP4",             // the original recording, never a proxy
  "transcript": "transcripts/C2690.scribe.json",
  "drops": [                                // reviewed retakes and false starts, with the reason
    {"phrase": "so you're soul tyling--", "why": "retake; clean take follows"},
    {"phrase": "Knowing that,", "after": 176, "why": "restart"}   // after: source seconds, to pick the right repeat
  ],
  "end_phrase": "follow for more.",         // optional: end the cut on this phrase
  "max_pause": 0.26,                        // longest pause kept between phrases (teaching)
  "calm_from": "Father, I thank you",       // optional calm section (prayer, testimony):
  "calm_to": "go into the comment section", //   longer pauses and shots, soft captions, a swell in
  "calm_max_pause": 0.6,
  "max_shot": 3.4, "calm_max_shot": 7.0,    // longest shot before a punch-in is added
  "hook": {"line1": "IS SLEEP PARALYSIS", "line2": "JUST SLEEP?", "hold": 3.0},
  "hook_shot": "W",                         // W wide, M medium, T tight
  "sections": [{"phrase": "But here's the beautiful thing", "text": "HOW TO GET FREE"}],
  "slams": [{"phrase": "legal grounds", "text": "LEGAL GROUNDS", "sub": null, "hold": 1.0}],
  "emphasis": ["sleep", "paralysis", "free"],   // accent-colored caption words; punch-ins outside calm
  "cta": {"phrase": "go into the comment section", "text": "\"I AM FREE\\NINDEED\""},
  "look": {"accent": "#FFC83D", "caption_y": 1300, "caption_px": 92}  // optional overrides
}
```

Run from the video project folder:

```sh
python3 ../../.agents/skills/council-editor/scripts/talking_head.py plan edit-spec.json
python3 ../../.agents/skills/council-editor/scripts/talking_head.py render edit-plan.json --draft
python3 ../../.agents/skills/council-editor/scripts/talking_head.py render edit-plan.json
python3 ../../.agents/skills/edit-qc/scripts/craft_qc.py renders/<name>.mp4 --plan edit-plan.json --out qa
```

`plan` writes `edit-plan.json` (frame-exact keep segments, shots, captions, graphics, sound
cues, and the retimed words) and caches face positions in `cache/faces.json`. Read the plan's
summary line: shot count, median and longest shot. `render` decodes only the kept frames of the
original once, crops each shot from it, burns captions and graphics with libass, builds the
voice from the same frame-exact segments with 6 ms fades, adds the synthesized effects, and
masters to -14 LUFS / -1.5 dBTP. A 3-minute 4K source takes about 5 minutes on 4 cores.

Needs ffmpeg with libass, Python 3 with numpy and `opencv-python-headless<5` (4.x keeps the
face detector), the Inter font (any heavy font works through `look.font`), and for craft QC,
faster-whisper.

Slams, chips, and the CTA are only words the speaker says. The script refuses an anchor
phrase it cannot find in the transcript.
