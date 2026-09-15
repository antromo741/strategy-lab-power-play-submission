# Editorial notes: Keep the Final Say Over Your AI

Supporting material for `power-play.md`: what was checked and repaired, why each win was chosen, and how ambiguous source material was handled.

- Status: **complete**
- Transcript: /root/.claude/uploads/ae8c6b6a-9006-594d-b5b6-822db9052f19/3d17624c-transcript.md (117347 bytes, sha256 a90041bfe4477cd8…)
- Structural validation: PASS; 6 warning(s)
- Editorial review: 2 round(s); 5 finding(s): 5 repaired, 0 unresolved
- Rendered: 2026-09-15T19:04:29.789Z

## Unresolved issues

None. No operator action is needed before an editor's normal read.

## Checks performed

| Play | claims | scope | caveat_coverage | unresolved_info | retire_by_use | score_as_proof | intake | internal_resource | naming | dry_run | concise | check_alignment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #1 | pass | fixed | pass | pass | n/a | n/a | pass | pass | n/a | pass | pass | pass |
| #2 | pass | pass | pass | pass | pass | n/a | pass | pass | fixed | pass | pass | fixed |
| #3 | fixed | pass | pass | pass | n/a | pass | pass | pass | n/a | pass | pass | pass |

| Article | title | through_line | tone | class_recap | notes_agreement |
| --- | --- | --- | --- | --- | --- |
| whole | pass | pass | pass | pass | pass |

Prompt dry-runs: reasoned walkthroughs by the writing model with fictional inputs. **No prompt was executed in any external tool.**

- Play #1, Rules for what AI can touch: pass
  - Input: Fictional: 'Harbor & Pine', an invented interior-design studio of four. Pasted list: shared email, calendar, Slack, an accounting app, a client-files drive, a social scheduler; AI tools: a chat assistant and a meeting note-taker. Owner answers: would have to undo mistakes in accounting and client files; fine with changes to the social scheduler drafts; unsure about the note-taker's recordings.
  - Expected: Questions come first and cover each listed account before any rule sheet appears.
  - Expected: The sheet places all six accounts and two AI tools exactly once; accounting and client files are not under 'Fine to share'; the note-taker recordings sit under 'Decide later' with a question.
  - Expected: The sorting rule is labeled a suggestion. If the sheet placed accounting under 'Fine to share', the check's 'nothing you said you would have to undo sits under Fine to share' would catch it.
  - Notes: Nothing in the prompt turns an unknown into a rule; unknowns are routed to 'Decide later'.
- Play #2, A plan before files move: pass
  - Input: Fictional: 'Bramblewood Events', an invented events planner with twelve pasted Drive folder names including 'Misc', 'Misc 2', 'Vendors', 'Vendors OLD', 'Contracts', and 'Photos'. Notes: two staff need to find vendor contracts fast.
  - Expected: Questions come before the plan; the plan is under a page with four parts.
  - Expected: All twelve folders appear once in the table with keep/move/merge; 'Misc 2' and 'Vendors OLD' are not marked delete but appear under 'For me to decide' with a note on what they seem to hold and what may depend on them.
  - Expected: Step order names a small first batch. If the table dropped 'Photos' or listed 'Vendors' twice, the check's 'exactly once' test would catch it; if it proposed deleting 'Vendors OLD', the 'nothing is marked for deletion' test would catch it.
  - Notes: Removal stays behind the owner's decision; low use alone never produces a delete.
- Play #3, Make your proposal sound like you: pass
  - Input: Fictional: a two-page coaching proposal for an invented client 'Meridian Labs' with a fee of 4,800, a start date of 3 November, and six workshop sessions; plus a short sample of the owner's own emails.
  - Expected: Every listed passage is quoted verbatim from the proposal with a one-line reason and a rewrite; the rewrites keep 4,800, 3 November, and six sessions unchanged.
  - Expected: No score or verdict appears; up to three questions close the reply, under 600 words.
  - Expected: If a rewrite changed the fee to 5,000 or invented a guarantee, the check's 'each rewrite keeps the same prices, dates, names, and deliverables' would catch it.
  - Notes: The promise stays at 'passages and rewrites', not a guarantee about the reader, matching the caveat.

Validator warnings left in place:

