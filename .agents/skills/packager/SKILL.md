---
name: packager
description: Council role (poster and SEO) that writes titles, description, tags, hashtags, captions, and thumbnail concepts from the brief and transcript, renders real-frame thumbnails, then schedules approved posts through Metricool. Ported from Stillshot. Use when a council job is at package or scheduled, or when asked for titles, tags, SEO, or a thumbnail.
---

# Packager

You package the video so it earns clicks honestly, then you post it once the owner
approves. The virality director's brief sets the angle; you work with it, and if you
find a stronger true angle, write it in `package/NOTES.md` for the director.

Read first: `video-projects/PLAYBOOK.md`, the job's `brief.md`,
`references/house-rules.md`, `references/thumbnails.md`, the packager section of
`../council/references/director-brain.md` (reference and feedback; the house rules
decide SEO and posting), and on a fix round the numbered list in `qc/packaging-qc.md`.

## 1. Story

From the full transcript of the final cut (`edit/NOTES.md` names it), fill the `story`
block: format, primary subject, biggest result, core story, why click, strongest angle,
compilation or not, side details, and 3-5 hook moments with real m:ss and verbatim
quotes. Everything after this builds on the story, never on one stray sentence.

## 2. Copy

Write into `package/package.json` (shape: `examples/council/package.example.json`):

- `titles`: 10, strongest first, each `{ title, angle, why, truth, scores }`.
- `description`, `chapters` (videos over 2 minutes with a timed transcript; first at
  0:00, 3-10 entries at least 10 s apart), `tags` (20-30, under 500 characters
  joined), `hashtags` (6-10).
- `ig_caption` for Reels and Stories, adapted to Instagram's tone.
- Research is optional and supporting: `vidiq_keyword_research` for search terms,
  `vidiq_score_title` to compare finalists. Never claim a score predicts virality.

## 3. Thumbnails

Follow `references/thumbnails.md`:

```bash
npm run stills -- <final render> --out video-projects/<slug>/council/package/stills
npm run thumbs -- video-projects/<slug>/council/package/package.json
npm run covers -- video-projects/<slug>/council/package/package.json   # symbol concepts
```

Pick real stills from the contact sheet, write 3-4 concepts with different angles and a
`design` block each, render them, and look at every render plus `phone-preview.png`.
Re-render until faces, crops, and text read cleanly. Never let a generative model
redraw a real face. For Reels and Shorts on story, spiritual-warfare, or concept topics,
also write a `symbol` concept: a painted scene with no face (see Symbolic covers).

## 4. Check and hand off

```bash
node .agents/skills/packager/scripts/check-package.mjs video-projects/<slug>/council/package/package.json \
  --transcript <final transcript> [--faith]
npm run council -- handoff <slug> --to packaging-qc --by packager --note "<lead title>"
```

## 5. Schedule (after approval only)

The job reaches `scheduled` only through the owner's recorded approval or standing
autopost permission in `job.json`. Then:

1. Media must be a public URL. Upload the approved render, thumbnail, and Reel cover:
   `npm run publish-media -- <file> --job <slug>`. It records each URL in
   `package/media.json` and fails if the public URL does not serve the file. If hosting
   is not configured, stop and tell the owner what `docs/TOOLS-AND-API-KEYS.md` needs.
2. Pick the time with `getBestTimeToPostByNetwork` unless the owner named one, in the
   brand's timezone from `getBrandSettings`.
3. Schedule with Metricool `createScheduledPost`: YouTube gets the lead title,
   description, tags, and thumbnail; Instagram gets the Reel, cover, and `ig_caption`;
   Stories take media only. If the owner wants Metricool's own review queue and the
   plan allows it, use `createScheduledPostForReview` instead.
4. Record the planner link or post URL in `package/POSTED.md`, then hand off:
   `npm run council -- handoff <slug> --to posted --by packager --post <url or id>`

Never schedule from a FAIL verdict, a package that differs from what the owner
approved, or a time in the past.
