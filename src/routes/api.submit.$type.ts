import { createFileRoute } from '@tanstack/react-router';
import { pool } from '../server/config/db.server.js';
import { FORM_MAP } from '../server/constants/formMaps.server.js';
import { processAndStore } from '../server/services/processAndStore.server.js';

async function verifyAPIKey(request: Request) {
  let apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    const url = new URL(request.url);
    apiKey = url.searchParams.get('apiKey');
  }

  // Try parsing from body clone if still missing
  if (!apiKey && request.method === 'POST') {
    try {
      const clone = request.clone();
      const body = await clone.json();
      apiKey = body.apiKey || body.api_key;
    } catch (e) {
      // ignore
    }
  }

  if (!apiKey) {
    return { authenticated: false, error: 'API key is missing.', status: 401 };
  }

  const userResult = await pool.query(
    'SELECT id, name, email FROM profiles WHERE $1 = ANY(api_keys)',
    [apiKey]
  );

  if (userResult.rows.length === 0) {
    return { authenticated: false, error: 'Invalid API key.', status: 403 };
  }

  return { authenticated: true, user: userResult.rows[0] };
}

export const Route = createFileRoute('/api/submit/$type')({
  server: {
    handlers: {
      POST: async ({ request, params }: { request: Request; params: { type: string } }) => {
        const auth = await verifyAPIKey(request);
        if (!auth.authenticated || !auth.user) {
          return new Response(JSON.stringify({ error: auth.error }), {
            status: auth.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const formType = params.type;
        const clientId = auth.user.id;

        let body: any;
        try {
          body = await request.json();
        } catch (err) {
          return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Exclude auth keys from the payload
        const { apiKey, api_key, ...payload } = body;

        // Validate that formType exists in FORM_MAP
        if (!FORM_MAP[formType]) {
          return new Response(JSON.stringify({ error: `Unsupported form type: ${formType}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        try {
          // 1. Allocate next submission ID
          const seqResult = await pool.query("SELECT nextval('submissions_id_seq') as next_id");
          const submissionId = Number(seqResult.rows[0].next_id);

          // 2. Insert into submissions
          await pool.query(
            `INSERT INTO submissions (id, form_type, payload, client_id)
             VALUES ($1, $2, $3, $4)`,
            [submissionId, formType, JSON.stringify(payload), clientId]
          );

          // 3. Queue the message in pgmq
          await pool.query(
            `SELECT * FROM pgmq.send('form_queue', $1::jsonb)`,
            [JSON.stringify({ submission_id: submissionId, form_type: formType, payload, client_id: clientId })]
          );

          // 4. Process synchronously in the background to ensure real-time analysis
          processAndStore(submissionId, formType, payload, clientId).catch((err) => {
            console.error(`[Synchronous Pipeline] Failed for submission ID ${submissionId}:`, err.message);
          });

          return new Response(JSON.stringify({
            success: true,
            message: 'Submission received and queued.',
            submissionId
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });

        } catch (err: any) {
          console.error('[Submit] Error processing submission:', err.message);
          return new Response(JSON.stringify({ error: err.message || 'Internal server error.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }
  }
});

