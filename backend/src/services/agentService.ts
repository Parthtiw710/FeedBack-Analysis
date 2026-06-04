import { Runner, InMemorySessionService, isFinalResponse } from '@google/adk';
import { rootAgent, InsightOutputSchema, OUTPUT_KEY } from '../agent/agent.js';
import { pool } from '../config/db.js';

const DEFAULT_CLIENT_ID = 1;

export async function runAgentInsights(clientId: number = DEFAULT_CLIENT_ID) {
  const sessionService = new InMemorySessionService();
  const session = await sessionService.createSession({ appName: 'insights', userId: `user_${clientId}` });
  const runner = new Runner({ agent: rootAgent, appName: 'insights', sessionService });

  let parsed: any = null;

  const stream = runner.runAsync({
    userId: `user_${clientId}`,
    sessionId: session.id,
    newMessage: {
      role: 'user',
      parts: [{ text: `Generate a report for client_id: ${clientId}` }]
    }
  });

  for await (const event of stream) {
    const eventAny = event as any;
    const isFinal = isFinalResponse(event);

    console.log(`[Agent Event] author=${eventAny?.author}, has content=${!!eventAny?.content}, final=${isFinal}`);

    // ── Strategy 1: outputKey → stateDelta (when zodObjectToSchema + outputKey works correctly) ──
    const fromState = eventAny?.actions?.stateDelta?.[OUTPUT_KEY];
    if (fromState) {
      try {
        const raw = typeof fromState === 'string' ? JSON.parse(fromState) : fromState;
        parsed = InsightOutputSchema.parse(raw);
        console.log(`[Agent] ✅ Parsed from stateDelta`);
        break;
      } catch (e) {
        console.log(`[Agent] stateDelta parse error: ${(e as Error).message}`);
      }
    }

    // ── Strategy 2: content.parts[].text — check every event, not just final ──
    if (!parsed && eventAny?.content?.parts && Array.isArray(eventAny.content.parts)) {
      for (const part of eventAny.content.parts) {
        if (part?.text) {
          // Strip markdown code fences if present
          const rawText = part.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          if (!rawText.startsWith('{')) continue;
          console.log(`[Agent] Found text (${rawText.length} chars): ${rawText.substring(0, 80)}...`);
          try {
            const json = JSON.parse(rawText);
            parsed = InsightOutputSchema.parse(json);
            console.log(`[Agent] ✅ Parsed from text part`);
            break;
          } catch (e) {
            console.log(`[Agent] Text parse error: ${(e as Error).message}`);
          }
        }
      }
    }

    if (parsed) break;
  }

  if (!parsed) {
    console.error(`[Agent] No valid response found for client_id=${clientId}`);
    throw new Error(`No valid insight response for client_id=${clientId}`);
  }

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await pool.query(
    `INSERT INTO ai_insights (client_id, batch_id, insight_type, content)
     VALUES ($1, $2, $3, $4)`,
    [clientId, batchId, parsed.insight_type, JSON.stringify(parsed)]
  );

  return { ...parsed, batchId };
}