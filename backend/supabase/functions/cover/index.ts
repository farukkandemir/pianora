/**
 * POST /functions/v1/cover
 * Body: { title: string, composer?: string, dryRun?: boolean }   Header: x-install-id
 * Returns { url, cached }. The same piece is generated once and reused.
 * The app sends its publishable key in the apikey header; checked below.
 */
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../_shared/database.types.ts";

const BUCKET = "covers";

/** The whole prompt. Short on purpose: the model does better with a mood than with a novel. */
function prompt(title: string, composer: string | null): string {
  const piece = composer ? `${title} by ${composer}` : title;
  return (
    `Album cover for ${piece}. Abstract, stylized interpretation, not literal or photorealistic. ` +
    `Capture the emotion, not the dictionary meaning. Painterly, dreamy or surreal aesthetic. ` +
    `Single unified image, no collage. Edge to edge, no text, no borders.`
  );
}

/** One image provider today; add another with the same shape and switch here. */
interface CoverProvider {
  name: string;
  generate(prompt: string): Promise<{ bytes: Uint8Array<ArrayBuffer>; mime: string }>;
}

/** IMAGE_MODEL picks the Gemini image model: gemini-3.1-flash-image for production, gemini-3.1-flash-lite-image (half price) for tests. */
const gemini: CoverProvider = {
  name: Deno.env.get("IMAGE_MODEL") || "gemini-3.1-flash-image",
  async generate(prompt) {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.name}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const parts: Array<{ inlineData?: { mimeType: string; data: string } }> = data?.candidates?.[0]?.content?.parts ?? [];
    const image = parts.find((p) => p.inlineData)?.inlineData;
    if (!image) throw new Error("Gemini returned no image");
    return { bytes: Uint8Array.from(atob(image.data), (c) => c.charCodeAt(0)), mime: image.mimeType || "image/png" };
  },
};

const provider: CoverProvider = gemini;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!hasPublishableKey(req)) return json({ error: "apikey header must be the app's publishable key" }, 401);
  const installId = req.headers.get("x-install-id")?.trim();
  if (!installId) return json({ error: "x-install-id header required" }, 400);

  let body: { title?: unknown; composer?: unknown; dryRun?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON body required" }, 400);
  }
  const title = clean(body.title);
  const composer = clean(body.composer);
  if (!title) return json({ error: "title required" }, 400);

  const key = await coverKey(title, composer);
  const dryRun = body.dryRun === true;
  const db = adminClient();

  if (!dryRun) {
    const existing = await db.from("covers").select("path").eq("key", key).maybeSingle();
    if (existing.error) return json({ error: existing.error.message }, 500);
    if (existing.data) return json({ url: publicUrl(db, existing.data.path), cached: true });
  }

  let image: { bytes: Uint8Array<ArrayBuffer>; mime: string };
  try {
    image = await provider.generate(prompt(title, composer));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "generation failed" }, 502);
  }

  // Dry run: hand the image straight back, store nothing. For judging the prompt.
  if (dryRun) {
    return new Response(image.bytes, { headers: { "content-type": image.mime, "x-model": provider.name } });
  }

  const path = `${key}.${ext(image.mime)}`;
  const up = await db.storage.from(BUCKET).upload(path, image.bytes, { contentType: image.mime, cacheControl: "31536000", upsert: true });
  if (up.error) return json({ error: up.error.message }, 500);

  const ins = await db.from("covers").insert({ key, install_id: installId, title, composer, model: provider.name, path });
  // 23505 = unique violation: another request generated the same piece first. Its file is the same key, so fine.
  if (ins.error && ins.error.code !== "23505") return json({ error: ins.error.message }, 500);

  return json({ url: publicUrl(db, path), cached: false });
});

/** The gateway does not check publishable keys (they are not JWTs), so the function does. */
function hasPublishableKey(req: Request): boolean {
  const sent = req.headers.get("apikey")?.trim();
  if (!sent) return false;
  const known = new Set<string>(Object.values(keysFromEnv("SUPABASE_PUBLISHABLE_KEYS")));
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) known.add(legacy);
  return known.has(sent);
}

/** Service-role client: bypasses row-level security, so it never leaves this function. */
function adminClient(): SupabaseClient<Database> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Object.values(keysFromEnv("SUPABASE_SECRET_KEYS"))[0];
  if (!url || !key) throw new Error("Supabase service credentials missing");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

/** Newer runtimes expose key sets as JSON dictionaries in the environment. */
function keysFromEnv(name: string): Record<string, string> {
  try {
    const parsed = JSON.parse(Deno.env.get(name) ?? "{}");
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

/** Same piece, same key: lowercase, trimmed, single-spaced, diacritics kept. */
async function coverKey(title: string, composer: string | null): Promise<string> {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const input = new TextEncoder().encode(`${norm(title)}|${composer ? norm(composer) : ""}`);
  const hash = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function publicUrl(db: SupabaseClient<Database>, path: string): string {
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim().slice(0, 200);
  return s || null;
}

function ext(mime: string): string {
  return mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
