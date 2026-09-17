import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getUserPlan } from '../../shared/tiers.ts';
import { fetchPageText } from '../../shared/pageReader.ts';

// Deep Search — the LBC AI Ultra flagship research capability. Server-side
// only: decomposes a question, fires parallel targeted live-web searches,
// reads full pages, cross-checks claims, iterates on gaps, and produces a
// structured report with honest confidence levels including what could NOT
// be verified.
//
// Security model:
//  - Tier gate: Deep Search is Ultra-only (the founder session previews at
//    Ultra). Honest rejection, never a fake downgrade.
//  - Per-user daily budget: hard-capped runs per day so one user cannot burn
//    the system. All budgets are server-side.
//  - Per-user isolation: every report is created/updated through the
//    user-scoped client, so RLS stamps and enforces ownership.
//  - Every cited source is logged on the report record.
//  - No engine, model, or infrastructure names ever appear in prompts or
//    responses — LBC AI only.

const MIN_QUESTION_CHARS = 10;
const MAX_QUESTION_CHARS = 2000;
const MAX_SUB_QUESTIONS = 6;
const MAX_FOLLOWUPS = 3;
const MAX_ROUNDS = 2;
const MAX_PAGES = 4;
const MAX_RUNS_PER_DAY = 5;
const SEARCH_BATCH_SIZE = 3;

const SUB_QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    sub_questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['sub_questions'],
};

const SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, url: { type: 'string' } },
        required: ['url'],
      },
    },
  },
  required: ['answer', 'confidence'],
};

const GAPS_SCHEMA = {
  type: 'object',
  properties: {
    follow_up_questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['follow_up_questions'],
};

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          evidence: { type: 'string' },
        },
        required: ['claim', 'confidence'],
      },
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, url: { type: 'string' } },
        required: ['url'],
      },
    },
    unverified: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
  required: ['answer', 'confidence'],
};

const CONFIDENCE_LEVELS = ['low', 'medium', 'high'];

// Bounded parallelism: at most `size` in flight at once, in order.
async function runBatch(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const results = await Promise.all(chunk.map(fn));
    out.push(...results);
  }
  return out;
}

async function invokeJson(base44, opts) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: opts.prompt,
    ...(opts.schema ? { response_json_schema: opts.schema } : {}),
    ...(opts.web ? { add_context_from_internet: true, model: 'gemini_3_flash' } : {}),
  });
  return res && typeof res === 'object' ? res : {};
}

