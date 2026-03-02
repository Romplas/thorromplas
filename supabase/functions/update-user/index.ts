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

    const { user_id, nome, email, usuario, senha, telefone, tipo, supervisora } = await req.json();

    // Update auth user if email or password changed
    const authUpdate: Record<string, unknown> = {};
    if (email) authUpdate.email = email;
    if (senha) authUpdate.password = senha;
    if (Object.keys(authUpdate).length > 0) {
      await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdate);
    }

    // Update profile
    await supabaseAdmin
      .from("profiles")
      .update({ nome, email, usuario, telefone, supervisora })
      .eq("user_id", user_id);

    // Update role
    if (tipo) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id, role: tipo }, { onConflict: "user_id,role" });

      // Remove old roles
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .neq("role", tipo);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
