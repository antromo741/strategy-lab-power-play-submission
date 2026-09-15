#!/usr/bin/env node
// Smoke checks for the strategy-lab-power-play helper. Node.js built-ins only.
// Runs the helper as a subprocess (the same way the skill does) against small fixtures.
//   node dev/check.mjs [--work-dir <dir>] [--keep]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, '.claude/skills/strategy-lab-power-play/scripts/power_play.mjs');
const FIXTURES = path.join(ROOT, 'dev/fixtures');

const { values } = parseArgs({
  options: { 'work-dir': { type: 'string', default: os.tmpdir() }, keep: { type: 'boolean', default: false } },
});
fs.mkdirSync(values['work-dir'], { recursive: true });
const WORK = fs.mkdtempSync(path.join(values['work-dir'], 'power-play-check-'));

const run = (...args) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const writeTemp = (name, text) => {
  const file = path.join(WORK, name);
  fs.writeFileSync(file, text);
  return file;
};
const indexFile = (file) => {
  const r = run('index', file, '--out-root', path.join(WORK, 'runs'));
  expect(r.code === 0, `index exited ${r.code}: ${r.out}`);
  const runDir = r.out.match(/^Run folder: (.+)$/m)[1];
  return { runDir, index: JSON.parse(fs.readFileSync(path.join(runDir, 'index.json'), 'utf8')), out: r.out };
};
const miniRun = () => indexFile(path.join(FIXTURES, 'mini-session.md'));
const validDraft = () => JSON.parse(fs.readFileSync(path.join(FIXTURES, 'valid-power-play.json'), 'utf8'));
const saveDraft = (runDir, draft) => fs.writeFileSync(path.join(runDir, 'power-play.json'), JSON.stringify(draft, null, 2));
const read = (runDir, name) => fs.readFileSync(path.join(runDir, name), 'utf8');
// Trim a 3-play review record down to n plays (checks, findings, dry-runs).
const trimReview = (d, n) => {
  for (let k = n + 1; k <= 3; k++) delete d.review.checks[String(k)];
  d.review.findings = d.review.findings.filter((f) => f.play <= n);
  d.review.dry_runs = d.review.dry_runs.filter((x) => x.play <= n);
};

const results = [];
const test = (name, fn) => {
  try {
    fn();
    results.push([true, name]);
  } catch (e) {
    results.push([false, `${name}: ${e.message}`]);
  }
};

// ---- index ----
test('missing transcript exits 2', () => {
  const r = run('index', path.join(WORK, 'nope.md'));
  expect(r.code === 2 && /not found/.test(r.out), `got ${r.code}: ${r.out}`);
});
test('empty transcript exits 2', () => {
  const r = run('index', writeTemp('empty.md', '  \n\n'));
  expect(r.code === 2 && /empty/.test(r.out), `got ${r.code}: ${r.out}`);
});
test('no timestamps falls back to paragraphs with a warning', () => {
  const { index, out } = indexFile(writeTemp('untimed.md', 'First paragraph.\n\nSecond paragraph.\n'));
  expect(/No timestamps found/.test(out), 'missing warning');
  expect(index.blocks.length === 2 && index.blocks.every((b) => b.kind === 'untimed'), JSON.stringify(index.blocks));
});
test('unexplained gap is reported', () => {
  const { index } = indexFile(writeTemp('gap.md', '00:10\nHello.\n\n05:00\nLater.\n'));
  expect(index.stats.unexplainedGaps.length === 1, JSON.stringify(index.stats.unexplainedGaps));
});
test('read-only out-root exits 2 with a "not writable" message', () => {
  if (typeof process.getuid === 'function' && process.getuid() === 0) return; // root ignores directory modes
  const ro = path.join(WORK, 'readonly-out');
  fs.mkdirSync(ro);
  fs.chmodSync(ro, 0o500);
  const r = run('index', path.join(FIXTURES, 'mini-session.md'), '--out-root', ro);
  fs.chmodSync(ro, 0o700);
  expect(r.code === 2 && /not writable/.test(r.out) && !/at .*power_play\.mjs/.test(r.out), `got ${r.code}: ${r.out}`);
});
test('mini-session: formats, repeats, brackets, inline timestamp, removals', () => {
  const { index } = miniRun();
  const b = Object.fromEntries(index.blocks.map((x) => [x.id, x]));
  expect(index.stats.timestampLines === 9 && index.blocks.length === 11, `counts ${index.stats.timestampLines}/${index.blocks.length}`);
  expect(index.stats.formats['MM:SS'] === 4 && index.stats.formats['HH:MM:SS'] === 5, JSON.stringify(index.stats.formats));
  expect(index.stats.repeatedLabels.some((r) => r.label === '59:10' && r.count === 2), 'repeated 59:10');
  expect(b.B0002.text.includes('[laughter]') && b.B0002.text.includes('10:30 is when'), 'B0002 should keep [laughter] and the 10:30 line as text');
  expect(b.B0003.kind === 'timed' && b.B0003.text === '[crosstalk]', 'whole-line [crosstalk] must stay text');
  expect(b.B0008.label === '01:05:10' && b.B0008.text.startsWith('Third idea'), 'inline timestamp block');
  expect(b.B0006.kind === 'removal' && b.B0006.label === '1:00:05' && b.B0006.gap.seconds === 265, JSON.stringify(b.B0006));
  expect(b.B0010.kind === 'removal' && b.B0010.label === null && b.B0010.gap.from === '01:05:40' && b.B0010.gap.to === '01:12:00', JSON.stringify(b.B0010));
  expect(index.stats.unexplainedGaps.length === 0, 'removal gaps must not count as unexplained');
});

