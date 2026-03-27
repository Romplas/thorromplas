import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const N8N_WEBHOOK_URL = "https://automacoes-n8n.2qfd43.easypanel.host/webhook-test/8f187f65-ce32-4af9-9d25-1c8e0a3a4da3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate JWT using anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Check role - only admin, gestor, supervisor can trigger
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const role = (roleRow as { role?: string } | null)?.role;
    if (!role || !["admin", "gestor", "supervisor"].includes(role)) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Role não autorizada para webhook" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse body
    const { chamado_id } = await req.json();
    if (chamado_id == null || typeof chamado_id !== "number") {
      return new Response(JSON.stringify({ error: "chamado_id inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch chamado
    const { data: chamado, error: chamadoErr } = await supabaseAdmin
      .from("chamados")
      .select("id, cliente_nome, motivo, submotivo, status, etapa, descricao, negociado_com, representante_id, updated_at")
      .eq("id", chamado_id)
      .maybeSingle();

    if (chamadoErr || !chamado) {
      return new Response(JSON.stringify({ error: "Chamado não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no representante, skip
    if (!chamado.representante_id) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Sem representante vinculado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get representante name
    const { data: repData } = await supabaseAdmin
      .from("representantes")
      .select("nome")
      .eq("id", chamado.representante_id)
      .maybeSingle();

    const repNome = repData?.nome || "";

    // Get representante email from profiles (match by name)
    let repEmail = "";
    if (repNome) {
      const { data: profileData } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .ilike("nome", repNome)
        .maybeSingle();
      repEmail = profileData?.email || "";
    }

    if (!repEmail) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Email do representante não encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Send to n8n webhook
    const payload = {
      chamado_id: chamado.id,
      cliente_nome: chamado.cliente_nome,
      motivo: chamado.motivo,
      submotivo: chamado.submotivo,
      status: chamado.status,
      etapa: chamado.etapa,
      descricao: chamado.descricao,
      negociado_com: chamado.negociado_com,
      representante_nome: repNome,
      representante_email: repEmail,
      updated_at: chamado.updated_at,
    };

    const webhookRes = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return new Response(
      JSON.stringify({ sent: true, webhookStatus: webhookRes.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
