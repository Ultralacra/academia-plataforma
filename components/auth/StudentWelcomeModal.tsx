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
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/auth";

/* ────────────────────────── tipos ────────────────────────── */

interface SocialNetwork {
  platform: string;
  handle: string;
}

interface ProfileDraft {
  niche: string;
  socialNetworks: SocialNetwork[];
  occupation: string;
  digitalExperience: string;
  learningPreference: string;
}

const EMPTY_DRAFT: ProfileDraft = {
  niche: "",
  socialNetworks: [{ platform: "instagram", handle: "" }],
  occupation: "",
  digitalExperience: "",
  learningPreference: "",
};

const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "pinterest", label: "Pinterest" },
  { value: "otra", label: "Otra" },
] as const;

const EXPERIENCE_OPTIONS = [
  {
    value: "basico",
    label: "Básico",
    desc: "Estoy empezando en el mundo digital",
  },
  {
    value: "intermedio",
    label: "Intermedio",
    desc: "Ya tengo algo de experiencia",
  },
  {
    value: "experto",
    label: "Experto",
    desc: "Manejo herramientas digitales con soltura",
  },
] as const;

const LEARNING_OPTIONS = [
  { value: "video", label: "Video", emoji: "🎬" },
  { value: "audio", label: "Audio", emoji: "🎧" },
  { value: "texto", label: "Texto", emoji: "📖" },
] as const;

const TOTAL_STEPS = 3;

/* ────────────────────────── componente ────────────────────────── */

const LS_KEY = "student_welcome_completed";

function getLocalCompleted(code: string): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.code === code && !!parsed?.completedAt;
  } catch {
    return false;
  }
}

function setLocalCompleted(code: string) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ code, completedAt: new Date().toISOString() }),
    );
  } catch {}
}

function clearLocalCompleted(code: string) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.code === code) {
      localStorage.removeItem(LS_KEY);
    }
  } catch {}
}

