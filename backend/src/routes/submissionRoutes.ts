import express, { Response } from 'express';
import { pool } from '../config/db.js';
import { forms } from '../constants/forms.js';
import rateLimit from 'express-rate-limit';
import { preprocessSingle } from '../services/pipelineService.js';
import { authenticateAPIKey, APIKeyRequest } from '../middleware/apiKeyAuth.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

export const submissionRouter = express.Router();

const submitLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: { error: 'Too many submissions, please try again later.' }
});

// ── PUBLIC SUBMISSION APIS (API Key Protected) ───────────────────────────

submissionRouter.get('/server-forms/:type', authenticateAPIKey, async (req: APIKeyRequest, res: Response) => {
  const typeStr = req.params.type as string;
  const form = forms[typeStr];
  if (!form) return res.status(404).json({ error: 'Form not found' });
  return res.json(form);
});

const UNPROCESSED_BATCH_THRESHOLD = 10;
const pendingCounts = new Map<number, number>();
const catchUpLocks = new Set<number | 'global'>();

function getPending(clientId: number) { return pendingCounts.get(clientId) ?? 0; }
function incPending(clientId: number) { pendingCounts.set(clientId, getPending(clientId) + 1); }
function decPending(clientId: number) { pendingCounts.set(clientId, Math.max(0, getPending(clientId) - 1)); }
function resetPending(clientId?: number) {
  if (clientId !== undefined) pendingCounts.set(clientId, 0);
  else pendingCounts.clear();
}

export async function processAndStore(submissionId: number, formType: string, payload: any, clientId: number) {
  try {
    const processed = preprocessSingle(formType, payload);
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
      processed.scorePrimary    ?? null,
      processed.scoreSecondary  ?? null,
      processed.scoreTertiary   ?? null,
      processed.npsSegment      ?? null,
      processed.category        ?? null,
      processed.subCategory     ?? null,
      processed.priority        ?? null,
      processed.sentimentLabel  ?? null,
      processed.booleanFlag     ?? null,
      JSON.stringify(processed.scores      ?? {}),
      JSON.stringify(processed.categories  ?? {}),
      JSON.stringify(processed.freetext    ?? {}),
      JSON.stringify(processed.derived     ?? {}),
      JSON.stringify(processed.cleanPayload ?? {}),
    ]);
    console.log(`✅ [pipeline] submission ${submissionId} client=${clientId} (${formType}) processed`);
  } catch (err: any) {
    console.error(`❌ [pipeline] submission ${submissionId} failed:`, err.message);
    incPending(clientId);
  }
}

export async function catchUpUnprocessed(clientId?: number) {
  const lockKey: number | 'global' = clientId ?? 'global';
  if (catchUpLocks.has(lockKey)) {
    console.log(`⚠️  [catch-up] Already running for ${clientId ? `client_id=${clientId}` : 'all clients'}`);
    return;
  }
  catchUpLocks.add(lockKey);
  try {
    const params: any[] = [];
    let clientFilter = '';
    if (clientId !== undefined) {
      params.push(clientId);
      clientFilter = `AND s.client_id = $${params.length}`;
    }

    const { rows } = await pool.query(`
      SELECT s.id, s.form_type, s.payload, s.client_id
      FROM submissions s
      LEFT JOIN processed_submissions ps ON ps.submission_id = s.id
      WHERE ps.id IS NULL ${clientFilter}
      ORDER BY s.client_id ASC, s.created_at ASC
    `, params);

    if (rows.length === 0) {
      resetPending(clientId);
      console.log(`✅ [catch-up] Nothing to reprocess${clientId ? ` for client_id=${clientId}` : ''}.`);
      return;
    }

    console.log(`⚡ [catch-up] Processing ${rows.length} submissions${clientId ? ` for client_id=${clientId}` : ' across all clients'}...`);
    for (const row of rows) {
      await processAndStore(row.id, row.form_type, row.payload, row.client_id ?? 1);
    }
    resetPending(clientId);
    console.log(`✅ [catch-up] Done${clientId ? ` for client_id=${clientId}` : ''}.`);
  } catch (err: any) {
    console.error('❌ [catch-up] Failed:', err.message);
  } finally {
    catchUpLocks.delete(lockKey);
  }
}

