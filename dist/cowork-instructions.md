# strategy-lab-power-play in Cowork: install and run

**Status:** run once in Cowork on 2026-09-15 with the transcript attached to a fresh task. The resulting notes show the transcript was found at the environment's upload location, the Node.js helper ran (index, check, render), and the run finished `complete` with no unresolved issues; the output is `../sample/`. Not recorded from that run: which permission prompts appeared, and how the files were handed back. Treat anything beyond that as untested.

## Before you start
- A Claude plan with skills, and **code execution enabled** (Anthropic's help page says skills need it; menu names may differ by app version).
- `strategy-lab-power-play.zip`, from this folder. Its root is a `strategy-lab-power-play/` folder containing `SKILL.md`, `references/` and `scripts/`.
- The transcript as a `.md` or `.txt` file.

## Install
1. In the Claude desktop app, open **Customize → Skills**. In Cowork, Customize is in the left sidebar.
2. Click **+**, then **Create skill → Upload a skill**, and choose the ZIP.
3. Check that `strategy-lab-power-play` appears in your skills list and is turned on. If the upload is rejected, keep the exact error message. Don't edit the skill files to force it.

## Run: attach the transcript (simplest)
1. Start a **new** Cowork task. No folder connection is needed.
2. Attach the transcript file to your first message and ask:
   `Use the strategy-lab-power-play skill on the attached transcript.`
   With exactly one transcript attached, the skill uses it without you naming it. If you attach more than one text file, it asks which one.
3. **Node check.** The skill runs `node --version` first. If Node.js isn't available in the task environment it stops and says so; the skill won't run there.
4. Approve file writes and `node` commands if asked.
5. **Where things go.** Uploaded files may live in a read-only place, so the skill writes to the task's output location and returns `power-play.md` (the Power Play, already reviewed and repaired) and `editorial-notes.md` (optional: checks performed, repairs, selection reasons, sources, any genuinely unresolved issue). If the session had too little material it returns `insufficient-material.md` and the notes instead. Keep both files as emitted; put human edits in a separate notes file.

## Run: connected folder (alternative, not exercised in Cowork)
1. Start a Cowork task with the folder that holds the transcript connected.
2. Ask: `Use the strategy-lab-power-play skill on <transcript file name>. Put the output folder next to the transcript.`
3. The skill looks for that file name inside the connected folder and writes `power-play-output/<name>-<timestamp>/` beside it if the folder is writable, otherwise to the task's output location. It says which it used.

## If something goes wrong
- **"Node.js was not found"**: the environment has no Node; the skill can't run there.
- **"Can't find the skill's own files"**: re-upload the ZIP. The files must be installed as a folder, not as loose files.
- **It asks for the transcript** even though you attached one: reply with the file name, or re-attach it. The skill never rebuilds a transcript from the chat text.
- **"Output location is not writable"**: tell it to use the task's output location.
