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
2. Judge what a script cannot, against `../packager/references/house-rules.md` and
   `../packager/references/thumbnails.md`:
   - Every claim in titles, description, and caption is supported by the transcript.
   - Titles use genuinely different mechanisms and the top 3 are the strongest.
   - Thumbnails show a real frame, a real expression, and an undistorted face; text is
     spelled right and readable at about 320 px wide; nothing sits in the bottom-right.
   - The thumbnail asks the question and the title deepens it.
   - Ministry rules and participant dignity hold.
   - The schedule time and platforms match the brief.
3. Write `qc/packaging-qc.md` with `Verdict: PASS` or `Verdict: FAIL`, the evidence,
   and on FAIL a numbered fix list that names each field.
4. Hand off with `--by packaging-qc`: PASS `--to approval` (only when check-package is
   clean), FAIL `--to package`. Never edit the package yourself.