function validate(formType: string, payload: any) {
  const schema = forms[formType];
  if (!schema) return { valid: true, errors: [] };
  const errors = [];
  for (const field of schema.fields) {
    const fieldId = field.id as string;
    const value = payload[fieldId];
    if (field.required && (value === undefined || value === null || value === '' || value === false))
      errors.push(`"${field.label}" is required`);
    if (value === undefined || value === null) continue;
    if (field.minLength && String(value).length < field.minLength)
      errors.push(`"${field.label}" must be at least ${field.minLength} characters`);
    if (field.maxLength && String(value).length > field.maxLength)
      errors.push(`"${field.label}" exceeds max length of ${field.maxLength}`);
    if (field.min !== undefined && Number(value) < field.min)
      errors.push(`"${field.label}" must be ≥ ${field.min}`);
    if (field.max !== undefined && Number(value) > field.max)
      errors.push(`"${field.label}" must be ≤ ${field.max}`);
    if (field.pattern && !new RegExp(field.pattern).test(String(value)))
      errors.push(`"${field.label}" has an invalid format`);
  }
  return { valid: errors.length === 0, errors };
}

submissionRouter.post('/server-submit/:type', submitLimiter, authenticateAPIKey, async (req: APIKeyRequest, res: Response): Promise<any> => {
  const type = req.params.type as string;
  const payload = req.body;

  if (!forms[type])
    return res.status(404).json({ error: 'Unknown form type' });

  const { valid, errors } = validate(type, payload);
  if (!valid)
    return res.status(422).json({ error: 'Validation failed', details: errors });

  try {
    // Restrict the submission to the client ID resolved from the API key
    const clientId = req.clientId;

    // 1. Pre-allocate the submission ID so we can return it instantly
    const seqRes = await pool.query(`SELECT nextval('submissions_id_seq') AS id`);
    const submissionId = Number(seqRes.rows[0].id);

    // 2. Format queue message payload
    const queueMsg = {
      submission_id: submissionId,
      form_type: type,
      payload: payload,
      client_id: clientId
    };

    // 3. Send message to pgmq form_queue
    await pool.query(
      `SELECT * FROM pgmq.send('form_queue', $1)`,
      [JSON.stringify(queueMsg)]
    );

    res.json({ success: true, submissionId });
  } catch (err: any) {
    console.error('QUEUE INSERT ERROR:', err.message);
    res.status(500).json({ error: 'Failed to queue submission' });
  }
});

// ── PRIVATE DASHBOARD APIS (JWT Protected) ───────────────────────────────

submissionRouter.use('/server-submissions', authenticateJWT);
submissionRouter.use('/server-raw-submissions', authenticateJWT);

submissionRouter.get('/server-submissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const params: any[] = [];
    let whereClause = '';

    // Enforce queries to only show data for the logged-in client ID
    const clientId = req.user?.id;
    params.push(clientId);
    whereClause += ` AND s.client_id = $${params.length}`;

    if (req.query.formType) {
      params.push(req.query.formType as string);
      whereClause += ` AND s.form_type = $${params.length}`;
    }
    if (req.query.from) {
      params.push(new Date(req.query.from as string).toISOString());
      whereClause += ` AND s.created_at >= $${params.length}`;
    }
    if (req.query.to) {
      params.push(new Date(req.query.to as string).toISOString());
      whereClause += ` AND s.created_at <= $${params.length}`;
    }

    params.push(limit);
    const { rows } = await pool.query(`
      SELECT
        s.id, s.form_type, s.payload, s.created_at,
        ps.score_primary, ps.score_secondary, ps.score_tertiary,
        ps.nps_segment, ps.category, ps.sub_category, ps.priority,
        ps.sentiment_label, ps.boolean_flag,
        ps.scores, ps.categories, ps.freetext, ps.derived,
        ps.processed_at
      FROM submissions s
      LEFT JOIN processed_submissions ps ON ps.submission_id = s.id
      WHERE 1=1 ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${params.length}
    `, params);

    res.json({ count: rows.length, rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

submissionRouter.get('/server-raw-submissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allowedLimits = [50, 100, 500, 1000];
    const requested = Number(req.query.limit);
    const limit = allowedLimits.includes(requested) ? requested : 100;

    const clientId = req.user?.id;
    const { rows } = await pool.query(`
      SELECT id, form_type, payload, created_at
      FROM submissions
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [clientId, limit]);

    res.json({ count: rows.length, limit, rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

submissionRouter.delete('/server-submissions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = req.user?.id;
    const r = await pool.query('DELETE FROM submissions WHERE id = $1 AND client_id = $2', [req.params.id, clientId]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).send('Delete failed');
  }
});

submissionRouter.post('/server-submissions/reprocess', async (req: AuthenticatedRequest, res: Response) => {
  const clientId = req.user?.id;
  res.json({
    success: true,
    message: `Reprocessing submissions for client_id=${clientId} in background`
  });
  catchUpUnprocessed(clientId);
});
