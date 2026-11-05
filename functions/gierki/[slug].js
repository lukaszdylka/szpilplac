/* Cloudflare Pages: jeden ekran gierki pod czytelnymi adresami. */
const allowed = new Set(["zeflik", "kopalnia", "na-wiyrch", "szlojder"]);

export async function onRequestGet({ request, env, params }) {
  const slug = String(params.slug || "").toLowerCase();
  if (!allowed.has(slug)) return new Response("Nie znaleziono gierki.", { status: 404 });

  // Pobierz istniejący wspólny ekran jako zasób statyczny.
  // Widoczny URL przeglądarki pozostaje /gierki/<slug>.
  const url = new URL("/minigra", request.url);
  const response = await env.ASSETS.fetch(new Request(url, request));
  if (!response.ok) return response;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-cache");
  headers.set("Content-Type", "text/html; charset=utf-8");
  return new Response(response.body, { status: 200, headers });
}
