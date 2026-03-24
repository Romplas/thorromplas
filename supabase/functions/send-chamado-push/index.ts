import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  chamado_id: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:romplas30@gmail.com";
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublic || !vapidPrivate) {
      return new Response(
        JSON.stringify({ error: "VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY devem estar configurados nos secrets da função." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { chamado_id }: Body = await req.json();
    if (chamado_id == null || typeof chamado_id !== "number" || !Number.isFinite(chamado_id)) {
      return new Response(JSON.stringify({ error: "chamado_id inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: chamado, error: chamadoErr } = await supabaseAdmin
      .from("chamados")
      .select("id, representante_id, supervisor_id, gestor_id, cliente_nome")
      .eq("id", chamado_id)
      .maybeSingle();

    if (chamadoErr || !chamado) {
      return new Response(JSON.stringify({ error: "Chamado não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = (roleRow as { role?: string } | null)?.role;
    const isAdminOrGestor = role === "admin" || role === "gestor";

    const callerPid = callerProfile?.id;
    const linked =
      callerPid &&
      (callerPid === chamado.representante_id ||
        callerPid === chamado.supervisor_id ||
        callerPid === chamado.gestor_id);

    if (!isAdminOrGestor && !linked) {
      return new Response(JSON.stringify({ error: "Sem permissão para notificar este ticket" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileIds = [
      chamado.representante_id,
      chamado.supervisor_id,
      chamado.gestor_id,
    ].filter((id): id is string => typeof id === "string" && id.length > 0);

    const uniqueProfileIds = [...new Set(profileIds)];

    if (uniqueProfileIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "Nenhum destinatário vinculado ao ticket" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id")
      .in("id", uniqueProfileIds);

    const recipientUserIds = new Set<string>();
    for (const p of profiles ?? []) {
      if (p.user_id && p.id !== callerPid) {
        recipientUserIds.add(p.user_id);
      }
    }

    if (recipientUserIds.size === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "Nenhum destinatário (exceto o autor)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", [...recipientUserIds]);

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "Nenhuma subscription registada para os destinatários" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = `Ticket #${chamado_id}`;
    const body = chamado.cliente_nome
      ? `Atualização — ${chamado.cliente_nome}`
      : "O ticket foi atualizado. Abra o Thor Romplas para ver os detalhes.";

    const payload = JSON.stringify({
      title,
      body,
      data: {
        url: `/historico?ticketId=${chamado_id}`,
        chamado_id,
      },
    });

    let sent = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        await webpush.sendNotification(pushSub, payload, {
          TTL: 3600,
        });
        sent++;
      } catch (e) {
        const msg = (e as Error).message ?? String(e);
        errors.push(msg);
        if (msg.includes("410") || msg.includes("Gone") || msg.includes("404")) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    return new Response(
      JSON.stringify({
        sent,
        attempted: subs.length,
        errors: errors.length ? errors.slice(0, 3) : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
