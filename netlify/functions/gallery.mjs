// Gallery storage for drpremgastro.com (Netlify Functions + Netlify Blobs).
//   GET  /api/gallery            -> { items: [...] } the gallery list (items: null until the first save)
//   GET  /api/gallery?img=<id>   -> one uploaded photo
//   POST /api/gallery            -> needs header x-gallery-key = the GALLERY_PASSWORD set in Netlify
//        { op: "check" } | { op: "upload", type, data(base64) } | { op: "save", items }
import { getStore } from "@netlify/blobs";
import { timingSafeEqual, randomUUID } from "node:crypto";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function same(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); }
function clean(items) {
  if (!Array.isArray(items)) return null;
  return items.slice(0, 200).map((x) => {
    if (!x || typeof x !== "object") return null;
    const cap = typeof x.cap === "string" ? x.cap.slice(0, 140) : "";
    if (typeof x.id === "string" && /^[a-f0-9-]{8,64}$/.test(x.id)) return { id: x.id, cap };
    if (typeof x.src === "string" && /^\/(assets|gallery)\/[\w.\-]+$/.test(x.src)) return { src: x.src, cap };
    return null;
  }).filter(Boolean);
}

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore({ name: "gallery", consistency: "strong" });

  if (req.method === "GET") {
    const img = url.searchParams.get("img");
    if (img) {
      if (!/^[a-f0-9-]{8,64}$/.test(img)) return new Response("Not found", { status: 404 });
      const r = await store.getWithMetadata("img/" + img, { type: "arrayBuffer" });
      if (!r) return new Response("Not found", { status: 404 });
      return new Response(r.data, { headers: { "content-type": (r.metadata && r.metadata.type) || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
    }
    const m = await store.get("manifest", { type: "json" });
    return json({ items: m && Array.isArray(m.items) ? m.items : null, updatedAt: m && m.updatedAt });
  }

  if (req.method !== "POST") return json({ error: "method-not-allowed" }, 405);
  const pass = process.env.GALLERY_PASSWORD;
  if (!pass) return json({ error: "no-password-set" }, 500);
  if (!same(req.headers.get("x-gallery-key") || "", pass)) { await sleep(800); return json({ error: "wrong-password" }, 401); }

  let body = null;
  try { body = await req.json(); } catch (e) { return json({ error: "bad-request" }, 400); }

  if (body.op === "check") return json({ ok: true });

  if (body.op === "upload") {
    if (!TYPES.includes(body.type) || typeof body.data !== "string") return json({ error: "unsupported-type" }, 400);
    const buf = Buffer.from(body.data, "base64");
    if (!buf.length || buf.length > 4.5 * 1024 * 1024) return json({ error: "too-large" }, 413);
    const id = randomUUID();
    await store.set("img/" + id, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), { metadata: { type: body.type, at: Date.now() } });
    return json({ id });
  }

  if (body.op === "save") {
    const items = clean(body.items);
    if (!items) return json({ error: "bad-items" }, 400);
    const old = await store.get("manifest", { type: "json" });
    const keep = new Set(items.filter((x) => x.id).map((x) => x.id));
    for (const x of (old && old.items) || []) if (x.id && !keep.has(x.id)) await store.delete("img/" + x.id);
    await store.setJSON("manifest", { items, updatedAt: new Date().toISOString() });
    return json({ ok: true });
  }

  return json({ error: "unknown-op" }, 400);
};

export const config = { path: "/api/gallery" };
