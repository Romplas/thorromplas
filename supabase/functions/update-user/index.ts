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

    // Verify caller
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

    const { user_id, nome, email, contact_email, usuario, senha, telefone, tipo, supervisora } = await req.json();

    // Update auth user if login email or password changed
    const authUpdate: Record<string, unknown> = {};
    if (email) authUpdate.email = email;
    if (senha) authUpdate.password = senha;
    if (Object.keys(authUpdate).length > 0) {
      await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdate);
    }

    // Update profile
    await supabaseAdmin
      .from("profiles")
      .update({ nome, email, contact_email, usuario, telefone, supervisora })
      .eq("user_id", user_id);

    // Update role
    if (tipo) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id, role: tipo }, { onConflict: "user_id" });

      // Remove old roles, garantindo apenas um papel por usuário
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .neq("role", tipo);
    }

    // Sync representante record + supervisor linkage when applicable.
    // We store `representantes.id` as `profiles.id` so the app can use consistent IDs.
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id, nome, supervisora")
      .eq("user_id", user_id)
      .maybeSingle();

    if (prof?.id) {
      if (tipo === "representante") {
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

        const supervisoraNome = (supervisora ?? prof.supervisora ?? "").trim();
        // Replace linkage based on current supervisor name (if provided).
        await supabaseAdmin
          .from("supervisor_representante")
          .delete()
          .eq("representante_id", prof.id);

        if (supervisoraNome) {
          const { data: sup } = await supabaseAdmin
            .from("supervisores")
            .select("id")
            .ilike("nome", supervisoraNome)
            .eq("status", "ativo")
            .maybeSingle();
          if (sup?.id) {
            await supabaseAdmin
              .from("supervisor_representante")
              .insert({ supervisor_id: sup.id, representante_id: prof.id });
          }
        }
      } else {
        // If the user is no longer a representante, remove supervisor linkage
        // (keep `representantes` row for historical integrity).
        await supabaseAdmin
          .from("supervisor_representante")
          .delete()
          .eq("representante_id", prof.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
