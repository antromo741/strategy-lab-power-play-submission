#!/usr/bin/env node
// Helper for the strategy-lab-power-play skill. Node.js built-in modules only.
//   index  <transcript>   -> numbered blocks: index.json + transcript-index.md in a new run folder
//   check  <run_dir>      -> validate power-play.json against index.json
//   render <run_dir>      -> power-play.md (or insufficient-material.md) + editorial-notes.md
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseArgs } from 'node:util';

const USAGE = `Usage:
  node power_play.mjs index <transcript> [--out-root <dir>]   (default out-root: power-play-output)
  node power_play.mjs check <run_dir>
  node power_play.mjs render <run_dir> [--force]   (renders, then verifies article and notes agree)
  node power_play.mjs verify <run_dir>             (re-checks that the rendered files agree with power-play.json)

Exit codes: 0 ok, 1 validation errors, 2 bad input or usage.`;

const PART_CHARS = 24000;
const GAP_SECONDS = 120;
// A timestamp line: M:SS, MM:SS, H:MM:SS or HH:MM:SS, optionally wrapped in [], () or **, optional text after.
const TS_RE = /^(?:\*\*)?[\[(]?(\d{1,2}):([0-5]\d)(?::([0-5]\d))?[\])]?(?:\*\*)?(?:\s+(.+))?$/;
// Only whole-line bracketed notices that say material was removed. [laughter], [crosstalk] etc. stay text.
const REMOVAL_RE = /^\[(.*\b(?:removed|redacted|omitted|withheld|cut from|edited out)\b.*)\]$/i;

class InputError extends Error {}

const blockId = (i) => `B${String(i + 1).padStart(4, '0')}`;
const squash = (s) => s.replace(/\s+/g, ' ').trim();
const pad2 = (n) => String(n).padStart(2, '0');
const fmtDuration = (sec) => (sec >= 60 ? `${Math.floor(sec / 60)}m${pad2(sec % 60)}s` : `${sec}s`);
const stamp = (d = new Date()) =>
  `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;

function parseTranscript(raw) {
  const lines = raw.replace(/^﻿/, '').split(/\r?\n/);
  const hasTimestamps = lines.some((l) => TS_RE.test(l.trim()));
  const blocks = [];
  const timestampLabels = [];
  const formats = { 'MM:SS': 0, 'HH:MM:SS': 0 };
  let cur = null;
  let prevBlank = true;
  let lastSeconds = -1;
  const flush = () => {
    if (cur && cur.parts.length) blocks.push(cur);
    cur = null;
  };

  lines.forEach((rawLine, i) => {
    const line = i + 1;
    const t = rawLine.trim();
    if (/^(```|~~~)/.test(t)) return; // wrapper fences carry no content
    if (!t) {
      prevBlank = true;
      if (!hasTimestamps) flush(); // paragraph mode
      return;
    }
    const wasBlank = prevBlank;
    prevBlank = false;

    if (REMOVAL_RE.test(t)) {
      if (cur && cur.kind === 'timed' && !cur.parts.length) {
        // Notice is the only text under a timestamp: the removal keeps that label.
        blocks.push({ ...cur, kind: 'removal', line, parts: [t] });
        cur = null;
      } else {
        flush();
        blocks.push({ kind: 'removal', label: null, seconds: null, line, parts: [t] });
      }
      return;
    }

    const m = hasTimestamps ? t.match(TS_RE) : null;
    if (m) {
      const [, a, b, c, rest] = m;
      const seconds = c ? +a * 3600 + +b * 60 + +c : +a * 60 + +b;
      // Text on the same line only starts a block at a paragraph start and in time order.
      if (!rest || (wasBlank && seconds >= lastSeconds)) {
        flush();
        const label = c ? `${a}:${b}:${c}` : `${a}:${b}`;
        formats[c ? 'HH:MM:SS' : 'MM:SS'] += 1;
        timestampLabels.push(label);
        lastSeconds = seconds;
        cur = { kind: 'timed', label, seconds, line, parts: rest ? [rest] : [] };
        return;
      }
    }
    if (!cur) {
      const kind = hasTimestamps && !timestampLabels.length ? 'preamble' : 'untimed';
      cur = { kind, label: null, seconds: null, line, parts: [] };
    }
    cur.parts.push(t);
  });
  flush();

  const out = blocks.map((b, i) => ({
    id: blockId(i),
    kind: b.kind,
    label: b.label,
    seconds: b.seconds,
    line: b.line,
    text: squash(b.parts.join(' ')),
  }));

  const warnings = [];
  if (!hasTimestamps) warnings.push('No timestamps found: blocks are paragraphs, cited by block ID and line number only.');

  for (const [i, b] of out.entries()) {
    if (b.kind !== 'removal') continue;
    const prev = b.seconds !== null ? b : out.slice(0, i).reverse().find((x) => x.seconds !== null);
    const next = out.slice(i + 1).find((x) => x.seconds !== null);
    if (prev && next) b.gap = { from: prev.label, to: next.label, seconds: next.seconds - prev.seconds };
  }

  const timedIdx = out.flatMap((b, i) => (b.seconds !== null ? [i] : []));
  const unexplainedGaps = [];
  const backwardJumps = [];
  for (let k = 1; k < timedIdx.length; k++) {
    const x = out[timedIdx[k - 1]];
    const y = out[timedIdx[k]];
    const d = y.seconds - x.seconds;
    if (d < 0) backwardJumps.push({ from: x.label, to: y.label, fromId: x.id, toId: y.id });
    const explained = x.kind === 'removal' || out.slice(timedIdx[k - 1] + 1, timedIdx[k]).some((z) => z.kind === 'removal');
    if (d > GAP_SECONDS && !explained) unexplainedGaps.push({ from: x.label, to: y.label, seconds: d, fromId: x.id, toId: y.id });
  }
  if (backwardJumps.length) warnings.push(`${backwardJumps.length} timestamp(s) go backwards; check block order before citing.`);

  const labelCounts = {};
  for (const l of timestampLabels) labelCounts[l] = (labelCounts[l] || 0) + 1;
  const kinds = {};
  for (const b of out) kinds[b.kind] = (kinds[b.kind] || 0) + 1;

  const parts = [];
  let acc = 0;
  for (const b of out) {
    if (!parts.length || acc >= PART_CHARS) {
      parts.push({ part: parts.length + 1, first: b.id, last: b.id, blocks: 0 });
      acc = 0;
    }
    const p = parts.at(-1);
    p.last = b.id;
    p.blocks += 1;
    b.part = p.part;
    acc += b.text.length;
  }
  for (const p of parts) {
    const labelled = out.filter((b) => b.part === p.part && b.label);
    p.from = labelled[0]?.label ?? null;
    p.to = labelled.at(-1)?.label ?? null;
  }

  const labelled = out.filter((b) => b.label);
  const stats = {
    blocks: out.length,
    kinds,
    timestampLines: timestampLabels.length,
    formats,
    range: labelled.length ? `${labelled[0].label}–${labelled.at(-1).label}` : 'none',
    repeatedLabels: Object.entries(labelCounts)
      .filter(([, n]) => n > 1)
      .map(([label, count]) => ({ label, count })),
    removals: out.filter((b) => b.kind === 'removal').length,
    unexplainedGaps,
    backwardJumps,
  };
  return { stats, warnings, parts, blocks: out };
}

