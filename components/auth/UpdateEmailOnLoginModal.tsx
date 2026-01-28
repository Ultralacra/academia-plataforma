"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { authService, getAuthToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api-config";

function formatEsDateTime(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  // Simple y suficiente para UI
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function ConfettiBurst({ runKey }: { runKey: number }) {
  const pieces = React.useMemo(() => {
    // pseudo-rng estable por key
    let seed = (runKey || 1) * 9301 + 49297;
    const rand = () => {
      seed = (seed * 233280 + 49297) % 233280;
      return seed / 233280;
    };

    const colors = [
      "#f59e0b", // amber
      "#22c55e", // green
      "#3b82f6", // blue
      "#a855f7", // purple
      "#ef4444", // red
      "#06b6d4", // cyan
    ];

    return Array.from({ length: 36 }).map((_, i) => {
      const left = Math.floor(rand() * 100);
      const delay = rand() * 0.12;
      const rotate = Math.floor(rand() * 360);
      const duration = 0.95 + rand() * 0.45;
      const size = 6 + Math.floor(rand() * 6);
      const color = colors[i % colors.length];
      const drift = (rand() - 0.5) * 180; // px
      return { left, delay, rotate, duration, size, color, drift, i };
    });
  }, [runKey]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[10002] overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translate3d(var(--dx), -12px, 0) rotate(var(--r)); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate3d(calc(var(--dx) * 0.8), 92vh, 0) rotate(calc(var(--r) + 520deg)); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <span
          key={p.i}
          style={
            {
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${Math.max(6, Math.floor(p.size * 0.55))}px`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              transform: `rotate(${p.rotate}deg)`,
              // variables css
              "--dx": `${p.drift}px`,
              "--r": `${p.rotate}deg`,
            } as React.CSSProperties
          }
          className="absolute top-0 rounded-sm opacity-0 [animation-name:confetti-fall] [animation-timing-function:ease-out] [animation-fill-mode:forwards]"
        />
      ))}
    </div>
  );
}

export function UpdateEmailOnLoginModal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [confettiKey, setConfettiKey] = React.useState(0);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const allowCloseRef = React.useRef(false);

  const userId = user?.id != null ? String(user.id) : "";
  const updatedAt = (user as any)?.updated_at as string | undefined;
  const currentEmail = String(user?.email || "");
  const userCode = String((user as any)?.codigo || "");

  const isMigrationEmail = React.useMemo(() => {
    const e = currentEmail.trim().toLowerCase();
    // Email generado para migración inicial
    return e.endsWith("@x-academy.com") || e.endsWith(".x-academy.com");
  }, [currentEmail]);

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) return;

    // Solo mostrar a alumnos cuyo correo aún es el generado para migración
    if (user.role !== "student") return;
    if (!isMigrationEmail) return;

    // Modal obligatorio: input vacío
    setEmail("");
    setOpen(true);
  }, [isLoading, isAuthenticated, user, isMigrationEmail]);

  const onSave = React.useCallback(async () => {
    if (!userId || !userCode) return;
    const nextEmail = email.trim();
    if (!isValidEmail(nextEmail)) {
      toast({
        title: "Email inválido",
        description: "Revisa el formato del correo e inténtalo nuevamente.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const token = getAuthToken();
      const res: any = await apiFetch(
        `/users/${encodeURIComponent(userCode)}`,
        {
          method: "PUT",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: JSON.stringify({ email: nextEmail }),
        },
      );

      const payload: any = res?.data ?? res;
      const serverEmail = String(payload?.email || nextEmail);
      const serverUpdatedAt = String(
        payload?.updated_at || payload?.updatedAt || new Date().toISOString(),
      );

      // Actualizar auth local para que el modal desaparezca inmediatamente
      try {
        const st = authService.getAuthState();
        authService.setAuthState({
          ...st,
          isAuthenticated: true,
          user: {
            ...(st.user || user),
            email: serverEmail,
            updated_at: serverUpdatedAt,
          } as any,
        });
      } catch {}

      toast({
        title: "Correo cambiado con éxito",
        description: "¡Listo! Actualizamos tu email.",
      });

      setConfettiKey((k) => k + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1400);

      // Permitir cerrar SOLO cuando ya guardó con éxito
      allowCloseRef.current = true;
      setOpen(false);
    } catch (e: any) {
      toast({
        title: "No se pudo actualizar el correo",
        description: String(
          e?.message || "Intenta nuevamente en unos segundos.",
        ),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [userId, userCode, email, user]);

  // Solo aplica para alumnos. Si ya cambió el mail, solo dejamos montado durante confetti.
  if (!isAuthenticated || !user || user.role !== "student") return null;
  if (!isMigrationEmail && !showConfetti) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // No permitir cerrar por overlay/ESC; solo cerramos vía éxito
        if (!next && !allowCloseRef.current) {
          setOpen(true);
          return;
        }
        setOpen(next);
      }}
    >
      <DialogContent
        className="border-0 p-0 overflow-hidden sm:max-w-xl"
        showCloseButton={false}
        onEscapeKeyDown={(e) => {
          if (!allowCloseRef.current) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (!allowCloseRef.current) e.preventDefault();
        }}
      >
        {showConfetti ? <ConfettiBurst runKey={confettiKey} /> : null}
        {/* Header decorativo */}
        <div className="relative p-6 sm:p-7 bg-gradient-to-br from-amber-500/15 via-primary/10 to-sky-500/15">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.14),transparent_55%)]" />

          <div className="relative flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/10 grid place-items-center border border-primary/15">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Actualiza tu correo
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Confirma tu email para recibir notificaciones y mantener tu
                  cuenta al día.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="relative mt-4 rounded-xl border bg-background/70 backdrop-blur p-3">
            <div className="text-xs text-muted-foreground">Mail actual</div>
            <div className="mt-0.5 font-medium break-all">
              {currentEmail || "—"}
            </div>
            <div className="mt-1 text-xs text-amber-700/90">
              Este correo fue generado por migración inicial. Por favor
              actualízalo.
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Última actualización:{" "}
              <span className="font-medium text-foreground/80">
                {formatEsDateTime(updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 pt-5">
          <div className="space-y-2">
            <Label htmlFor="update-email">Nuevo mail</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </span>
              <Input
                id="update-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="pl-9 focus-visible:ring-amber-500"
                autoComplete="email"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              onClick={onSave}
              disabled={saving || !isValidEmail(email)}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
