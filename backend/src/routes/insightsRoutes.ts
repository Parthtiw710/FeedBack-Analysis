import express, { Response } from 'express';
import { pool } from '../config/db.js';
import { runDailyBatch } from '../services/pipelineService.js';
import { runAgentInsights } from '../services/agentService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

export const insightsRouter = express.Router();

// Apply JWT authentication to all insights routes
insightsRouter.use(authenticateJWT);

// GET /insights — list insights, filtered by client_id (enforced from JWT)
insightsRouter.get('/server-insights', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const clientId = req.user?.id;
    const { rows } = await pool.query(`
      SELECT id, client_id, batch_id, form_type, insight_type, content, created_at
      FROM ai_insights
      WHERE client_id = $1
      ORDER BY created_at DESC LIMIT $2
    `, [clientId, limit]);
    res.json({ clientId, insights: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /insights/latest — latest batch for a client (enforced from JWT)
insightsRouter.get('/server-insights/latest', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = req.user?.id;
    const { rows: batch } = await pool.query(
      `SELECT batch_id FROM ai_insights WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [clientId]
    );
    if (!batch.length) return res.json({ clientId, insights: [] });
    const { rows } = await pool.query(`
      SELECT id, insight_type, content, created_at
      FROM ai_insights WHERE batch_id = $1 ORDER BY id ASC
    `, [batch[0].batch_id]);
    res.json({ clientId, batchId: batch[0].batch_id, insights: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /insights/trigger — run daily batch for all clients (admin/dev trigger)
insightsRouter.post('/server-insights/trigger', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = req.user?.id;
    if (clientId === 1) {
      return res.status(403).json({ error: 'AI analysis generation is disabled for the Test Client profile.' });
    }
    const result = await runDailyBatch(pool);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /insights/generate — generate insight for the logged-in client
insightsRouter.post('/server-insights/generate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = req.user?.id;
    if (!clientId) {
      return res.status(401).json({ error: 'Client ID not resolved' });
    }
    if (clientId === 1) {
      return res.status(403).json({ error: 'AI analysis generation is disabled for the Test Client profile.' });
    }
    const result = await runAgentInsights(clientId);
    res.json({ success: true, clientId, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
