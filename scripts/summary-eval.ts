/**
 * Eval for the coach's summary prompt. Runs the real prompt, with the Edge
 * Function's settings, on a set of matches and checks every output against the
 * rules the prompt sets. Each run costs about $0.10 and bills the TT Analysis
 * workspace.
 *
 *   npx vite-node scripts/summary-eval.ts export <dir>
 *     Reads every production match that has a summary into <dir>, read-only,
 *     with `supabase db query --remote --read-only`. The files hold real names,
 *     so keep <dir> outside the repo.
 *
 *   npx vite-node scripts/summary-eval.ts run <dir> [runs]
 *     Writes a summary for each match, `runs` times (default 1), saves the raw
 *     outputs to <dir>/results-<time>.json and prints the checks.
 *
 *   npx vite-node scripts/summary-eval.ts check <results file>
 *     Prints the checks again for saved outputs, at no cost.
 *
 * The API key is ANTHROPIC_API_KEY, or the one in supabase/functions/.env.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildAnalysis, type Analysis, type AnalysisShot } from '../src/lib/analysis.ts';
import { SUMMARY_MODEL, SUMMARY_SCHEMA, buildSummaryInput, costUsd, enforceKinds, isMatchSummary, type SummaryMatch } from '../src/lib/aiSummary.ts';
import { SYSTEM_PROMPT } from '../supabase/functions/match-summary/prompt.ts';

type Match = SummaryMatch & { id: string; initial_server: 'player' | 'opponent' | null };
type Result = { matchId: string; label: string; run: number; raw: unknown; costUsd: number };

const QUERIES = {
  matches: 'select m.id, m.player_name, m.opponent_name, m.event, m.date, m.best_of, m.initial_server from matches m join match_summaries ms on ms.match_id = m.id order by m.date',
  sets: 'select s.id, s.match_id, s.set_number, s.player_score, s.opponent_score from sets s join match_summaries ms on ms.match_id = s.match_id',
  points: 'select p.id, p.set_id, p.match_id, p.winner, p.winning_shot_id, p.winning_hand, p.other_shot_id, p.other_hand, p.is_lucky_shot, p.is_unforced_error from points p join match_summaries ms on ms.match_id = p.match_id order by p.created_at',
  shots: 'select s.id, s.name, s.display_name, c.name as category, c.display_order as category_order, s.role, s.check_qualities, s.technical_notes from shots s join shot_categories c on c.id = s.category_id',
};

const exportMatches = (dir: string) => {
  for (const [name, sql] of Object.entries(QUERIES)) {
    const out = execFileSync('supabase', ['db', 'query', '--remote', '--read-only', sql], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    // The CLI prints a header line before the JSON
    const [data] = (() => {
      const start = out.indexOf('{');
      let depth = 0;
      for (let i = start; i < out.length; i++) {
        if (out[i] === '{') depth++;
        if (out[i] === '}' && --depth === 0) return [JSON.parse(out.slice(start, i + 1))];
      }
      throw new Error(`No JSON in the output for ${name}`);
    })();
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(data.rows));
    console.log(`${name}: ${data.rows.length} rows`);
  }
};

const load = (dir: string) => {
  const read = (name: string) => JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'));
  const [matches, sets, points, shots] = ['matches', 'sets', 'points', 'shots'].map(read) as [Match[], any[], any[], AnalysisShot[]];
  return matches.map(match => {
    const analysis = buildAnalysis({
      initialServer: match.initial_server ?? 'player',
      sets: sets.filter(s => s.match_id === match.id),
      points: points.filter(p => p.match_id === match.id),
      shots,
    });
    return { match, analysis, input: buildSummaryInput(match, analysis, shots), label: `${match.player_name || 'Player'} v ${match.opponent_name}` };
  });
};

const apiKey = () => {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const file = 'supabase/functions/.env';
  const line = existsSync(file) && readFileSync(file, 'utf8').split('\n').find(l => l.startsWith('ANTHROPIC_API_KEY='));
  if (!line) throw new Error('Set ANTHROPIC_API_KEY or add it to supabase/functions/.env');
  return line.slice('ANTHROPIC_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
};

const summarise = async (input: string, key: string) => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: SUMMARY_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: input }],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SUMMARY_SCHEMA } },
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const text = body.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  let raw: unknown = null;
  try { raw = JSON.parse(text); } catch { raw = text; }
  return { raw, costUsd: costUsd(SUMMARY_MODEL, body.usage) };
};

// The checks. A failure breaks a rule in the prompt; a warning is worth reading.
type Finding = { level: 'fail' | 'warn'; text: string };
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

const check = (raw: any, analysis: Analysis): Finding[] => {
  const found: Finding[] = [];
  const fail = (text: string) => found.push({ level: 'fail', text });
  const warn = (text: string) => found.push({ level: 'warn', text });
  if (!raw || typeof raw !== 'object') return [{ level: 'fail', text: 'not JSON' }];

  for (const p of raw.problems ?? []) {
    if (p.kind === 'unforced' && p.tactical?.trim()) fail(`"${p.title}": unforced problem with tactical advice (cleared on save)`);
    if (p.kind === 'situation' && p.technical?.trim()) fail(`"${p.title}": situation with technical advice (cleared on save)`);
  }
  const summary = enforceKinds(raw) as any;
  if (!isMatchSummary(summary)) fail('fails the validator, so the function would refuse it');

  const fields: [string, string][] = [
    ['headline', summary.headline ?? ''],
    ...(summary.problems ?? []).flatMap((p: any) => [[`${p.title} / detail`, p.detail], [`${p.title} / tactical`, p.tactical], [`${p.title} / technical`, p.technical]]),
    ...(summary.mental ?? []).map((m: any) => [`${m.title} (mental)`, m.detail]),
  ];
  const all = fields.map(([, text]) => text ?? '').join('\n');

  if (/—/.test(all)) fail('em dash');
  if (/[‘’“”]/.test(all)) fail('curly quotes');
  if (/\*\*|^#/m.test(all)) fail('markdown');
  if (/towel/i.test(all) && !/6 points|six points/i.test(all)) fail('towel suggested without the 6-point rule');
  if (/\b(chopper|blocker|looper|penhold|defender)\b/i.test(all)) fail('names a style of play');
  if (/same way each time|every time the same/i.test(all)) fail('claims the player repeated something the data can\'t show');
  if (/data (does not|doesn't) (show|record)/i.test(all)) fail('talks about gaps in the data');
  if (/\b(record|recorded|recording|log|logged)\b/i.test(all)) fail('says "record" or "log" (the site says film and enter)');
  if (/\b(nerves|nervous|tension|tense)\b/i.test(all) && !analysis.unforced.bunchedLate) fail('puts errors down to nerves when bunchedLate is false');
  if (analysis.unforced.bunchedLate && !(summary.mental ?? []).some((m: any) => /nerv|tens/i.test(m.detail))) warn('bunchedLate is true but no mental note on nerves');

  for (const p of summary.problems ?? []) {
    if (!/\d/.test(p.detail)) fail(`"${p.title}": detail has no counts`);
    if (p.kind === 'receive' && /footwork/i.test(p.technical)) fail(`"${p.title}": receive advice uses footwork`);
    if (p.kind === 'unforced' && /misread|misjudg|read(ing)? (the )?spin|incoming spin/i.test(p.technical)) fail(`"${p.title}": unforced error put down to reading spin`);
    if (!['receive', 'serve'].includes(p.kind) && /\b(receive|receiving|third ball|against (his|her|their) serve)\b/i.test(`${p.tactical} ${p.technical}`)) {
      warn(`"${p.title}" (${p.kind}): mentions receive or the third ball`);
    }
  }

  const [won, lost] = [analysis.setsWon.won, analysis.setsWon.lost];
  const result = summary.headline?.match(/You (won|lost) (\d)-(\d)/);
  if (!result) warn('headline doesn\'t open with the result in sets');
  else if (`${result[2]}-${result[3]}` !== `${Math.max(won, lost)}-${Math.min(won, lost)}` && `${result[2]}-${result[3]}` !== `${won}-${lost}`) fail(`headline result ${result[0]} doesn't match ${won}-${lost}`);

  const n = summary.problems?.length ?? 0;
  if (n < 3 || n > 5) fail(`${n} problems, not 3 to 5`);
  if ((summary.mental?.length ?? 0) > 2) fail('more than 2 mental notes');
  for (const [name, text] of fields) if (words(text ?? '') > 60) warn(`${name}: ${words(text)} words`);
  const total = words(all);
  if (total > 550) warn(`${total} words in all`);
  return found;
};

const report = (results: Result[], matches: ReturnType<typeof load>) => {
  let fails = 0;
  for (const m of matches) {
    const runs = results.filter(r => r.matchId === m.match.id);
    if (!runs.length) continue;
    console.log(`\n## ${m.label}`);
    for (const r of runs) {
      const raw = r.raw as any;
      const findings = check(raw, m.analysis);
      fails += findings.filter(f => f.level === 'fail').length;
      console.log(`\nRun ${r.run} ($${r.costUsd.toFixed(3)}): ${raw?.headline ?? ''}`);
      for (const p of raw?.problems ?? []) console.log(`  - [${p.kind}] ${p.title}`);
      for (const mn of raw?.mental ?? []) console.log(`  * ${mn.title}`);
      for (const f of findings) console.log(`  ${f.level.toUpperCase()}: ${f.text}`);
    }
    if (runs.length > 1) {
      const sets = runs.map(r => ((r.raw as any)?.problems ?? []).map((p: any) => p.kind).sort().join(','));
      console.log(`\n  Problem kinds per run: ${sets.join(' | ')}`);
    }
  }
  const cost = results.reduce((n, r) => n + r.costUsd, 0);
  console.log(`\n${results.length} summaries, ${fails} failures, $${cost.toFixed(2)}`);
};

const [command, path, runsArg] = process.argv.slice(2);
if (command === 'export' && path) {
  exportMatches(path);
} else if (command === 'run' && path) {
  const matches = load(path);
  const key = apiKey();
  const runs = Number(runsArg ?? 1);
  const jobs = matches.flatMap(m => Array.from({ length: runs }, (_, i) => ({ m, run: i + 1 })));
  const results: Result[] = await Promise.all(jobs.map(async ({ m, run }) => {
    const { raw, costUsd: cost } = await summarise(m.input, key);
    return { matchId: m.match.id, label: m.label, run, raw, costUsd: cost };
  }));
  const file = join(path, `results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify(results, null, 2));
  console.log(`Saved to ${file}`);
  report(results, matches);
} else if (command === 'check' && path) {
  const results: Result[] = JSON.parse(readFileSync(path, 'utf8'));
  report(results, load(join(path, '..')));
} else {
  console.log('Usage: summary-eval.ts export <dir> | run <dir> [runs] | check <results file>');
}
