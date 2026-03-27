import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin or gestor
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);

    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleCheck || !["admin", "gestor"].includes(roleCheck.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { nome, email, contact_email, usuario, senha, telefone, tipo, supervisora } = await req.json();

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, usuario },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile with extra fields
    await supabaseAdmin
      .from("profiles")
      .update({ telefone, supervisora, contact_email: contact_email ?? email })
      .eq("user_id", newUser.user.id);

    // Assign role
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: tipo });

    // If the user is a representante, ensure it exists in `representantes`
    // and keep supervisor linkage in `supervisor_representante`.
    if (tipo === "representante") {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("id, nome, supervisora")
        .eq("user_id", newUser.user.id)
        .maybeSingle();

      if (prof?.id) {
        // Ensure a numeric codigo exists (schema requires it).
        const { data: existingRep } = await supabaseAdmin
          .from("representantes")
          .select("id, codigo")
          .eq("id", prof.id)
          .maybeSingle();

        let codigo = existingRep?.codigo;
        if (!codigo) {
          const { data: maxRes } = await supabaseAdmin
            .from("representantes")
            .select("codigo")
            .order("codigo", { ascending: false })
            .limit(1)
            .maybeSingle();
          codigo = (maxRes?.codigo ?? 0) + 1;
        }

        await supabaseAdmin
          .from("representantes")
          .upsert({ id: prof.id, nome: prof.nome, codigo }, { onConflict: "id" });

        // Supervisor linkage by supervisor name in profile (`supervisora`)
        const supervisoraNome = (supervisora ?? prof.supervisora ?? "").trim();
        if (supervisoraNome) {
          const { data: sup } = await supabaseAdmin
            .from("supervisores")
            .select("id")
            .ilike("nome", supervisoraNome)
            .eq("status", "ativo")
            .maybeSingle();

          if (sup?.id) {
            // Replace any existing linkage for this representante
            await supabaseAdmin
              .from("supervisor_representante")
              .delete()
              .eq("representante_id", prof.id);

            await supabaseAdmin
              .from("supervisor_representante")
              .insert({ supervisor_id: sup.id, representante_id: prof.id });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