- [length] play #1 prompt: 218 words (aim for 200 or fewer)
- [length] play #1 tldr: 47 words (aim for 45 or fewer)
- [length] play #1 why_it_matters: 80 words (aim for 70 or fewer)
- [length] play #2 prompt: 203 words (aim for 200 or fewer)
- [length] play #2 why_it_matters: 75 words (aim for 70 or fewer)
- [length] play #3 why_it_matters: 75 words (aim for 70 or fewer)

## Repairs made

- **Play #1, Rules for what AI can touch · scope · prompt**
  - Text: "Anything I would have to undo must be kept out of AI tools."
  - Evidence: B0246–B0247: the test is one team member's framework ('the framework I put together'), not a universal rule; the guide says a policy or opinion may not become a requirement in the prompt.
  - Correction: Rewritten so the prompt applies it only as the draft's sorting rule and says it is a suggestion she can change: 'Apply this sorting rule and tell me it is a suggestion I can change: anything I would have to undo does not go in Fine to share.' The reader text presents it as 'a simple test came out of that'.
  - Status: fixed
- **Play #2, A plan before files move · check_alignment · prompt**
  - Text: "a table listing every current folder with where it would go"
  - Evidence: The check expects each pasted folder exactly once, but the draft prompt did not settle duplicates (guide: 'Duplication').
  - Correction: Prompt now says 'a table listing every current folder exactly once'; the check tests exactly that and recovers by asking for the missing folder to be added once.
  - Status: fixed
- **Play #3, Make your proposal sound like you · claims · prompt**
  - Text: "generic openings, stacked adjectives, lists of three, vague claims, phrases nobody says aloud"
  - Evidence: No block in the transcript names these patterns; the host only said to read as someone who 'deeply understands AI linguistic patterns' (B0385). The list was our enrichment.
  - Correction: Removed the list; the prompt now says 'an editor who knows the patterns that make text read as machine-written' and leaves the patterns to the AI.
  - Status: fixed
- **Play #2, A plan before files move · naming · why_it_matters**
  - Text: "In the session a member asked why Claude kept failing to organize her Drive"
  - Evidence: Guide: name a product only if the win depends on it, and no session recap; the play works with any AI assistant, and the draft both named the product and referred to the session.
  - Correction: Rewritten as 'One owner spent months on it: the tool scrambled her Drive, then reported it could not move things', with no session reference or product name.
  - Status: fixed
- **Play #3, Make your proposal sound like you · claims · why_it_matters**
  - Text: "lost the deal because the reader felt it seemed AI-written"
  - Evidence: B0369–B0371 say the client 'did not like the fact that the proposal was AI made' and that it 'seemed AI written'; the transcript does not state the contract was lost.
  - Correction: Now reads 'the client balked because it seemed AI-written'; the candidate's owner_problem was aligned to the same wording.
  - Status: fixed

## Selected wins

### #1: Rules for what AI can touch

- Candidate: C1 (Written rules for what your team may share with AI tools)
- Why selected: Directly raised owner problem, inputs she has, one prompt gives a concrete editable policy; the safety concern the speakers raised is the point of the play rather than something it works around.
- Evidence: explained
- Owner problem: Team members are trying new AI tools; the owner has no stated rules for what they may paste into them or connect them to, and a tool with broad access acted on its own (messaged a whole team on Slack).
- Inputs the reader supplies: A list of the tools and accounts the business uses, the AI tools the team uses or is considering, and her own answers about which accounts she could tolerate an AI changing on its own.
- Outcome: A one-page draft rule sheet, sorted into fine-to-share, connect-with-a-person-checking, keep-out, and decide-later, with a one-line reason per item, for her to edit.
- Prerequisites: She knows which tools and accounts her team uses.
- Caveats, corrections, disagreement: The sorting test (give access only where you would accept the tool making changes on its own; never where you would have to undo a mistake) is one team member's framework, offered as a proposal she can change. The accounting-books example is one company's policy, shown as an example only. Turning the framework into a prompt is our application; it was described, not demonstrated.
- Sources:
  - `01:06:46` (B0232, line 696): "As a leader in your business, if your team is using these different tools, you guys have to have rules."
  - `01:09:40` (B0246, line 738): "if you're okay with it 100% going and making changes to whatever you give it access to, give it access, if you're not, don't."
  - `01:10:32` (B0247, line 741): "if it's something that you would have to undo, don't let it have access."
  - `56:27` (B0207, line 621): "It created a group message on my Slack and sent everyone who was on that calendar invitation a note about potentially changing that invitation."

