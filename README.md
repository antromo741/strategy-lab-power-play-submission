# strategy-lab-power-play

A Claude Code skill that turns a Strategy Lab transcript into a written Power Play: three source-backed quick wins for a non-technical founder, each with a promise, a two-sentence TL;DR, why it matters, a copy-paste prompt, and a way to tell it worked, plus a through-line. The skill reviews and repairs its own draft and ships editorial notes that record what it checked, what it changed, and any genuinely unresolved issue.

Submission for The Uncommon Business, Curriculum Producer (Technical): "Ship the Skill, Not the Output."

## What is here

| Path | What it is |
| --- | --- |
| `.claude/skills/strategy-lab-power-play/` | **The working skill.** `SKILL.md` (workflow), `references/editorial-guide.md` (the judgment rules), `scripts/power_play.mjs` (Node.js helper: transcript indexing, validation, rendering, article/notes agreement check). No dependencies, no API keys. |
| `dist/strategy-lab-power-play.zip` | The same skill folder zipped for upload to the Claude desktop app or Cowork. Byte-identical to the folder above. `dist/cowork-instructions.md` says how. |
| `sample/power-play.md` | **The Power Play the skill produced** on the supplied transcript, unpolished, exactly as emitted. |
| `sample/editorial-notes.md` | Its supporting notes: checks performed, repairs made, why each win was chosen and others rejected, sources by block and line, how removed segments and misspelled product names were handled. |
| `sample/power-play.json` | The structured draft both files were rendered from, kept so the sample can be audited. |
| `dev/` | Smoke tests (`node dev/check.mjs`), a frontmatter validator, synthetic fixtures, and a before/after behavioral check. Not needed to run the skill. |
| `NOTE.md` | The short note (Step 4). |

The supplied transcript, brief, and example Power Play are not included.

## Run it

**Claude Code** (verified): start Claude Code in this folder with Node.js on your PATH, then

```
/strategy-lab-power-play path/to/transcript.md
```

Headless: `claude -p "/strategy-lab-power-play path/to/transcript.md" --permission-mode acceptEdits`

**Claude desktop app / Cowork:** upload `dist/strategy-lab-power-play.zip` under Customize → Skills, start a new task, attach the transcript, and ask for a Power Play. See `dist/cowork-instructions.md`.

Output lands in `power-play-output/<transcript-name>-<timestamp>/` (Claude Code) or the task's output location (Cowork): `power-play.md` first, `editorial-notes.md` beside it. If a session has fewer than three supportable wins the draft is marked incomplete; if none, you get `insufficient-material.md` instead. The skill never pads.

## How the sample was produced

One run in Cowork with the transcript attached to a fresh task (no folder connected), using the ZIP in `dist/`. The notes record the environment's upload path for the transcript, the transcript's SHA-256, status `complete`, two review rounds, five repairs, and no unresolved issues. Nothing in `sample/` was edited afterwards; re-rendering `sample/power-play.json` with the helper reproduces `power-play.md` byte for byte.

## What was verified

- `node dev/check.mjs`: 36 structural checks (indexing edge cases, validation rules, review-record consistency, dry-run labeling, rendering, article/notes agreement, incomplete and insufficient paths).
- Headless Claude Code cold runs in clean folders on synthetic sessions: a one-win session yields an honest incomplete draft; a defect-seeded session had every seeded defect (a delete-by-age rule, a detector score as proof, a "guaranteed" saving, an internal template, a class recap, a misspelled product) kept out of the article and recorded as repairs (`dev/behavioral/results.md`).
- One Cowork run on the real transcript: the sample above.

Not verified: repeated runs for consistency; other Node versions; macOS/Windows.

## Design in one paragraph

Claude does the judgment (what counts as a teaching moment, evidence grading, selection, writing, and an editor's review of its own text). Code does what code is good at: splitting a messy auto-transcript into citable blocks that survive repeated timestamps and redacted gaps, refusing quotes that are not in the cited block, refusing a review record whose marks and findings disagree, and checking that the rendered article and notes tell the same story. Anything the skill cannot settle from the transcript is disclosed as a specific unresolved issue rather than turned into a checklist for the operator.
