import { pool } from '../config/db.server.js';

export async function runAgentInsights(clientId: number = 1) {
  // 1. Check if user has less than 10 submissions using a highly efficient query
  const checkRes = await pool.query(
    'SELECT id FROM submissions WHERE client_id = $1 LIMIT 10',
    [clientId]
  );
  const totalSubmissions = checkRes.rows.length;

  if (totalSubmissions < 10) {
    // Generate server-side mock analysis to save Gemini costs
    const parsed = {
      insight_type: "summary_report",
      content: {
        summary: {
          headline: "Insufficient Submissions to Generate Insights",
          key_points: [
            "Your account currently has less than 10 submissions.",
            "AI analytics requires a minimum of 10 submissions to perform deep statistical analysis and reliable sentiment mapping.",
            "Once you collect more submissions, you can regenerate this report to get full analytical insights."
          ]
        },
        nps_analysis: {
          overall_score: 0,
          commentary: "No NPS analysis commentary available due to insufficient data."
        },
        recommendations: [
          {
            "title": "Distribute your forms",
            "detail": "Start collecting more submissions through your configured form endpoints."
          },
          {
            "title": "Verify API key integration",
            "detail": "Test your endpoints by sending mock requests to ensure submissions are being logged."
          }
        ],
        per_form_type: {}
      },
      submission_ids: [],
      priority_score: 0.1,
      form_type: null,
      system_message: "Available submissions is very very less to generate a proper AI analysis."
    };

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO ai_insights (client_id, batch_id, insight_type, content)
       VALUES ($1, $2, $3, $4)`,
      [clientId, batchId, parsed.insight_type, JSON.stringify(parsed)]
    );

    return { ...parsed, batchId };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not defined');
  }

  const systemPrompt = `
    You are a professional analyst analyzing form submission data for client_id: ${clientId}.
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
  `;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const response = await fetch(`${url}?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\nGenerate the JSON report.` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            insight_type: {
              type: "STRING",
              enum: ["summary_report", "trend_analysis", "risk_assessment"]
            },
            content: {
              type: "OBJECT",
              properties: {
                summary: {
                  type: "OBJECT",
                  properties: {
                    headline: { type: "STRING" },
                    key_points: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    }
                  },
                  required: ["headline", "key_points"]
                },
                nps_analysis: {
                  type: "OBJECT",
                  properties: {
                    overall_score: { type: "NUMBER" },
                    commentary: { type: "STRING" }
                  },
                  required: ["commentary"]
                },
                recommendations: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      title: { type: "STRING" },
                      detail: { type: "STRING" }
                    },
                    required: ["title", "detail"]
                  }
                },
                per_form_type: {
                  type: "OBJECT",
                  additionalProperties: {
                    type: "OBJECT",
                    properties: {
                      summary: { type: "STRING" },
                      trend: {
                        type: "STRING",
                        enum: ["up", "down", "stable"]
                      }
                    },
                    required: ["summary", "trend"]
                  }
                }
              },
              required: ["summary", "nps_analysis", "recommendations", "per_form_type"]
            },
            submission_ids: {
              type: "ARRAY",
              items: { type: "INTEGER" }
            },
            priority_score: { type: "NUMBER" },
            form_type: {
              type: "STRING",
              nullable: true
            }
          },
          required: ["insight_type", "content", "submission_ids", "priority_score", "form_type"]
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API call failed: ${response.status} - ${errorText}`);
  }

  const resData = await response.json();
  const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  const parsed = JSON.parse(text);

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await pool.query(
    `INSERT INTO ai_insights (client_id, batch_id, insight_type, content)
     VALUES ($1, $2, $3, $4)`,
    [clientId, batchId, parsed.insight_type, JSON.stringify(parsed)]
  );

  return { ...parsed, batchId };
}