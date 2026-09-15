# Strategy Lab → Power Play

Turn a Strategy Lab transcript into three practical quick wins for a busy founder. This reusable Claude skill selects the ideas, writes the Power Play, and reviews and repairs its draft before returning it.

Built by **Anthony Romagnolo** for The Uncommon Business’s **Curriculum Producer (Technical)** challenge, *Ship the Skill, Not the Output*.

## Start here

- **[Read the Power Play](sample/power-play.md)** — the generated sample, unchanged.
- **[Read the submission note](NOTE.md)** — my choices, AI use, and where I kept human judgment.
- **[Download the skill](dist/strategy-lab-power-play.zip)** — the installable package.

## Use it in Claude Desktop with Cowork

**Install once, then attach a transcript and send one request.** You do not need to clone this repository, connect a folder, or edit code for this workflow.

1. Download **[strategy-lab-power-play.zip](dist/strategy-lab-power-play.zip)**. This is the skill package to upload; GitHub’s general “Download ZIP” contains the entire repository.
2. In Claude, open **Customize → Skills → + → Create skill → Upload a skill**. Upload the package and enable it. Skills and code execution must be enabled for your account; see [Anthropic’s setup instructions](https://support.claude.com/en/articles/12512180-use-skills-in-claude).
3. Start a **new Cowork task** and attach your transcript as a `.md` or `.txt` file. Enabled skills load when the session starts, as described in [Anthropic’s Cowork skill documentation](https://code.claude.com/docs/en/skills#use-skills-in-cowork-and-cloud-sessions).
4. Send:

```text
Use the strategy-lab-power-play skill on the attached transcript.
```

Claude returns **`power-play.md`** as the main deliverable, with **`editorial-notes.md`** as optional supporting information. The skill checks its runtime prerequisites before processing the transcript.

## What the Power Play includes

Each of the three wins has:

- A name and one-line promise
- A TL;DR of no more than two sentences
- Why it matters to a business owner
- A copy-paste prompt
- A concrete way to tell whether it worked

A short closing connects the three wins. If fewer than three ideas qualify, the output is marked incomplete; if none qualify, the skill returns an insufficiency report. It does not invent extra plays to fill the format.

## Use it in Claude Code

Open this repository in Claude Code with **Node.js available on your PATH**, then run:

```text
/strategy-lab-power-play path/to/transcript.md
```

The helper uses Node’s built-in modules, so no additional npm packages or separate API key are needed. Claude access and a working Node runtime are required. Outputs are saved under `power-play-output/` in a separate run folder.

## How it works

Claude interprets the session, selects the wins, writes, and performs an editorial review. The Node helper gives transcript passages unique IDs, checks quoted evidence and required fields, validates the review record, and renders the files. This preserves source references even when timestamps repeat or sections have been removed.

The **[complete skill source](.claude/skills/strategy-lab-power-play/)** contains `SKILL.md`, the editorial guide, and the helper script. Code checks structure and consistency; it cannot prove that every editorial judgment is correct.

## About the sample

The sample, **[Keep the Final Say Over Your AI](sample/power-play.md)**, was generated in Cowork with the supplied transcript attached and no connected folder, using Fable. It is presented without hand-editing. The **[optional editorial notes](sample/editorial-notes.md)** record the source coverage, selection decisions, and five repairs across two review rounds.

<details>
<summary>Development checks and tested environments</summary>

- **36 structural checks** cover indexing, validation, review records, rendering, and incomplete or insufficient results: `node dev/check.mjs`.
- **Development tests** used synthetic sessions to check weak-source handling and common editorial defects; details are in [the behavioral test results](dev/behavioral/results.md).
- **Tested environments:** Claude Code in WSL Ubuntu with Node.js 24.18.0, and the attached-transcript Cowork workflow above. Repeated-run consistency, other Node versions, and native macOS/Windows command-line execution have not been established.

The development frontmatter validator uses Python and PyYAML; these are not runtime dependencies of the installed skill.

</details>

The employer’s transcript, brief, and published example are not included in this repository.
