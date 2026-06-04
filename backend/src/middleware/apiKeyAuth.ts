import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db.js';

export interface APIKeyRequest extends Request {
  clientId?: number;
}

export async function authenticateAPIKey(req: APIKeyRequest, res: Response, next: NextFunction) {
  // Support API key in header (x-api-key), query parameter (api_key), or body (api_key)
  const apiKey = (req.headers['x-api-key'] || req.query.api_key || req.body.api_key) as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const result = await pool.query(
      `SELECT id FROM profiles WHERE $1 = ANY(api_keys)`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.clientId = result.rows[0].id;
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
