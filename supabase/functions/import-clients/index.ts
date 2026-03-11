import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RawRow {
  codSupervisor: number;
  supervisor: string;
  codRepresentante: number;
  representante: string;
  rede: string;
  codigoCliente: number;
  cliente: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { rows } = (await req.json()) as { rows: RawRow[] };
    if (!rows || !Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: "Missing rows array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Extract distinct supervisores
    const supervisorNames = [...new Set(rows.map((r) => r.supervisor))];
    const { data: insertedSupervisores, error: supErr } = await supabase
      .from("supervisores")
      .upsert(
        supervisorNames.map((nome) => ({ nome })),
        { onConflict: "nome" }
      )
      .select("id, nome");
    if (supErr) throw new Error(`Supervisores: ${supErr.message}`);
    const supMap = new Map(insertedSupervisores!.map((s: any) => [s.nome, s.id]));

    // 2. Extract distinct representantes
    const repMap_ = new Map<string, number>();
    rows.forEach((r) => repMap_.set(r.representante, r.codRepresentante));
    const repEntries = Array.from(repMap_.entries()).map(([nome, codigo]) => ({ nome, codigo }));
    const { data: insertedReps, error: repErr } = await supabase
      .from("representantes")
      .upsert(repEntries, { onConflict: "nome" })
      .select("id, nome");
    if (repErr) throw new Error(`Representantes: ${repErr.message}`);
    const repMap = new Map(insertedReps!.map((r: any) => [r.nome, r.id]));

    // 3. Extract distinct redes (excluding "SEM REDE")
    const redeNames = [...new Set(rows.map((r) => r.rede).filter((r) => r !== "SEM REDE" && r.trim() !== ""))];
    let redeMap = new Map<string, string>();
    if (redeNames.length > 0) {
      // Insert in batches of 500 to avoid issues
      for (let i = 0; i < redeNames.length; i += 500) {
        const batch = redeNames.slice(i, i + 500).map((nome) => ({ nome }));
        const { data: insertedRedes, error: redeErr } = await supabase
          .from("redes")
          .upsert(batch, { onConflict: "nome" })
          .select("id, nome");
        if (redeErr) throw new Error(`Redes batch ${i}: ${redeErr.message}`);
        insertedRedes!.forEach((r: any) => redeMap.set(r.nome, r.id));
      }
    }

    // 4. Create supervisor_representante links
    const srLinks = new Set<string>();
    const srInserts: { supervisor_id: string; representante_id: string }[] = [];
    rows.forEach((r) => {
      const supId = supMap.get(r.supervisor);
      const repId = repMap.get(r.representante);
      if (supId && repId) {
        const key = `${supId}-${repId}`;
        if (!srLinks.has(key)) {
          srLinks.add(key);
          srInserts.push({ supervisor_id: supId, representante_id: repId });
        }
      }
    });
    // Insert in batches
    for (let i = 0; i < srInserts.length; i += 500) {
      const batch = srInserts.slice(i, i + 500);
      const { error: srErr } = await supabase
        .from("supervisor_representante")
        .upsert(batch, { onConflict: "supervisor_id,representante_id" });
      if (srErr) throw new Error(`SR links batch ${i}: ${srErr.message}`);
    }

    // 5. Insert/update clientes
    // First, clear existing imported clients (those with codigo set)
    // Then insert all clients from the spreadsheet
    const clientInserts = rows.map((r) => ({
      nome: r.cliente,
      codigo: r.codigoCliente,
      representante_id: repMap.get(r.representante) || null,
      rede_id: r.rede !== "SEM REDE" && r.rede.trim() !== "" ? redeMap.get(r.rede) || null : null,
    }));

    // Insert in batches of 500
    let insertedCount = 0;
    for (let i = 0; i < clientInserts.length; i += 500) {
      const batch = clientInserts.slice(i, i + 500);
      const { error: clientErr } = await supabase.from("clientes").insert(batch);
      if (clientErr) throw new Error(`Clientes batch ${i}: ${clientErr.message}`);
      insertedCount += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        supervisores: supervisorNames.length,
        representantes: repEntries.length,
        redes: redeNames.length,
        sr_links: srInserts.length,
        clientes: insertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