async function runDeepSearch(base44, question) {
  let searchesUsed = 0;

  // (a) Decompose the question into focused, independent sub-questions.
  const decomp = await invokeJson(base44, {
    prompt: `You are the research planner of LBC AI Deep Search. Decompose the user's research question into ${MAX_SUB_QUESTIONS} focused, independent sub-questions that together fully cover it. Order them by importance.\n\nResearch question: ${question}\n\nReturn JSON.`,
    schema: SUB_QUESTION_SCHEMA,
  });
  const subQuestions = (Array.isArray(decomp.sub_questions) ? decomp.sub_questions : [])
    .filter(q => typeof q === 'string' && q.trim())
    .slice(0, MAX_SUB_QUESTIONS);
  if (subQuestions.length === 0) throw new Error('decompose_failed');

  // (b) One targeted live-web search per sub-question, in bounded parallel batches.
  const searchOne = async (q) => {
    searchesUsed += 1;
    const r = await invokeJson(base44, {
      prompt: `You are a research agent of LBC AI Deep Search. Answer this sub-question using live web search. Base your answer only on what you actually find — never guess. Record the sources you used. If the evidence is thin, lower your confidence.\n\nSub-question: ${q}\n\nReturn JSON with fields: answer, confidence (low/medium/high), sources (list of {title, url}).`,
      schema: SEARCH_SCHEMA,
      web: true,
    });
    return {
      question: q,
      answer: String(r.answer || '').slice(0, 3000),
      confidence: CONFIDENCE_LEVELS.includes(r.confidence) ? r.confidence : 'low',
      sources: Array.isArray(r.sources) ? r.sources.slice(0, 8) : [],
    };
  };

  let roundsUsed = 1;
  const findings = await runBatch(subQuestions, SEARCH_BATCH_SIZE, searchOne);

  // (c-e) Gap round — iterate once on what is still missing or contradicted.
  if (roundsUsed < MAX_ROUNDS) {
    const findingsText = findings
      .map(f => `Q: ${f.question}\nA: ${f.answer} (confidence: ${f.confidence})`)
      .join('\n\n');
    const gaps = await invokeJson(base44, {
      prompt: `You are the gap analyst of LBC AI Deep Search. Below are sub-question answers for a research report. Identify what is STILL missing, thin, or contradicted to fully answer the main question. Return at most ${MAX_FOLLOWUPS} follow-up questions — or an empty list if the evidence is already sufficient.\n\nMain question: ${question}\n\nFindings so far:\n${findingsText}\n\nReturn JSON with field follow_up_questions.`,
      schema: GAPS_SCHEMA,
    });
    const followUps = (Array.isArray(gaps.follow_up_questions) ? gaps.follow_up_questions : [])
      .filter(q => typeof q === 'string' && q.trim())
      .slice(0, MAX_FOLLOWUPS);
    if (followUps.length > 0) {
      roundsUsed += 1;
      findings.push(...(await runBatch(followUps, SEARCH_BATCH_SIZE, searchOne)));
    }
  }

  // (c) Read full pages from the most promising sources.
  const seen = new Set();
  const candidateUrls = [];
  for (const f of findings) {
    for (const s of f.sources || []) {
      if (s && typeof s.url === 'string' && !seen.has(s.url)) {
        seen.add(s.url);
        candidateUrls.push(s.url);
      }
    }
  }
  const pages = (await runBatch(candidateUrls.slice(0, MAX_PAGES), SEARCH_BATCH_SIZE, fetchPageText))
    .filter(Boolean);

  // (f) Synthesis — cross-check claims across independent sources.
  const evidenceText = findings
    .map(f => `Q: ${f.question}\nA: ${f.answer}\nConfidence: ${f.confidence}\nSources: ${(f.sources || []).map(s => s.url).join(', ') || 'none recorded'}`)
    .join('\n\n');
  const pagesText = pages.length > 0
    ? '\n\nFULL PAGE EXCERPTS (read directly from the sources):\n' +
      pages.map(p => `[Page: ${p.url}]\n${p.text.slice(0, 6000)}`).join('\n\n')
    : '';

  const synthesis = await invokeJson(base44, {
    prompt: `You are the lead researcher of LBC AI Deep Search. Cross-check the findings below against each other and the full-page excerpts. Produce a structured research report that answers the main question honestly.

Rules:
- Only include findings supported by the evidence; note where sources disagree.
- Confidence levels: high = confirmed by multiple independent sources, medium = a single reliable source, low = weak or conflicting evidence.
- In "unverified", list the claims that could NOT be verified or that sources contradicted — be explicit about what is not known.
- In "sources", list every source actually cited in the findings.
- Set an overall "confidence" for the answer itself.

Main question: ${question}

FINDINGS FROM SEARCHES:
${evidenceText}${pagesText}

Return JSON with fields: answer, findings (list of {claim, confidence, evidence}), sources (list of {title, url}), unverified (list of strings), confidence.`,
    schema: REPORT_SCHEMA,
  });

  // Log every source: search-recorded plus synthesis-cited, deduplicated.
  const sourceSeen = new Set();
  const sources = [];
  const allSourceEntries = [
    ...findings.flatMap(f => f.sources || []),
    ...(Array.isArray(synthesis.sources) ? synthesis.sources : []),
  ];
  for (const s of allSourceEntries) {
    if (s && typeof s.url === 'string' && !sourceSeen.has(s.url)) {
      sourceSeen.add(s.url);
      sources.push({ title: String(s.title || s.url).slice(0, 200), url: s.url.slice(0, 500) });
    }
  }

  return {
    answer: String(synthesis.answer || '').slice(0, 20000),
    findings: Array.isArray(synthesis.findings) ? synthesis.findings.slice(0, 30) : [],
    sources: sources.slice(0, 40),
    unverified: Array.isArray(synthesis.unverified) ? synthesis.unverified.slice(0, 20) : [],
    confidence: CONFIDENCE_LEVELS.includes(synthesis.confidence) ? synthesis.confidence : 'low',
    sub_questions: subQuestions,
    rounds_used: roundsUsed,
    searches_used: searchesUsed,
    pages_read: pages.length,
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const question = typeof body.question === 'string' ? body.question.trim().slice(0, MAX_QUESTION_CHARS) : '';
    if (question.length < MIN_QUESTION_CHARS) {
      return Response.json({ error: 'Please Enter A Research Question Of At Least 10 Characters' }, { status: 400 });
    }

    // Tier gate — Deep Search is an LBC AI Ultra capability. Honest, server-side.
    const plan = await getUserPlan(base44, user);
    if (plan !== 'ultra') {
      return Response.json({ error: 'Deep Search Is An LBC AI Ultra Capability', plan }, { status: 403 });
    }

    // Per-user daily budget — one user cannot burn the system.
    const now = new Date();
    const startIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const todays = await base44.entities.DeepSearchReport.filter(
      { created_date: { $gte: startIso } }, 'created_date', 100
    ).catch(() => []);
    if ((todays || []).length >= MAX_RUNS_PER_DAY) {
      return Response.json({
        error: `Daily Deep Search Limit Reached — ${MAX_RUNS_PER_DAY} Runs Per Day On LBC AI Ultra`,
      }, { status: 429 });
    }

    // Per-user record — RLS stamps and enforces ownership on every operation.
    const report = await base44.entities.DeepSearchReport.create({ question, status: 'processing' });

    try {
      const result = await runDeepSearch(base44, question);
      await base44.entities.DeepSearchReport.update(report.id, { status: 'ready', ...result });
      return Response.json({ report_id: report.id, ...result });
    } catch (err) {
      await base44.entities.DeepSearchReport.update(report.id, {
        status: 'error',
        error_message: 'Deep Search Could Not Complete — Please Try Again',
      }).catch(() => {});
      return Response.json({ error: 'Deep Search Failed — Please Try Again' }, { status: 502 });
    }
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}