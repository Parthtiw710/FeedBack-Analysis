import { createServerFn } from '@tanstack/react-start';
import { pool } from '../config/db.server.js';
import { getAuthenticatedUser, userHasData } from '../authHelper.server.js';

export const getAnalyticsOverviewFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const user = getAuthenticatedUser();
    const userId = user.id;

    const hasData = await userHasData(userId);
    if (!hasData) {
      return {
        success: true,
        data: {
          total: 0,
          pending: 0,
          processed: 0,
          averagePriority: "0.00",
          sentiment: {
            positive: 0,
            neutral: 0,
            negative: 0
          }
        }
      };
    }

    // 1. Get total, pending, and processed counts
    const totalRes = await pool.query(
      'SELECT COUNT(*) FROM submissions WHERE client_id = $1',
      [userId]
    );
    const pendingRes = await pool.query(
      'SELECT COUNT(*) FROM submissions WHERE client_id = $1 AND is_processed = false',
      [userId]
    );
    const processedRes = await pool.query(
      'SELECT COUNT(*) FROM submissions WHERE client_id = $1 AND is_processed = true',
      [userId]
    );

    // 2. Calculate average priority and sentiment breakdown
    const processedStats = await pool.query(
      `SELECT
         AVG(priority) as avg_priority,
         COUNT(CASE WHEN sentiment_label = 'positive' THEN 1 END) as pos_count,
         COUNT(CASE WHEN sentiment_label = 'neutral' THEN 1 END) as neu_count,
         COUNT(CASE WHEN sentiment_label = 'negative' THEN 1 END) as neg_count
       FROM processed_submissions
       WHERE client_id = $1`,
      [userId]
    );

    const stats = processedStats.rows[0] || {};
    const totalProcessed = Number(processedRes.rows[0].count) || 0;

    return {
      success: true,
      data: {
        total: Number(totalRes.rows[0].count) || 0,
        pending: Number(pendingRes.rows[0].count) || 0,
        processed: totalProcessed,
        averagePriority: Number(stats.avg_priority || 0).toFixed(2),
        sentiment: {
          positive: totalProcessed ? Math.round((Number(stats.pos_count || 0) / totalProcessed) * 100) : 0,
          neutral: totalProcessed ? Math.round((Number(stats.neu_count || 0) / totalProcessed) * 100) : 0,
          negative: totalProcessed ? Math.round((Number(stats.neg_count || 0) / totalProcessed) * 100) : 0
        }
      }
    };
  });

export const getAnalyticsTimeSeriesFn = createServerFn({ method: 'GET' })
  .validator((data: { days?: number }) => data)
  .handler(async ({ data }) => {
    const user = getAuthenticatedUser();
    const userId = user.id;
    const days = data.days || 30;

    const hasData = await userHasData(userId);
    if (!hasData) {
      return {
        success: true,
        clientId: userId,
        timeSeries: [],
        formTypes: []
      };
    }

    const query = `
      SELECT
        DATE_TRUNC('day', created_at) as date_bucket,
        form_type,
        COUNT(*) as count,
        AVG(priority) as avg_priority
      FROM processed_submissions
      WHERE client_id = $1 AND created_at >= NOW() - $2 * INTERVAL '1 day'
      GROUP BY date_bucket, form_type
      ORDER BY date_bucket ASC
    `;

    const result = await pool.query(query, [userId, days]);

    // Format the time series to be friendly for charts
    const timeSeriesMap: Record<string, any> = {};
    result.rows.forEach((row: any) => {
      const dateStr = new Date(row.date_bucket).toISOString().split('T')[0];
      if (!timeSeriesMap[dateStr]) {
        timeSeriesMap[dateStr] = { date: dateStr };
      }
      timeSeriesMap[dateStr][row.form_type] = Number(row.count);
      timeSeriesMap[dateStr][`${row.form_type}_priority`] = Number(row.avg_priority || 0).toFixed(2);
    });

    const timeSeries = Object.values(timeSeriesMap);

    // Get distribution of form types
    const formTypesRes = await pool.query(
      `SELECT form_type, COUNT(*) as count
       FROM submissions
       WHERE client_id = $1
       GROUP BY form_type`,
      [userId]
    );

    return {
      success: true,
      clientId: userId,
      timeSeries: timeSeries as any[],
      formTypes: formTypesRes.rows as any[]
    };
  });

