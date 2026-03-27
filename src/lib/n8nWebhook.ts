import { supabase } from "@/integrations/supabase/client";

/**
 * Invoca a Edge Function que envia dados do ticket ao webhook n8n
 * para notificar o representante por email.
 * A verificação de role é feita server-side.
 */
export async function notifyN8nWebhook(chamadoId: number): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.functions.invoke("notify-n8n-webhook", {
      body: { chamado_id: chamadoId },
    });
    if (error) {
      console.warn("notifyN8nWebhook:", error.message);
    }
  } catch (e) {
    console.warn("notifyN8nWebhook:", e);
  }
}
