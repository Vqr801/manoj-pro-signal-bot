/**
 * PAYASI AI OTC PRO - Cloudflare Worker API proxy
 * Deploy as a Cloudflare Worker, then configure the bot to use its URL.
 * This proxy forwards only selected OTCharts read-only endpoints.
 */
const UPSTREAM = "https://otcharts.com";
const ALLOWED = new Set(["/v1/symbols", "/v1/candles", "/v1/stream", "/v1/usage", "/v1/venues"]);

function cors(origin) {
  // For this public signal-bot page, allow browser calls. API key is supplied
  // by the user in the Authorization header and is never stored by this Worker.
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";
    const headers = cors(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Only GET is allowed." }), {
        status: 405, headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    // Worker route format: /v1/candles?... (or /v1/stream?...).
    if (!ALLOWED.has(url.pathname)) {
      return new Response(JSON.stringify({ error: "Endpoint not allowed." }), {
        status: 404, headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer otc_live_")) {
      return new Response(JSON.stringify({ error: "Add your OTCharts API key in the bot first." }), {
        status: 401, headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const upstreamUrl = UPSTREAM + url.pathname + url.search;
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { "Authorization": auth, "Accept": url.pathname === "/v1/stream" ? "text/event-stream" : "application/json" },
      redirect: "follow"
    });

    const outHeaders = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(headers)) outHeaders.set(k, v);
    outHeaders.set("Cache-Control", "no-store");
    // Preserve SSE streaming; don't buffer stream responses.
    return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
  }
};
