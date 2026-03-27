import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProfileRow = {
  id: string;
  user_id: string;
  nome: string;
  status: string;
  supervisora: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleCheck || !["admin", "gestor"].includes(roleCheck.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load all "representante" users (active profiles only)
    const [{ data: repRoles, error: repRoleErr }, { data: profiles, error: profErr }] =
      await Promise.all([
        supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "representante"),
        supabaseAdmin.from("profiles").select("id, user_id, nome, status, supervisora").eq("status", "ativo"),
      ]);

    if (repRoleErr) throw repRoleErr;
    if (profErr) throw profErr;

    const repUserIds = new Set((repRoles || []).map((r: any) => r.user_id));
    const repProfiles = (profiles as ProfileRow[] || []).filter((p) => repUserIds.has(p.user_id));

    // Find current max codigo
    const { data: maxRes } = await supabaseAdmin
      .from("representantes")
      .select("codigo")
      .order("codigo", { ascending: false })
      .limit(1)
      .maybeSingle();
    let nextCodigo = (maxRes?.codigo ?? 0) + 1;

    let upserted = 0;
    let linked = 0;

    for (const p of repProfiles) {
      // Ensure representantes row exists (id = profile.id)
      const { data: existingRep } = await supabaseAdmin
        .from("representantes")
        .select("id, codigo")
        .eq("id", p.id)
        .maybeSingle();

      const codigo = existingRep?.codigo ?? nextCodigo++;
      await supabaseAdmin
        .from("representantes")
        .upsert({ id: p.id, nome: p.nome, codigo }, { onConflict: "id" });
      upserted++;

      // Replace linkage based on supervisor name
      await supabaseAdmin
        .from("supervisor_representante")
        .delete()
        .eq("representante_id", p.id);

      const supervisoraNome = (p.supervisora || "").trim();
      if (!supervisoraNome) continue;

      const { data: sup } = await supabaseAdmin
        .from("supervisores")
        .select("id")
        .ilike("nome", supervisoraNome)
        .eq("status", "ativo")
        .maybeSingle();

      if (sup?.id) {
        await supabaseAdmin
          .from("supervisor_representante")
          .insert({ supervisor_id: sup.id, representante_id: p.id });
        linked++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      representantes_upserted: upserted,
      vinculados: linked,
      total_representantes_ativos: repProfiles.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

