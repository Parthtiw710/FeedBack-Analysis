import { createServerFn } from '@tanstack/react-start';
import { pool } from '../config/db.server.js';
import { getAuthenticatedUser, userHasData } from '../authHelper.server.js';
import { processAndStore } from '../services/processAndStore.server.js';


export const getSubmissionsFn = createServerFn({ method: 'GET' })
  .validator((data: { page?: number; limit?: number; search?: string }) => data)
  .handler(async ({ data }) => {
    const user = getAuthenticatedUser();
    const userId = user.id;

    const page = data.page || 1;
    const limit = data.limit || 20;
    const offset = (page - 1) * limit;
    const search = data.search || '';

    const hasData = await userHasData(userId);
    if (!hasData) {
      return {
        success: true,
        submissions: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      };
    }

    let query = `
      SELECT * FROM submissions
      WHERE client_id = $1
    `;
    const params: any[] = [userId];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (form_type ILIKE $2 OR payload::text ILIKE $2)`;
    }

    params.push(limit, offset);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const countQuery = search
      ? { text: `SELECT COUNT(*) FROM submissions WHERE client_id = $1 AND (form_type ILIKE $2 OR payload::text ILIKE $2)`, values: [userId, `%${search}%`] }
      : { text: `SELECT COUNT(*) FROM submissions WHERE client_id = $1`, values: [userId] };

    const [rowsRes, countRes] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery.text, countQuery.values)
    ]);

    const total = Number(countRes.rows[0].count) || 0;

    return {
      success: true,
      submissions: rowsRes.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  });

export const getProcessedSubmissionsFn = createServerFn({ method: 'GET' })
  .validator((data: { page?: number; limit?: number; formType?: string }) => data)
  .handler(async ({ data }) => {
    const user = getAuthenticatedUser();
    const userId = user.id;

    const page = data.page || 1;
    const limit = data.limit || 20;
    const offset = (page - 1) * limit;
    const formType = data.formType || '';

    const hasData = await userHasData(userId);
    if (!hasData) {
      return {
        success: true,
        processedSubmissions: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      };
    }

    let query = `
      SELECT p.*, s.payload
      FROM processed_submissions p
      JOIN submissions s ON p.submission_id = s.id
      WHERE p.client_id = $1
    `;
    const params: any[] = [userId];

    if (formType) {
      params.push(formType);
      query += ` AND p.form_type = $2`;
    }

    params.push(limit, offset);
    query += ` ORDER BY p.processed_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const countQuery = formType
      ? { text: `SELECT COUNT(*) FROM processed_submissions WHERE client_id = $1 AND form_type = $2`, values: [userId, formType] }
      : { text: `SELECT COUNT(*) FROM processed_submissions WHERE client_id = $1`, values: [userId] };

    const [rowsRes, countRes] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery.text, countQuery.values)
    ]);

    const total = Number(countRes.rows[0].count) || 0;

    return {
      success: true,
      processedSubmissions: rowsRes.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  });

export const reprocessSubmissionsFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    const user = getAuthenticatedUser();
    const userId = user.id;

    const hasData = await userHasData(userId);
    if (!hasData) {
      return {
        success: true,
        message: `Reprocessing completed. Successfully processed 0 out of 0 submissions.`
      };
    }

    // Fetch all unprocessed or previously processed submissions for this client
    const submissionsRes = await pool.query(
      'SELECT id, form_type, payload, client_id FROM submissions WHERE client_id = $1',
      [userId]
    );

    const submissions = submissionsRes.rows;
    let successCount = 0;

    for (const sub of submissions) {
      try {
        await processAndStore(sub.id, sub.form_type, sub.payload, sub.client_id);
        successCount++;
      } catch (err: any) {
        console.error(`[Reprocess] Failed for submission ID ${sub.id}:`, err.message);
      }
    }

    return {
      success: true,
      message: `Reprocessing completed. Successfully processed ${successCount} out of ${submissions.length} submissions.`
    };
  });

export const deleteSubmissionFn = createServerFn({ method: 'POST' })
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const user = getAuthenticatedUser();
    const clientId = user.id;
    const r = await pool.query('DELETE FROM submissions WHERE id = $1 AND client_id = $2', [data.id, clientId]);
    if (r.rowCount === 0) {
      throw new Error('Submission not found');
    }
    return { success: true };
  });

export const getRawSubmissionsFn = createServerFn({ method: 'GET' })
  .validator((data: { limit?: number }) => data)
  .handler(async ({ data }) => {
    const user = getAuthenticatedUser();
    const clientId = user.id;
    const allowedLimits = [50, 100, 250, 500, 1000];
    const requested = Number(data.limit);
    const limit = allowedLimits.includes(requested) ? requested : 100;

    const hasData = await userHasData(clientId);
    if (!hasData) {
      return { success: true, count: 0, limit, rows: [] };
    }

    const { rows } = await pool.query(`
      SELECT id, form_type, payload, created_at
      FROM submissions
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [clientId, limit]);

    return { success: true, count: rows.length, limit, rows };
  });
