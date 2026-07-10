// Supabase Edge Function: send-szpilplac-push
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:kontakt@familock.pl";
const PUSH_ADMIN_SECRET = Deno.env.get("PUSH_ADMIN_SECRET") || "";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

type PushType = "daily_games" | "weekly_summary" | "kamrat_reactions" | "kamrat_added" | "achievements" | "news";
type PushBody = { type?:PushType; title?:string; body?:string; url?:string; tag?:string; user_id?:string; };
const allowedTypes: PushType[] = ["daily_games","weekly_summary","kamrat_reactions","kamrat_added","achievements","news"];

function json(data: unknown, status = 200){
  return new Response(JSON.stringify(data), { status, headers: {"content-type":"application/json; charset=utf-8"} });
}

Deno.serve(async (req) => {
  try{
    if(req.method !== "POST") return json({error:"method_not_allowed"}, 405);

    const secret = req.headers.get("x-szpilplac-push-secret") || "";
    if(!PUSH_ADMIN_SECRET || secret !== PUSH_ADMIN_SECRET) return json({error:"unauthorized"}, 401);
    if(!SUPABASE_URL || !SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return json({error:"missing_env"}, 500);

    const payload = await req.json().catch(() => ({})) as PushBody;
    const type = allowedTypes.includes(payload.type as PushType) ? payload.type as PushType : "news";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth:{persistSession:false, autoRefreshToken:false} });

    let query = supabase
      .from("szp_push_targets")
      .select("user_id,endpoint,p256dh,auth,daily_games,weekly_summary,kamrat_reactions,kamrat_added,achievements,news")
      .eq(type, true);

    if(payload.user_id) query = query.eq("user_id", payload.user_id);

    const { data, error } = await query;
    if(error) throw error;

    const message = JSON.stringify({
      type,
      title: payload.title || "Szpilplac",
      body: payload.body || "Masz nowe rzeczy na Szpilplacu.",
      url: payload.url || "/",
      tag: payload.tag || `szpilplac-${type}`,
      icon: "/pwa-icon.svg",
      badge: "/pwa-maskable.svg"
    });

    let sent = 0, failed = 0;
    const deadEndpoints: string[] = [];

    for(const row of data || []){
      try{
        await webpush.sendNotification({
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth }
        }, message);
        sent++;
      }catch(e){
        failed++;
        const statusCode = Number((e as any)?.statusCode || 0);
        if(statusCode === 404 || statusCode === 410) deadEndpoints.push(row.endpoint);
      }
    }

    if(deadEndpoints.length){
      await supabase
        .from("szpilplac_push_subscriptions")
        .update({is_active:false, updated_at:new Date().toISOString()})
        .in("endpoint", deadEndpoints);
    }

    return json({ok:true,type,sent,failed,disabled:deadEndpoints.length});
  }catch(e){
    return json({error:String((e as Error)?.message || e)}, 500);
  }
});
