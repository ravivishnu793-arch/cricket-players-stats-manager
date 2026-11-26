// Scorecard OCR — admin only. Reads an uploaded scorecard (image/PDF) and returns structured data for review.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAI } from "npm:@ai-sdk/openai@4";
import { streamText } from "npm:ai@7";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { createLovableAiGatewayRunIdFetch } from "../_shared/run-id.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

const PROMPT = `You are reading a cricket scorecard. Extract EVERYTHING visible. Respond with ONLY a JSON object (no markdown) of this shape:
{
 "match": {"date": "YYYY-MM-DD or null", "title": str|null, "venue": str|null, "tournament": str|null, "format": str|null,
   "overs_limit": int|null, "team1": str|null, "team2": str|null, "toss_winner": str|null, "toss_decision": "bat"|"bowl"|null,
   "winner": str|null, "result": str|null, "target": int|null, "status": str|null},
 "innings": [ {"batting_team": str, "bowling_team": str, "total_runs": int|null, "wickets": int|null, "overs": "e.g. 7.5 as written"|null, "extras": int|null,
   "batting": [{"name": str, "position": int|null, "runs": int, "balls": int|null, "fours": int|null, "sixes": int|null, "strike_rate": number|null, "dismissal": str|null, "not_out": bool}],
   "bowling": [{"name": str, "overs": "as written e.g. 1.4", "maidens": int|null, "runs": int, "wickets": int, "economy": number|null, "wides": int|null, "no_balls": int|null}],
   "fielding": [{"name": str, "catches": int, "run_outs": int, "stumpings": int}] } ],
 "quality": "good"|"poor", "warnings": [str]
}
Rules: copy player names exactly as printed. Keep overs EXACTLY as printed (cricket notation: 7.5 means 7 overs 5 balls). Derive fielding from dismissals (c X b Y => X catch; run out (X) => X run out; st X => X stumping). Put players who did not bat in batting only if listed with runs. Use null when a value is not visible; never guess. If the image is not a cricket scorecard, return {"error": "not_a_scorecard"}.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  const uid = claims?.claims?.sub;
  if (!uid) return json({ error: "Please sign in." }, 401);
  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: uid, _role: "admin" });
  if (!isAdmin) return json({ error: "Only admins can import scorecards." }, 403);

  let importId: string;
  try {
    const body = await req.json();
    importId = String(body?.import_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(importId)) throw new Error();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const fail = async (msg: string, status = 422) => {
    await admin.from("ocr_imports").update({ status: "failed", errors: [msg] }).eq("id", importId);
    return json({ error: msg }, status);
  };

  const { data: imp } = await admin.from("ocr_imports").select("*").eq("id", importId).maybeSingle();
  if (!imp?.file_path) return json({ error: "Import not found" }, 404);

  const { data: file, error: dlErr } = await admin.storage.from("scorecards").download(imp.file_path);
  if (dlErr || !file) return fail("Could not read the uploaded file.");
  const mime = file.type || (imp.file_name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
  if (!ALLOWED.includes(mime)) return fail("Unsupported file type. Use PNG, JPG, WEBP or PDF.", 400);
  if (file.size === 0) return fail("The file is empty.", 400);

  const b64 = encodeBase64(new Uint8Array(await file.arrayBuffer()));
  const part = mime === "application/pdf"
    ? { type: "file" as const, filename: imp.file_name, data: b64, mediaType: "application/pdf" }
    : { type: "image" as const, image: new URL(`data:${mime};base64,${b64}`) };

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return fail("AI is not configured.", 500);

  try {
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, part] }],
      abortSignal: req.signal,
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
      },
    });
    const text = (await result.text).trim();
    if (!text) return fail("Could not read this scorecard. Try a clearer image.");
    const match = text.match(/\{[\s\S]*\}/);
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(match ? match[0] : text); } catch { return fail("Could not understand the scorecard. Try a clearer image."); }
    if (parsed.error === "not_a_scorecard") return fail("This doesn't look like a cricket scorecard.");
    const innings = (parsed.innings as unknown[]) ?? [];
    if (!innings.length) return fail("No batting or bowling data was found on this scorecard.");
    await admin.from("ocr_imports").update({ status: "review_required", extracted: parsed, errors: (parsed.warnings as string[]) ?? [] }).eq("id", importId);
    return json({ extracted: parsed });
  } catch (e) {
    const s = (e as { statusCode?: number })?.statusCode;
    console.error("ocr error", e);
    if (s === 429) return fail("Too many requests right now. Please try again in a minute.", 429);
    if (s === 402) return fail("AI credits have run out. Please add credits to continue.", 402);
    return fail("Scorecard reading failed. Please try again.", 500);
  }
});
