import { LlmAgent, zodObjectToSchema } from '@google/adk';
import { z } from 'zod';
import { Pool } from 'pg';

export const OUTPUT_KEY = 'insight_result';

export const InsightOutputSchema = z.object({
  insight_type: z.enum(['summary_report', 'trend_analysis', 'risk_assessment'])
    .default('summary_report'),

  content: z.object({
    summary: z.object({
      headline: z.string(),
      key_points: z.array(z.string()),
    }),
    nps_analysis: z.object({
      overall_score: z.number().optional(),
      commentary: z.string(),
    }),
    recommendations: z.array(z.object({
      title: z.string(),
      detail: z.string(),
    })),
    per_form_type: z.record(z.string(), z.object({
      summary: z.string(),
      trend: z.enum(['up', 'down', 'stable']),
    })),
  }),

  submission_ids: z.array(z.number())
    .describe("Array of processed_submission IDs that were analyzed"),

  priority_score: z.number().min(0).max(1).default(0.5),

  form_type: z.string().nullable(),
});

let _pool: Pool | null = null;
export const setPool = (pool: Pool) => { _pool = pool; };

export const rootAgent = new LlmAgent({
  name: 'ai_insights_agent',
  model: 'gemini-flash-latest',
  outputKey: OUTPUT_KEY,
  // Pass the schema through zodObjectToSchema so ADK converts it to a proper
  // Gemini-compatible JSON schema for controlled generation (not raw Zod)
  outputSchema: zodObjectToSchema(InsightOutputSchema),
  instruction: `
    You are a professional analyst analyzing form submission data.
    Extract client_id from the user message (format: "Generate a report for client_id: N").
    If no client_id is mentioned, assume client_id = 1.

    Based on typical SaaS feedback patterns, generate a structured insight report.
    Guidelines:
    - insight_type: "summary_report" for overview, "trend_analysis" for changes, "risk_assessment" for concerns
    - content.summary: 1 headline and 3-5 key_points as string array
    - content.nps_analysis: overall_score (0-10) and commentary string
    - content.recommendations: 3-5 items each with title and detail
    - content.per_form_type: object with keys like "survey", "feedback", "nps" each having summary and trend ("up", "down", or "stable")
    - submission_ids: use empty array []
    - priority_score: number between 0.0 and 1.0
    - form_type: most relevant form type string, or null
  `,
});