export function StudentWelcomeModal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [checked, setChecked] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [draft, setDraft] = React.useState<ProfileDraft>({ ...EMPTY_DRAFT });
  const [saving, setSaving] = React.useState(false);
  const [serverChecked, setServerChecked] = React.useState(false);

  const userCode = String((user as any)?.codigo ?? "").trim();
  const userRole = String(user?.role ?? "").toLowerCase();

  /* ── verificar si ya completó la encuesta ── */
  React.useEffect(() => {
    // Permitir evaluar incluso durante isLoading si ya tenemos user data (de localStorage)
    const hasUser = !!user && !!userCode;
    if (!hasUser) {
      // Si terminó de cargar y no hay user, no hacer nada
      if (!isLoading) {
        setChecked(true);
        setServerChecked(true);
      }
      return;
    }

    if (userRole !== "student") {
      setChecked(true);
      setServerChecked(true);
      return;
    }

    // Decisión instantánea:
    // - si NO hay cache local, mostrar de inmediato
    // - si SÍ hay cache local, dejamos cerrado inicialmente pero SIEMPRE revalidamos
    const hasLocalCompleted = getLocalCompleted(userCode);
    setOpen(!hasLocalCompleted);
    setChecked(true);
    setServerChecked(false);

    let cancelled = false;

    // Verificación en background: el backend corrige cualquier cache local obsoleta
    const token = getAuthToken();
    fetch(`/api/alumnos/${encodeURIComponent(userCode)}/metadata/profile`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        const completedAt = json?.item?.payload?.completedAt;
        if (completedAt) {
          setLocalCompleted(userCode);
          setOpen(false);
        } else {
          clearLocalCompleted(userCode);
          setOpen(true);
        }
        setServerChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setServerChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, user, userCode, userRole]);

  /* ── helpers de draft ── */
  const patch = (partial: Partial<ProfileDraft>) =>
    setDraft((d) => ({ ...d, ...partial }));

  const addSocial = () =>
    patch({
      socialNetworks: [
        ...draft.socialNetworks,
        { platform: "instagram", handle: "" },
      ],
    });

  const removeSocial = (idx: number) =>
    patch({
      socialNetworks: draft.socialNetworks.filter((_, i) => i !== idx),
    });

  const updateSocial = (
    idx: number,
    field: keyof SocialNetwork,
    value: string,
  ) =>
    patch({
      socialNetworks: draft.socialNetworks.map((s, i) =>
        i === idx ? { ...s, [field]: value } : s,
      ),
    });

  /* ── validación por paso ── */
  const isStep1Valid =
    draft.niche.trim().length > 0 &&
    draft.socialNetworks.some((s) => s.handle.trim().length > 0);

  const isStep2Valid =
    draft.occupation.trim().length > 0 && draft.digitalExperience !== "";

  const isStep3Valid = draft.learningPreference !== "";

  const canNext =
    (step === 1 && isStep1Valid) ||
    (step === 2 && isStep2Valid) ||
    (step === 3 && isStep3Valid);

  /* ── guardar ── */
  const onSave = React.useCallback(async () => {
    if (!userCode) return;
    setSaving(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `/api/alumnos/${encodeURIComponent(userCode)}/metadata/profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            niche: draft.niche.trim(),
            socialNetworks: draft.socialNetworks.filter((s) => s.handle.trim()),
            occupation: draft.occupation.trim(),
            digitalExperience: draft.digitalExperience,
            learningPreference: draft.learningPreference,
          }),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Error ${res.status}`);
      }

      toast({
        title: "¡Bienvenido/a!",
        description: "Tus datos fueron guardados correctamente.",
      });
      setLocalCompleted(userCode);
      setOpen(false);
    } catch (e: any) {
      toast({
        title: "No se pudieron guardar los datos",
        description: e?.message || "Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [userCode, draft]);

  /* ── render guard ── */
  if (!user || userRole !== "student") return null;
  if (!checked && !open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // No permitir cerrar sin completar
        if (!next) return;
        setOpen(next);
      }}
    >
      <DialogContent
        className="border-0 p-0 overflow-hidden sm:max-w-lg"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="relative p-6 sm:p-7 bg-gradient-to-br from-violet-500/15 via-primary/10 to-amber-500/15">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(245,158,11,0.14),transparent_55%)]" />
          <div className="relative flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/10 grid place-items-center border border-primary/15">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  ¡Bienvenido/a a la academia!
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Cuéntanos un poco sobre ti para personalizar tu experiencia.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          {/* Progress indicator */}
          <div className="relative mt-4 flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i + 1 <= step ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">
              {step}/{TOTAL_STEPS}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 pt-5 space-y-5 min-h-[280px]">
          {/* ───── STEP 1: Nicho + Redes ───── */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="welcome-niche">
                  ¿Cuál es tu nicho de mercado?
                </Label>
                <Input
                  id="welcome-niche"
                  placeholder="Ej: E-commerce de moda, salud y bienestar, finanzas personales..."
                  value={draft.niche}
                  onChange={(e) => patch({ niche: e.target.value })}
                  maxLength={200}
                />
              </div>

              <div className="space-y-3">
                <Label>Tus redes sociales</Label>
                {draft.socialNetworks.map((sn, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={sn.platform}
                      onChange={(e) =>
                        updateSocial(idx, "platform", e.target.value)
                      }
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {SOCIAL_PLATFORMS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="@tu_usuario o URL"
                      value={sn.handle}
                      onChange={(e) =>
                        updateSocial(idx, "handle", e.target.value)
                      }
                      maxLength={100}
                      className="flex-1"
                    />
                    {draft.socialNetworks.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSocial(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {draft.socialNetworks.length < 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSocial}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar red
                  </Button>
                )}
              </div>
            </>
          )}

          {/* ───── STEP 2: Ocupación + Experiencia ───── */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="welcome-occupation">¿A qué te dedicas?</Label>
                <Input
                  id="welcome-occupation"
                  placeholder="Ej: Emprendedor, freelancer, empleado, estudiante..."
                  value={draft.occupation}
                  onChange={(e) => patch({ occupation: e.target.value })}
                  maxLength={200}
                />
              </div>

              <div className="space-y-3">
                <Label>Tu nivel de experiencia digital</Label>
                <RadioGroup
                  value={draft.digitalExperience}
                  onValueChange={(v) => patch({ digitalExperience: v })}
                  className="space-y-2"
                >
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        draft.digitalExperience === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <RadioGroupItem value={opt.value} />
                      <div>
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {opt.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </>
          )}

          {/* ───── STEP 3: Preferencia de aprendizaje ───── */}
          {step === 3 && (
            <div className="space-y-3">
              <Label>¿Cómo aprendes mejor?</Label>
              <RadioGroup
                value={draft.learningPreference}
                onValueChange={(v) => patch({ learningPreference: v })}
                className="grid grid-cols-3 gap-3"
              >
                {LEARNING_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 cursor-pointer transition-colors text-center ${
                      draft.learningPreference === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <RadioGroupItem value={opt.value} className="sr-only" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </RadioGroup>

              {/* Resumen antes de guardar */}
              <div className="mt-4 rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
                <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Resumen
                </div>
                <div>
                  <span className="text-muted-foreground">Nicho:</span>{" "}
                  {draft.niche}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-muted-foreground">Redes:</span>
                  {draft.socialNetworks
                    .filter((s) => s.handle.trim())
                    .map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {s.platform}: {s.handle}
                      </Badge>
                    ))}
                </div>
                <div>
                  <span className="text-muted-foreground">Ocupación:</span>{" "}
                  {draft.occupation}
                </div>
                <div>
                  <span className="text-muted-foreground">Experiencia:</span>{" "}
                  {EXPERIENCE_OPTIONS.find(
                    (o) => o.value === draft.digitalExperience,
                  )?.label ?? "—"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-6 sm:px-7 sm:pb-7 gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={saving}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Atrás
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={onSave}
              disabled={saving || !canNext}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
