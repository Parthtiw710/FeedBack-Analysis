import { createServerFn } from '@tanstack/react-start';
import { deleteCookie } from '@tanstack/react-start/server';
import { pool } from '../config/db.server.js';
import { getAuthenticatedUser } from '../authHelper.server.js';

export const deleteAccountFn = createServerFn({ method: 'POST' }).handler(async () => {
  const user = getAuthenticatedUser();

  if (user.id === 1) {
    throw new Error('Cannot delete the test client account.');
  }

  await pool.query('DELETE FROM profiles WHERE id = $1', [user.id]);

  // Clear the auth cookie server-side
  deleteCookie('token', { path: '/' });

  return { success: true };
});