function indexMarkdown(index) {
  const { source, stats, parts, blocks, warnings } = index;
  const gapText = (g) => `${g.from}→${g.to} (${fmtDuration(g.seconds)})`;
  const row = (b) => {
    const text = b.kind === 'removal'
      ? `[REMOVED — do not cite or infer content${b.gap ? `; gap ${gapText(b.gap)}` : ''}] ${b.text}`
      : b.text;
    return `${b.id} | ${b.label ?? b.kind} | L${b.line} | ${text}`;
  };
  const removalLines = blocks
    .filter((b) => b.kind === 'removal')
    .map((b) => `- ${b.id} (line ${b.line})${b.gap ? `: gap ${gapText(b.gap)}` : ''} — ${b.text}`);
  const gapLines = stats.unexplainedGaps.map((g) => `- ${g.fromId} → ${g.toId}: ${gapText(g)}`);
  const sections = parts.map((p) => [
    `## Part ${p.part} of ${parts.length} · ${p.from ?? '—'}–${p.to ?? '—'}`,
    '',
    ...blocks.filter((b) => b.part === p.part).map(row),
    '',
  ]);
  const head = (ranges) => [
    '# Transcript index',
    '',
    `Source: ${source.path} · ${source.bytes} bytes · sha256 ${source.sha256}`,
    `Blocks: ${stats.blocks} (${Object.entries(stats.kinds).map(([k, n]) => `${k} ${n}`).join(', ')}) · ` +
      `timestamp lines: ${stats.timestampLines} (MM:SS ${stats.formats['MM:SS']}, HH:MM:SS ${stats.formats['HH:MM:SS']}) · range ${stats.range}`,
    `Repeated timestamp labels: ${stats.repeatedLabels.length}. Cite block IDs (e.g. B0123), never bare timestamps.`,
    'Row format: block ID | timestamp | source line | text',
    '',
    'Removed material (preserved as gaps; never cite or infer what it contained):',
    ...(removalLines.length ? removalLines : ['- none']),
    '',
    'Unexplained gaps over 2 minutes (do not assume content):',
    ...(gapLines.length ? gapLines : ['- none']),
    ...(warnings.length ? ['', 'Warnings:', ...warnings.map((w) => `- ${w}`)] : []),
    '',
    '## Parts: read every part and write one coverage line per part',
    '',
    '| Part | Blocks | Time range | Index file lines |',
    '| --- | --- | --- | --- |',
    ...parts.map((p, i) => `| ${p.part} | ${p.first}–${p.last} | ${p.from ?? '—'}–${p.to ?? '—'} | ${ranges[i]} |`),
    '',
  ];
  let lineNo = head(parts.map(() => '')).length + 1;
  const ranges = sections.map((s) => {
    const start = lineNo + 2; // heading, blank, then rows
    lineNo += s.length;
    return `${start}–${lineNo - 2}`;
  });
  parts.forEach((p, i) => (p.indexLines = ranges[i]));
  return [...head(ranges), ...sections.flat()].join('\n') + '\n';
}