### #2: A plan before files move

- Candidate: C2 (A plan you approve before AI reorganizes your files or inbox)
- Why selected: Common owner pain, trivial inputs, one prompt yields a reviewable plan, and the plan-first method is clearly stated in the transcript.
- Evidence: explained
- Owner problem: A member spent months trying to have AI organize Drive, Gmail, and contacts; it scrambled things and then stalled. The advice was to have it produce a plan first, edit it, then execute.
- Inputs the reader supplies: A pasted list of her current top-level folder names (or email labels) and a few sentences on how she and her team look for things.
- Outcome: A written reorganization plan: a proposed structure, a table placing every existing folder once, open questions, and a small first batch to check, with nothing moved.
- Prerequisites: She can copy her folder or label names from her own account.
- Caveats, corrections, disagreement: The advice was given in answer to one member and was not demonstrated; the prompt is our application. The play works from a pasted list rather than a connected account so nothing can be moved by accident; a remark that the tool 'is lying' about its permissions is a speaker's view and is left out.
- Sources:
  - `02:05:13` (B0464, line 1390): "literally ask it to create a plan before you actually go and do work."
  - `02:05:13` (B0464, line 1390): "You edit the plan and then you execute the plan. Right now it's assuming what is best and then trying to go and get it done for you"
  - `02:04:45` (B0463, line 1387): "I gave that to Clog and it Claude and it like screwed everything up and then now it's telling me it doesn't have the permissions to move things around"
  - `02:06:02` (B0469, line 1405): "This would be a big job. That's why I want you to be in plan mode first."

### #3: Make your proposal sound like you