export const getAnalyticsFormDetailsFn = createServerFn({ method: 'GET' })
  .validator((data: { formType: string }) => data)
  .handler(async ({ data }) => {
    const { formType } = data;
    if (!formType) {
      throw new Error('formType parameter is required');
    }

    const user = getAuthenticatedUser();
    const userId = user.id;

    const hasData = await userHasData(userId);
    if (!hasData) {
      return {
        success: true,
        recent: [],
        categories: [],
        keywords: []
      };
    }

    // 1. Get recent submissions for this form type
    const recentRes = await pool.query(
      `SELECT
         p.id,
         p.created_at,
         p.sentiment_label,
         p.priority,
         p.category,
         p.freetext,
         s.payload
       FROM processed_submissions p
       JOIN submissions s ON p.id = s.id
       WHERE p.client_id = $1 AND p.form_type = $2
       ORDER BY p.created_at DESC
       LIMIT 10`,
      [userId, formType]
    );

    // 2. Get categories breakdown
    const categoriesRes = await pool.query(
      `SELECT category, COUNT(*) as count
       FROM processed_submissions
       WHERE client_id = $1 AND form_type = $2 AND category IS NOT NULL
       GROUP BY category
       ORDER BY count DESC`,
      [userId, formType]
    );

    // 3. Get word frequencies / common keywords from freetext answers
    const freetextRes = await pool.query(
      `SELECT freetext FROM processed_submissions
       WHERE client_id = $1 AND form_type = $2`,
      [userId, formType]
    );

    const wordCount: Record<string, number> = {};
    const stopWords = new Set([
      'the', 'a', 'and', 'to', 'of', 'in', 'is', 'that', 'it', 'for', 'on', 'with', 'as',
      'this', 'was', 'at', 'by', 'an', 'be', 'are', 'from', 'i', 'you', 'my', 'we', 'have',
      'but', 'or', 'not', 'your', 'our', 'us', 'they', 'them', 'he', 'she', 'so', 'can', 'will'
    ]);

    freetextRes.rows.forEach((row: any) => {
      const texts = Object.values(row.freetext || {});
      texts.forEach((text: any) => {
        if (typeof text === 'string') {
          const words = text.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
          words.forEach((w: string) => {
            if (w.length > 2 && !stopWords.has(w)) {
              wordCount[w] = (wordCount[w] || 0) + 1;
            }
          });
        }
      });
    });

    const topKeywords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({ text: word, value: count }));

    return {
      success: true,
      recent: recentRes.rows as any[],
      categories: categoriesRes.rows as any[],
      keywords: topKeywords as any[]
    };
  });

export const getAnalyticsNpsFn = createServerFn({ method: 'GET' })
  .validator((data: { days?: number }) => data)
  .handler(async ({ data }) => {
    const days = data.days || 30;
    const user = getAuthenticatedUser();
    const clientId = user.id;

    const hasData = await userHasData(clientId);
    if (!hasData) {
      return {
        success: true,
        clientId, days, total: 0,
        promoters: 0, passives: 0, detractors: 0,
        npsScore: null,
        distribution: [
          { name: 'Promoters',  value: 0,  pct: 0 },
          { name: 'Passives',   value: 0,  pct: 0 },
          { name: 'Detractors', value: 0,  pct: 0 },
        ]
      };
    }

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
    const p = m.promoter || m.Promoters || 0, pa = m.passive || m.Passives || 0, d = m.detractor || m.Detractors || 0;
    const total = p + pa + d;

    return {
      success: true,
      clientId, days, total,
      promoters: p, passives: pa, detractors: d,
      npsScore: total ? Math.round(((p - d) / total) * 100) : null,
      distribution: [
        { name: 'Promoters',  value: p,  pct: total ? +((p/total)*100).toFixed(1)  : 0 },
        { name: 'Passives',   value: pa, pct: total ? +((pa/total)*100).toFixed(1) : 0 },
        { name: 'Detractors', value: d,  pct: total ? +((d/total)*100).toFixed(1)  : 0 },
      ]
    };
  });

export const getAnalyticsScoresFn = createServerFn({ method: 'GET' })
  .validator((data: { days?: number }) => data)
  .handler(async ({ data }) => {
    const days = data.days || 30;
    const user = getAuthenticatedUser();
    const clientId = user.id;

    const hasData = await userHasData(clientId);
    if (!hasData) {
      return { success: true, clientId, days, scores: [] };
    }

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
    return { success: true, clientId, days, scores: rows };
  });

