import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Chama a Edge Function para enviar Web Push aos perfis vinculados ao ticket
 * (representante, supervisor, gestor), exceto quem acabou de alterar.
 */
export async function notifyChamadoPush(chamadoId: number): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.functions.invoke("send-chamado-push", {
      body: { chamado_id: chamadoId },
    });
    if (error) {
      console.warn("notifyChamadoPush:", error.message);
    }
  } catch (e) {
    console.warn("notifyChamadoPush:", e);
  }
}

/**
 * Regista a subscription Web Push no Supabase (requer VITE_VAPID_PUBLIC_KEY e permissão do browser).
 */
export async function registerPushSubscription(): Promise<void> {
  const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidPublic || typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return;

  const registration = await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublic),
    });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const json = sub.toJSON();
  const keys = json.keys as { p256dh?: string; auth?: string } | undefined;
  if (!json.endpoint || !keys?.p256dh || !keys?.auth) return;

  const { error } = await (supabase as any).from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) {
    console.warn("registerPushSubscription:", error.message);
  }
}
