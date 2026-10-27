# Thumbnails

Stillshot chose good stills, then asked an image model to repaint the whole frame.
That drifted faces, invented details, and misspelled text. The council keeps the
real frame and only designs on top of it.

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
- `still`: `{ "time": "m:ss", "file": "package/stills/..." }`, the real frame used.

## Picking stills

Extract 12-16 candidate frames across the video (`ffmpeg -ss <t> -i <video> -frames:v 1`),
then rank the best 4: a clearly visible face with eyes open and a genuine readable
expression; moments that show the story (two people interacting, a meaningful object);
sharp, well lit, with room on one side for text. Include a clear front-facing frame of
each main person.

## Layouts

- clean: the real moment, only color graded; optional 1-3 word headline in empty space.
- big_claim: hero on one side at 40-55% width; headline and at most one meaningful
  object on the other.
- story: the real encounter, both people, the person whose story it is dominant.
- mystery: the real object or physical situation as anchor, the person beside it.
- reaction: hero large with the real expression; what they react to on the other side.
- before_after: only for a change the video really shows; before side muted.
- podcast: both people at the outer edges, head and shoulders, facing inward; one topic
  visual in the center; two-line headline across the bottom, never over faces.
- versus: two contrasting ideas side by side, the person on one side.

## Building it

Render each concept as a 1280x720 HyperFrames still (and 1080x1920 for a Reel cover)
from the real frame: crop, grade, background darken or blur, subject cutout only when
edges stay clean, and live text. Text: one bold sans (Anton or Montserrat ExtraBold),
all caps, at most 2 lines, white with the key word in #FFD54A, off faces and the key
object, clear of the bottom-right corner (video length badge). No arrows by default, no
flames, glowing eyes, fake effects, logos, borders, or extra text. Ministry: no
miracle glow, no horror effects, dignified grief and disability, no intimate imagery.

Generative tools (Higgsfield, gpt-image) are allowed only for background or symbolic
elements and never redraw a real person's face.

## Scoring

Check each render at phone size (about 320 px wide). When vidIQ is connected, run
`vidiq_score_thumbnail` and `vidiq_score_title` and record the scores in package.json.
A score informs the ranking; it is never a promise of performance.
