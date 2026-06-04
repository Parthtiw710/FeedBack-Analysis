import express, { Response } from 'express';
import { pool } from '../config/db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

export const analyticsRouter = express.Router();

// Apply JWT authentication to all analytics routes
analyticsRouter.use(authenticateJWT);

/**
 * GET /analytics
 * Full processed rows. ?from ?to ?formType
 */
analyticsRouter.get('/server-analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const to   = req.query.to   ? new Date(req.query.to as string)   : new Date();
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 86400_000);
    const clientId = req.user?.id;
    const params: any[] = [from.toISOString(), to.toISOString(), clientId];
    let typeClause = '';
    if (req.query.formType) {
      params.push(req.query.formType as string);
      typeClause = `AND ps.form_type = $${params.length}`;
    }

    const { rows } = await pool.query(`
      SELECT
        ps.id, ps.submission_id, ps.form_type,
        ps.score_primary, ps.score_secondary, ps.score_tertiary,
        ps.nps_segment, ps.category, ps.sub_category, ps.priority,
        ps.sentiment_label, ps.boolean_flag,
        ps.scores, ps.categories, ps.freetext, ps.derived,
        ps.processed_at
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.processed_at BETWEEN $1 AND $2
        AND s.client_id = $3 ${typeClause}
      ORDER BY ps.processed_at ASC
    `, params);

    res.json({ clientId, count: rows.length, from, to, rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /analytics/nps
 * NPS breakdown + net score. ?days=30
 */
analyticsRouter.get('/server-analytics/nps', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Number(req.query.days) || 30;
    const clientId = req.user?.id;
    const { rows } = await pool.query(`
      SELECT ps.nps_segment, COUNT(*) AS count
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.form_type = 'nps'
        AND ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND ps.nps_segment IS NOT NULL
        AND s.client_id = $2
      GROUP BY ps.nps_segment
    `, [days, clientId]);

    const m = Object.fromEntries(rows.map(r => [r.nps_segment, Number(r.count)]));
    const p = m.promoter || 0, pa = m.passive || 0, d = m.detractor || 0;
    const total = p + pa + d;

    res.json({
      clientId, days, total,
      promoters: p, passives: pa, detractors: d,
      npsScore: total ? Math.round(((p - d) / total) * 100) : null,
      distribution: [
        { name: 'Promoters',  value: p,  pct: total ? +((p/total)*100).toFixed(1)  : 0 },
        { name: 'Passives',   value: pa, pct: total ? +((pa/total)*100).toFixed(1) : 0 },
        { name: 'Detractors', value: d,  pct: total ? +((d/total)*100).toFixed(1)  : 0 },
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /analytics/scores
 * Per-form score averages + percentiles. ?days=30
 */
analyticsRouter.get('/server-analytics/scores', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Number(req.query.days) || 30;
    const clientId = req.user?.id;
    const { rows } = await pool.query(`
      SELECT
        ps.form_type,
        COUNT(*)                         AS count,
        ROUND(AVG(ps.score_primary), 2)  AS avg_primary,
        ROUND(AVG(ps.score_secondary), 2) AS avg_secondary,
        ROUND(AVG(ps.score_tertiary), 2) AS avg_tertiary,
        MIN(ps.score_primary)            AS min_primary,
        MAX(ps.score_primary)            AS max_primary,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ps.score_primary) AS p25,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ps.score_primary) AS p50,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ps.score_primary) AS p75
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND ps.score_primary IS NOT NULL
        AND s.client_id = $2
      GROUP BY ps.form_type
      ORDER BY ps.form_type
    `, [days, clientId]);
    res.json({ clientId, days, scores: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /analytics/scores/trend
 * Daily avg score per form. ?days=30 ?formType=csat
 */
analyticsRouter.get('/server-analytics/scores/trend', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Number(req.query.days) || 30;
    const clientId = req.user?.id;
    const params: any[] = [days, clientId];
    let typeClause = '';
    if (req.query.formType) {
      params.push(req.query.formType as string);
      typeClause = `AND ps.form_type = $${params.length}`;
    }

    const { rows } = await pool.query(`
      SELECT
        ps.form_type,
        DATE_TRUNC('day', ps.processed_at) AS day,
        ROUND(AVG(ps.score_primary), 2)    AS avg_score,
        COUNT(*)                           AS count
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND ps.score_primary IS NOT NULL
        AND s.client_id = $2 ${typeClause}
      GROUP BY ps.form_type, day
      ORDER BY day ASC
    `, params);
    res.json({ clientId, days, trend: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /analytics/categories
 * Category breakdown per form. ?days=30
 */
analyticsRouter.get('/server-analytics/categories', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Number(req.query.days) || 30;
    const clientId = req.user?.id;
    const { rows } = await pool.query(`
      SELECT ps.form_type, ps.category, COUNT(*) AS count
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND ps.category IS NOT NULL
        AND s.client_id = $2
      GROUP BY ps.form_type, ps.category
      ORDER BY ps.form_type, count DESC
    `, [days, clientId]);

    const grouped: any = {};
    for (const r of rows) {
      if (!grouped[r.form_type]) grouped[r.form_type] = [];
      grouped[r.form_type].push({ category: r.category, count: Number(r.count) });
    }
    for (const ft of Object.keys(grouped)) {
      const total = grouped[ft].reduce((s, r) => s + r.count, 0);
      grouped[ft].forEach(r => { r.pct = +((r.count / total) * 100).toFixed(1); });
    }
    res.json({ clientId, days, categories: grouped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /analytics/priority
 * Priority distribution. ?days=30
 */
analyticsRouter.get('/server-analytics/priority', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Number(req.query.days) || 30;
    const clientId = req.user?.id;
    const { rows } = await pool.query(`
      SELECT ps.form_type, ps.priority, COUNT(*) AS count
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND ps.priority IS NOT NULL
        AND s.client_id = $2
      GROUP BY ps.form_type, ps.priority
      ORDER BY ps.form_type,
        CASE ps.priority
          WHEN 'critical' THEN 1 WHEN 'high'   THEN 2
          WHEN 'medium'   THEN 3 WHEN 'low'     THEN 4
          ELSE 5
        END
    `, [days, clientId]);
    res.json({ clientId, days, priority: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /analytics/volume
 * Daily submission counts per form.
 */
analyticsRouter.get('/server-analytics/volume', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Number(req.query.days) || 90;
    const clientId = req.user?.id;
    const { rows } = await pool.query(`
      SELECT ps.form_type, DATE_TRUNC('day', ps.processed_at) AS day, COUNT(*) AS count
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND s.client_id = $2
      GROUP BY ps.form_type, day
      ORDER BY day ASC
    `, [days, clientId]);

    const byDay: any = {};
    const formTypes = new Set();
    for (const r of rows) {
      const date = r.day.toISOString().slice(0, 10);
      if (!byDay[date]) byDay[date] = { date, total: 0 };
      byDay[date][r.form_type] = Number(r.count);
      byDay[date].total += Number(r.count);
      formTypes.add(r.form_type);
    }
    res.json({
      clientId,
      timeSeries: Object.values(byDay).sort((a: any, b: any) => a.date.localeCompare(b.date)),
      formTypes: [...formTypes],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /analytics/sentiment
 * Sentiment distribution. ?days=30
 */
analyticsRouter.get('/server-analytics/sentiment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Number(req.query.days) || 30;
    const clientId = req.user?.id;
    const { rows } = await pool.query(`
      SELECT ps.form_type, ps.sentiment_label, COUNT(*) AS count
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND ps.sentiment_label IS NOT NULL
        AND s.client_id = $2
      GROUP BY ps.form_type, ps.sentiment_label
      ORDER BY ps.form_type
    `, [days, clientId]);
    res.json({ clientId, days, sentiment: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /analytics/churn
 * Churn reason breakdown. ?days=90
 */
analyticsRouter.get('/server-analytics/churn', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Number(req.query.days) || 90;
    const clientId = req.user?.id;
    const { rows } = await pool.query(`
      SELECT
        ps.category AS reason,
        COUNT(*) AS count,
        ROUND(AVG(ps.score_primary), 2) AS avg_satisfaction,
        SUM(CASE WHEN (ps.categories->>'would_return') = 'likely' THEN 1 ELSE 0 END) AS would_return
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.form_type = 'churnSurvey'
        AND ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND s.client_id = $2
      GROUP BY ps.category
      ORDER BY count DESC
    `, [days, clientId]);
    res.json({ clientId, days, churn: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /analytics/winloss
 * Win/Loss breakdown. ?days=90
 */
analyticsRouter.get('/server-analytics/winloss', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Number(req.query.days) || 90;
    const clientId = req.user?.id;

    const { rows: outcomes } = await pool.query(`
      SELECT ps.category AS outcome, COUNT(*) AS count
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.form_type = 'winLoss'
        AND ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND ps.category IS NOT NULL
        AND s.client_id = $2
      GROUP BY ps.category ORDER BY count DESC
    `, [days, clientId]);

    const { rows: lossReasons } = await pool.query(`
      SELECT ps.sub_category AS reason, COUNT(*) AS count
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.form_type = 'winLoss'
        AND ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND ps.category = 'lost'
        AND ps.sub_category IS NOT NULL
        AND s.client_id = $2
      GROUP BY ps.sub_category ORDER BY count DESC
    `, [days, clientId]);

    const { rows: pricePerception } = await pool.query(`
      SELECT ps.categories->>'price_perception' AS price_perception, COUNT(*) AS count
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.form_type = 'winLoss'
        AND ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND ps.category = 'lost'
        AND s.client_id = $2
      GROUP BY price_perception ORDER BY count DESC
    `, [days, clientId]);

    const total = outcomes.reduce((s, r) => s + Number(r.count), 0);
    const wins  = Number(outcomes.find(r => r.outcome === 'won')?.count  || 0);
    const losses = Number(outcomes.find(r => r.outcome === 'lost')?.count || 0);

    res.json({
      clientId, days, total,
      winRate:  total ? +((wins / total) * 100).toFixed(1) : null,
      lossRate: total ? +((losses / total) * 100).toFixed(1) : null,
      outcomes, lossReasons, pricePerception,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /analytics/pricing
 * Pricing perception breakdown. ?days=90
 */
analyticsRouter.get('/server-analytics/pricing', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Number(req.query.days) || 90;
    const clientId = req.user?.id;

    const { rows: perception } = await pool.query(`
      SELECT ps.category AS value_perception, COUNT(*) AS count
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.form_type = 'pricingFeedback'
        AND ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND ps.category IS NOT NULL
        AND s.client_id = $2
      GROUP BY ps.category ORDER BY count DESC
    `, [days, clientId]);

    const { rows: blockers } = await pool.query(`
      SELECT ps.categories->>'upgrade_blocker' AS blocker, COUNT(*) AS count
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.form_type = 'pricingFeedback'
        AND ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND s.client_id = $2
      GROUP BY blocker ORDER BY count DESC
    `, [days, clientId]);

    const { rows: pricePoints } = await pool.query(`
      SELECT
        ROUND(AVG((ps.derived->>'too_expensive_at_num')::NUMERIC), 2) AS avg_too_expensive,
        ROUND(AVG((ps.derived->>'great_value_at_num')::NUMERIC), 2)   AS avg_great_value,
        COUNT(*) FILTER (WHERE ps.derived->>'too_expensive_at_num' IS NOT NULL) AS price_responses
      FROM processed_submissions ps
      JOIN submissions s ON s.id = ps.submission_id
      WHERE ps.form_type = 'pricingFeedback'
        AND ps.processed_at >= NOW() - ($1 || ' days')::INTERVAL
        AND s.client_id = $2
    `, [days, clientId]);

    res.json({ clientId, days, perception, blockers, pricePoints: pricePoints[0] ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
