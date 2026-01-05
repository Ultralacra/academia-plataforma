"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Chrome/Edge Android: beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  // PWA display-mode
  const isStandaloneDisplay = window.matchMedia?.("(display-mode: standalone)")?.matches;
  // iOS Safari
  const isIOSStandalone = (window.navigator as any)?.standalone === true;
  return Boolean(isStandaloneDisplay || isIOSStandalone);
}

export function InstallPwaButton() {
  const { toast } = useToast();
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    setInstalled(isStandaloneMode());

    const onBeforeInstallPrompt = (e: Event) => {
      // Evita el mini-infobar automático
      e.preventDefault?.();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as any);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as any);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed) return null;

  // Mostramos el botón si hay prompt disponible; si no, igual lo mostramos pero con ayuda.
  // (Útil en iOS donde no existe beforeinstallprompt)
  const canPrompt = Boolean(deferred);

  const onClick = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        try {
          const choice = await deferred.userChoice;
          if (choice?.outcome === "accepted") {
            setInstalled(true);
          }
        } catch {}
      } catch {}
      setDeferred(null);
      return;
    }

    // Fallback: instrucciones rápidas
    const ua = navigator.userAgent || "";
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    toast({
      title: "Cómo instalar",
      description: isIOS
        ? "En iPhone: botón Compartir → “Añadir a pantalla de inicio”."
        : "En Android/Chrome: menú ⋮ → “Instalar aplicación” / “Añadir a pantalla de inicio”.",
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      {canPrompt ? "Instalar" : "Instalar app"}
    </Button>
  );
}
