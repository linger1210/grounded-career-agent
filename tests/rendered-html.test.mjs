import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished Grounded landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Grounded — Realistic AI career guidance<\/title>/i);
  assert.match(html, /without inventing your experience/i);
  assert.match(html, /Analyze My Career for Free/);
  assert.match(html, /Evidence-based\. Explainable\. Private\. Deletable\./);
  assert.match(html, /AI resume optimizer/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("rendered page exposes one English interface and accessible landmarks", async () => {
  const html = await (await render()).text();
  assert.match(html, /<html lang="en"/i);
  assert.match(html, /<main>/i);
  assert.match(html, /aria-label="Landing navigation"/i);
  assert.match(html, /Privacy by default/);
});