function cmdIndex(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { 'out-root': { type: 'string', default: 'power-play-output' } },
  });
  const file = positionals[0];
  if (!file) throw new InputError('index needs a transcript path.');
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    throw new InputError(`Transcript not found: ${file}`);
  }
  if (!stat.isFile()) throw new InputError(`Not a file: ${file}`);
  const buf = fs.readFileSync(file);
  const raw = buf.toString('utf8');
  if (!raw.trim()) throw new InputError(`Transcript is empty: ${file}`);
  const parsed = parseTranscript(raw);
  if (!parsed.blocks.length) throw new InputError(`No readable text found in: ${file}`);
  if (raw.includes('�')) parsed.warnings.push('File has bytes that are not valid UTF-8; they were replaced with U+FFFD.');

  const stem = path.basename(file).replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-') || 'transcript';
  let runDir = path.join(values['out-root'], `${stem}-${stamp()}`);
  for (let n = 2; fs.existsSync(runDir); n++) runDir = path.join(values['out-root'], `${stem}-${stamp()}-${n}`);
  try {
    fs.mkdirSync(runDir, { recursive: true });
  } catch (e) {
    // Upload folders and connected folders can be read-only; say so instead of dumping a stack trace.
    throw new InputError(
      `Output location is not writable: ${values['out-root']} (${e.code ?? e.message}). Rerun with --out-root pointing to a writable folder.`,
    );
  }

  const index = {
    version: 1,
    generated: new Date().toISOString(),
    source: { path: file, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') },
    ...parsed,
  };
  const md = indexMarkdown(index); // also fills parts[].indexLines
  fs.writeFileSync(path.join(runDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  fs.writeFileSync(path.join(runDir, 'transcript-index.md'), md);

  const s = index.stats;
  console.log(`Run folder: ${runDir}`);
  console.log(`Index: ${path.join(runDir, 'transcript-index.md')}`);
  console.log(
    `Blocks ${s.blocks} · timestamp lines ${s.timestampLines} · repeated labels ${s.repeatedLabels.length} · ` +
      `removed segments ${s.removals} · unexplained gaps ${s.unexplainedGaps.length} · range ${s.range}`,
  );
  console.log('Parts (read every one):');
  for (const p of index.parts) {
    console.log(`  Part ${p.part}: ${p.first}–${p.last}, ${p.from ?? '—'}–${p.to ?? '—'}, index lines ${p.indexLines}`);
  }
  for (const w of index.warnings) console.log(`WARN ${w}`);
  console.log(`Next: write ${path.join(runDir, 'power-play.json')}, then run check ${runDir}`);
  return 0;
}

const STATUS_COUNTS = { complete: [3, 3], incomplete: [1, 2], insufficient: [0, 0] };
const EVIDENCE = ['demonstrated', 'explained', 'reported', 'planned-or-failed'];
const DECISIONS = ['selected', 'rejected'];
const PLAY_TEXT_FIELDS = ['name', 'promise', 'tldr', 'why_it_matters', 'prompt', 'check'];
const BLOCK_ID_RE = /\bB\d{4}\b/;
const PLACEHOLDER_RES = [/\[[^\]\n]{1,60}\]/, /<[^>\n]{1,40}>/, /\{\{[^}\n]*\}\}/, /\b(?:TODO|TBD|INSERT|XXX)\b/];
// Unambiguous dependencies on the Strategy Lab itself (errors in prompts).
const LAB_DEPENDENCY_RE = /\b(?:strategy lab|hot seats?|(?:class|session|lab) notes|(?:the|this|today['’]s|this week['’]s) lab)\b/i;
// References that may point at the session instead of the reader's own material (warnings for editorial review).
const AMBIGUOUS_RES = [
  /\b(?:this|that|the|today['’]s) (?:transcript|session|class|call|recording|demo|replay)\b(?! (?:of|from|with) (?:my|our|your)\b| (?:below|above|i|you|we)\b)/i,
  /\bas (?:discussed|mentioned|shown)\b/i,
  /\bthe (?!(?:following|above|below|attached)\b)(?:[\w'’-]+ ){1,4}(?:guide|template|portal|library|playbook|framework)\b/i,
];
const NUMERIC_RE = /\$\s?\d|\b\d+(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?\s?(?:x|seconds?|mins?|minutes?|hours?|hrs?|days?|weeks?|months?|years?)\b/i;
// Text that asserts the reader has already adopted something the play introduces (a proposal dressed as her decision).
const ASSUMED_RE = /\b(?:(?:since|as|because|now that) you(?:'ve| have)? already\b|you(?:'ve| have) already (?:decided|chosen|set|adopted|agreed)|you(?:'ve| have) (?:decided|chosen|adopted) (?:on |to )?(?:a|the|your)\b)/i;
// A check that rejects wording instead of judging behaviour.
const WORDING_RE = /\bif (?:it|the (?:output|result|table|list|reply|draft)) (?:says|uses|mentions|contains|includes) (?:the (?:word|phrase)|["“'])|\b(?:should not|shouldn't|must not|never) (?:contain|use|include|mention) the (?:word|phrase)\b/i;
const JARGON_RE = /\b(?:API|MCP|CLI|terminal|command line|JSON|repo|VPS|virtual machine|cron|webhook|SDK)\b/i;

const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const normalizeText = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sentenceCount = (s) =>
  s.trim().split(/(?<=[.!?]["'’”)\]]?)\s+(?=["'‘“(\[]?[A-Z0-9])/).filter((x) => /[a-z0-9]/i.test(x)).length;
const stringList = (v) => Array.isArray(v) && v.every(nonEmpty);

function validate(draft, index) {
  const errors = [];
  const warnings = []; // { category, where, msg }
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (category, where, msg) => warnings.push({ category, where, msg });
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    err('power-play.json', 'must be a JSON object');
    return { errors, warnings };
  }

  const byId = new Map(index.blocks.map((b, i) => [b.id, { ...b, i }]));
  const blockRef = (where, id) => {
    const b = byId.get(id);
    if (!b) err(where, `unknown block ${JSON.stringify(id)}`);
    else if (b.kind === 'removal') err(where, `${id} is a removal notice; removed material cannot be cited`);
    else if (b.kind === 'preamble') err(where, `${id} is the transcript preamble, not session content`);
    else return b;
    return null;
  };
  // Checks for any text the reader sees, except the prompt (which has stricter rules below).
  const readerText = (where, t) => {
    if (!nonEmpty(t)) return;
    if (BLOCK_ID_RE.test(t)) err(where, 'contains a block ID; keep citations in the notes');
    const ref = t.match(LAB_DEPENDENCY_RE) ?? AMBIGUOUS_RES.map((re) => t.match(re)).find(Boolean);
    if (ref) warn('ambiguous', where, `"${ref[0]}" refers to the session; the reader may not have seen it`);
    const num = t.match(NUMERIC_RE);
    if (num) warn('numeric', where, `"${num[0]}": confirm this number is in the source or remove it`);
    const jargon = t.match(JARGON_RE);
    if (jargon) warn('jargon', where, `"${jargon[0]}" may be too technical for the reader`);
    const assumed = t.match(ASSUMED_RE);
    if (assumed) warn('assumed', where, `"${assumed[0]}": asserts the reader already adopted something; keep her supplied decisions and present the play's own suggestions as proposals`);
  };

  const status = draft.status;
  const plays = Array.isArray(draft.plays) ? draft.plays : [];
  const candidates = Array.isArray(draft.candidates) ? draft.candidates : [];
  if (draft.plays !== undefined && !Array.isArray(draft.plays)) err('plays', 'must be an array');
  if (!Array.isArray(draft.candidates)) err('candidates', 'must be an array listing every candidate considered');
  if (!STATUS_COUNTS[status]) {
    err('status', `must be one of ${Object.keys(STATUS_COUNTS).join(', ')}`);
  } else {
    const [min, max] = STATUS_COUNTS[status];
    if (plays.length < min || plays.length > max) {
      err('status', `"${status}" needs ${min === max ? min : `${min}–${max}`} play(s), found ${plays.length}`);
    }
    if (status !== 'complete' && !nonEmpty(draft.status_reason)) err('status_reason', `required when status is "${status}"`);
  }
  if (plays.length && !nonEmpty(draft.title)) err('title', 'required');
  readerText('title', draft.title);

  const coverage = Array.isArray(draft.coverage) ? draft.coverage : [];
  for (const p of index.parts) {
    if (!coverage.some((c) => c && c.part === p.part && nonEmpty(c.summary))) {
      err('coverage', `missing summary for part ${p.part} (${p.first}–${p.last})`);
    }
  }
  (Array.isArray(draft.normalizations) ? draft.normalizations : []).forEach((n, i) => {
    for (const id of n?.blocks ?? []) blockRef(`normalizations[${i}]`, id);
  });

  const candById = new Map();
  candidates.forEach((c, i) => {
    const where = `candidates[${i}]${c?.id ? ` (${c.id})` : ''}`;
    if (!c || typeof c !== 'object') return err(where, 'must be an object');
    if (!nonEmpty(c.id)) err(where, 'id is required');
    else if (candById.has(c.id)) err(where, `duplicate id ${c.id}`);
    else candById.set(c.id, c);
    if (!nonEmpty(c.title)) err(where, 'title is required');
    if (!EVIDENCE.includes(c.evidence)) err(where, `evidence must be one of ${EVIDENCE.join(', ')}`);
    if (!DECISIONS.includes(c.decision)) err(where, 'decision must be "selected" or "rejected"');
    if (!nonEmpty(c.reason)) err(where, 'reason is required');
    if (!Array.isArray(c.blocks) || !c.blocks.length) err(where, 'blocks must list at least one supporting block');
    else c.blocks.forEach((id) => blockRef(where, id));
  });

  const seenNames = new Map();
  const seenPrompts = new Map();
  const usedCandidates = new Set();
  plays.forEach((p, i) => {
    const where = `play #${i + 1}`;
    if (!p || typeof p !== 'object') return err(where, 'must be an object');
    for (const f of ['candidate', ...PLAY_TEXT_FIELDS]) if (!nonEmpty(p[f])) err(where, `${f} is required`);
    for (const f of ['name', 'promise']) if (nonEmpty(p[f]) && p[f].trim().includes('\n')) err(where, `${f} must be one line`);
    if (nonEmpty(p.tldr) && sentenceCount(p.tldr) > 2) err(where, `tldr has ${sentenceCount(p.tldr)} sentences (max 2)`);
    if (p.before_you_start !== undefined && !stringList(p.before_you_start)) err(where, 'before_you_start must be a list of non-empty strings');
    if (Array.isArray(p.before_you_start) && p.before_you_start.length > 3) {
      warn('length', `${where} before_you_start`, `${p.before_you_start.length} items (aim for 3 or fewer; only what the prompt needs)`);
    }

    if (nonEmpty(p.candidate)) {
      const cand = candById.get(p.candidate);
      if (!cand) err(where, `candidate ${p.candidate} is not in candidates`);
      else {
        if (cand.decision !== 'selected') err(where, `candidate ${p.candidate} is not marked "selected"`);
        if (cand.evidence === 'planned-or-failed') err(where, `candidate ${p.candidate} rests only on a planned or failed demo`);
      }
      if (usedCandidates.has(p.candidate)) err(where, `candidate ${p.candidate} is already used by another play`);
      usedCandidates.add(p.candidate);
      // The notes' selection record must cover everything the article cites.
      if (cand && Array.isArray(cand.blocks) && Array.isArray(p.sources)) {
        const missing = [...new Set(p.sources.map((s) => s?.block).filter((b) => nonEmpty(b) && !cand.blocks.includes(b)))];
        if (missing.length) err(where, `cites ${missing.join(', ')} but candidate ${p.candidate}.blocks does not list ${missing.length > 1 ? 'them' : 'it'}; keep the candidate record in step with the article`);
      }
    }
    for (const [seen, f] of [[seenNames, 'name'], [seenPrompts, 'prompt']]) {
      if (!nonEmpty(p[f])) continue;
      const key = normalizeText(p[f]);
      if (seen.has(key)) err(where, `same ${f} as play #${seen.get(key)}`);
      seen.set(key, i + 1);
    }

    if (!Array.isArray(p.sources) || !p.sources.length) {
      err(where, 'sources must cite at least one block with a quote');
    } else {
      p.sources.forEach((s, k) => {
        const sw = `${where} sources[${k}]`;
        const b = blockRef(sw, s?.block);
        if (!nonEmpty(s?.quote)) return err(sw, 'quote is required');
        if (words(s.quote) < 4) warn('source', sw, 'quote is under 4 words; weak evidence');
        if (!b) return;
        const next = index.blocks[b.i + 1];
        const nextText = next && next.kind !== 'removal' ? next.text : '';
        if (!normalizeText(`${b.text} ${nextText}`).includes(normalizeText(s.quote))) {
          err(sw, `quote not found in ${b.id}${nextText ? ` or ${next.id}` : ''}; copy the words exactly from the index`);
        }
      });
    }

    if (nonEmpty(p.prompt)) {
      if (BLOCK_ID_RE.test(p.prompt)) err(where, 'prompt contains a block ID');
      const ph = PLACEHOLDER_RES.map((re) => p.prompt.match(re)).find(Boolean);
      if (ph) err(where, `prompt has a placeholder ${JSON.stringify(ph[0])}; have the AI ask the reader for it instead`);
      const dep = p.prompt.match(LAB_DEPENDENCY_RE);
      if (dep) err(where, `prompt depends on the Strategy Lab itself ("${dep[0]}"); it must run without the session`);
      for (const re of AMBIGUOUS_RES) {
        const m = p.prompt.match(re);
        if (m) warn('ambiguous', `${where} prompt`, `"${m[0]}" may point at the session rather than the reader's own material`);
      }
      if (words(p.prompt) > 200) warn('length', `${where} prompt`, `${words(p.prompt)} words (aim for 200 or fewer)`);
      const assumed = p.prompt.match(ASSUMED_RE);
      if (assumed) warn('assumed', `${where} prompt`, `"${assumed[0]}": tells the AI the reader already adopted something; use her stated decisions and label the prompt's own suggestions as suggestions`);
    }
    const shown = [['name', p.name], ['promise', p.promise], ['tldr', p.tldr], ['why_it_matters', p.why_it_matters], ['check', p.check]];
    if (Array.isArray(p.before_you_start)) p.before_you_start.forEach((t, k) => shown.push([`before_you_start[${k}]`, t]));
    for (const [f, t] of shown) readerText(`${where} ${f}`, t);

    const long = (f, n, unit, limit) => n > limit && warn('length', `${where} ${f}`, `${n} ${unit} (aim for ${limit} or fewer)`);
    if (nonEmpty(p.promise)) long('promise', p.promise.length, 'characters', 110);
    if (nonEmpty(p.name)) long('name', words(p.name), 'words', 8);
    if (nonEmpty(p.tldr)) long('tldr', words(p.tldr), 'words', 45);
    if (nonEmpty(p.why_it_matters)) long('why_it_matters', words(p.why_it_matters), 'words', 70);
    if (nonEmpty(p.check)) long('check', words(p.check), 'words', 70);
    if (nonEmpty(p.check) && words(p.check) < 8) warn('vague', `${where} check`, 'under 8 words; say exactly what to look for');
    if (nonEmpty(p.check)) {
      const wording = p.check.match(WORDING_RE);
      if (wording) warn('wording', `${where} check`, `"${wording[0]}": the check rejects wording; test the behaviour instead (for example "no deletions are proposed")`);
    }
  });

  const selected = candidates.filter((c) => c?.decision === 'selected').length;
  if (selected !== plays.length) err('candidates', `${selected} marked "selected" but ${plays.length} play(s) written`);
  if (status === 'complete' && !nonEmpty(draft.through_line)) err('through_line', 'required for a complete Power Play');
  if (nonEmpty(draft.through_line)) {
    readerText('through_line', draft.through_line);
    if (words(draft.through_line) > 90) warn('length', 'through_line', `${words(draft.through_line)} words (aim for 90 or fewer)`);
  }
  if (nonEmpty(draft.title) && words(draft.title) > 10) warn('length', 'title', `${words(draft.title)} words (aim for 3-8, outcome-focused)`);
  validateReview(draft, plays.length, err, warn);
  return { errors, warnings };
}

// The review record: code checks that it is complete and internally consistent, not that it is right.
const PLAY_CHECKS = ['claims', 'scope', 'caveat_coverage', 'unresolved_info', 'retire_by_use', 'score_as_proof', 'intake', 'internal_resource', 'naming', 'dry_run', 'concise', 'check_alignment'];
const ARTICLE_CHECKS = ['title', 'through_line', 'tone', 'class_recap', 'notes_agreement'];
const NA_ALLOWED = new Set(['retire_by_use', 'score_as_proof', 'naming', 'unresolved_info', 'through_line']);
const CHECK_VALUES = ['pass', 'fixed', 'unresolved', 'n/a'];
const FINDING_STATUS = ['fixed', 'replaced', 'unresolved'];
const EXECUTION_CLAIM_RE = /\b(?:ran|executed|tested|verified) (?:it|this|the prompts?) in\b|\bactually (?:ran|executed|tested)\b/i;
const FICTIONAL_RE = /\b(?:fictional|invented|made[- ]up|imaginary)\b/i;

function validateReview(draft, playCount, err, warn) {
  const review = draft.review;
  if (playCount === 0) {
    if (review !== undefined && (typeof review !== 'object' || Array.isArray(review))) err('review', 'must be an object');
    return;
  }
  if (!review || typeof review !== 'object' || Array.isArray(review)) {
    return err('review', 'required: the review stage record (rounds, checks, findings, dry_runs); see SKILL.md step 6');
  }
  if (!Number.isInteger(review.rounds) || review.rounds < 1 || review.rounds > 3) err('review.rounds', 'must be 1, 2, or 3');

  const findings = Array.isArray(review.findings) ? review.findings : [];
  if (!Array.isArray(review.findings)) err('review.findings', 'must be an array (empty when nothing was found)');
  const byKey = new Map(); // "play:rule" -> findings
  findings.forEach((f, i) => {
    const where = `review.findings[${i}]${f?.id ? ` (${f.id})` : ''}`;
    if (!f || typeof f !== 'object') return err(where, 'must be an object');
    const article = f.play === 0;
    if (!Number.isInteger(f.play) || f.play < 0 || f.play > playCount) err(where, `play must be 0 (article) or 1-${playCount}`);
    const rules = article ? ARTICLE_CHECKS : PLAY_CHECKS;
    if (!rules.includes(f.rule)) err(where, `rule must be one of ${rules.join(', ')}${article ? ' (article-level)' : ''}`);
    for (const k of ['text', 'evidence', 'correction']) if (!nonEmpty(f[k])) err(where, `${k} is required (quote the affected text, give the evidence, state the correction)`);
    if (!FINDING_STATUS.includes(f.status)) err(where, `status must be one of ${FINDING_STATUS.join(', ')}`);
    if (f.status === 'unresolved') {
      if (typeof f.blocking !== 'boolean') err(where, 'blocking (true/false) is required for an unresolved finding');
      else if (f.blocking) err(where, `blocking unresolved finding on ${article ? 'the article' : `play #${f.play}`}: replace the candidate or drop the play; a known material defect cannot ship`);
    }
    const key = `${f.play}:${f.rule}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(f);
  });

  const checks = review.checks && typeof review.checks === 'object' && !Array.isArray(review.checks) ? review.checks : null;
  if (!checks) err('review.checks', 'required: an "article" entry and one entry per play ("1", "2", ...)');
  const targets = [['article', 0, ARTICLE_CHECKS]];
  for (let n = 1; n <= playCount; n++) targets.push([String(n), n, PLAY_CHECKS]);
  for (const [key, play, rules] of targets) {
    const entry = checks?.[key];
    const where = `review.checks.${key}`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      if (checks) err(where, `missing (${rules.join(', ')})`);
      continue;
    }
    for (const rule of rules) {
      const v = entry[rule];
      const rw = `${where}.${rule}`;
      if (!CHECK_VALUES.includes(v)) {
        err(rw, `must be one of ${CHECK_VALUES.join(', ')}`);
        continue;
      }
      if (v === 'n/a' && !NA_ALLOWED.has(rule)) err(rw, 'n/a is not allowed for this check; mark pass, fixed, or unresolved');
      if (v === 'n/a' && rule === 'through_line' && draft.status === 'complete') err(rw, 'n/a only when the draft is incomplete');
      const related = byKey.get(`${play}:${rule}`) ?? [];
      const fixed = related.filter((f) => f.status === 'fixed' || f.status === 'replaced');
      const open = related.filter((f) => f.status === 'unresolved');
      if (v === 'fixed' && !fixed.length) err(rw, 'marked fixed but no fixed/replaced finding records what changed');
      if (v === 'unresolved' && !open.length) err(rw, 'marked unresolved but no unresolved finding describes the issue');
      if ((v === 'pass' || v === 'n/a') && related.length) err(rw, `marked ${v} but finding(s) exist for it: ${related.map((f) => f.id ?? '?').join(', ')}`);
      if (v === 'fixed' && open.length) err(rw, 'marked fixed but an unresolved finding remains; mark unresolved');
    }
  }

  const dryRuns = Array.isArray(review.dry_runs) ? review.dry_runs : [];
  if (!Array.isArray(review.dry_runs)) err('review.dry_runs', 'must be an array with one reasoned walkthrough per play');
  const seenPlays = new Set();
  dryRuns.forEach((d, i) => {
    const where = `review.dry_runs[${i}]`;
    if (!d || typeof d !== 'object') return err(where, 'must be an object');
    if (!Number.isInteger(d.play) || d.play < 1 || d.play > playCount) err(where, `play must be 1-${playCount}`);
    else if (seenPlays.has(d.play)) err(where, `play #${d.play} already has a dry-run`);
    else seenPlays.add(d.play);
    if (d.kind !== 'reasoned-walkthrough') err(where, 'kind must be "reasoned-walkthrough"; dry-runs are reasoning, not execution');
    if (!nonEmpty(d.input)) err(where, 'input is required: describe the fictional input used');
    else if (!FICTIONAL_RE.test(d.input)) err(where, 'input must be described as fictional/invented so it is never mistaken for real data');
    if (!stringList(d.expected) || !d.expected.length) err(where, 'expected must list at least one concrete property of the output');
    if (!['pass', 'fixed', 'unresolved'].includes(d.result)) err(where, 'result must be pass, fixed, or unresolved');
    const claim = [d.input, d.notes, ...(Array.isArray(d.expected) ? d.expected : [])].filter(nonEmpty).map((t) => t.match(EXECUTION_CLAIM_RE)).find(Boolean);
    if (claim) err(where, `"${claim[0]}" claims an execution; a dry-run is a reasoned walkthrough and must say so`);
  });
  for (let n = 1; n <= playCount; n++) if (!seenPlays.has(n)) err('review.dry_runs', `no dry-run recorded for play #${n}`);
  if (review.rounds === 1 && findings.some((f) => f.status !== 'unresolved')) {
    warn('review', 'review.rounds', 'fixes were made in round 1 but no round 2 recheck is recorded');
  }
}

function loadRun(runDir) {
  if (!runDir) throw new InputError('Give the run folder printed by the index command.');
  const indexPath = path.join(runDir, 'index.json');
  if (!fs.existsSync(indexPath)) throw new InputError(`No index.json in ${runDir}; run the index command first.`);
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const draftPath = path.join(runDir, 'power-play.json');
  const fail = (msg) => ({ index, draft: null, result: { errors: [`power-play.json: ${msg}`], warnings: [] } });
  if (!fs.existsSync(draftPath)) return fail(`not found in ${runDir}`);
  let draft;
  try {
    draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  } catch (e) {
    return fail(`invalid JSON (${e.message})`);
  }
  return { index, draft, result: validate(draft, index) };
}

function printResult({ errors, warnings }, draft) {
  for (const e of errors) console.log(`ERROR ${e}`);
  for (const w of warnings) console.log(`WARN  [${w.category}] ${w.where}: ${w.msg}`);
  console.log(
    errors.length
      ? `check: FAIL (${errors.length} error(s), ${warnings.length} warning(s))`
      : `check: PASS (${warnings.length} warning(s))`,
  );
  const findings = Array.isArray(draft?.review?.findings) ? draft.review.findings : [];
  if (findings.length || draft?.review) {
    const count = (s) => findings.filter((f) => f?.status === s).length;
    console.log(`review record: ${findings.length} finding(s): ${count('fixed')} fixed, ${count('replaced')} replaced, ${count('unresolved')} unresolved`);
  }
}

function cmdCheck(args) {
  const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
  const { draft, result } = loadRun(positionals[0]);
  printResult(result, draft);
  return result.errors.length ? 1 : 0;
}

const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const cell = (v) => str(v).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
const longestTicks = (s) => Math.max(0, ...(s.match(/`+/g) ?? []).map((m) => m.length));

function renderPowerPlay(draft, forced, result) {
  const plays = arr(draft.plays).filter((p) => p && typeof p === 'object');
  const n = plays.length;
  const out = [`# Power Play: ${str(draft.title) || 'Untitled draft'}`, ''];
  if (forced) out.push(`> **VALIDATION FAILED: not ready to publish.** ${result.errors.length} problem(s) remain; see editorial-notes.md.`, '');
  if (draft.status === 'incomplete') {
    out.push(`> **Incomplete draft:** this session supported ${n} of the three quick wins a Power Play needs. ${str(draft.status_reason)}`, '');
  }
  out.push(`**${n === 3 ? 'Three quick wins' : n === 1 ? 'One quick win' : `${n} quick wins`}:**`, '');
  for (const p of plays) out.push(`- **${str(p.name)}:** ${str(p.promise)}`);
  out.push('', '---', '');
  plays.forEach((p, i) => {
    const prompt = str(p.prompt);
    const fence = '`'.repeat(Math.max(3, longestTicks(prompt) + 1));
    out.push(`## #${i + 1}: ${str(p.name)}`, '', `*${str(p.promise)}*`, '');
    out.push(`**TL;DR:** ${str(p.tldr)}`, '', `**Why it matters:** ${str(p.why_it_matters)}`, '');
    if (arr(p.before_you_start).length) out.push('**Before you start:**', '', ...arr(p.before_you_start).map((t) => `- ${str(t)}`), '');
    out.push('**Copy this prompt:**', '', `${fence}text`, prompt, fence, '');
    out.push(`**How to tell it worked:** ${str(p.check)}`, '', '---', '');
  });
  if (nonEmpty(draft.through_line)) out.push('## The through-line', '', str(draft.through_line), '');
  return out.join('\n');
}

function renderInsufficient(draft, forced, result) {
  const cands = arr(draft.candidates).filter((c) => c && typeof c === 'object');
  return [
    '# Power Play not produced: not enough supported material',
    '',
    ...(forced ? [`> **VALIDATION FAILED.** ${result.errors.length} problem(s) remain; see editorial-notes.md.`, ''] : []),
    str(draft.status_reason) || 'No candidate met the quality bar for a quick win.',
    '',
    '## What the session contained',
    '',
    ...(cands.length
      ? cands.map((c) => `- **${str(c.title)}** (${str(c.evidence)}): ${str(c.reason)}`)
      : ['- No candidate teaching moments were recorded.']),
    '',
    'Sources and details are in editorial-notes.md.',
    '',
  ].join('\n');
}

function renderNotes(draft, index, result, forced, outputName) {
  const plays = arr(draft.plays).filter((p) => p && typeof p === 'object');
  const cands = arr(draft.candidates).filter((c) => c && typeof c === 'object');
  const candById = new Map(cands.map((c) => [c.id, c]));
  const blockById = new Map(index.blocks.map((b) => [b.id, b]));
  const cite = (id) => {
    const b = blockById.get(id);
    return b ? `${b.label ? `\`${b.label}\` ` : ''}(${b.id}, line ${b.line})` : `${str(id)} (unknown block)`;
  };
  const field = (label, v) => (nonEmpty(v) ? [`- ${label}: ${v.trim()}`] : []);
  const s = index.stats;
  const review = draft.review && typeof draft.review === 'object' && !Array.isArray(draft.review) ? draft.review : null;
  const findings = arr(review?.findings).filter((f) => f && typeof f === 'object');
  const unresolved = findings.filter((f) => f.status === 'unresolved');
  const repaired = findings.filter((f) => f.status === 'fixed' || f.status === 'replaced');
  const dryRuns = arr(review?.dry_runs).filter((d) => d && typeof d === 'object');
  const coverage = new Map(arr(draft.coverage).map((c) => [c?.part, str(c?.summary)]));
  const removals = index.blocks.filter((b) => b.kind === 'removal');
  const rejected = cands.filter((c) => c.decision !== 'selected');
  const norms = arr(draft.normalizations);
  const playLabel = (n) => (n === 0 ? 'Article' : `Play #${n}${plays[n - 1] ? `, ${str(plays[n - 1].name)}` : ''}`);
  const findingLines = (f) => [
    `- **${playLabel(f.play)} · ${str(f.rule)}${nonEmpty(f.location) ? ` · ${str(f.location)}` : ''}**`,
    `  - Text: "${str(f.text)}"`,
    `  - Evidence: ${str(f.evidence)}`,
    `  - ${f.status === 'unresolved' ? 'What is missing and why it matters' : 'Correction'}: ${str(f.correction)}`,
  ];
  const mark = { pass: 'pass', fixed: 'fixed', unresolved: 'OPEN', 'n/a': 'n/a' };
  const matrixRow = (label, entry, rules) => `| ${label} | ${rules.map((r) => mark[entry?.[r]] ?? '?').join(' | ')} |`;

  const out = [
    `# Editorial notes: ${str(draft.title) || path.basename(index.source.path)}`,
    '',
    `Supporting material for \`${outputName}\`: what was checked and repaired, why each win was chosen, and how ambiguous source material was handled.`,
    '',
    `- Status: **${str(draft.status) || 'missing'}**${nonEmpty(draft.status_reason) ? `: ${str(draft.status_reason)}` : ''}`,
    `- Transcript: ${index.source.path} (${index.source.bytes} bytes, sha256 ${index.source.sha256.slice(0, 16)}…)`,
    `- Structural validation: ${forced ? `**FAILED** with ${result.errors.length} error(s); rendered with --force` : 'PASS'}; ${result.warnings.length} warning(s)`,
    `- Editorial review: ${review ? `${review.rounds ?? '?'} round(s); ${findings.length} finding(s): ${repaired.length} repaired, ${unresolved.length} unresolved` : 'no review record'}`,
    `- Rendered: ${new Date().toISOString()}`,
    '',
    '## Unresolved issues',
    '',
    ...(unresolved.length ? unresolved.flatMap(findingLines) : ["None. No operator action is needed before an editor's normal read."]),
    ...(result.errors.length ? ['', 'Validation errors still present:', ...result.errors.map((e) => `- ${e}`)] : []),
    '',
    '## Checks performed',
    '',
  ];
  if (review) {
    out.push(
      `| Play | ${PLAY_CHECKS.join(' | ')} |`,
      `| --- |${PLAY_CHECKS.map(() => ' --- |').join('')}`,
      ...plays.map((p, i) => matrixRow(`#${i + 1}`, review.checks?.[String(i + 1)], PLAY_CHECKS)),
      '',
      `| Article | ${ARTICLE_CHECKS.join(' | ')} |`,
      `| --- |${ARTICLE_CHECKS.map(() => ' --- |').join('')}`,
      matrixRow('whole', review.checks?.article, ARTICLE_CHECKS),
      '',
      'Prompt dry-runs: reasoned walkthroughs by the writing model with fictional inputs. **No prompt was executed in any external tool.**',
      '',
      ...(dryRuns.length
        ? dryRuns.flatMap((d) => [
            `- ${playLabel(d.play)}: ${str(d.result)}`,
            `  - Input: ${str(d.input)}`,
            ...arr(d.expected).map((e) => `  - Expected: ${str(e)}`),
            ...(nonEmpty(d.notes) ? [`  - Notes: ${str(d.notes)}`] : []),
          ])
        : ['- none recorded']),
      '',
    );
  } else {
    out.push('- No review record.', '');
  }
  out.push(
    'Validator warnings left in place:',
    '',
    ...(result.warnings.length ? result.warnings.map((w) => `- [${w.category}] ${w.where}: ${w.msg}`) : ['- none']),
    '',
    '## Repairs made',
    '',
    ...(repaired.length ? repaired.flatMap((f) => [...findingLines(f), `  - Status: ${f.status}`]) : ['None.']),
    '',
    '## Selected wins',
    '',
  );
  if (!plays.length) out.push('- none', '');
  plays.forEach((p, i) => {
    const c = candById.get(p.candidate) ?? {};
    out.push(
      `### #${i + 1}: ${str(p.name)}`,
      '',
      `- Candidate: ${str(p.candidate)} (${str(c.title)})`,
      ...field('Why selected', c.reason),
      ...field('Evidence', c.evidence),
      ...field('Owner problem', c.owner_problem),
      ...field('Inputs the reader supplies', c.inputs),
      ...field('Outcome', c.outcome),
      ...field('Prerequisites', c.prerequisites),
      ...field('Caveats, corrections, disagreement', c.caveats),
      '- Sources:',
      ...arr(p.sources).map((src) => `  - ${cite(src?.block)}: "${str(src?.quote)}"`),
      '',
    );
  });
  out.push(
    '## Candidates not selected',
    '',
    ...(rejected.length
      ? [
          '| ID | Candidate | Evidence | Blocks | Why not selected |',
          '| --- | --- | --- | --- | --- |',
          ...rejected.map((c) => `| ${cell(c.id)} | ${cell(c.title)} | ${cell(c.evidence)} | ${cell(arr(c.blocks).join(', '))} | ${cell(c.reason)} |`),
        ]
      : ['- none']),
    '',
    '## Ambiguous material handled',
    '',
    'Name normalizations (variants as transcribed → name used):',
    '',
    ...(norms.length
      ? norms.map((n) => `- ${arr(n?.variants).map((v) => `"${str(v)}"`).join(', ')} → "${str(n?.used_as)}" (${arr(n?.blocks).join(', ')})`)
      : ['- none']),
    '',
    'Removed material (preserved as gaps; not reviewed or inferred):',
    '',
    ...(removals.length
      ? removals.map((b) => `- ${b.id} (line ${b.line})${b.gap ? `: gap ${b.gap.from}→${b.gap.to} (${fmtDuration(b.gap.seconds)})` : ''}: ${b.text}`)
      : ['- none']),
    '',
    'Unexplained gaps over 2 minutes:',
    '',
    ...(s.unexplainedGaps.length
      ? s.unexplainedGaps.map((g) => `- ${g.fromId} → ${g.toId}: ${g.from}→${g.to} (${fmtDuration(g.seconds)})`)
      : ['- none']),
    '',
    '## Coverage',
    '',
    `Index: ${s.blocks} blocks, ${s.timestampLines} timestamp lines, range ${s.range}, ${s.repeatedLabels.length} repeated labels.`,
    '',
    '| Part | Blocks | Time range | What this part contains |',
    '| --- | --- | --- | --- |',
    ...index.parts.map((p) => `| ${p.part} | ${p.first}–${p.last} | ${p.from ?? '—'}–${p.to ?? '—'} | ${cell(coverage.get(p.part) || 'MISSING')} |`),
    '',
  );
  return out.join('\n');
}

// After rendering, the article and the notes must tell the same story. Both come from one JSON,
// so a disagreement means the JSON is inconsistent or a file was edited by hand.
function verifyAgreement(runDir, draft) {
  const problems = [];
  const insufficient = draft.status === 'insufficient' && !arr(draft.plays).length;
  const articleName = insufficient ? 'insufficient-material.md' : 'power-play.md';
  const articlePath = path.join(runDir, articleName);
  const notesPath = path.join(runDir, 'editorial-notes.md');
  if (!fs.existsSync(articlePath)) problems.push(`${articleName} is missing`);
  if (!fs.existsSync(notesPath)) problems.push('editorial-notes.md is missing');
  if (problems.length) return problems;
  const other = insufficient ? 'power-play.md' : 'insufficient-material.md';
  if (fs.existsSync(path.join(runDir, other))) problems.push(`both ${articleName} and ${other} exist; only one belongs to status "${draft.status}"`);
  const article = fs.readFileSync(articlePath, 'utf8');
  const notes = fs.readFileSync(notesPath, 'utf8');
  const articleWins = [...article.matchAll(/^## #(\d+): (.+)$/gm)].map((m) => `${m[1]}:${m[2].trim()}`);
  const notesWins = [...notes.matchAll(/^### #(\d+): (.+)$/gm)].map((m) => `${m[1]}:${m[2].trim()}`);
  const jsonWins = arr(draft.plays).map((p, i) => `${i + 1}:${str(p?.name)}`);
  if (articleWins.join('|') !== notesWins.join('|')) problems.push(`wins differ: article [${articleWins.join(', ')}] vs notes [${notesWins.join(', ')}]`);
  if (articleWins.join('|') !== jsonWins.join('|')) problems.push(`article wins [${articleWins.join(', ')}] do not match power-play.json [${jsonWins.join(', ')}]`);
  const notesStatus = (notes.match(/^- Status: \*\*(\w+)\*\*/m) || [])[1];
  if (notesStatus !== draft.status) problems.push(`status: notes say "${notesStatus}", power-play.json says "${draft.status}"`);
  if (/^> \*\*Incomplete draft:/m.test(article) !== (draft.status === 'incomplete')) problems.push('incomplete banner in the article does not match the status');
  if (/VALIDATION FAILED/.test(article) !== /Structural validation: \*\*FAILED\*\*/.test(notes)) problems.push('validation-failed banner differs between article and notes');
  const unresolvedJson = arr(draft.review?.findings).filter((f) => f?.status === 'unresolved').length;
  const section = notes.split('## Unresolved issues')[1]?.split('\n## ')[0] ?? '';
  const unresolvedNotes = (section.match(/^- \*\*/gm) || []).length;
  if (unresolvedNotes !== unresolvedJson) problems.push(`unresolved issues: notes list ${unresolvedNotes}, power-play.json has ${unresolvedJson}`);
  if (unresolvedJson === 0 && !/^None\./m.test(section)) problems.push('notes must say "None." when there are no unresolved findings');
  if (!insufficient) {
    const titleArticle = (article.match(/^# (?:Power Play: )?(.+)$/m) || [])[1]?.trim();
    const titleNotes = (notes.match(/^# Editorial notes: (.+)$/m) || [])[1]?.trim();
    if (titleArticle !== titleNotes) problems.push(`title differs: article "${titleArticle}" vs notes "${titleNotes}"`);
  }
  if (/\bB\d{4}\b/.test(article)) problems.push('block IDs appear in the article');
  if (/Before publishing|^- \[ \]/m.test(notes)) problems.push('notes contain a human checklist');
  return problems;
}

function cmdRender(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { force: { type: 'boolean', default: false } },
  });
  const runDir = positionals[0];
  const { index, draft, result } = loadRun(runDir);
  printResult(result);
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    console.log('render: nothing to render (power-play.json is missing or not a JSON object)');
    return 1;
  }
  if (result.errors.length && !values.force) {
    console.log('render: refused; fix the errors above, or rerun with --force after the repair limit');
    return 1;
  }
  const forced = result.errors.length > 0;
  const insufficient = draft.status === 'insufficient' && !arr(draft.plays).length;
  const outputName = insufficient ? 'insufficient-material.md' : 'power-play.md';
  fs.rmSync(path.join(runDir, insufficient ? 'power-play.md' : 'insufficient-material.md'), { force: true });
  const body = insufficient ? renderInsufficient(draft, forced, result) : renderPowerPlay(draft, forced, result);
  fs.writeFileSync(path.join(runDir, outputName), body);
  fs.writeFileSync(path.join(runDir, 'editorial-notes.md'), renderNotes(draft, index, result, forced, outputName));
  const problems = verifyAgreement(runDir, draft);
  console.log(`Power Play: ${path.join(runDir, outputName)}`);
  console.log(`Notes (supporting): ${path.join(runDir, 'editorial-notes.md')}`);
  console.log(`Working files (not for delivery) stay in ${runDir}`);
  for (const p of problems) console.log(`ERROR agreement: ${p}`);
  console.log(problems.length ? `verify: FAIL (${problems.length} disagreement(s) between article and notes)` : 'verify: article and notes agree');
  return forced || problems.length ? 1 : 0;
}

function cmdVerify(args) {
  const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
  const { draft } = loadRun(positionals[0]);
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    console.log('verify: power-play.json is missing or not a JSON object');
    return 1;
  }
  const problems = verifyAgreement(positionals[0], draft);
  for (const p of problems) console.log(`ERROR agreement: ${p}`);
  console.log(problems.length ? `verify: FAIL (${problems.length} disagreement(s) between article and notes)` : 'verify: article and notes agree');
  return problems.length ? 1 : 0;
}

const COMMANDS = { index: cmdIndex, check: cmdCheck, render: cmdRender, verify: cmdVerify };
const [command, ...rest] = process.argv.slice(2);
if (!command || command === '--help' || command === '-h') {
  console.log(USAGE);
  process.exit(command ? 0 : 2);
}
if (rest.includes('--help') || rest.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}
if (!COMMANDS[command]) {
  console.error(`Unknown command: ${command}\n\n${USAGE}`);
  process.exit(2);
}
try {
  process.exitCode = COMMANDS[command](rest);
} catch (e) {
  if (e instanceof InputError || String(e.code).startsWith('ERR_PARSE_ARGS')) {
    console.error(`Error: ${e.message}\n\n${USAGE}`);
    process.exit(2);
  }
  throw e;
}
