import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        // Verifica por nova versão com mais frequência (a cada 30 segundos)
        setInterval(() => {
          r.update();
        }, 30 * 1000);
      }
    },
  });

  const handleUpdate = async () => {
    try {
      await updateServiceWorker(true);
    } catch (e) {
      console.error("Erro ao atualizar:", e);
      window.location.reload();
    }
  };

  const handleClose = () => {
    setNeedRefresh(false);
  };

  return (
    <Dialog open={!!needRefresh} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Atualização disponível</DialogTitle>
              <DialogDescription>
                Uma nova versão do aplicativo está pronta. Atualize para garantir que está usando a versão mais recente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Depois
          </Button>
          <Button onClick={handleUpdate} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
