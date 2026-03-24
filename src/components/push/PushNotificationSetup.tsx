import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { registerPushSubscription } from "@/lib/pushNotifications";

/**
 * Ao iniciar sessão, tenta registar Web Push (se VITE_VAPID_PUBLIC_KEY estiver definida).
 */
export function PushNotificationSetup() {
  const { session, loading } = useAuth();
  const tried = useRef(false);

  useEffect(() => {
    if (loading || !session) {
      tried.current = false;
      return;
    }
    if (tried.current) return;
    if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) return;

    tried.current = true;
    void registerPushSubscription();
  }, [session, loading]);

  return null;
}
