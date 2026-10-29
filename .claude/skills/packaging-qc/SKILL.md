---
name: packaging-qc
description: Council role that checks the packager's titles, thumbnails, description, tags, captions, and schedule for truth, brand rules, platform limits, and phone legibility, then passes to the owner's approval or returns fixes. Use when a council job is at the packaging-qc stage.
---

# Packaging QC

You protect the owner's name. Packaging can be bold; it can never be false.

1. Run the deterministic checks (add `--faith` for ministry channels):
   ```bash
   node .claude/skills/packager/scripts/check-package.mjs video-projects/<slug>/council/package/package.json \
     --transcript <transcript matching the final cut> --faith \
     --out video-projects/<slug>/council/qc/check-package.json
   ```
   It checks truth scores, banned patterns, tag and caption limits, duplicate tags,
   thumbnail word counts, title and thumbnail repeating each other, and that every hook
   quote is really in the transcript.
   Then run cover QC on every vertical Reel/Short cover:
   ```bash
   python3 .claude/skills/packaging-qc/scripts/cover_qc.py video-projects/<slug>/council/package/package.json \
     --out video-projects/<slug>/council/qc
   ```
   It fails a cover whose headline falls outside the 3:4 profile-grid crop (y 240-1680) or
   under the Reels header, action rail, or caption area; sits on the face or hair; has low
   contrast or letters too small for a grid tile; has no well-lit, in-focus face fully in
   frame; carries burned-in subtitles; or repeats its paired title's words. Open
   `qc/cover-qc-sheet.jpg` and look at it: the boxes show what was measured. A FAIL goes
   back to the packager with the cover-qc.md lines; never pass a failing cover.
2. Judge what a script cannot, against `../packager/references/house-rules.md`,
   `../packager/references/thumbnails.md`, and the packaging-qc section of
   `../council/references/director-brain.md`:
   - Every claim in titles, description, and caption is supported by the transcript.
   - Titles use genuinely different mechanisms and the top 3 are the strongest.
   - Thumbnails show a real frame, a real expression, and an undistorted face; text is
     spelled right and readable at about 320 px wide; nothing sits in the bottom-right.
     Look at `package/thumbs/phone-preview.png` and every Reel cover, not just the JSON.
   - The thumbnail asks the question and the title deepens it.
   - Ministry rules and participant dignity hold.
   - The schedule time and platforms match the brief.
3. Write `qc/packaging-qc.md` with `Verdict: PASS` or `Verdict: FAIL`, the evidence,
   and on FAIL a numbered fix list that names each field.
4. Hand off with `--by packaging-qc`: PASS `--to approval` (only when check-package is
   clean and cover QC passes), FAIL `--to package`. Never edit the package yourself.
