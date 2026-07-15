import { createServerFn } from '@tanstack/react-start';
import { pool } from '../config/db.server.js';
import { getAuthenticatedUser, userHasData } from '../authHelper.server.js';
import { runDailyBatch } from '../services/pipelineService.server.js';
import { runAgentInsights } from '../services/agentService.server.js';

export const getInsightsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const user = getAuthenticatedUser();
    const userId = user.id;

    const hasData = await userHasData(userId);
    if (!hasData) {
      return {
        success: true,
        insights: []
      };
    }

    const result = await pool.query(
      `SELECT * FROM ai_insights
       WHERE client_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    return {
      success: true,
      insights: result.rows
    };
  });

export const runDailyBatchFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    const user = getAuthenticatedUser();
    if (user.id !== 1) {
      throw new Error('Unauthorized. Only system administrator can run daily batch pipeline.');
    }

    try {
      const stats = await runDailyBatch(pool);
      return {
        success: true,
        message: 'Daily pipeline completed successfully',
        ...stats
      };
    } catch (err: any) {
      throw new Error(err.message || 'Pipeline execution failed');
    }
  });

export const runAgentInsightsFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    const user = getAuthenticatedUser();
    const userId = user.id;

    if (userId === 1) {
      throw new Error('AI insights generation is disabled for the Test Client profile.');
    }

    const hasData = await userHasData(userId);
    if (!hasData) {
      return {
        success: true,
        message: 'No submissions found to generate insights for.',
        data: null
      };
    }

    try {
      const result = await runAgentInsights(userId);
      return {
        success: true,
        message: 'AI Agent insights generated successfully',
        data: result
      };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to generate AI insights');
    }
  });

export const deleteInsightFn = createServerFn({ method: 'POST' })
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const user = getAuthenticatedUser();
    const clientId = user.id;

    if (clientId === 1) {
      throw new Error('AI insights deletion is disabled for the Test Client profile.');
    }

    const r = await pool.query(
      'DELETE FROM ai_insights WHERE id = $1 AND client_id = $2',
      [data.id, clientId]
    );

    if (r.rowCount === 0) {
      throw new Error('Insight not found');
    }

    return { success: true };
  });
