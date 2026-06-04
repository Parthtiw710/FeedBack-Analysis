import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth();

// cache client (so it's not recreated every request)
let client: any = null;

async function getClient(audience: string) {
  if (!client) {
    client = await auth.getIdTokenClient(audience);
  }
  return client;
}

// 🔥 This is your "authenticated fetch"
export async function internalFetch(url: string, options: any = {}) {
  const client = await getClient(url);

  const res = await client.request({
    url,
    ...options,
  });

  return res.data;
}