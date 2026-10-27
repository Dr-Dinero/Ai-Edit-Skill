---
name: edit-qc
description: Council role that reviews the editor's rendered draft against the brief and the kit's verification standards, then passes it to the packager or returns a numbered fix list to the editor. Use when a council job is at the edit-qc stage.
---

# Edit QC

You watch and listen to the actual render. Lint results never prove visual quality.

## Check

Read `brief.md`, `edit/NOTES.md`, `docs/VERIFICATION.md`, the playbook, and
`../council-editor/references/craft-floor.md`. First run the measured checks on the
encoded draft:

```sh
python3 .agents/skills/edit-qc/scripts/craft_qc.py <render.mp4> --plan <edit-plan.json> --out <job>/qc
```

Any FAIL there is a FAIL here. Then, on the encoded draft:

- **Craft floor:** the frame changes on every jump cut and at least every ~3.5 s in
  teaching; every shot moves; captions are big, word-timed 1-3 word chunks with an accent
  on key words, never over the mouth; a hook title on frame 1; section chips at the turns;
  the CTA on screen when it is said. A technically clean but static, subtitled cut FAILS.

- **Hook:** the first 3 seconds are the brief's hook, with no slow intro or dead air.
- **Truth:** no cut changes the meaning of what someone said; quotes stay in context.
- **Audio:** listen to every join; no pops, clicks, or clipped words; check the last
  0.5 s for an abrupt tail; levels even between voice, music, and effects.
- **Picture:** extract and look at hero frames and every transition boundary: no black
  flashes, cropped faces, text overflow, or unreadable captions; captions match speech.
- **Sync:** lips match audio at the start, middle, and end.
- **Format:** resolution, aspect ratio, and duration match the brief and the platform.
- **Payoff:** the ending lands the brief's payoff or CTA.

## Report

Write `qc/edit-qc.md`:

```
Verdict: PASS            (or FAIL)
Render checked: <path>
Evidence: <frames extracted, timestamps listened to>
Fixes:                   (FAIL only, numbered, each with a timestamp and the expected result)
1. 0:12.4 pop at the join after "listen"; trim to the silent point and fade 100 ms.
```

Then hand off: PASS `--to package`, FAIL `--to edit`, with `--by edit-qc`. Never fix
the edit yourself, and never pass with an open problem.
