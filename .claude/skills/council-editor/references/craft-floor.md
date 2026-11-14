# Craft floor for council edits

Follow the owner's packs first: the AI editor pack (`ai-editor-shorts`, `ai-editor-qa`, the brand
file), the hooks and SEO notes, and the motion rules in One-File Studio and Scrollstopper. This file
is how the council editor applies them to a talking-head Reel or Short. Where a brand file says
something different, the brand file wins.

History: the first C2690 edit was one locked-off shot with small subtitles ("edited horribly").
The fix that followed invented its own style (cut zooms, bouncing yellow caps, dim-and-slam words,
synthetic hits) and was rejected for glitchy zooms, a clipped ending, and not matching the packs.
Do not invent a house style; use the packs.

## Picture

- **No cut zooms.** One framing (never tighter than mid-chest to head, eyes about a third down)
  and one slow push-in carried across every jump cut (about 0.25 %/s, at most +6 %). A zoom that
  resets at a cut pops. The push restarts only while a full-frame cutaway hides the speaker.
  `talking_head.py` does this unless the spec sets `"cut_zooms": true` (only if the brand allows).
- **B-roll covers the jump cuts.** Every join sits under a cutaway that starts at least 0.25 s
  before it and ends at least 0.25 s after. The owner's reels run about 20 to 25 cutaways a minute
  at 2 to 3 s each. Literal clips only; no generic sky or space in the hook. Prefer the owner's own
  Higgsfield footage, then Storyblocks. Each cutaway pushes in gently (1.00 to 1.07) and fades
  in and out over about 0.2 s; brighten dark clips (`gamma`) so they read on a phone.
- Face in frame 1. A light grade, soft vignette, and 5 % film grain on the whole piece.

## Words on screen

- Captions on: 1 to 4 words, word-timed, about 80 px at 1080 wide, bold (Figtree ExtraBold for
  TSNL), warm white with a soft shadow, at most one accent word per line in the brand gold, in the
  speaker's own case. They fade and rise a few pixels in; nothing bounces.
- Hook title in the first frame: a few words, Libre Caslon, a thin gold rule, calm fade.
- The CTA is on screen when it is said, in the speaker's exact words.
- Nothing over the face; nothing in the top 8 %, bottom 20 %, or right 12 %.

## Sound

- Cut only in silence, 6 ms fades. Music from Epidemic: dark under the hook and the problem,
  hopeful from the turn, warm under the prayer; 18 to 22 dB under the voice, ducked, crossfaded
  at section changes. No synthetic effects unless the brand asks for them.
- -14 LUFS, true peak at or below -1.5 dBTP on the encoded file.

## Pacing and the ending

- Hook within 1.5 s; 30 to 60 s by default, 90 s at most. Remove pauses over about 0.4 s.
- The ending holds about 1 s after the last word, then fades picture and sound over 1 s. No cut in
  the last 0.8 s.

## QC

`craft_qc.py` measures zoom pops, cut zooms, sideways pops, push speed, stacked events, the
ending, joins, glitches, loudness, and words (from a provider transcript of the render). Every FAIL
writes a frame strip to `qa/flags/`. Then a person watches every cutaway in and out, the hook,
and the ending, and listens to every join. A pass is evidence, not taste.
