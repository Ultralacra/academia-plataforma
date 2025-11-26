"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Utilidades numéricas para formato en vista previa del formulario ADS
function toNum(v?: string | number | null) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}
function fmtNum(n?: string | number | null, digits?: number) {
  const v = toNum(n);
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: typeof digits === "number" ? digits : 0,
  }).format(v);
}
function fmtMoney(n?: string | number | null) {
  const v = toNum(n);
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}
function fmtPct(n?: string | number | null) {
  const v = toNum(n);
  if (v == null) return "—";
  const pct = v <= 1 ? v * 100 : v;
  return `${pct.toFixed(1)}%`;
}

export default function AdsMetricsForm({
  studentCode,
  studentName,
}: {
  studentCode: string;
  studentName?: string;
}) {
  type Metrics = {
    fecha_inicio?: string;
    fecha_asignacion?: string;
    fecha_fin?: string;
    inversion?: string;
    facturacion?: string;
    roas?: string;
    alcance?: string;
    clics?: string;
    visitas?: string;
    pagos?: string;
    carga_pagina?: string;
    eff_ads?: string;
    eff_pago?: string;
    eff_compra?: string;
    compra_carnada?: string;
    compra_bump1?: string;
    compra_bump2?: string;
    compra_oto1?: string;
    compra_oto2?: string;
    compra_downsell?: string;
    pauta_activa?: boolean;
    requiere_interv?: boolean;
    fase?: string;
    fase_data?: Record<string, { obs?: string; interv_sugerida?: string }>;
    coach_copy?: string;
    coach_plat?: string;
    obs?: string;
    interv_sugerida?: string;
    auto_roas?: boolean;
    auto_eff?: boolean;
    adjuntos?: Array<{
      id: string;
      kind: "link" | "file";
      name: string;
      url?: string;
      type?: string;
      size?: number;
    }>;
  };

  const [data, setData] = useState<Metrics>({
    auto_roas: true,
    auto_eff: true,
    pauta_activa: false,
    requiere_interv: false,
    adjuntos: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const saveTimerRef = useRef<number | null>(null);
  const didInitRef = useRef<boolean>(false);

  function toNumOrNull(s?: string): number | null {
    if (s == null || s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  function fmtPercentNoScale(n?: number | null): string {
    if (n == null || !Number.isFinite(Number(n))) return "—";
    const v = Number(n);
    const s = v.toFixed(2);
    return `${s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}%`;
  }
  function pctOf(
    part?: string | number | null,
    total?: string | number | null
  ): string {
    const p = toNum(part as any);
    const t = toNum(total as any);
    if (p == null || !t || t <= 0) return "—";
    return fmtPercentNoScale(p / t);
  }

  // Cargar métrica existente por estudiante
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const key = `ads-metrics:${studentCode}`;
        const raw =
          typeof window !== "undefined"
            ? window.localStorage.getItem(key)
            : null;
        if (mounted && raw) {
          try {
            const parsed = JSON.parse(raw);
            const maybeForm = parsed?.form ?? parsed;

            // Migration: if obs/interv exists but no fase_data, move them
            if (
              (maybeForm.obs || maybeForm.interv_sugerida) &&
              !maybeForm.fase_data
            ) {
              const p = maybeForm.fase || "sin-fase";
              maybeForm.fase_data = {
                [p]: {
                  obs: maybeForm.obs,
                  interv_sugerida: maybeForm.interv_sugerida,
                },
              };
            }

            setData((prev) => ({ ...prev, ...maybeForm }));
          } catch {}
        }
      } catch (e) {
        console.error("ADS metrics local load error", e);
      } finally {
        if (mounted) setLoading(false);
        didInitRef.current = true;
      }
    })();
    return () => {
      mounted = false;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [studentCode]);

  // Autosave con debounce al cambiar datos
  useEffect(() => {
    if (!didInitRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        setSaving(true);
        const key = `ads-metrics:${studentCode}`;
        const payload = {
          savedAt: new Date().toISOString(),
          form: data,
        };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(payload));
        }
      } catch (e) {
        console.error("ADS metrics local save error", e);
      } finally {
        setSaving(false);
      }
    }, 600);
  }, [JSON.stringify(data), studentCode]);

  function persist(next: Metrics) {
    setData(next);
  }

  // Derivados automáticos
  const roasCalc = useMemo(() => {
    const inv = toNum(data.inversion);
    const fac = toNum(data.facturacion);
    if (inv && inv > 0 && fac != null) return (fac / inv).toFixed(2);
    return undefined;
  }, [data.inversion, data.facturacion]);
  const effAdsCalc = useMemo(() => {
    const v = toNum(data.visitas);
    const a = toNum(data.alcance);
    if (v != null && a && a > 0) return String(v / a);
    return undefined;
  }, [data.visitas, data.alcance]);
  const effPagoCalc = useMemo(() => {
    const p = toNum(data.pagos);
    const v = toNum(data.visitas);
    if (p != null && v && v > 0) return String(p / v);
    return undefined;
  }, [data.pagos, data.visitas]);
  const effCompraCalc = useMemo(() => {
    const comp = toNum(data.compra_carnada);
    const v = toNum(data.visitas);
    if (comp != null && v && v > 0) return String(comp / v);
    return undefined;
  }, [data.compra_carnada, data.visitas]);

  const view = {
    roas: data.auto_roas ? roasCalc ?? data.roas : data.roas,
    eff_ads: data.auto_eff ? effAdsCalc ?? data.eff_ads : data.eff_ads,
    eff_pago: data.auto_eff ? effPagoCalc ?? data.eff_pago : data.eff_pago,
    eff_compra: data.auto_eff
      ? effCompraCalc ?? data.eff_compra
      : data.eff_compra,
  } as const;

  function onChange<K extends keyof Metrics>(k: K, v: Metrics[K]) {
    persist({ ...data, [k]: v });
  }

  // Cleanup session files on unmount
  useEffect(() => {
    return () => {
      sessionFiles.forEach((f) => {
        try {
          if (f.url) URL.revokeObjectURL(f.url);
        } catch {}
      });
    };
  }, []);

  // Notas y Adjuntos (link y archivos de sesión)
  const [newLinkName, setNewLinkName] = useState<string>("");
  const [newLinkUrl, setNewLinkUrl] = useState<string>("");
  const [sessionFiles, setSessionFiles] = useState<
    Array<{ id: string; name: string; type: string; size: number; url: string }>
  >([]);

  function addLinkAttachment() {
    const url = (newLinkUrl || "").trim();
    const name = (newLinkName || "").trim() || url;
    if (!url) return;
    try {
      const u = new URL(url);
      const item = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        kind: "link" as const,
        name,
        url: u.toString(),
      };
      const next = [...(data.adjuntos || []), item];
      onChange("adjuntos", next as any);
      setNewLinkName("");
      setNewLinkUrl("");
    } catch {}
  }

  function removeSavedAttachment(id: string) {
    const next = (data.adjuntos || []).filter((a) => a.id !== id);
    onChange("adjuntos", next as any);
  }

  function onPickSessionFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const add = files.map((f) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
      url: URL.createObjectURL(f),
    }));
    setSessionFiles((prev) => [...prev, ...add]);
    try {
      e.target.value = "";
    } catch {}
  }

  function removeSessionFile(id: string) {
    setSessionFiles((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it?.url) URL.revokeObjectURL(it.url);
      return prev.filter((x) => x.id !== id);
    });
  }

  // Auto-calcular "Carga de página (%)" = visitas/clics*100
  useEffect(() => {
    const v = toNum(data.visitas);
    const c = toNum(data.clics);
    let calc = "0";
    if (c && c > 0 && v != null) {
      const pct = (v / c) * 100;
      const s = pct.toFixed(1);
      calc = /\.0$/.test(s) ? s.replace(/\.0$/, "") : s;
    }
    if ((data.carga_pagina || "0") !== calc) {
      setData((prev) => ({ ...prev, carga_pagina: calc }));
    }
  }, [data.visitas, data.clics]);

  // Helpers de presentación para porcentajes sin símbolo
  function toPercentNoSymbol(x?: string | number | null): string {
    const v = toNum(x);
    if (v == null) return "";
    const ratio = v > 1 ? v / 100 : v;
    const pct = ratio * 100;
    const s = pct.toFixed(1);
    return /\.0$/.test(s) ? s.replace(/\.0$/, "") : s;
  }
  function toPercentNoSymbolNoScale(x?: string | number | null): string {
    const v = toNum(x);
    if (v == null) return "";
    const s = Number(v).toFixed(2);
    return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }
  function sanitizePercentInput(s: string): string {
    try {
      const t = s.replace(/%/g, "").trim();
      const norm = t.replace(/,/g, ".").replace(/[^0-9.\-]/g, "");
      const parts = norm.split(".");
      if (parts.length <= 2) return norm;
      return parts[0] + "." + parts.slice(1).join("").replace(/\./g, "");
    } catch {
      return s;
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        {loading
          ? "Cargando métricas…"
          : saving
          ? "Guardando…"
          : "Cambios guardados"}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Métricas ADS {studentName ? `— ${studentName}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={data.fecha_inicio || ""}
                onChange={(e) => onChange("fecha_inicio", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha asignación</Label>
              <Input
                type="date"
                value={data.fecha_asignacion || ""}
                onChange={(e) => onChange("fecha_asignacion", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha fin</Label>
              <Input
                type="date"
                value={data.fecha_fin || ""}
                onChange={(e) => onChange("fecha_fin", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Rendimiento</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Inversión (USD)</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.inversion || ""}
                    onChange={(e) => onChange("inversion", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Facturación (USD)</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.facturacion || ""}
                    onChange={(e) => onChange("facturacion", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>ROAS</Label>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Auto</span>
                      <Switch
                        checked={!!data.auto_roas}
                        onCheckedChange={(v) => onChange("auto_roas", v)}
                      />
                    </div>
                  </div>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    disabled={data.auto_roas}
                    value={data.auto_roas ? view.roas || "" : data.roas || ""}
                    onChange={(e) => onChange("roas", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Notas y adjuntos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Observaciones</Label>
                  <Textarea
                    rows={3}
                    placeholder="Notas, comentarios, enlaces…"
                    value={data.fase_data?.[data.fase || "sin-fase"]?.obs || ""}
                    onChange={(e) => {
                      const phase = data.fase || "sin-fase";
                      const currentPhaseData = data.fase_data?.[phase] || {};
                      const nextPhaseData = {
                        ...currentPhaseData,
                        obs: e.target.value,
                      };
                      onChange("fase_data", {
                        ...(data.fase_data || {}),
                        [phase]: nextPhaseData,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Intervención sugerida</Label>
                  <Textarea
                    rows={3}
                    placeholder="Descripción de la intervención"
                    value={
                      data.fase_data?.[data.fase || "sin-fase"]
                        ?.interv_sugerida || ""
                    }
                    onChange={(e) => {
                      const phase = data.fase || "sin-fase";
                      const currentPhaseData = data.fase_data?.[phase] || {};
                      const nextPhaseData = {
                        ...currentPhaseData,
                        interv_sugerida: e.target.value,
                      };
                      onChange("fase_data", {
                        ...(data.fase_data || {}),
                        [phase]: nextPhaseData,
                      });
                    }}
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Adjuntar enlaces
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <Input
                      className="md:col-span-2"
                      placeholder="Nombre (opcional)"
                      value={newLinkName}
                      onChange={(e) => setNewLinkName(e.target.value)}
                    />
                    <Input
                      className="md:col-span-3"
                      placeholder="https://…"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Button type="button" size="sm" onClick={addLinkAttachment}>
                      Agregar enlace
                    </Button>
                  </div>
                  {(data.adjuntos || []).filter((a) => a.kind === "link")
                    .length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Enlaces guardados
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(data.adjuntos || [])
                          .filter((a) => a.kind === "link")
                          .map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center gap-2 rounded border px-2 py-1"
                            >
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline"
                                title={a.url}
                              >
                                {a.name || a.url}
                              </a>
                              <button
                                type="button"
                                className="text-[11px] text-muted-foreground hover:text-destructive"
                                onClick={() => removeSavedAttachment(a.id)}
                              >
                                Quitar
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Adjuntar archivos (solo esta sesión)
                  </div>
                  <input type="file" multiple onChange={onPickSessionFiles} />
                  {sessionFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Archivos de la sesión
                      </div>
                      <div className="flex flex-col gap-1">
                        {sessionFiles.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between text-xs rounded border px-2 py-1"
                          >
                            <div className="truncate">
                              {f.name}{" "}
                              <span className="text-muted-foreground">
                                ({(f.size / 1024).toFixed(0)} KB)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={f.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                              >
                                Ver
                              </a>
                              <button
                                type="button"
                                className="hover:text-destructive"
                                onClick={() => removeSessionFile(f.id)}
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Nota: los archivos no se guardan en el servidor ni en
                        localStorage. Usa enlaces para persistir referencias
                        (Drive, YouTube, etc.).
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Embudo</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Alcance</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.alcance || ""}
                    onChange={(e) => onChange("alcance", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Clics</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.clics || ""}
                    onChange={(e) => onChange("clics", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Visitas</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.visitas || ""}
                    onChange={(e) => onChange("visitas", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Pagos iniciados</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.pagos || ""}
                    onChange={(e) => onChange("pagos", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Efectividades (%)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label>Carga de página (visitas/clics)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0%"
                    disabled
                    value={`${data.carga_pagina || "0"}%`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>Ads (visitas/alcance)</Label>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Auto</span>
                      <Switch
                        checked={!!data.auto_eff}
                        onCheckedChange={(v) => onChange("auto_eff", v)}
                      />
                    </div>
                  </div>
                  <Input
                    inputMode="decimal"
                    placeholder="0%"
                    disabled={data.auto_eff}
                    value={`${
                      data.auto_eff
                        ? toPercentNoSymbol(view.eff_ads)
                        : toPercentNoSymbol(data.eff_ads)
                    }%`}
                    onChange={(e) =>
                      onChange("eff_ads", sanitizePercentInput(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Pago iniciado (pagos/visitas)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0%"
                    disabled={data.auto_eff}
                    value={`${
                      data.auto_eff
                        ? toPercentNoSymbol(view.eff_pago)
                        : toPercentNoSymbol(data.eff_pago)
                    }%`}
                    onChange={(e) =>
                      onChange("eff_pago", sanitizePercentInput(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Compra (carnada/visitas)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0%"
                    disabled={data.auto_eff}
                    value={`${
                      data.auto_eff
                        ? toPercentNoSymbol(view.eff_compra)
                        : toPercentNoSymbol(data.eff_compra)
                    }%`}
                    onChange={(e) =>
                      onChange(
                        "eff_compra",
                        sanitizePercentInput(e.target.value)
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Compras</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Carnada</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_carnada || ""}
                    onChange={(e) => onChange("compra_carnada", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bump 1</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_bump1 || ""}
                    onChange={(e) => onChange("compra_bump1", e.target.value)}
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Efectividad: {pctOf(data.compra_bump1, data.compra_carnada)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Bump 2</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_bump2 || ""}
                    onChange={(e) => onChange("compra_bump2", e.target.value)}
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Efectividad: {pctOf(data.compra_bump2, data.compra_carnada)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>OTO 1</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_oto1 || ""}
                    onChange={(e) => onChange("compra_oto1", e.target.value)}
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Efectividad: {pctOf(data.compra_oto1, data.compra_carnada)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>OTO 2</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_oto2 || ""}
                    onChange={(e) => onChange("compra_oto2", e.target.value)}
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Efectividad: {pctOf(data.compra_oto2, data.compra_carnada)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Downsell</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_downsell || ""}
                    onChange={(e) =>
                      onChange("compra_downsell", e.target.value)
                    }
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Efectividad:{" "}
                    {pctOf(data.compra_downsell, data.compra_carnada)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Pauta activa</Label>
                  <Switch
                    checked={!!data.pauta_activa}
                    onCheckedChange={(v) => onChange("pauta_activa", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>¿Requiere intervención?</Label>
                  <Switch
                    checked={!!data.requiere_interv}
                    onCheckedChange={(v) => onChange("requiere_interv", v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fase</Label>
                  <select
                    value={data.fase ? data.fase : "sin-fase"}
                    onChange={(e) =>
                      onChange(
                        "fase",
                        e.target.value === "sin-fase" ? "" : e.target.value
                      )
                    }
                    className="w-full h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="sin-fase">Sin fase</option>
                    <option value="Fase de testeo">Fase de testeo</option>
                    <option value="Fase de optimización">
                      Fase de optimización
                    </option>
                    <option value="Fase de Escala">Fase de Escala</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Coaches</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label>Coach de Copy</Label>
                  <Input
                    placeholder="Nombre"
                    value={data.coach_copy || ""}
                    onChange={(e) => onChange("coach_copy", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Coach de Plataformas</Label>
                  <Input
                    placeholder="Nombre"
                    value={data.coach_plat || ""}
                    onChange={(e) => onChange("coach_plat", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vista previa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <div className="space-y-1.5">
            <div className="font-medium text-muted-foreground">Rendimiento</div>
            <div>
              ROAS: <b>{view.roas ?? "—"}</b>
            </div>
            <div>
              Inversión: <b>{fmtMoney(data.inversion)}</b>
            </div>
            <div>
              Facturación: <b>{fmtMoney(data.facturacion)}</b>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="font-medium text-muted-foreground">Embudo</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  Alcance: <b>{fmtNum(data.alcance)}</b>
                </div>
                <div>
                  Clics: <b>{fmtNum(data.clics)}</b>
                </div>
                <div>
                  Visitas: <b>{fmtNum(data.visitas)}</b>
                </div>
                <div>
                  Pagos: <b>{fmtNum(data.pagos)}</b>
                </div>
                <div className="col-span-2">
                  Carga pág: <b>{fmtPct(data.carga_pagina)}</b>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="font-medium text-muted-foreground">
                Efectividades
              </div>
              <div>
                Ads: <b>{fmtPct(view.eff_ads)}</b>
              </div>
              <div>
                Pago iniciado: <b>{fmtPct(view.eff_pago)}</b>
              </div>
              <div>
                Compra: <b>{fmtPct(view.eff_compra)}</b>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="font-medium text-muted-foreground mb-2">
                Compras
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["Carnada", data.compra_carnada],
                    ["B1", data.compra_bump1],
                    ["B2", data.compra_bump2],
                    ["O1", data.compra_oto1],
                    ["O2", data.compra_oto2],
                    ["Dn", data.compra_downsell],
                  ] as const
                )
                  .filter(([, v]) => toNum(v) && toNum(v)! > 0)
                  .map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center rounded bg-muted px-2 py-1 text-xs"
                    >
                      {k}: {fmtNum(v)}
                    </span>
                  ))}
                {!toNum(data.compra_carnada) &&
                  !toNum(data.compra_bump1) &&
                  !toNum(data.compra_bump2) &&
                  !toNum(data.compra_oto1) &&
                  !toNum(data.compra_oto2) &&
                  !toNum(data.compra_downsell) && (
                    <span className="text-sm text-muted-foreground">
                      Sin registros
                    </span>
                  )}
              </div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground mb-2">
                Estado y fase
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                    data.pauta_activa ? "border-border" : "border-border"
                  }`}
                >
                  {data.pauta_activa ? "Pauta activa" : "Pauta inactiva"}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                    data.requiere_interv
                      ? "bg-rose-900/20 text-rose-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {data.requiere_interv
                    ? "Requiere intervención"
                    : "Sin intervención"}
                </span>
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs border-border">
                  {data.fase || "Sin fase"}
                </span>
              </div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground mb-2">
                Coaches
              </div>
              <div className="grid grid-cols-1 gap-1">
                <div>
                  Copy: <b>{data.coach_copy || "—"}</b>
                </div>
                <div>
                  Plataformas: <b>{data.coach_plat || "—"}</b>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Guardado local automáticamente. Esta vista no envía datos al
            servidor.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
