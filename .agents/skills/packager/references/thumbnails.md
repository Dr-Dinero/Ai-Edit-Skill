# Thumbnails

Stillshot chose good stills, then asked an image model to repaint the whole frame.
That drifted faces, invented details, and misspelled text. The council keeps the
real frame and designs on top of it with `scripts/pick-stills.mjs` and
`scripts/render-thumbnails.mjs`.

## Concepts (fill `thumbnails` in package.json)

Write 3-4 concepts, each a different `angle`: RESULT (biggest measurable outcome),
CURIOSITY (what changed or was discovered in the main story), CONFLICT (what wasn't
working), TRANSFORMATION (a real before and after), EMOTION (only for a real, powerful
human moment). Every concept is about the primary subject and core story; nothing from
`side_details`.

- `text`: 2-5 words that create curiosity, show a result, or reveal conflict. Never a
  summary, never the title's words. Title gives the situation; text gives the hook
  ("5 Ways to Know If the Devil Is Speaking to You" + "IS THAT GOD?"). Numbers only
  if said. Banned: BE YOURSELF, MY JOURNEY, SUCCESS STORY, WATCH THIS.
- `style`: clean, podcast, big_claim, story, mystery, reaction, before_after, versus
  (layouts below). Vlogs: at least 2 `clean` concepts with 0-3 words.
- `scene`: 2-4 sentences on what the thumbnail communicates: who the hero is and why,
  where they sit and how large, their expression, who else appears, what to darken or
  blur, where the text sits.
- `emotion`: the real one in the frame. Never fake tears, terror, or screaming.
- `pairs_with`: the exact title it pairs with.
- `still`: `{ "time": "m:ss", "file": "stills/still-07.jpg" }`, the real frame used (paths
  are relative to package.json).

## Picking stills

```bash
npm run stills -- <final render or source> --count 16 --out video-projects/<slug>/council/package/stills
```

This writes `still-01.jpg`..., `stills.json` (each still's m:ss), and `sheet.jpg`, a
4-wide contact sheet. Look at the sheet and rank the best 4: a clearly visible face with
eyes open and a genuine readable expression; moments that show the story (two people
interacting, a meaningful object); sharp, well lit, with room on one side for text.
Include a clear front-facing frame of each main person. For a moment the sampler
missed, grab it directly: `ffmpeg -ss <t> -i <video> -frames:v 1 -q:v 2 <file>.jpg`.

## Layouts

- clean: the real moment, only color graded; optional 1-3 word headline in empty space.
- big_claim: hero on one side at 40-55% width; headline on the other.
- story: the real encounter, both people, the person whose story it is dominant.
- mystery: the real object or physical situation as anchor, the person beside it.
- reaction: hero large with the real expression; the headline beside them.
- before_after: two stills side by side for a change the video really shows; the
  before side is muted.
- podcast and versus: two stills side by side, one person each, headline across the bottom.

## Rendering

Give each concept its real still and a `design` block, then render:

```json
"still": { "time": "0:42", "file": "stills/still-07.jpg" },
"still2": { "time": "3:10", "file": "stills/still-12.jpg" },
"design": { "focus": [0.48, 0.3], "focus2": [0.5, 0.32], "zoom": 1.25,
            "text_side": "right", "key_word": "GOD?", "grade": "warm", "darken": 0.8 }
```

- `focus`: where the hero's face is in the still, as fractions of width and height
  (look at the still; 0.5, 0.3 is a centered talking head). `focus2` is for `still2`.
- `text_side`: left, right, top, or bottom. Defaults to the side away from the face.
- `key_word`: the one word drawn in #FFD54A; defaults to the last word.
- `zoom`: 1 keeps the frame; 1.2-1.4 tightens on the face. `grade`: warm, cool, neutral.

```bash
npm run thumbs -- video-projects/<slug>/council/package/package.json [--only 1,3]
```

For each concept this writes a 1280x720 thumbnail and a 1080x1920 Reel cover into
`package/thumbs/`, plus `phone-preview.png` with every thumbnail at phone size. A
package with `"video_format": "short"` (Shorts and Reels) gets the vertical cover only,
and its preview shows covers. It
records `file`, `cover`, and `layout` (font size, line count, fit, badge overlap) on
the concept; check-package fails a concept whose text does not fit or hits the
duration badge.

What the renderer does: crop and position the real frame, grade it, darken the text
side, and set the headline in the bundled Anton font (all caps, at most 2 lines,
white with one key word, auto-sized, clear of the bottom-right duration badge). Reel
covers put the frame over a blurred copy of itself so the headline sits above the
face. It never redraws a face, adds arrows, flames, glowing eyes, logos, or borders.

Look at every render and at `phone-preview.png` before handing off: the face is not
cut at the top, the expression is real, the text is spelled right and readable at
phone size. Adjust `focus`, `zoom`, or `text_side` and render again. Ministry: no
miracle glow, no horror effects, dignified grief and disability, no intimate imagery.

Generative tools (Higgsfield, gpt-image) are allowed only for background or symbolic
elements and never redraw a real person's face.

## Scoring

Check each render at phone size (about 320 px wide). When vidIQ is connected, run
`vidiq_score_thumbnail` and `vidiq_score_title` and record the scores in package.json.
A score informs the ranking; it is never a promise of performance.
