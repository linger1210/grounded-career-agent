import { redactSecret } from "../../../lib/domain";

export const dynamic = "force-dynamic";

type RuntimeEnv = { DB?: D1Database; CREDENTIAL_ENCRYPTION_KEY?: string };

async function deriveKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt"]);
}

export async function POST(request: Request) {
  const { env } = await import("cloudflare:workers");
  const runtime = env as unknown as RuntimeEnv;
  if (!runtime.DB || !runtime.CREDENTIAL_ENCRYPTION_KEY) {
    return Response.json({ error: "Secure credential storage is not configured for this environment" }, { status: 503 });
  }
  const body = (await request.json()) as { provider?: string; credential?: string };
  if (!body.provider || !body.credential || body.credential.length < 8) {
    return Response.json({ error: "Enter a provider and a valid API credential" }, { status: 400 });
  }
  const key = await deriveKey(runtime.CREDENTIAL_ENCRYPTION_KEY);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(body.credential));
  const payload = `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(encrypted)))}`;
  await runtime.DB.prepare(`CREATE TABLE IF NOT EXISTS provider_credentials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    encrypted_value TEXT NOT NULL,
    masked_suffix TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
  await runtime.DB.prepare("DELETE FROM provider_credentials WHERE user_id = ? AND provider = ?").bind("demo-user", body.provider).run();
  await runtime.DB.prepare("INSERT INTO provider_credentials (id, user_id, provider, encrypted_value, masked_suffix, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), "demo-user", body.provider, payload, redactSecret(body.credential), new Date().toISOString())
    .run();
  return Response.json({ saved: true, masked: redactSecret(body.credential) });
}

export async function DELETE(request: Request) {
  const { env } = await import("cloudflare:workers");
  const runtime = env as unknown as RuntimeEnv;
  if (!runtime.DB) return Response.json({ deleted: false }, { status: 503 });
  const provider = new URL(request.url).searchParams.get("provider");
  if (!provider) return Response.json({ error: "Provider is required" }, { status: 400 });
  await runtime.DB.prepare("DELETE FROM provider_credentials WHERE user_id = ? AND provider = ?").bind("demo-user", provider).run();
  return Response.json({ deleted: true });
}
