# Owner rules (this workspace)

Standing decisions from the owner. They override defaults and apply to every thread and role.
The generic versions, with the checks that enforce them, are in `FIRST-PASS-RULES.md`. Client
looks live in `presets/`.

## Before delivery

1. Run `npm run gate` with the client's preset and the script. A FAIL does not go to the owner.
2. Hand off with `npm run deliver`. A delivery is done when the file is in the folder he looks in
   and its checksum matched, not when it was rendered.
3. One video of a batch is approved before the rest are rendered. Tell him before the first post of
   a batch, with times.

## Editing

- Never cut a clip before its thought ends. Cut only at phrase ends.
- Captions are word-synced to the audio and match the words actually spoken.
- Overlays and graphics stay in the middle of the frame, and land on their word.
- Music stays well under the voice.
- Never colour grade the footage.
- No AI b-roll on Shorts. No AI-looking faces anywhere.
- No frozen still frame at the end.
- Never label a speaker, a price, or a spelling from a guess. Ask.
- Say which pack or preset each style choice came from. Never invent a house style.
- Every piece gets its own caption style and its own graphics unless he asks to match another.
- 3D: follow `3D.md`. No 3D built from basic shapes. One or two short designed moments per short.

## Packaging and posting

- Covers symbolise the topic. Not a face plus a title card.
- Shorts go to YouTube only, 1 to 2 a day around 12 PM and 6 PM Eastern, nothing overnight.
- Nothing is posted, scheduled or uploaded without his go.

## Running cost

- Council intake runs only when he asks. Nothing runs on a timer unless he asked for that timer.
- One video or one batch per thread. Close it when delivered. See `SCALE.md`.
- A tool that worked is merged into this repo the same day, so no other thread rebuilds it.
