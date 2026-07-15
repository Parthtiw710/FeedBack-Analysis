import { pool } from '../config/db.server.js';
import { preprocessSingle } from './pipelineService.server.js';

export async function processAndStore(submissionId: number, formType: string, payload: any, clientId: number): Promise<void> {
  const result = preprocessSingle(formType, payload);

  await pool.query(`
    INSERT INTO processed_submissions (
      submission_id, client_id, form_type,
      score_primary, score_secondary, score_tertiary,
      nps_segment, category, sub_category, priority,
      sentiment_label, boolean_flag,
      scores, categories, freetext, derived, clean_payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
  `, [
    submissionId, clientId, formType,
    result.scorePrimary    ?? null,
    result.scoreSecondary  ?? null,
    result.scoreTertiary   ?? null,
    result.npsSegment      ?? null,
    result.category        ?? null,
    result.subCategory     ?? null,
    result.priority        ?? null,
    result.sentimentLabel  ?? null,
    result.booleanFlag     ?? null,
    JSON.stringify(result.scores      ?? {}),
    JSON.stringify(result.categories  ?? {}),
    JSON.stringify(result.freetext    ?? {}),
    JSON.stringify(result.derived     ?? {}),
    JSON.stringify((result as any).cleanPayload ?? {}),
  ]);
}
