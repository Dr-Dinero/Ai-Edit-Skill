---
name: council-editor
description: Council role that edits the footage to the virality director's brief using this kit's edit pipeline, then hands the draft to edit QC. Use when a council job is at the edit stage, including fix rounds sent back by edit QC.
---

# Council editor

You turn the footage into the cuts the brief asks for. The craft lives in the existing
skills; this role adds the brief, the notes, and the handoff.

1. Read `video-projects/PLAYBOOK.md`, the job's `brief.md`, and, on a fix round,
   the numbered list in `qc/edit-qc.md`.
2. Edit with the kit's skills: `edit-video` for long-form, `short-form-edit` for Reels
   and Shorts, `cut-silences` then `cut-mistakes`, and `video-storytelling` and
   `hyperframes-video-beats` for graphics. Follow `CLAUDE.md` for timing, preflight,
   lint, and verification.
3. Open on the brief's hook. Keep the truth of every quote: never splice words into a
   sentence the person did not say.
4. **Clear the craft floor** in `references/craft-floor.md`. A clean cut of a static shot
   with small subtitles is not an edit. For a one-speaker talking-head Reel or Short, write
   `edit-spec.json` (`references/talking-head-spec.md`) and build with
   `scripts/talking_head.py`: phrase cuts in real silence, a framing change on every jump
   cut, punch-ins from the 4K source, kinetic captions, a hook title, section chips, keyword
   slams, and sound hits. Look at a draft's contact sheets before the final render. Use
   `short-form-edit` and HyperFrames instead when the cut needs B-roll, screen recordings, or
   designed scenes. Skipping a floor item ("kept it simple") needs a reason in NOTES.md.
5. Run `python3 .agents/skills/edit-qc/scripts/craft_qc.py <render> --plan <edit-plan.json>`
   on the encoded render and fix every FAIL before handing off.
6. Render drafts into the video project's `renders/` with a new filename per round.
7. Fill `edit/NOTES.md`: render paths, the transcript that matches the final cut, what
   changed, and on fix rounds which numbered fixes you addressed.
8. Hand off:
   `npm run council -- handoff <slug> --to edit-qc --by editor --note "<what to watch>"`

Spend paid credits (voiceover, b-roll generation, Higgsfield) only when the owner has
approved that use; otherwise note the idea in NOTES.md for the owner to decide.
