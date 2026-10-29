# Set up your content council

The content council turns a raw talking-head video into an edited, captioned,
packaged post that waits for your OK. You upload footage; a team of Claude role
agents (director, editor, QC, packager, analyst) does the rest and shows its
progress on a Control Room dashboard. Nothing is posted until you say "post it".

This guide is written for anyone: a church media team, a creator, a small
business. You don't need to code. Claude does the technical steps with you.

## The fastest way: let Claude set it up

1. Make your own copy of this repository on GitHub (the **Fork** button), or ask
   the owner to share theirs.
2. Open [claude.ai/code](https://claude.ai/code), pick your copy of the repository,
   and paste this:

   > Set up the content council from docs/COUNCIL-SETUP.md for me. Walk me
   > through one step at a time, check each step yourself before moving on, and
   > tell me exactly where to click when something needs my account.

Claude will check what's connected, tell you what's missing, and build your
dashboard and hourly run. The steps below are what it will walk you through, so
you can also follow them yourself.

## What you need

| Need | Why | Cost |
| --- | --- | --- |
| A Claude plan with Claude Code on the web | Runs the council | Your plan |
| A Google account with Google Drive | Where you drop footage and get results | Free |
| A transcription service (ElevenLabs Scribe by default) | Word-level timing for clean cuts and captions | Pay as you go; OpenAI Whisper or local Whisper also work ([details](TOOLS-AND-API-KEYS.md)) |
| Metricool (optional) | Scheduling posts and the analytics on the dashboard | Free tier available |
| Cloud media storage, such as Cloudflare R2 (optional) | A public link Metricool can post from | Free tier available |

## Step by step

### 1. Connect Google Drive to Claude

In claude.ai, open **Settings → Connectors** and connect **Google Drive**. If you
use Metricool, connect it too.

### 2. Make two Drive folders

- **Council Inbox**: where you drop raw footage. Share it as **Anyone with the
  link: Viewer** so the council can download large video files.
- **Council Review**: where the council puts each finished package.

Tip: put each video in a subfolder named after its topic (for example
`Inbox/Leviathan/C2405.MP4`). The council uses that name as the video's working title.

### 3. Create the cloud environment

In Claude Code on the web, create an environment for the repository (for example
"Council") and:

- Add your transcription key as an environment secret, for example
  `ELEVENLABS_API_KEY`.
- Allow these hosts under network access: `drive.usercontent.google.com` (footage
  downloads) and `api.elevenlabs.io` (transcription). Add your media storage host if
  you use one.
- Optional media storage keys: `R2_ACCOUNT_ID`, `MEDIA_BUCKET`,
  `MEDIA_ACCESS_KEY_ID`, `MEDIA_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL`. An R2
  access key id is 32 characters and its secret is 64; anything shorter was copied
  wrong.

Keys belong only in the environment's secrets, never in the repository or a chat.

### 4. Build the Control Room and the Council Desk

Ask Claude:

> Build my Council Control Room dashboard and Council Desk page from
> docs/COUNCIL-SETUP.md, using my Council Inbox folder.

- **Control Room** (a Claude dashboard): what is waiting for your go, a **Live now**
  list with each video's current step, the edit-bay timeline, quality gates, and your
  Instagram and YouTube numbers. Its data sources:
  - `jobs`: the job board, a JSON file the council rewrites at every step. One row per
    video: `slug, video, drive_file_id, stage, step, step_pct, step_at, top_title,
    platforms, review_url, needs_owner, post_url, started_at, updated, note`.
  - `covers`: current cover previews, written with `npm run board-covers`.
  - `inbox`: a live Google Drive query of Council Inbox and its subfolders.
  - `runs`: a live query of your Claude scheduled tasks, for the next council check
    and booked calibration sessions.
  - Metricool queries for Instagram and YouTube, if connected.
- **Council Desk** (a small page): **Upload footage** opens Council Inbox; **Choose
  from Drive** lists videos already in your Drive and copies the one you pick into
  Council Inbox (the original stays put); **Calibration sessions** books a time for
  Claude to bring you the cover calibrator.

### 5. Turn on the hourly council run

Ask Claude to create the scheduled task from
[council/hourly-run.md](council/hourly-run.md), with your folder ids and dashboard
link filled in. It checks Council Inbox once an hour, takes the oldest new video
through every stage, updates the dashboard after each step, and stops at your
approval. Every hourly check uses some of your Claude plan even when the inbox is
empty, so pick waking hours only if you post on a schedule.

### 6. Calibrate your taste

Before the first real post, book a calibration session on the Council Desk. Claude
shows you a few cover and carousel options per round; you pick, and your picks
become the rules the packager and cover QC follow.

### 7. Run your first video

Drop one short video in Council Inbox. Within the hour **Live now** on the Control
Room shows it moving: downloaded, transcribed, brief, edit, QC, covers, packaging
QC. When it reaches **Your go**, watch it, then reply "post it" (or ask for changes)
in chat.

## Checking it yourself

| Command | What it checks |
| --- | --- |
| `npm run setup` | Node, FFmpeg, and your local `.env` |
| `npm test` | The kit's tests |
| `npm run audit` | Tests, kit checks, dependency advisories, and, when installed, Semgrep code rules and Gitleaks secret scanning |
| `npm run council -- board` | Every job, its stage, and what it is doing now |

The repository's **Audit** GitHub workflow runs Semgrep, Gitleaks, and `npm audit`
on every push and once a week.

## When something looks stuck

| What you see | Usual cause | Fix |
| --- | --- | --- |
| A video sits in Council Inbox past the next check | The hourly run is off, or it is finishing another video | The top bar shows the next check. One video starts per check. |
| "No movement" on a Live now card | The run stopped mid-job (time limit or an error) | The next hourly check resumes the job once. If it stays red, ask Claude in chat what failed. |
| "Drive did not send the file" | Council Inbox isn't shared by link | Share it as Anyone with the link: Viewer. |
| Transcription fails with 401 or 403 | Wrong key, or the key lacks speech-to-text access | Re-create the key and update the environment secret. |
| Transcription or downloads fail with a proxy 403 | The host isn't allowed in the environment | Add it under the environment's network access. |
| "Credential access key has length 20" | An R2 key was copied wrong | R2 keys are 32 and 64 characters; create a new R2 API token. |
| Dashboard numbers say "Not loaded" | A connector needs reconnecting | Reconnect it in claude.ai Settings → Connectors. |
