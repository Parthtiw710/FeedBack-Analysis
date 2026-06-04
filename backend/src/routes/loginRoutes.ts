import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

export const authRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';

authRouter.post('/google', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already exists
    const result = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          billing_id: user.billing_id
        }
      });
    }

    // User does not exist. If name is provided, create the user
    if (name) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }

      const insertResult = await pool.query(
        'INSERT INTO profiles (name, email, billing_id, api_keys) VALUES ($1, $2, 0, $3) RETURNING *',
        [trimmedName, email, '{}']
      );

      const newUser = insertResult.rows[0];
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, name: newUser.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          billing_id: newUser.billing_id
        }
      });
    }

    // User does not exist and name was not provided yet. Ask frontend to prompt for name.
    return res.json({
      success: false,
      needsName: true,
      email
    });
  } catch (err: any) {
    console.error('Google Auth Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
