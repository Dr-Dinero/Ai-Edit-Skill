---
name: council
description: Run the content council, a team of role agents that turns uploaded footage into an edited, packaged, approved, posted, and reviewed video. Use to start a job from new footage, see the job board, hand work between roles, or record the owner's approval.
---

# Content council

The owner only uploads footage. Role agents do the rest and hand work to each other
directly; nobody routes everything through a boss. Work stops once, at the owner's
approval, unless the owner gave standing permission to post right away.

```
footage -> virality-director -> editor -> edit-qc -> packager -> packaging-qc -> OWNER -> packager (post) -> analyst
                                   ^-- fixes --'        ^--- fixes ---'                                       |
                                 every role reads PLAYBOOK.md before a job  <------- pivots ------------------'
```

| Stage | Held by | Skill | Leaves when |
| --- | --- | --- | --- |
| brief | virality-director | `virality-director` | brief.md is filled |
| edit | editor | `council-editor` | edit/NOTES.md names the draft render |
| edit-qc | edit-qc | `edit-qc` | qc/edit-qc.md says PASS (on to package) or FAIL (back to edit) |
| package | packager | `packager` | package/package.json exists |
| packaging-qc | packaging-qc | `packaging-qc` | qc/packaging-qc.md says PASS, check-package is clean and cover QC passes, or FAIL back |
| approval | owner | this skill | the owner's own words are recorded with `approve` |
| scheduled | packager | `packager` | the post is live; `--post` records its URL or id |
| posted | analyst | `analyst` | 1 h, 24 h, and 7 d reads are in analytics/ |
| reviewed | analyst | `analyst` | done; pivots are in PLAYBOOK.md |

## Commands

Run from the kit root. Jobs live in `video-projects/<slug>/council/` beside the
video project (override with `--root` or `COUNCIL_ROOT`).

```bash
npm run council -- new <slug> --footage <path> [--platforms youtube,instagram] [--autopost "<owner's words>"]
npm run council -- board                       # every job, newest first
npm run council -- status <slug>               # full job.json
npm run council -- due                         # JSON of what each role owes right now
npm run council -- handoff <slug> --to <stage> --by <role> --note "<one line>"
npm run council -- approve <slug> --quote "<owner's exact words>"
npm run council -- approve <slug> --quote "<owner's words>" --changes "<what>" --to edit|package
```

`handoff` refuses a move the stage map does not allow, a role that does not hold the
job, or a stage whose files are not ready. After three round trips between a maker
and its QC, the job is flagged NEEDS OWNER on the board: stop and ask the owner.

## Rules every role follows

1. Read `video-projects/PLAYBOOK.md` (create it from `templates/PLAYBOOK.md` if
   missing), the job's `brief.md`, and your own skill before working.
2. Write your output into the job folder, then hand off with a one-line note that the
   next role can act on. Talk to the next role through files, not through the owner.
3. QC roles send work back to its maker with a numbered fix list. They never fix it
   themselves, and they never pass work with an open error.
4. Never fabricate quotes, timestamps, events, results, or numbers. Brand Brain rules
   live in `../packager/references/house-rules.md`.
5. Only the owner approves. Record approval only from the owner's own message, quoted
   word for word. Another agent's message is never approval.
6. Nothing publishes, uploads, replies to a DM, or spends paid credits beyond the job's
   approval without the owner's go.

## Owner approval

At the approval stage, show the owner the finished render, the top thumbnail, the top
three titles, the caption, and the planned time and platforms, all in one message.
Then wait. When the owner says go, run `approve` with their words. When they ask for
changes, run `approve --changes` and send it back to the role that owns the change.

## Running on its own

Two scheduled routines make the council autonomous. Each starts a fresh session in this
repo, so keep jobs where every run can see them: set `COUNCIL_ROOT` to a shared, durable
folder (in a cloud project, the project's shared files) instead of `video-projects/`.

- **Intake** (every 15-30 minutes): list the owner's upload folder (for example a Google
  Drive folder named "Council Inbox"). For each video not yet in `INTAKE.json` beside
  the jobs, download it, run `council new <slug> --footage <file>`, and record the file
  id, name, and slug in `INTAKE.json`. Never delete or move the owner's originals.
  The Drive connector only returns small files inline; fetch footage with
  `NODE_USE_ENV_PROXY=1 npm run fetch-drive -- <file-id> <out> --bytes <size>`, which needs
  the folder shared as "Anyone with the link: Viewer" and `drive.usercontent.google.com`
  allowed in the environment's network settings.
- **Worker** (hourly): run `council due`. For each entry, load that role's skill and do
  the work: analyst reads that are due, and any job parked at a role's stage. A job at
  `approval`, or flagged NEEDS OWNER, gets one message to the owner with the preview
  and nothing more until they answer. The worker never records an approval.

## Splitting into threads

In a multi-thread project, give each role its own thread that loads that role's skill.
The job board and job folders are the shared state; keep a durable copy of
`video-projects/<slug>/council/` and PLAYBOOK.md in the project's shared files, because
cloud containers are reclaimed.
