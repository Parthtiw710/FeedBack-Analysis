import jwt from 'jsonwebtoken';
import { getCookie } from '@tanstack/react-start/server';
import { pool } from './config/db.server.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';

export function getAuthenticatedUser() {
  // getCookie reads from H3's cookie jar — works correctly for all SSR and client server-fn calls
  const token = getCookie('token') || '';

  if (token) {
    try {
      const user = jwt.verify(token, JWT_SECRET) as { id: number; email: string; name: string };
      return user;
    } catch (err: any) {
      console.error('[authHelper] JWT verify error:', err.message);
    }
  }

  // Not logged in — return test client
  return {
    id: 1,
    email: 'test@example.com',
    name: 'Test Client'
  };
}

export async function userHasData(userId: number): Promise<boolean> {
  // The test client (id = 1) always has simulation data
  if (userId === 1) return true;

  try {
    const res = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM submissions WHERE client_id = $1 LIMIT 1)',
      [userId]
    );
    return res.rows[0]?.exists || false;
  } catch (err: any) {
    console.error('[authHelper] Error checking user data existence:', err.message);
    return false;
  }
}
