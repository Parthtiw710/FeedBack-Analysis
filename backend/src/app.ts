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
app.use(express.json());

// Regex to allow any localhost port (HTTP/HTTPS) and feedback.parthtiw710.dev (HTTP/HTTPS)
const ALLOWED_ORIGINS_REGEX = /^(https?:\/\/localhost(:\d+)?|https?:\/\/feedback\.parthtiw710\.dev)$/;

const dashboardCors = cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS_REGEX.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
});

const publicCors = cors({
  origin: true,
  credentials: true
});

// Dynamically apply CORS based on the request path
app.use((req, res, next) => {
  if (req.path.startsWith('/server-submit') || req.path.startsWith('/server-forms')) {
    return publicCors(req, res, next);
  }
  return dashboardCors(req, res, next);
});

// Mount specific routers
app.use('/server-auth', authRouter);
app.use(keysRouter);
app.use(submissionRouter);
app.use(analyticsRouter);
app.use(insightsRouter);

export default app;
