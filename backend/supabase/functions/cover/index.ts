/**
 * POST /functions/v1/cover
 * Body: { title: string, composer?: string, dryRun?: boolean }   Header: x-install-id
 * Returns { url, cached }. The same piece is generated once and reused.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "covers";

/** The paint, fixed for every cover. Subject and composition come from the brief. */
const STYLE =
  "Opaque gouache painting, not watercolour. Flat shapes with soft edges, subtle paper grain, soft natural light. " +
  "The painting fills the entire square frame edge to edge: no paper border, no white margin, no frame, no vignette. " +
  "No text, no letters, no people, no faces, no musical instruments, no sheet music.";

/** Compositions the brief may pick from, so the grid never repeats one layout. */
const COMPOSITIONS = [
  "a wide scene with a low horizon",
  "a close crop of one thing, edges cut off by the frame",
  "seen from directly above",
  "a corner of a room or a window",
  "a pattern or texture filling the whole frame",
  "a small thing in a large empty space",
];

const TEXT_MODEL = "gemini-3.1-flash-lite";

/** Ask a text model for a short art brief: what to paint, how to frame it, which colours. */
async function writeBrief(title: string, composer: string | null, composition: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const piece = composer ? `"${title}" by ${composer}` : `"${title}"`;
  const ask =
    `You write briefs for a painter making cover art for piano pieces. The piece is ${piece}. ` +
    `Draw the subject from the piece's era and place of origin, so a 1900s American rag, a Viennese bagatelle and an Italian folk song each look like where they come from. ` +
    `Match the emotional register of the piece: a cheerful or festive piece gets a bright, warm, lively scene with daylight; ` +
    `a tender piece gets something gentle; only a genuinely sombre piece gets a dark or lonely scene. Not every piece is melancholy. ` +
    `Cheer comes from the subject and daylight, never from loud colour: every palette is chalky and muted, like faded gouache. ` +
    `Pick the palette family that fits the piece (cool blues and greys; warm ochres and terracotta; pale pastels; deep greens and browns; dusky rose and plum; slate and sand) and name three muted colours from it. ` +
    `Never choose a subject that conventionally carries writing or lettering: no cakes with messages, signs, labels, banners, books, posters, packaging. ` +
    `The composition is fixed: ${composition}. ` +
    `Reply with one sentence, under 40 words, naming one concrete subject (a place, object or moment), that composition, and the three colours. ` +
    `No people, no instruments, no text. Plain sentence, no quotes, no preamble.`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: ask }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 120 } }),
  });
  if (!res.ok) throw new Error(`Gemini brief ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text;
  if (!text) throw new Error("Gemini returned no brief");
  return text.replace(/\s+/g, " ").trim();
}

/** One image provider today; add another with the same shape and switch here. */
interface CoverProvider {
  name: string;
  generate(prompt: string): Promise<{ bytes: Uint8Array; mime: string }>;
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
  // The framing comes from the key, so a library cycles through every composition instead of the model's favourites.
  const composition = COMPOSITIONS[parseInt(key.slice(0, 2), 16) % COMPOSITIONS.length];
  const dryRun = body.dryRun === true;
  const db = adminClient();

  if (!dryRun) {
    const existing = await db.from("covers").select("path").eq("key", key).maybeSingle();
    if (existing.error) return json({ error: existing.error.message }, 500);
    if (existing.data) return json({ url: publicUrl(db, existing.data.path), cached: true });
  }

  let brief: string;
  let image: { bytes: Uint8Array; mime: string };
  try {
    brief = await writeBrief(title, composer, composition);
    image = await provider.generate(`${STYLE} Paint: ${brief}`);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "generation failed" }, 502);
  }

  // Dry run: hand the image straight back, store nothing. For judging the prompt.
  if (dryRun) {
    return new Response(image.bytes, { headers: { "content-type": image.mime, "x-brief": encodeURIComponent(brief), "x-model": provider.name } });
  }

  const path = `${key}.${ext(image.mime)}`;
  const up = await db.storage.from(BUCKET).upload(path, image.bytes, { contentType: image.mime, cacheControl: "31536000", upsert: true });
  if (up.error) return json({ error: up.error.message }, 500);

  const ins = await db.from("covers").insert({ key, install_id: installId, title, composer, model: provider.name, path, brief });
  // 23505 = unique violation: another request generated the same piece first. Its file is the same key, so fine.
  if (ins.error && ins.error.code !== "23505") return json({ error: ins.error.message }, 500);

  return json({ url: publicUrl(db, path), cached: false, brief });
});

/** Same piece, same key: lowercase, trimmed, single-spaced, diacritics kept. */
async function coverKey(title: string, composer: string | null): Promise<string> {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const input = new TextEncoder().encode(`${norm(title)}|${composer ? norm(composer) : ""}`);
  const hash = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? secretKeyFromDict();
  if (!url || !key) throw new Error("Supabase service credentials missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Newer runtimes expose SUPABASE_SECRET_KEYS as a JSON dictionary instead of the legacy key. */
function secretKeyFromDict(): string | undefined {
  try {
    const dict = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return dict.default ?? Object.values(dict)[0];
  } catch {
    return undefined;
  }
}

function publicUrl(db: SupabaseClient, path: string): string {
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
