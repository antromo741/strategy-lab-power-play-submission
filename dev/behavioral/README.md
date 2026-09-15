# Behavioral check: do the editorial rules change the output?

The structural checks (`node dev/check.mjs`) prove the helper enforces fields and citations. They cannot show that the editorial rules change what Claude writes. This check does that, with one small before/after comparison on subject matter unrelated to the real session.

This rubric was written **before** the runs, so the judging criteria were fixed in advance.

## Fixture
`dev/fixtures/behavior-session.md` is a synthetic 14-minute session about the customer side of a small service business. Each of its three teachable moments is set up so that one or more rules matter:

| Moment | Rules it exercises |
| --- | --- |
| Drafting replies to online reviews, with the AI asked to rate each draft; a speaker overstates what the rating means and another qualifies it | Claims across the whole play; subjective scores; intake |
| A refund and cancellation policy; one business's specific rule, then another speaker explains that rule wouldn't fit other businesses | Source scope; intake |
| Whether to switch booking and payment software; key costs and terms are unknown and the vendor's claim is unverified | Missing evidence; intake |

It also contains non-qualifying material: housekeeping, a failed demo, hype about an untried app, a vague Q&A answer, and one removed segment.

The transcript never states the editorial rules. The skill's editorial guide contains no topics from this fixture.

## Method
- **Baseline:** the skill as it was before the revision (snapshot in `~/code/uncommon_power_play_testruns/baseline-skill/`).
- **Revised:** the current `.claude/skills/strategy-lab-power-play/`.
- **Setup:** each arm runs in its own clean folder under `~/code/uncommon_power_play_testruns/`, containing only that skill copy and the fixture.
- **Command:** `claude -p "/strategy-lab-power-play behavior-session.md" --permission-mode acceptEdits --output-format json`, with inherited Claude session variables unset.
- **Runs:** one per arm.

## Structural results (checked by code or tool output)
- Exit code, permission denials, and turn count.
- `check` result on the output folder.
- Status and play count.
- Whether `claim_review` is present (revised arm only; the baseline has no such field).

## Editorial rubric (judgment, not automated)
Rate each item for each arm as **Meets**, **Partly**, **Does not meet**, or **N/A** (the relevant candidate was not selected), and quote the reader-facing text behind the rating.

| ID | Rule | Meets when |
| --- | --- | --- |
| R1 | Claims across the play | Any score or rating is labeled as a subjective estimate in the prompt and the reader text. No section, including the prompt and check, implies a guaranteed outcome. The check does not use the score as proof. |
| R2 | Source scope | One business's specific refund rule appears as an example or an owner's choice, not as a required rule in the prompt or a pass condition in the check. |
| R3 | Missing evidence | The switching play lists open questions before any recommendation. While costs and terms are unknown, it limits the recommendation to waiting or a small, bounded test. |
| R4 | Intake | Prompts use material the reader pastes, ask for missing essentials in one request (not a one-question-at-a-time sequence), and keep optional inputs optional. |

## Limits
- One run per arm. Model output varies, so a difference can be suggestive without being conclusive.
- The builder applying the rubric is the same model family that wrote the skill. The quotes are included so a human can check each rating.

---

# Case 2: automatic review → repair → recheck (revision 4)

Fixture: `dev/fixtures/defect-session.md`, a synthetic 15-minute session on the operations side of a small product business. Written **before** the run, it seeds defects that the review stage must catch and repair on its own, plus one clean win:

| Seeded material | Rule it exercises | Expected in the final `power-play.md` |
| --- | --- | --- |
| "Anything that hasn't run in ninety days, delete it" (automation clean-up, demonstrated) | `retire_by_use` | No deletion rule based on age or low use alone; removal sits behind purpose/dependency/consequence and an owner decision |
| "under twenty [percent] … you're safe, Google won't flag it" (detector score; a member disputes it) | `score_as_proof`, `caveat_coverage` | No detector threshold as a pass sign in any prompt or check; no "safe" claim |
| "saves you ten hours a week, guaranteed" | `claims` | Absent |
| "use our supplier follow-up email template from the member portal" | `internal_resource` | No portal/template dependence; the technique described instead, or omitted |
| "Shopifi" / "shop a fi" / "Shopify" | `naming` | One spelling if named at all, normalization logged |
| "block any refund over a hundred dollars … we don't know your margins … just do it" | `unresolved_info` | Not a play; or if used, no automatic block rule while margins/policy are unknown |
| "Last week we covered … replay is up … office hours moved" | `class_recap` | Absent from the article |
| Supplier-delay table: demonstrated; "it put the wrong date on one order … so I check the flagged ones" | `caveat_coverage`, `dry_run` | The spot-check caveat governs the promise and the check |

Structural pass conditions: exit 0, no permission denials, `check` PASS, `render` reports "article and notes agree", `review.findings` non-empty with quoted text/evidence/correction, one `reasoned-walkthrough` per play, notes contain no `Before publishing` / `- [ ]` checklist.

Editorial pass conditions: the greps in the table above on `power-play.md`; the notes' "Repairs made" section names which seeded defects were fixed; any "Unresolved issues" entry is specific (text, evidence, what is missing).

Not a pass condition: which three candidates were chosen. Several selections are defensible.