// ---- check + render ----
test('clean 3-play draft: check passes, render verifies, notes have no human checklist', () => {
  const { runDir } = miniRun();
  saveDraft(runDir, validDraft());
  const c = run('check', runDir);
  expect(c.code === 0, c.out);
  expect(/review record: 2 finding\(s\): 2 fixed, 0 replaced, 0 unresolved/.test(c.out), `missing review summary: ${c.out}`);
  const r = run('render', runDir);
  expect(r.code === 0 && /verify: article and notes agree/.test(r.out), r.out);
  expect(/^Power Play: /m.test(r.out) && r.out.indexOf('Power Play:') < r.out.indexOf('Notes (supporting)'), 'render must announce the Power Play first');
  const md = read(runDir, 'power-play.md');
  for (const h of ['## #1:', '## #2:', '## #3:', '**TL;DR:**', '**Why it matters:**', '**Copy this prompt:**', '**How to tell it worked:**', '## The through-line']) {
    expect(md.includes(h), `power-play.md missing ${h}`);
  }
  expect(!/B\d{4}/.test(md), 'block IDs leaked into power-play.md');
  const notes = read(runDir, 'editorial-notes.md');
  expect(/## Unresolved issues\n\nNone\./.test(notes), 'notes must say Unresolved issues: None.');
  expect(!/Before publishing|- \[ \]|human pass/i.test(notes), 'notes must not contain a generic human checklist');
  expect(notes.includes('## Repairs made') && notes.includes('so fewer follow-up questions land on you'), 'notes missing the recorded repair');
  expect(notes.includes('No prompt was executed in any external tool'), 'notes missing the dry-run disclaimer');
  expect(notes.includes('(B0004, line 13)') && notes.includes('## Candidates not selected'), 'notes missing sources or selection sections');
  const v = run('verify', runDir);
  expect(v.code === 0, v.out);
});

const mutations = [
  ['TL;DR over two sentences', (d) => (d.plays[0].tldr = 'One. Two. Three.'), 'sentences (max 2)'],
  ['placeholder in prompt', (d) => (d.plays[0].prompt += ' My city is [your city].'), 'placeholder'],
  ['unknown block', (d) => (d.plays[1].sources[0].block = 'B0999'), 'unknown block'],
  ['citing a removal block', (d) => (d.plays[1].sources[0] = { block: 'B0006', quote: 'Segment removed for member confidentiality' }), 'removal notice'],
  ['fabricated quote', (d) => (d.plays[2].sources[0].quote = 'it saved us ten thousand dollars a year'), 'quote not found'],
  ['complete with two plays', (d) => { d.plays.pop(); d.candidates[2].decision = 'rejected'; trimReview(d, 2); }, '"complete" needs 3'],
  ['missing check', (d) => delete d.plays[0].check, 'check is required'],
  ['prompt depends on the Strategy Lab', (d) => (d.plays[0].prompt += ' Use the checklist from the Strategy Lab.'), 'depends on the Strategy Lab'],
  ['missing review record', (d) => delete d.review, 'review: required'],
  ['check marked fixed with no finding', (d) => (d.review.checks['2'].intake = 'fixed'), 'marked fixed but no fixed/replaced finding'],
  ['finding without a correction', (d) => delete d.review.findings[0].correction, 'correction is required'],
  ['finding present but check marked pass', (d) => (d.review.checks['1'].claims = 'pass'), 'marked pass but finding(s) exist'],
  ['blocking unresolved finding', (d) => { d.review.findings[0].status = 'unresolved'; d.review.findings[0].blocking = true; d.review.checks['1'].claims = 'unresolved'; }, 'blocking unresolved finding on play #1'],
  ['n/a where not allowed', (d) => (d.review.checks['3'].claims = 'n/a'), 'n/a is not allowed'],
  ['dry-run with the wrong kind', (d) => (d.review.dry_runs[0].kind = 'executed'), 'kind must be "reasoned-walkthrough"'],
  ['dry-run claiming execution', (d) => (d.review.dry_runs[1].notes = 'I ran it in ChatGPT and it worked.'), 'claims an execution'],
  ['dry-run input not marked fictional', (d) => (d.review.dry_runs[2].input = 'Last month\'s quote and invoice from our supplier.'), 'described as fictional'],
  ['missing dry-run for a play', (d) => d.review.dry_runs.pop(), 'no dry-run recorded for play #3'],
  ['play cites a block its candidate does not list', (d) => (d.candidates[0].blocks = ['B0004']), 'candidate C1.blocks does not list'],
  ['check_alignment missing from the matrix', (d) => delete d.review.checks['1'].check_alignment, 'check_alignment: must be one of'],
];
for (const [name, mutate, message] of mutations) {
  test(`check rejects: ${name}`, () => {
    const { runDir } = miniRun();
    const d = validDraft();
    mutate(d);
    saveDraft(runDir, d);
    const c = run('check', runDir);
    expect(c.code === 1 && c.out.includes(message), `expected exit 1 with "${message}", got ${c.code}:\n${c.out}`);
  });
}

test('reader-owned "transcript of my call" passes with no ambiguity warning', () => {
  const { runDir } = miniRun();
  const d = validDraft();
  d.plays[0].prompt = `Here is the transcript of my call. ${d.plays[0].prompt}`;
  saveDraft(runDir, d);
  const c = run('check', runDir);
  expect(c.code === 0 && !c.out.includes('[ambiguous]'), c.out);
});
test('"the framework from the session" is a warning, not an error', () => {
  const { runDir } = miniRun();
  const d = validDraft();
  d.plays[0].prompt += ' Use the framework from the session.';
  saveDraft(runDir, d);
  const c = run('check', runDir);
  expect(c.code === 0 && c.out.includes('[ambiguous]'), c.out);
});
test('"you have already decided" is flagged as an assumed adoption (warning)', () => {
  const { runDir } = miniRun();
  const d = validDraft();
  d.plays[1].why_it_matters += ' You have already decided on a ninety-day window.';
  d.plays[1].prompt += ' Since you already use a ninety-day window, apply it.';
  saveDraft(runDir, d);
  const c = run('check', runDir);
  expect(c.code === 0 && (c.out.match(/\[assumed\]/g) || []).length === 2, c.out);
});
test('a check that rejects wording is flagged (warning)', () => {
  const { runDir } = miniRun();
  const d = validDraft();
  d.plays[0].check += ' If it uses the word "delete", ask it to redo the table.';
  saveDraft(runDir, d);
  const c = run('check', runDir);
  expect(c.code === 0 && c.out.includes('[wording]'), c.out);
});
test('genuine non-blocking unresolved finding passes check and is disclosed in the notes', () => {
  const { runDir } = miniRun();
  const d = validDraft();
  d.review.checks['2'].claims = 'unresolved';
  d.review.findings.push({
    id: 'F3', play: 2, rule: 'claims', location: 'before_you_start',
    text: 'the three results this person must deliver in their first ninety days',
    evidence: 'B0007 says "first ninety days"; whether that window suits every role is not settled by the session.',
    correction: 'Kept as the session stated it. The reader may need a different window for senior roles; nothing in the transcript settles this.',
    status: 'unresolved', blocking: false,
  });
  saveDraft(runDir, d);
  const c = run('check', runDir);
  expect(c.code === 0 && /1 unresolved/.test(c.out), c.out);
  const r = run('render', runDir);
  expect(r.code === 0 && /verify: article and notes agree/.test(r.out), r.out);
  const notes = read(runDir, 'editorial-notes.md');
  const section = notes.split('## Unresolved issues')[1].split('\n## ')[0];
  expect(section.includes('Play #2, Outcome-Based Job Post · claims') && section.includes('What is missing and why it matters'), `unresolved not disclosed:\n${section}`);
  expect(!section.includes('None.'), 'section must not say None. when an issue is open');
  expect(!/Incomplete draft|VALIDATION FAILED/.test(read(runDir, 'power-play.md')), 'a non-blocking open point must not mark the article failed');
});
test('verify detects a hand-edited article that no longer matches the notes', () => {
  const { runDir } = miniRun();
  saveDraft(runDir, validDraft());
  expect(run('render', runDir).code === 0, 'render failed');
  const md = read(runDir, 'power-play.md').replace('## #2: Outcome-Based Job Post', '## #2: Something Else');
  fs.writeFileSync(path.join(runDir, 'power-play.md'), md);
  const v = run('verify', runDir);
  expect(v.code === 1 && /wins differ/.test(v.out), v.out);
});
test('render refuses on errors, --force renders with a banner', () => {
  const { runDir } = miniRun();
  const d = validDraft();
  delete d.plays[0].check;
  saveDraft(runDir, d);
  const r = run('render', runDir);
  expect(r.code === 1 && r.out.includes('render: refused') && !fs.existsSync(path.join(runDir, 'power-play.md')), r.out);
  const f = run('render', runDir, '--force');
  expect(f.code === 1 && read(runDir, 'power-play.md').includes('VALIDATION FAILED'), f.out);
  expect(read(runDir, 'editorial-notes.md').includes('Validation errors still present'), 'notes must list the remaining errors');
});
test('incomplete draft (2 plays) renders the incomplete banner and verifies', () => {
  const { runDir } = miniRun();
  const d = validDraft();
  d.status = 'incomplete';
  d.status_reason = 'Only two ideas had enough support.';
  d.plays.pop();
  d.candidates[2].decision = 'rejected';
  trimReview(d, 2);
  saveDraft(runDir, d);
  const r = run('render', runDir);
  expect(r.code === 0 && read(runDir, 'power-play.md').includes('Incomplete draft') && /agree/.test(r.out), r.out);
});
test('zero-win fallback writes insufficient-material.md and no power-play.md', () => {
  const { runDir } = miniRun();
  const d = validDraft();
  d.status = 'insufficient';
  d.status_reason = 'Nothing met the quality bar.';
  d.plays = [];
  d.through_line = '';
  d.candidates.forEach((c) => (c.decision = 'rejected'));
  delete d.review;
  saveDraft(runDir, d);
  const r = run('render', runDir);
  expect(r.code === 0 && /agree/.test(r.out), r.out);
  expect(fs.existsSync(path.join(runDir, 'insufficient-material.md')), 'insufficient-material.md missing');
  expect(!fs.existsSync(path.join(runDir, 'power-play.md')), 'power-play.md should not exist');
});

for (const [ok, msg] of results) console.log(`${ok ? 'ok    ' : 'NOT OK'} ${msg}`);
const failed = results.filter(([ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
if (values.keep) console.log(`Work folder kept: ${WORK}`);
else fs.rmSync(WORK, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