- Candidate: C3 (Find and rewrite the passages that make your proposal read as machine-written)
- Why selected: A real owner problem with a pasteable input and a concrete one-prompt output that differs in kind from the other two picks.
- Evidence: explained
- Owner problem: A coach with a client ready to sign sent an AI-drafted proposal and the client balked because it 'seemed AI written'; she wanted a way to spot that before sending.
- Inputs the reader supplies: The proposal text; optionally a sample of her own writing and the client's feedback.
- Outcome: A list of the passages that read as machine-written, why each does, and a rewrite of each in her voice with every fact, price, date, and commitment unchanged, plus questions where a personal detail would help.
- Prerequisites: She has the proposal as text she can paste.
- Caveats, corrections, disagreement: The suggested prompt (read as someone who spots AI writing patterns and point to where it shows) was offered by a host and accepted by the member; no result was shown. A host also suggested a 0–100 'anti-AI' score and an internal writing guide; both are left out (a score is the AI's opinion, the guide is not available to the reader). The hosts said even a cleaned-up document can still be called AI-made, so the play promises flagged passages and rewrites, not a guarantee about how a reader will react. Watermark remarks (B0396) are unverified and excluded.
- Sources:
  - `01:47:29` (B0369, line 1105): "they did not like the fact that the proposal was AI made."
  - `01:48:20` (B0371, line 1111): "he said that it seemed AI written"
  - `01:51:22` (B0385, line 1153): "where in this document would that person identify that this was written with AI"
  - `01:49:59` (B0377, line 1129): "And even if you run through all of those, anyone can say"

## Candidates not selected

| ID | Candidate | Evidence | Blocks | Why not selected |
| --- | --- | --- | --- | --- |
| C4 | Consolidate overlapping automations, prompts, and skills | explained | B0336, B0337, B0338, B0339, B0342, B0348, B0349 | Weaker input ease for a non-technical owner with a small team; the problem as described belongs to a company running hundreds of skills. Kept as the next qualifying candidate. |
| C5 | Pick the right AI model for the job | explained | B0053, B0054, B0055, B0062, B0064, B0066, B0072 | A heuristic rather than a one-prompt deliverable, and it cannot be written without transient model and pricing details. |
| C6 | Set up a Grokbot chief of staff | explained | B0221, B0222, B0224, B0226 | Needs a new paid account and the kind of broad access the speakers warned against; not something she can do today with what she has. |
| C7 | Evaluate any hyped AI tool with sexy, safe, scalable | explained | B0205, B0210, B0230, B0272 | Rests on the same framework and blocks as C1; selecting both would split one idea. |
| C8 | Export legacy memory before the deadline | explained | B0022, B0026, B0027 | Transient product housekeeping, not a business quick win. |

## Ambiguous material handled

Name normalizations (variants as transcribed → name used):

- "Grokbot", "Grockbot", "Rockbot", "Crockbot", "Grotbot", "Brockbot", "Grok Bot", "graph bot", "rockbot" → "Grokbot" (B0086, B0106, B0107, B0157, B0297, B0469)
- "Claude", "Clawd", "Clog", "claw", "cloud" → "Claude" (B0096, B0165, B0463, B0464)

Removed material (preserved as gaps; not reviewed or inferred):

- B0003 (line 10): gap 00:26→03:38 (3m12s): [Recording begins. Several minutes of audio from an open microphone removed.]
- B0358 (line 1074): gap 01:32:09→01:42:34 (10m25s): [Segment removed for member confidentiality. Two hot seats were cut from this recording before it was shared.]
- B0362 (line 1085): gap 01:43:02→01:47:04 (4m02s): [Segment removed for member confidentiality. Two hot seats were cut from this recording before it was shared.]

Unexplained gaps over 2 minutes:

- none

## Coverage

Index: 483 blocks, 480 timestamp lines, range 00:09–02:08:11, 32 repeated labels.

| Part | Blocks | Time range | What this part contains |
| --- | --- | --- | --- |
| 1 | B0001–B0068 | 00:09–24:23 | Housekeeping and warm-up: a poll on how many automations members run (B0008), class notes, calendar links, pods, event ticket promotion, a product memory-export deadline (B0022–B0027), member wins and spotlights (B0029–B0039), portal and Slack logistics, then a spotlight on a new model release and a 'right model, right job' discussion with if-this-then-that examples (B0053–B0068). Teaching content: only the model-choice heuristic; the rest is housekeeping and promotion. |
| 2 | B0069–B0164 | 24:58–46:56 | Wrap-up of model choice (it is the human's decision, B0072). Then the main segment begins: history of Grok/X/Cursor (B0089–B0094), the hosts' two-week test of Grokbot, a definition of an AI agent (context, connections, capabilities, scheduling, memory, B0108–B0110) and AI-employee levels (B0115), and a tour of one host's Grokbot team that was partly lost to a broken screen share (B0127–B0164). Mostly description and demo attempts; no reproducible quick win here. |
| 3 | B0165–B0253 | 47:34–01:12:14 | Grokbot capabilities: each bot has its own virtual computer, can log into tools without APIs (B0165–B0190). A sexy/safe/scalable evaluation of the tool (B0205–B0214) with a story of a bot messaging a whole team on Slack (B0207). A beginner's setup prompt for Grokbot (B0221–B0226). Leadership guidance that teams need rules on what they can share with AI tools, a company example (accounting books off-limits, B0240), and an operations-side framework: give access only where you'd accept it making changes on its own, never where you'd have to undo a mistake (B0246–B0253). |
| 4 | B0254–B0377 | 01:12:42–01:49:59 | Team disagreement over Grokbot summarized (B0254–B0272), homework and class housekeeping (B0275–B0276). Hand-raise Q&A: a member's self-built orchestrator in a markdown file (B0279–B0298), terminal anxiety (B0303–B0306), a question about Codex (B0315–B0321), 'how many agents is too many' with the 'would you ever talk to it by itself?' test and a skill-bloat discussion (B0333–B0357). Two removed hot seats (B0358, B0362). A coach whose proposal was rejected as AI-written (B0369–B0377). |
| 5 | B0378–B0483 | 01:50:49–02:08:11 | Continuation of the AI-written proposal question: encouragement, a prompt to have the AI point out where a document reads as AI-written (B0378–B0391), a watermark aside (B0396–B0399). Then technical member questions: captchas blocking automated logins (B0410–B0449), user logins for a client dashboard (B0452–B0458), a member whose Drive and Gmail organizing attempts failed, answered with 'make a plan first, edit it, then execute' (B0460–B0470), a live-feed recording setup (B0472–B0476), and sign-off. |
