import { autoPrepareApplications, getAutoPreparationReadiness } from "../../../lib/automation";
import { initialAppState } from "../../../lib/demo";
import type { AppState } from "../../../lib/types";

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

async function loadState(db: D1Database) {
  await ensureStateTable(db);
  const row = await db
    .prepare("SELECT state_json FROM app_states WHERE user_id = ?")
    .bind(initialAppState.user.id)
    .first<{ state_json: string }>();
  if (!row) return structuredClone(initialAppState);
  try {
    return JSON.parse(row.state_json) as AppState;
  } catch {
    return structuredClone(initialAppState);
  }
}

export async function GET() {
  const db = await getDatabase();
  if (!db) return Response.json({ readiness: getAutoPreparationReadiness(initialAppState), persistence: "demo-memory" });
  const state = await loadState(db);
  return Response.json({ readiness: getAutoPreparationReadiness(state), lastReport: state.schedule.lastReport ?? null, persistence: "d1" });
}

export async function POST() {
  const db = await getDatabase();
  if (!db) return Response.json({ error: "Production persistence is unavailable" }, { status: 503 });
  const state = await loadState(db);
  const result = autoPrepareApplications(state);
  await db
    .prepare("INSERT INTO app_states (user_id, state_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at")
    .bind(state.user.id, JSON.stringify(result.state), new Date().toISOString())
    .run();
  return Response.json({ state: result.state, report: result.report, persistence: "d1" });
}