export const getAnalyticsCategoriesFn = createServerFn({ method: 'GET' })
  .validator((data: { days?: number }) => data)
  .handler(async ({ data }) => {
    const days = data.days || 30;
    const user = getAuthenticatedUser();
    const clientId = user.id;

    const hasData = await userHasData(clientId);
    if (!hasData) {
      return { success: true, clientId, days, categories: {} };
    }

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
      const total = grouped[ft].reduce((s: number, r: any) => s + r.count, 0);
      grouped[ft].forEach((r: any) => { r.pct = +((r.count / total) * 100).toFixed(1); });
    }
    return { success: true, clientId, days, categories: grouped };
  });

export const getAnalyticsPriorityFn = createServerFn({ method: 'GET' })
  .validator((data: { days?: number }) => data)
  .handler(async ({ data }) => {
    const days = data.days || 30;
    const user = getAuthenticatedUser();
    const clientId = user.id;

    const hasData = await userHasData(clientId);
    if (!hasData) {
      return { success: true, clientId, days, priority: [] };
    }

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
    return { success: true, clientId, days, priority: rows };
  });

export const getAnalyticsVolumeFn = createServerFn({ method: 'GET' })
  .validator((data: { days?: number }) => data)
  .handler(async ({ data }) => {
    const days = data.days || 90;
    const user = getAuthenticatedUser();
    const clientId = user.id;

    const hasData = await userHasData(clientId);
    if (!hasData) {
      return {
        success: true,
        clientId,
        timeSeries: [],
        formTypes: [],
      };
    }

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
    const formTypes = new Set<string>();
    for (const r of rows) {
      const date = r.day.toISOString().slice(0, 10);
      if (!byDay[date]) byDay[date] = { date, total: 0 };
      byDay[date][r.form_type] = Number(r.count);
      byDay[date].total += Number(r.count);
      formTypes.add(r.form_type);
    }
    return {
      success: true,
      clientId,
      timeSeries: Object.values(byDay).sort((a: any, b: any) => a.date.localeCompare(b.date)) as Record<string, any>[],
      formTypes: Array.from(formTypes) as string[],
    };
  });

export const getAnalyticsSentimentFn = createServerFn({ method: 'GET' })
  .validator((data: { days?: number }) => data)
  .handler(async ({ data }) => {
    const days = data.days || 30;
    const user = getAuthenticatedUser();
    const clientId = user.id;

    const hasData = await userHasData(clientId);
    if (!hasData) {
      return { success: true, clientId, days, sentiment: [] };
    }

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
    return { success: true, clientId, days, sentiment: rows };
  });

export const getAnalyticsChurnFn = createServerFn({ method: 'GET' })
  .validator((data: { days?: number }) => data)
  .handler(async ({ data }) => {
    const days = data.days || 90;
    const user = getAuthenticatedUser();
    const clientId = user.id;

    const hasData = await userHasData(clientId);
    if (!hasData) {
      return { success: true, clientId, days, churn: [] };
    }

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
    return { success: true, clientId, days, churn: rows };
  });

export const getAnalyticsWinLossFn = createServerFn({ method: 'GET' })
  .validator((data: { days?: number }) => data)
  .handler(async ({ data }) => {
    const days = data.days || 90;
    const user = getAuthenticatedUser();
    const clientId = user.id;

    const hasData = await userHasData(clientId);
    if (!hasData) {
      return {
        success: true,
        clientId, days, total: 0,
        winRate:  null,
        lossRate: null,
        outcomes: [], lossReasons: [], pricePerception: [],
      };
    }

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

    return {
      success: true,
      clientId, days, total,
      winRate:  total ? +((wins / total) * 100).toFixed(1) : null,
      lossRate: total ? +((losses / total) * 100).toFixed(1) : null,
      outcomes, lossReasons, pricePerception,
    };
  });

export const getAnalyticsPricingFn = createServerFn({ method: 'GET' })
  .validator((data: { days?: number }) => data)
  .handler(async ({ data }) => {
    const days = data.days || 90;
    const user = getAuthenticatedUser();
    const clientId = user.id;

    const hasData = await userHasData(clientId);
    if (!hasData) {
      return { success: true, clientId, days, perception: [], blockers: [], pricePoints: null };
    }

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

    return { success: true, clientId, days, perception, blockers, pricePoints: pricePoints[0] ?? null };
  });
