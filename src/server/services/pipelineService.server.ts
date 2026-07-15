import { FORM_MAP } from '../constants/formMaps.server.js';
import {
  normalise, deriveSentiment, deriveNpsSegment,
  derivePriority, computeDerived,
} from '../utils/pipelineUtils.server.js';
import { runAgentInsights } from './agentService.server.js';

// ── preprocessSingle: unchanged, still needed by submission pipeline ──────────
export function preprocessSingle(formType: string, payload: any): any {
  const map = FORM_MAP[formType];
  if (!map) {
    return {
      scorePrimary: null, scoreSecondary: null, scoreTertiary: null,
      npsSegment: null, category: null, subCategory: null,
      priority: null, sentimentLabel: null, booleanFlag: null,
      scores: {}, categories: {}, freetext: {}, derived: {},
      cleanPayload: normalise(payload),
    };
  }

  const clean = normalise(payload);
  const scorePrimary = map.scorePrimary ? (clean[map.scorePrimary] ?? null) : null;
  const scoreSecondary = map.scoreSecondary ? (clean[map.scoreSecondary] ?? null) : null;
  const scoreTertiary = map.scoreTertiary ? (clean[map.scoreTertiary] ?? null) : null;
  const npsSegment = formType === 'nps' ? deriveNpsSegment(scorePrimary) : null;
  const category = map.category ? (clean[map.category] ?? null) : null;
  const subCategory = map.subCategory ? (clean[map.subCategory] ?? null) : null;
  const booleanFlag = map.booleanFlag
    ? (clean[map.booleanFlag] != null ? Boolean(clean[map.booleanFlag]) : null)
    : null;

  const sentimentLabel = deriveSentiment(formType, clean, map);
  const priority = derivePriority(formType, clean, map, sentimentLabel);

  const scores: any = {};
  for (const [k, v] of Object.entries(clean)) {
    if (typeof v === 'number' && k !== 'score') scores[k] = v;
  }
  if (formType === 'nps' && clean.score !== undefined) scores.score = clean.score;

  const categories: any = {};
  for (const [k, v] of Object.entries(clean)) {
    if (typeof v === 'string' && v.length <= 60) categories[k] = v;
  }

  const freetext: any = {};
  for (const field of (map.freetext || [])) {
    if (clean[field] && typeof clean[field] === 'string' && clean[field].length > 2) {
      freetext[field] = clean[field];
    }
  }

  return {
    scorePrimary, scoreSecondary, scoreTertiary,
    npsSegment, category, subCategory,
    priority, sentimentLabel, booleanFlag,
    scores, categories, freetext,
    derived: computeDerived(formType, clean, map, sentimentLabel),
    cleanPayload: clean,
  };
}

// ── runDailyBatch: now just calls agent + persists results ────────────────────
export async function runDailyBatch(pool: any): Promise<any> {
  const label = `[DailyBatch ${new Date().toISOString()}]`;
  console.log(`${label} Starting...`);

  try {
    // Get all unique client_ids from submissions
    const clientsResult = await pool.query(
      `SELECT DISTINCT client_id FROM submissions WHERE client_id IS NOT NULL`
    );
    
    const clients = clientsResult.rows;
    
    // Default to client_id=1 when no submissions exist yet
    if (clients.length === 0) {
      console.log(`${label} No clients found with submissions — defaulting to client_id=1`);
      clients.push({ client_id: 1 });
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let totalInsights = 0;

    // Generate insights for each client
    for (const { client_id } of clients) {
      try {
        await runAgentInsights(client_id);
        totalInsights++;
      } catch (clientErr: any) {
        console.error(`${label} Failed for client_id=${client_id}:`, clientErr.message);
      }
    }

    console.log(`${label} Done. batch_id=${batchId}, insights saved=${totalInsights}`);
    return { batchId, insightsSaved: totalInsights };

  } catch (err: any) {
    console.error(`${label} FAILED:`, err.message);
    throw err;
  }
}