# Motion and 3D beats

Designed moments inside a talking-head edit: a 3D object, a 3D title, a camera move
through depth. Build them in HyperFrames, render each to its own MP4, and drop it into
`edit-spec.json` as a b-roll entry over the line it illustrates. The brand rules in
`craft-floor.md` still apply (gold #C9A45C, warm white #F4EFE6, Libre Caslon Text titles,
Figtree labels, calm motion, no glitch or flash effects).

## Before animating

- Storyboard first. Write each beat in NOTES.md: the transcript phrase it sits under, its
  length, what is on screen, the motion, and the camera. A beat that does not serve the
  hook, the problem, the turn, or the payoff is cut.
- Use 2-3 beats in a 60-90 s short, on the lines that carry the message (the hook question,
  the turn, the declaration). More turns the sermon into a show reel.

## Motion rules

- Every frame is a function of time. Drive everything from one paused GSAP timeline; no
  timers, CSS transitions, `Math.random()` or `requestAnimationFrame` loops. Seed any
  randomness.
- Nothing moves linearly except slow drift. Entrances take about 0.5 s and may settle with
  a slight overshoot (`back.out(1.4)`); exits are faster, about 60 % of the entrance,
  easing in.
- Nothing fully stops. A held element keeps a slow drift (scale 1 to 1.02, a few pixels)
  and the camera keeps a micro-push.
- Group related elements and move the group; offset each element in a group 2-4 frames;
  start the next move during the last ~20 % of the previous one.
- Camera moves ease in and out and never take less than ~0.8 s across the frame.
- Text that matters stays readable for at least 1.5 s; numbers count up over about 1 s.
- Load fonts before the first frame (`document.fonts.ready`); a fallback font is a bug.

## 3D with Three.js

Start from `../templates/3d-beat.html` (a gold extruded cross with key and rim light,
dust, and a camera push). Setup per video project:

```bash
npm pack three@0.159.0 && tar xzf three-0.159.0.tgz && cp package/build/three.min.js video-projects/<slug>/assets/
cp /path/to/LibreCaslonText-Regular.ttf /path/to/Figtree-Bold.ttf video-projects/<slug>/assets/
```

r159 is the last release with the `build/three.min.js` classic script, which HyperFrames
loads like `gsap.min.js`. Keep `preserveDrawingBuffer: true`, `setPixelRatio(1)`, and a
canvas the size of the composition (1080x1920 for shorts). Shapes come from core geometry:
`THREE.Shape` plus `ExtrudeGeometry` for crosses, crowns, letters drawn as paths, and
`MeshStandardMaterial` with metalness ~0.9 for gold. Put the words in HTML over the canvas
(brand fonts, live text) rather than as 3D text geometry.

Render, then look before using it:

```bash
cd video-projects/<slug> && npx hyperframes lint && npx hyperframes render -o renders/<beat>.mp4
ffmpeg -i renders/<beat>.mp4 -vf "select='not(mod(n,30))',scale=270:480,tile=6x1" -frames:v 1 qa/<beat>-sheet.jpg
```

Check the sheet: the object stays inside the frame and clear of the caption band, text
never overlaps the object, the first frame is not black unless it fades in on purpose,
and the brightness matches the footage around it. Then add it to `edit-spec.json` as a
b-roll entry with the phrase it covers and run `craft_qc.py` on the full render as usual.
