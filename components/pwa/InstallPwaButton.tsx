"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Apple, Download, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

// Chrome/Edge Android: beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

async function registerServiceWorker() {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  // PWA display-mode
  const isStandaloneDisplay = window.matchMedia?.(
    "(display-mode: standalone)"
  )?.matches;
  // iOS Safari
  const isIOSStandalone = (window.navigator as any)?.standalone === true;
  return Boolean(isStandaloneDisplay || isIOSStandalone);
}

export function InstallPwaButton({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { toast } = useToast();
  const [deferred, setDeferred] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const suggestedRef = React.useRef(false);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  React.useEffect(() => {
    setInstalled(isStandaloneMode());

    // Aumenta la probabilidad de que el navegador habilite la instalación.
    registerServiceWorker();

    // Si el layout capturó beforeinstallprompt antes de hidratar React, usarlo.
    try {
      const w = window as any;
      if (w.__deferredInstallPrompt) {
        setDeferred(w.__deferredInstallPrompt as BeforeInstallPromptEvent);
      }
    } catch {}

    const onBeforeInstallPrompt = (e: Event) => {
      // Evita el mini-infobar automático
      e.preventDefault?.();
      try {
        (window as any).__deferredInstallPrompt = e;
      } catch {}
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      try {
        (window as any).__deferredInstallPrompt = null;
      } catch {}
    };

    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt as any
    );
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt as any
      );
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  // Mostramos el botón si hay prompt disponible; si no, igual lo mostramos pero con ayuda.
  // (Útil en iOS donde no existe beforeinstallprompt)
  const canPrompt = Boolean(deferred);

  const onClick = React.useCallback(async () => {
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

    toast({
      title: "Cómo instalar",
      description: isIOS
        ? "En iPhone: botón Compartir → “Añadir a pantalla de inicio”."
        : "En Android/Chrome: menú ⋮ → “Instalar aplicación” / “Añadir a pantalla de inicio”.",
    });
  }, [deferred, isIOS, toast]);

  // Auto-sugerencia dentro de la app (no puede auto-ejecutar el prompt nativo sin gesto del usuario).
  React.useEffect(() => {
    if (installed) return;
    if (suggestedRef.current) return;

    // Android/Chrome/Edge: cuando ya tenemos deferred, podemos sugerir instalación.
    if (deferred) {
      suggestedRef.current = true;
      toast({
        title: "Instalar la app",
        description:
          "Instálala para abrir más rápido y recibir notificaciones.",
        action: (
          <ToastAction altText="Instalar" onClick={onClick}>
            Instalar
          </ToastAction>
        ),
      });
      return;
    }

    // iOS Safari: no existe beforeinstallprompt, pero podemos guiar.
    if (isIOS) {
      suggestedRef.current = true;
      toast({
        title: "Instalar en iPhone",
        description: "Compartir → “Añadir a pantalla de inicio”.",
      });
    }
  }, [deferred, installed, isIOS, onClick, toast]);

  if (installed) return null;

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={cn(className)}
        title={
          canPrompt
            ? "Instalar Academia X"
            : isIOS
            ? "iPhone: Compartir → Añadir a pantalla de inicio"
            : "Android: menú ⋮ → Instalar aplicación"
        }
        aria-label="Instalar app"
      >
        <Download className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={onClick}
      className={cn(
        "w-full h-auto py-2 flex-col items-center justify-center gap-1",
        isIOS ? "" : "",
        className
      )}
      title={
        canPrompt
          ? "Instalar Academia X"
          : isIOS
          ? "iPhone: Compartir → Añadir a pantalla de inicio"
          : "Android: menú ⋮ → Instalar aplicación"
      }
    >
      <span className="inline-flex items-center gap-2">
        <Download className="h-4 w-4" />
        <span className="font-medium">Instalar app</span>
      </span>
      <span className="flex items-center gap-3 text-xs opacity-80">
        <span className="inline-flex items-center gap-1">
          <Apple className="h-3.5 w-3.5" />
          <span>iOS</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Smartphone className="h-3.5 w-3.5" />
          <span>Android</span>
        </span>
      </span>
    </Button>
  );
}
