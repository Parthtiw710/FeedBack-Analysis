import { createFileRoute } from '@tanstack/react-router';
import { pool } from '../server/config/db.server.js';
import { forms } from '../server/constants/forms.server.js';

async function verifyAPIKey(request: Request) {
  let apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    const url = new URL(request.url);
    apiKey = url.searchParams.get('apiKey');
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

export const Route = createFileRoute('/api/forms/$type')({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { type: string } }) => {
        const auth = await verifyAPIKey(request);
        if (!auth.authenticated) {
          return new Response(JSON.stringify({ error: auth.error }), {
            status: auth.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const typeStr = params.type;
        const form = (forms as any)[typeStr];
        if (!form) {
          return new Response(JSON.stringify({ error: 'Form definition not found.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(form), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }
});

