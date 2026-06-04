import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { analyticsRouter } from './routes/analyticsRoutes.js';
import { insightsRouter } from './routes/insightsRoutes.js';
import { submissionRouter } from './routes/submissionRoutes.js';
import { authRouter } from './routes/loginRoutes.js';
import { keysRouter } from './routes/keysRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Routes and static file serving
const adminPanelDist = join(dirname(dirname(__dirname)), 'admin-panel', 'dist');

app.use(express.static(adminPanelDist));

// Mount specific routers
app.use('/server-auth', authRouter);
app.use(keysRouter);
app.use(submissionRouter);
app.use(analyticsRouter);
app.use(insightsRouter);

// Serve React SPA index.html for all non-API paths
app.get('*', (req: Request, res: Response) => {
  res.sendFile(join(adminPanelDist, 'index.html'));
});

export default app;
