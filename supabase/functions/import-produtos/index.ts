import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProdutoRow {
  codProduto: string;
  produto: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { rows } = (await req.json()) as { rows: ProdutoRow[] };
    if (!rows || !Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: "Missing rows array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inserts = rows
      .filter((r) => (r.codProduto ?? "").toString().trim() !== "" && (r.produto ?? "").toString().trim() !== "")
      .map((r) => ({
        cod_produto: String(r.codProduto).trim(),
        produto: String(r.produto).trim(),
      }));

    if (inserts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, produtos: 0, message: "Nenhum registro válido encontrado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let insertedCount = 0;
    for (let i = 0; i < inserts.length; i += 500) {
      const batch = inserts.slice(i, i + 500);
      const { data, error } = await supabase
        .from("produtos")
        .upsert(batch, { onConflict: "cod_produto" })
        .select("id");
      if (error) throw new Error(`Produtos batch: ${error.message}`);
      insertedCount += data?.length ?? batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, produtos: insertedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
