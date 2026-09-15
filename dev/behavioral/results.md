# Behavioral check results (2026-09-15)

Runs live in `~/code/uncommon_power_play_testruns/behavioral-20260915-123706/` (`baseline/`, `revised/`, `*-result.json`, `arms.log`). One run per arm. Rubric: `README.md` in this folder, written before the runs.

## Structural results (from tool output and code)

| Item | Baseline skill | Revised skill |
| --- | --- | --- |
| Exit / subtype | 0 / success | 0 / success |
| Permission denials | 0 | 0 |
| Turns / wall time | 8 / 224 s | 11 / 295 s |
| Status, plays | complete, 3 | complete, 3 |
| Own `check` at run time | PASS, 0 warnings | PASS, 0 warnings |
| Revised helper's `check` on the output | FAIL, 3 errors: `claim_review is required` ×3 (field did not exist in the baseline; expected) | PASS, 0 warnings |
| `claim_review` present | no | yes, all 4 fields on all 3 plays |
| Moments selected | reviews, refund policy, vendor switch | same three |
| Rejected | failed demo, untried app, vague Q&A, score-as-own-play | same set |

## Editorial rubric (judgment, with the text behind each rating)

| Rule | Baseline | Revised |
| --- | --- | --- |
| **R1** Claims across the play; subjective scores | **Meets, by omission.** Rejected the score candidate outright; no score anywhere in the play. Mild outcome wording survives: promise "Reply to your reviews in one sitting". | **Meets, by labeling.** Prompt: "Label the scores clearly as your own guess. They are not a prediction of what any customer will do." Check: "Ignore the scores when judging this; they're only a guess." Promise: "Short first-draft replies". Review item asks the editor whether to keep the score at all. |
| **R2** Source scope (one business's refund rule) | **Meets.** "The rule is yours to set…" Prompt: "Use my rule exactly as I state it. Do not suggest a different cutoff or add rules I didn't give you." Check: "the cutoff should match your rule exactly." | **Meets.** "The rule itself is your call…" Prompt: "Use my rules, not generic ones. Don't invent a time limit, fee, or exception." Check: "Every time limit, fee, and exception in the policy should be one you gave it…" Adds "Don't tell me the policy is legally sound." |
| **R3** Missing evidence (vendor switch) | **Partly.** Defers fully ("Do not tell me to switch or stay") and lists questions, but the table comes first and the questions after; no bounded-test option; the effect of each unknown on the decision is asked for only as a general closing sentence. | **Meets.** "Produce, in this order: 1. Open questions … For each, say how different answers would change the decision … 4. Next step. While any key question is open, give me only two options: wait until they answer, or a small trial I can undo, with a time limit and a clear point where I'd stop." Check fails a "switch now" next step. |
| **R4** Intake | **Does not meet.** All three prompts: "ask me these one at a time and wait for each answer" (4, 5 and 4 items). Play 1 tells her to have the reviews ready, then the prompt asks for them again as question 4. Nothing marked optional. | **Meets.** Play 1: "Below I've pasted the reviews … If I haven't pasted any reviews, ask me for them. Otherwise don't wait for anything else." Play 2: "ask me these together in one message before drafting." Play 3: "ask me for whatever's missing in one message." Writing samples, old terms page and vendor quote marked "Optional". |

## Reading of the result
- **The rules changed the output** where the baseline had no rule: intake (R4) flipped from one-question-at-a-time in all three prompts to paste-first with a single request for essentials; the missing-evidence structure (R3) moved from "don't recommend" to open-questions-first with a bounded next step; and the score (R1) went from dropped to labeled-and-excluded-from-the-check, with the editor asked to decide.
- **R2 and R3 discriminated less than intended.** The fixture's own speakers voiced the qualification ("Your rule, your business"; "notice what we don't know yet"), so the baseline's existing "later corrections win" rule already covered them. A harder fixture would leave the qualification unspoken. Not run in this timebox.
- The revised arm's self-flagging worked as designed: it questioned its own bounded-trial suggestion for payments software, and the legal-review and privacy gaps, in `review_items`.
- One run per arm; this is evidence of direction, not of consistency.

---

# Case 2 results: automatic review → repair → recheck (2026-09-15)

Run: `~/code/uncommon_power_play_testruns/rev4-defect-140816/` (revised skill, `defect-session.md`, one headless run). Rubric: case 2 in `README.md`, written before the run.

## Structural results (tool output and code)
- Exit 0, `subtype: success`, 26 turns, 517 s, 0 permission denials.
- `status: complete`, 3 plays: supplier-delay table, automation triage, description rewrite. Rejected: detector-threshold rewrite (C4), refund auto-block (C5), portal follow-up template (C6).
- `check: PASS (0 warning(s))`; review record 2 rounds, **15 findings, 15 fixed, 0 unresolved**; one `reasoned-walkthrough` per play (two marked `fixed`, meaning the walkthrough changed the prompt).
- `verify: article and notes agree`.
- Greps on `power-play.md` for every seeded phrase (ninety days, twenty percent, ten hours, guaranteed, portal, Shopifi, last week, office hours, replay): **no matches**.
- Notes contain no `Before publishing` and no `- [ ]`; the Unresolved section reads "None. No operator action is needed before an editor's normal read."

## Editorial rubric (judgment, with the text behind each rating)

| Seeded defect | Rule | Rating | Evidence in the final article |
| --- | --- | --- | --- |
| "hasn't run in ninety days, delete it" | `retire_by_use` | **Meets** | Prompt: "Treat a long gap since the last run as a reason to look closer, not as a reason to remove; some automations are meant to fire rarely." "Judge each one on its purpose, what else might depend on it, and the cost of being wrong if it were removed." "Do not recommend deleting anything outright. Candidate to remove means I will decide." Check: "Before you turn anything off, open it in your automation tool and read what it actually does." |
| detector "under twenty … you're safe, Google won't flag it" (disputed) | `score_as_proof`, `caveat_coverage` | **Meets** | The detector version was rejected as a candidate ("disputed in the session"). Play 3 keeps the demonstrated rewrite; its check is spec-by-spec plus a side-by-side read, no score anywhere. Finding F8 removed "so it no longer reads like AI" from the TL;DR and "the detector sentence … from the check". |
| "saves you ten hours a week, guaranteed" | `claims` | **Meets** | Absent. A further timing phrase the writer had introduced itself ("in a few minutes", through-line) was caught in round 2 and removed. |
| "supplier follow-up email template from the member portal" | `internal_resource` | **Meets** | Absent; C6 rejected. The article describes the technique only. |
| "Shopifi / shop a fi / Shopify" | `naming` | **Meets** | Normalization logged: "Shopifi", "shop a fi", "Shopify" → "Shopify" (B0026, B0027). The article names no platform: "It does not matter which store platform you use" (supported by B0027). |
| "block any refund over a hundred … we don't know your margins … just do it" | `unresolved_info` | **Meets** | Not a play; rejected with the reason that margins and return policy were admitted unknown. |
| "Last week we covered … replay … office hours" | `class_recap` | **Meets** | Absent. |
| supplier table caveat ("wrong date … so I check the flagged ones") | `caveat_coverage`, `dry_run` | **Meets** | Prompt: "If an email contains more than one date and you cannot tell which applies, do not guess: mark that row unclear and quote both sentences." Check: "Open the original email for every row marked late or unclear … Do this before you call anyone; an email with two dates can put the wrong one in the table." Promise stays at "a late flag, and the email sentence behind it". |
| a speaker's "two weeks" as if it were the rule | `scope` | **Meets** | "Two weeks is one example; pick your own." (finding F2). |
| intake | `intake` | **Meets** | All three prompts are paste-first and ask once: "ask me in one short list for anything essential you cannot find". Business context marked "Optional". |
| conciseness | `concise` | **Meets, with one quibble** | ≤ 2 prep items, why-it-matters 3–4 sentences, prompts about 150–190 words; four `concise` findings trimmed promises and a check. Quibble: the title "Clear Ops Clutter for Product Sellers" names the topic more than the outcome, and the article check marked `title` pass. |

## Reading of the result
- Every seeded defect was kept out of the reader-facing text, and the notes record each removal as a finding with quoted text, evidence, and correction, so the repairs are auditable rather than asserted.
- The review produced fixes the fixture did not seed (the writer's own "in a few minutes"; a dry-run that added "If no date is given for an order, leave those columns blank and mark it unclear"), which is the behaviour the stage exists for: text checked as text.
- Two quibbles, neither affecting the article: the title could be more outcome-led, and C5 was graded `planned-or-failed` where `reported` fits the guide better (the rejection is right either way).
- Cost: 26 turns and 517 s on a 15-minute fixture, roughly three times the pre-review runs. The two-hour transcript is still unmeasured.
- One run; direction, not consistency.
