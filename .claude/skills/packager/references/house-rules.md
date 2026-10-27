# Packaging house rules

Ported from Stillshot (getstillshot.com) `src/brain.js` and `src/worker.js`, which
distill the four Brand Brain guides (01 Viral SEO Brand Brain, 02 Hooks Storytelling
Virality, 03 Thumbnails Titles SEO, 04 AI Workflow Prompts and QA). When a guide
changes, update this file to match.

## Process

1. Work out what actually happens in the whole video before writing anything.
2. Find the strongest true moment: a surprising line, tension, a reaction, a reversal,
   or a confrontation. Package that moment, not the video's general category.
3. Ask who would care beyond existing followers. Write for a cold audience.

## Taste

- Bold, cinematic, urgent, specific, curiosity-led, emotionally resonant. Provocative is
  fine; deceptive never is.
- Never corny, preachy, or corporate. Clean titles without excess symbols.
- Broad human hooks beat niche terminology: recognition ("I've wondered that"),
  uncertainty ("what happens next?"), stakes, conflict, transformation.
- Everyday words a stranger understands instantly. Give hope and agency, not only fear.

## Truth (hard limits)

- Never manufacture events, quotes, timestamps, diagnoses, healings, demons,
  controversies, or numbers. Every name, number, object, and outcome matches the
  transcript. "Hard to walk" never becomes "paralyzed". No quotation marks around a
  paraphrase.
- Describe what the footage shows and what the person reports, not unverified outcomes.
- Several separate encounters are a compilation with one shared theme ("3 Encounters..."),
  never one person's story. Numbers in titles match the real count.
- "Stunned" or "shocked" only when the footage shows that reaction.
- Never claim or imply a title will go viral. Rank by fidelity and likely appeal only.

## Story step (fill `story` in package.json)

- `format`: podcast, interview, talking head, vlog, tutorial, event, or other.
- `primary_subject`: whose story or result this is (not always the host).
- `biggest_result`: the strongest proof, with exact figures said.
- `core_story`: what changed from beginning to end, 1-2 sentences.
- `why_click`: the single strongest reason a stranger would click.
- `strongest_angle`: 2 sentences, the angle and why a stranger would care.
- `is_compilation`: true when the video holds several independent encounters.
- `side_details`: smaller anecdotes that must not become the main packaging.
- `hook_moments`: 3-5 real moments; `time` (m:ss copied from the transcript, "" if
  untimed), `quote` (verbatim), `why` (under 12 words).

## Titles

- 10 titles, strongest first; the first 3 are the ranked picks. At least 6 are
  curiosity or emotional hooks; at most 2 are plain search titles.
- Each uses a genuinely different mechanism (`angle`): story gap, warning/urgency,
  belief challenge, direct question, controversy/discussion, search intent, direct
  teaching, result + curiosity, situation -> unresolved development.
- Specific: a person, conflict, consequence, discovery, or outcome. No vague pronouns
  unless the thumbnail answers them. No vague stakes ("Do I Support This?").
- Title Case, at most one ALL-CAPS word, "..." welcome for curiosity gaps, 40-70
  characters, no emoji (one fitting emoji is fine for a live stream).
- A well-known guest's name may lead. Never put the host's own channel name first.
- Banned: "This Changed Everything", "Changes Everything", "SHOCKING ...!", "You Won't
  Believe", flat academic titles ("explains", "discusses", "insights").
- Patterns to adapt, never copy: "They Tried to Disprove the Bible... Then They Found
  This"; "He Came With Crutches... Then This Happened"; "He Thought Being a Good Person
  Gets You Into Heaven... He Was Wrong"; "Can You Prove Jesus Existed Without the Bible?"
- Score each title 1-5 on truth, curiosity, cold-audience accessibility, emotional
  stakes, and title-thumbnail synergy. `truth` under 4 is rewritten or dropped.

## Description

1. A hook question or bold statement.
2. Who is in the video and what it is (host and guest by name when known).
3. A paragraph of the specific things covered, by name: people, places, objects,
   numbers, key moments. Specific names are what search matches.
4. One "They also discuss..." line with the most compelling moment.
5. A book, product, or event only if the video promotes one.
6. One viewer question for the comments and one CTA line.

Short paragraphs, plain words, no URLs or link placeholders. Never imply a medical
outcome or miracle was independently verified. Live streams: 2-3 sentences.

## Tags and hashtags

- 20-30 tags people actually type: main topic and variations, the big question as
  searches, specific named things, then guest, host, and channel names. No duplicates,
  nothing unrelated. Joined with ", " they total under 500 characters.
- 6-10 hashtags. The first 3 matter most (YouTube shows them above the title): main
  topic, broad category, guest or creator.
- Instagram caption: hook line first, 1-3 short lines, one question, 3-8 hashtags.
  Adapt the tone; do not paste the YouTube opening everywhere.

## Ministry channels (TSNL, Daniel Adams, The Supernatural Life)

- Keep the message Jesus-centered and biblically grounded; reach people outside church.
  Say "being a good person", not "good works"; keep insider terms out of hooks.
- Do not lead titles, the description, or the top tags with Miracle, Healing, Healed,
  or Shocking Deliverance. Name the specific situation ("She Could Barely Walk Because
  of Her Back... Then This Happened").
- Do not manufacture demons, manifestations, or healings. Frame an interpretation as
  the speaker's biblical perspective, and only if they say it.
- Scripture in the description only when it genuinely connects to what is said.
- Evangelism conversations work with a "he was wrong" angle on a familiar belief.
  Family patterns are empowering ("What Started Before You Can End With You").
- Never imply a marriage was restored, someone was healed, or someone converted unless
  the video shows it. Preserve every participant's dignity.
- Reference directions, not proven performers: "That's NOT Your Dead Relative Visiting
  You..."; "Before You Cast Out Demons, WATCH THIS!"; "She Believes in the Universe...
  Until He Brings Up Jesus"; "How Did He Know That About Her?" with "HOW DID YOU KNOW?".
