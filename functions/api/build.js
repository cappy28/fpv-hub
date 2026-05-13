// functions/api/build.js
// Cloudflare Pages Function — proxy sécurisé vers OpenRouter
// La clé API est stockée dans : Pages → Settings → Environment Variables → OPENROUTER_API_KEY

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "deepseek/deepseek-chat-v3-0324";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.OPENROUTER_API_KEY) {
    return json({ error: "OPENROUTER_API_KEY not configured in Pages environment variables" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "messages must be a non-empty array" }, 400);
  }

  let upstream;
  try {
    upstream = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hubfpv.pages.dev",
        "X-Title": "FPV Build Generator",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });
  } catch (err) {
    return json({ error: `Upstream fetch failed: ${err.message}` }, 502);
  }

  const data = await upstream.json();

  if (!upstream.ok) {
    return json({ error: data?.error?.message || "OpenRouter error", detail: data }, upstream.status);
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
