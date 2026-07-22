import { initialAppState } from "../../../lib/demo";

export const dynamic = "force-dynamic";

type RuntimeEnv = {
  DB?: D1Database;
};

async function ensureStateTable(db: D1Database) {
  await db
    .prepare(`CREATE TABLE IF NOT EXISTS app_states (
      user_id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`)
    .run();
}

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  return (env as unknown as RuntimeEnv).DB;
}

export async function GET() {
  const db = await getDatabase();
  if (!db) return Response.json({ state: initialAppState, persistence: "demo-memory" });
  await ensureStateTable(db);
  const row = await db.prepare("SELECT state_json FROM app_states WHERE user_id = ?").bind(initialAppState.user.id).first<{ state_json: string }>();
  if (!row) return Response.json({ state: initialAppState, persistence: "d1-seed" });
  try {
    return Response.json({ state: JSON.parse(row.state_json), persistence: "d1" });
  } catch {
    return Response.json({ state: initialAppState, persistence: "d1-recovered" });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { state?: unknown };
  if (!body.state || typeof body.state !== "object") {
    return Response.json({ error: "A valid state object is required" }, { status: 400 });
  }
  const state = body.state as typeof initialAppState;
  if (state.user?.id !== initialAppState.user.id || !Array.isArray(state.applications)) {
    return Response.json({ error: "State failed validation" }, { status: 400 });
  }
  const db = await getDatabase();
  if (!db) return Response.json({ saved: false, persistence: "demo-memory" });
  await ensureStateTable(db);
  await db
    .prepare("INSERT INTO app_states (user_id, state_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at")
    .bind(state.user.id, JSON.stringify(state), new Date().toISOString())
    .run();
  return Response.json({ saved: true, persistence: "d1" });
}

export async function DELETE() {
  const db = await getDatabase();
  if (!db) return Response.json({ deleted: false, persistence: "demo-memory" });
  await ensureStateTable(db);
  await db.prepare("DELETE FROM app_states WHERE user_id = ?").bind(initialAppState.user.id).run();
  return Response.json({ deleted: true, originalFilesUntouched: true });
}
