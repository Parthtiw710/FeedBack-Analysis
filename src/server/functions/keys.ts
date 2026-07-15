import { createServerFn } from '@tanstack/react-start';
import randomstring from 'randomstring';
import { pool } from '../config/db.server.js';
import { getAuthenticatedUser } from '../authHelper.server.js';

export const getApiKeysFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const user = getAuthenticatedUser();
    const userId = user.id;

    const result = await pool.query(
      'SELECT api_keys FROM profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User profile not found');
    }

    const rawKeys = result.rows[0].api_keys || [];
    const maskedKeys = rawKeys.map((k: string) => {
      if (k.length > 8) {
        return `${k.substring(0, 4)}••••••••${k.substring(k.length - 4)}`;
      }
      return '••••••••';
    });

    return {
      success: true,
      apiKeys: maskedKeys
    };
  });

export const createApiKeyFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    const user = getAuthenticatedUser();
    const userId = user.id;

    if (userId === 1) {
      throw new Error('API key generation is disabled for the Test Client profile.');
    }

    const checkResult = await pool.query(
      'SELECT api_keys FROM profiles WHERE id = $1',
      [userId]
    );
    if (checkResult.rows.length === 0) {
      throw new Error('User profile not found');
    }

    const existingKeys = checkResult.rows[0].api_keys || [];
    if (existingKeys.length >= 1) {
      throw new Error('Maximum limit of 1 API key reached. Please revoke your existing key to generate a new one.');
    }

    const newApiKey = `fOS_${randomstring.generate(24)}`;

    await pool.query(
      `UPDATE profiles SET api_keys = array_append(api_keys, $1) WHERE id = $2`,
      [newApiKey, userId]
    );

    return {
      success: true,
      apiKey: newApiKey
    };
  });

export const deleteApiKeyFn = createServerFn({ method: 'POST' })
  .validator((data: { apiKey: string }) => data)
  .handler(async ({ data }) => {
    const { apiKey } = data;
    if (!apiKey) {
      throw new Error('apiKey to delete is required');
    }

    const user = getAuthenticatedUser();
    const userId = user.id;

    if (userId === 1) {
      throw new Error('API key deletion is disabled for the Test Client profile.');
    }

    const result = await pool.query(
      'SELECT api_keys FROM profiles WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      throw new Error('User profile not found');
    }

    const keys = result.rows[0].api_keys || [];
    let keyToRemove = apiKey;

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

    return {
      success: true,
      message: 'API key successfully revoked'
    };
  });
