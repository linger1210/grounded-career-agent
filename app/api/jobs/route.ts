import { GreenhousePublicBoardAdapter } from "../../../lib/job-sources/greenhouse";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const board = url.searchParams.get("board");
  const company = url.searchParams.get("company") ?? board;
  if (!board || !company) {
    return Response.json({ error: "Provide a Greenhouse board token and company name" }, { status: 400 });
  }
  try {
    const adapter = new GreenhousePublicBoardAdapter(board, company);
    const jobs = await adapter.searchJobs({
      roles: url.searchParams.getAll("role"),
      countries: url.searchParams.getAll("country"),
    });
    return Response.json({
      source: { id: adapter.id, label: adapter.label, live: true, capability: "public discovery only" },
      jobs: jobs.map((job) => adapter.normalizeJob(job)),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Job source failed" }, { status: 502 });
  }
}
