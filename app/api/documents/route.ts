export const dynamic = "force-dynamic";

type RuntimeEnv = { FILES?: R2Bucket; DB?: D1Database };

const supportedExtensions = new Set(["pdf", "docx", "txt", "md", "markdown", "pptx", "xlsx", "csv", "png", "jpg", "jpeg", "json", "html"]);

export async function POST(request: Request) {
  const { env } = await import("cloudflare:workers");
  const runtime = env as unknown as RuntimeEnv;
  const form = await request.formData();
  const file = form.get("file");
  const authorized = form.get("authorized") === "true";
  if (!(file instanceof File) || !authorized) {
    return Response.json({ error: "A file and explicit analysis authorization are required" }, { status: 400 });
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!supportedExtensions.has(extension)) {
    return Response.json({ error: "Unsupported file type" }, { status: 415 });
  }
  const id = crypto.randomUUID();
  const objectKey = `demo-user/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  if (runtime.FILES) {
    await runtime.FILES.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  }
  let preview = "";
  if (["txt", "md", "markdown", "csv", "json", "html"].includes(extension)) {
    preview = (await file.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  }
  if (runtime.DB) {
    await runtime.DB.prepare(`CREATE TABLE IF NOT EXISTS source_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL,
      object_key TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`).run();
    await runtime.DB.prepare("INSERT INTO source_documents (id, user_id, name, type, size, object_key, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, "demo-user", file.name, file.type || extension, file.size, runtime.FILES ? objectKey : null, "authorized", new Date().toISOString())
      .run();
  }
  return Response.json({ id, name: file.name, type: file.type || extension, size: file.size, preview, status: "authorized", storedCopy: Boolean(runtime.FILES), originalUntouched: true });
}
