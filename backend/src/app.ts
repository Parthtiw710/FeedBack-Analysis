import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyticsRouter } from './routes/analyticsRoutes.js';
import { insightsRouter } from './routes/insightsRoutes.js';
import { submissionRouter } from './routes/submissionRoutes.js';
import { authRouter } from './routes/loginRoutes.js';
import { keysRouter } from './routes/keysRoutes.js';

dotenv.config();

export const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Mount specific routers
app.use('/server-auth', authRouter);
app.use(keysRouter);
app.use(submissionRouter);
app.use(analyticsRouter);
app.use(insightsRouter);

export default app;
