import express, { Response } from 'express';
import randomstring from 'randomstring';
import { pool } from '../config/db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

export const keysRouter = express.Router();

// Apply JWT authentication to all API key management routes
keysRouter.use(authenticateJWT);

/**
 * GET /api-keys
 * Retrieve all API keys for the authenticated profile (masked for security)
 */
keysRouter.get('/server-api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      'SELECT api_keys FROM profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const rawKeys = result.rows[0].api_keys || [];
    // Mask keys so they are not exposed in plaintext on subsequent fetches
    const maskedKeys = rawKeys.map((k: string) => {
      if (k.length > 8) {
        return `${k.substring(0, 4)}••••••••${k.substring(k.length - 4)}`;
      }
      return '••••••••';
    });

    res.json({
      success: true,
      apiKeys: maskedKeys
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api-keys
 * Generate a new API key and append it to the profile (max 1 key per account, disabled for test client)
 */
keysRouter.post('/server-api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // 1. Disable for Test Client (ID 1)
    if (userId === 1) {
      return res.status(403).json({ error: 'API key generation is disabled for the Test Client profile.' });
    }

    // 2. Limit to max 1 key per account
    const checkResult = await pool.query(
      'SELECT api_keys FROM profiles WHERE id = $1',
      [userId]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const existingKeys = checkResult.rows[0].api_keys || [];
    if (existingKeys.length >= 1) {
      return res.status(400).json({ error: 'Maximum limit of 1 API key reached. Please revoke your existing key to generate a new one.' });
    }

    // Generate a professional looking API key
    const newApiKey = `fOS_${randomstring.generate(24)}`;

    await pool.query(
      `UPDATE profiles SET api_keys = array_append(api_keys, $1) WHERE id = $2`,
      [newApiKey, userId]
    );

    // Return the unmasked key so they can copy it once upon creation
    res.json({
      success: true,
      apiKey: newApiKey
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api-keys
 * Revoke/delete an API key (supports deleting by masked pattern)
 */
keysRouter.delete('/server-api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey to delete is required' });
    }

    // Get user's current keys
    const result = await pool.query(
      'SELECT api_keys FROM profiles WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const keys = result.rows[0].api_keys || [];
    let keyToRemove = apiKey;

    // If key is masked (contains bullet points), resolve to the actual key
    if (apiKey.includes('•')) {
      const suffix = apiKey.split('•').pop();
      const matched = keys.find((k: string) => suffix && k.endsWith(suffix));
      if (matched) {
        keyToRemove = matched;
      }
    }

    await pool.query(
      `UPDATE profiles SET api_keys = array_remove(api_keys, $1) WHERE id = $2`,
      [keyToRemove, userId]
    );

    res.json({
      success: true,
      message: 'API key successfully revoked'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});