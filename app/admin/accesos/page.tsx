"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAccessDueNotifications } from "@/components/hooks/useAccessDueNotifications";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  RefreshCw,
  Search,
  KeyRound,
  Clock,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Users,
  Crown,
  Download,
  Mail,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api-config";
import {
  CONTRACT_EXPIRY_TEMPLATES,
  type ContractExpiryKey,
} from "@/lib/email-templates/contract-expiry";

function canSeeAccesos(
  user: { role?: string | null; area?: string | null } | null | undefined,
) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "atc") return true;
  const area = String(user.area ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (user.role === "equipo" && area === "ATENCION_AL_CLIENTE") return true;
  return false;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

type TipoFilter = "todos" | "membresia" | "contractual";
type QuickFilter = null | "urgentes" | "membresia" | "contractual";
type InactivityPreset = "todos" | "7" | "14" | "21" | "30" | "custom";

function urgencyColor(daysLeft: number) {
  if (daysLeft < 0) return "text-destructive";
  if (daysLeft <= 7) return "text-orange-500";
  if (daysLeft <= 15) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

function urgencyBg(daysLeft: number) {
  if (daysLeft < 0) return "border-destructive/30 bg-destructive/5";
  if (daysLeft <= 7)
    return "border-orange-300/50 bg-orange-50/50 dark:bg-orange-950/20";
  if (daysLeft <= 15)
    return "border-yellow-300/50 bg-yellow-50/50 dark:bg-yellow-950/20";
  return "border-border bg-card";
}

async function exportToExcel(
  dueList: import("@/components/hooks/useAccessDueNotifications").AccessDueItem[],
  overdueList: import("@/components/hooks/useAccessDueNotifications").AccessDueItem[],
) {
  const toRows = (list: typeof dueList, estado: string) =>
    list.map((it) => ({
      Estado: estado,
      Nombre: it.alumnoNombre ?? "",
      Codigo: it.alumnoCodigo ?? "",
      "Estado alumno": it.alumnoEstado ?? "",
      Fase: it.stage ?? "",
      "Fecha vence": it.fechaVence,
      "Dias restantes": it.daysLeft,
      "Dias inactividad":
        typeof it.inactivityDays === "number" ? it.inactivityDays : "",
      "Tipo vence": it.venceTipo ?? "",
      "Tiene membresia": it.hasMembresia ? "Si" : "No",
      "Cantidad membresias": it.membresiaCount ?? 0,
    }));

  const rows = [
    ...toRows(dueList, "Por vencer"),
    ...toRows(overdueList, "Vencido"),
  ];

  if (rows.length === 0) return;

  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ancho de columnas
  ws["!cols"] = [
    { wch: 12 }, // Estado
    { wch: 30 }, // Nombre
    { wch: 12 }, // Codigo
    { wch: 18 }, // Estado alumno
    { wch: 12 }, // Fase
    { wch: 14 }, // Fecha vence
    { wch: 14 }, // Dias restantes
    { wch: 16 }, // Dias inactividad
    { wch: 14 }, // Tipo vence
    { wch: 16 }, // Tiene membresia
    { wch: 20 }, // Cantidad membresias
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Accesos");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `accesos-${today}.xlsx`);
}

function urgencyBar(daysLeft: number) {
  if (daysLeft < 0) return "bg-destructive";
  if (daysLeft <= 7) return "bg-orange-400";
  if (daysLeft <= 15) return "bg-yellow-400";
  return "bg-muted-foreground/20";
}

function formatDaysLeft(daysLeft: number) {
  if (daysLeft < 0)
    return `Vencido hace ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) !== 1 ? "s" : ""}`;
  if (daysLeft === 0) return "Vence hoy";
  if (daysLeft === 1) return "Vence manana";
  return `Vence en ${daysLeft} dias`;
}

export default function AccesosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const enabled = canSeeAccesos(user);

  // Ventana: hasta el último día del 3er mes calendario completo
  const MONTHS_WINDOW = 3;
  const daysWindow = useMemo(() => {
    const now = new Date();
    const endOfWindow = new Date(
      now.getFullYear(),
      now.getMonth() + MONTHS_WINDOW + 1,
      0, // día 0 del mes siguiente = último día del mes actual + MONTHS_WINDOW
    );
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    return Math.round(
      (endOfWindow.getTime() - startOfToday.getTime()) / 86400000,
    );
  }, []);

  const windowLabel = `próximos ${MONTHS_WINDOW} meses`;

  const {
    items,
    overdueItems,
    dueCount,
    overdueCount,
    loading,
    progress,
    error,
    refresh,
  } = useAccessDueNotifications({ enabled, daysWindow });

  const [tab, setTab] = useState<"due" | "overdue">("due");
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("todos");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);

  // ── Mail dialog state ──
  const [mailDialogItem, setMailDialogItem] = useState<
    (typeof items)[number] | null
  >(null);
  const [mailDialogVariant, setMailDialogVariant] = useState<"due" | "overdue">(
    "due",
  );
  const [mailStudentEmail, setMailStudentEmail] = useState("");
  const [mailSending, setMailSending] = useState(false);
  const [fetchingEmail, setFetchingEmail] = useState(false);
  const [mailTemplateKey, setMailTemplateKey] =
    useState<ContractExpiryKey | null>(null);

  const [monthFilter, setMonthFilter] = useState<string>("todos");
  const [dueMes, setDueMes] = useState<string>("todos");
  const [tagFilter, setTagFilter] = useState<string>("todos");
  const [inactivityPreset, setInactivityPreset] =
    useState<InactivityPreset>("todos");
  const [inactivityCustomDays, setInactivityCustomDays] = useState<string>("");

  const dueMesOptions = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; count: number }
    >();
    for (const it of items) {
      const m = /^(\d{4})-(\d{2})/.exec(it.fechaVence || "");
      if (!m) continue;
      const key = `${m[1]}-${m[2]}`;
      const label = `${MONTH_NAMES[Number(m[2]) - 1] ?? "?"} ${m[1]}`;
      const prev = map.get(key);
      if (prev) prev.count += 1;
      else map.set(key, { key, label, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [items]);

  const monthOptions = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; count: number }
    >();
    for (const it of overdueItems) {
      const m = /^(\d{4})-(\d{2})/.exec(it.fechaVence || "");
      if (!m) continue;
      const key = `${m[1]}-${m[2]}`;
      const label = `${MONTH_NAMES[Number(m[2]) - 1] ?? "?"} ${m[1]}`;
      const prev = map.get(key);
      if (prev) prev.count += 1;
      else map.set(key, { key, label, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [overdueItems]);

  const tagOptions = useMemo(() => {
    const all = [...items, ...overdueItems];
    const map = new Map<string, { label: string; count: number }>();
    for (const it of all) {
      const key = String(it.tag ?? "").trim();
      if (!key) continue;
      const prev = map.get(key);
      if (prev) prev.count += 1;
      else map.set(key, { label: key, count: 1 });
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, "es", { sensitivity: "base" }))
      .map(([key, v]) => ({ key, ...v }));
  }, [items, overdueItems]);

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const matchesSearch = (it: (typeof items)[number]) => {
    const q = normalize(search.trim());
    if (!q) return true;
    return (
      normalize(String(it.alumnoNombre ?? "")).includes(q) ||
      normalize(String(it.alumnoCodigo ?? "")).includes(q) ||
      normalize(String(it.alumnoEstado ?? "")).includes(q)
    );
  };

  // Membresia: solo si el estado del alumno es membresía
  const esMembresia = (it: (typeof items)[number]) =>
    it.alumnoEstado?.toLowerCase().includes("membres") ?? false;

  const matchesTipo = (it: (typeof items)[number]) => {
    if (tipoFilter === "todos") return true;
    if (tipoFilter === "membresia") return esMembresia(it);
    if (tipoFilter === "contractual") return !esMembresia(it);
    return true;
  };

  const matchesTag = (it: (typeof items)[number]) => {
    if (tagFilter === "todos") return true;
    if (tagFilter === "__sin_tag__") return !String(it.tag ?? "").trim();
    return String(it.tag ?? "").trim() === tagFilter;
  };

  // Umbral de días de inactividad activo (null = sin filtro).
  const inactivityThreshold = useMemo<number | null>(() => {
    if (inactivityPreset === "todos") return null;
    if (inactivityPreset === "custom") {
      const n = Number(inactivityCustomDays);
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    }
    const n = Number(inactivityPreset);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [inactivityPreset, inactivityCustomDays]);

  const matchesInactivity = (it: (typeof items)[number]) => {
    if (inactivityThreshold === null) return true;
    const v = it.inactivityDays;
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
    return v >= inactivityThreshold;
  };

  const matchesQuick = (it: (typeof items)[number]) => {
    if (!quickFilter) return true;
    if (quickFilter === "urgentes") return it.daysLeft <= 7;
    if (quickFilter === "membresia") return esMembresia(it);
    if (quickFilter === "contractual") return !esMembresia(it);
    // filtro para_notificar eliminado
    return true;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredDue = useMemo(
    () =>
      items.filter((it) => {
        if (
          !matchesSearch(it) ||
          !matchesTipo(it) ||
          !matchesQuick(it) ||
          !matchesTag(it) ||
          !matchesInactivity(it)
        )
          return false;
        if (dueMes !== "todos") {
          const m = /^(\d{4})-(\d{2})/.exec(it.fechaVence || "");
          if (!m) return false;
          if (`${m[1]}-${m[2]}` !== dueMes) return false;
        }
        return true;
      }),
    [
      items,
      search,
      tipoFilter,
      quickFilter,
      dueMes,
      tagFilter,
      inactivityThreshold,
    ],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredOverdue = useMemo(
    () =>
      overdueItems.filter((it) => {
        if (
          !matchesSearch(it) ||
          !matchesTipo(it) ||
          !matchesQuick(it) ||
          !matchesTag(it) ||
          !matchesInactivity(it)
        )
          return false;
        if (monthFilter === "todos") return true;
        const m = /^(\d{4})-(\d{2})/.exec(it.fechaVence || "");
        if (!m) return false;
        return `${m[1]}-${m[2]}` === monthFilter;
      }),
    [
      overdueItems,
      search,
      monthFilter,
      tipoFilter,
      quickFilter,
      tagFilter,
      inactivityThreshold,
    ],
  );

  const membresiaCount = filteredDue.filter(
    (it) => it.alumnoEstado?.toLowerCase().includes("membres") ?? false,
  ).length;
  const membresiasTotal = [...filteredDue, ...filteredOverdue].reduce(
    (acc, it) => acc + (it.membresiaCount ?? 0),
    0,
  );
  const alumnosConMembresia = [...filteredDue, ...filteredOverdue].filter(
    (it) => (it.membresiaCount ?? 0) > 0,
  ).length;
  const urgentCount = filteredDue.filter((it) => it.daysLeft <= 7).length;
  const contractualDueCount = filteredDue.filter(
    (it) => !esMembresia(it),
  ).length;

  async function handleSendFromAccesos() {
    const item = mailDialogItem;
    if (!item || !mailTemplateKey) return;

    const email = mailStudentEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    setMailSending(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/brevo/send-contract-expiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          to: email,
          recipientName: String(item.alumnoNombre ?? "").trim(),
          templateKey: mailTemplateKey,
          appName: "Hotselling",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json?.status || "") !== "success") {
        throw new Error(String(json?.message || "No se pudo enviar"));
      }
      const tplMeta = CONTRACT_EXPIRY_TEMPLATES.find(
        (t) => t.key === mailTemplateKey,
      );
      alert(`Email "${tplMeta?.name ?? mailTemplateKey}" enviado a ${email}.`);
      setMailDialogItem(null);
    } catch (err: any) {
      alert(`Error al enviar: ${err?.message ?? "Intenta nuevamente."}`);
    } finally {
      setMailSending(false);
    }
  }

  if (!enabled) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          No tenes permisos para ver esta seccion.
        </div>
      </DashboardLayout>
    );
  }

  const renderItem = (
    it: (typeof items)[number],
    variant: "due" | "overdue",
  ) => {
    const who =
      String(it.alumnoNombre ?? "").trim() ||
      String(it.alumnoCodigo ?? "").trim() ||
      "Alumno";
    const estado = it.alumnoEstado ? String(it.alumnoEstado).trim() : "";
    const fase = String(it.stage ?? "").trim() || "Sin fase";
    // Membresia solo si el tipo de vence ES membresia (no por tener records de extension)
    const isMembresia = it.venceTipo === "membresia";
    // Requiere membresia: contrato vencido por mas de 1 dia sin membresia
    const requiereMembresia = !isMembresia && it.daysLeft < -1;
    // Requiere intervencion: contrato vence hoy o manana sin membresia
    const requiereIntervencion =
      !isMembresia && it.daysLeft >= -1 && it.daysLeft <= 1;

    return (
      <div
        key={it.key}
        className={`group relative flex items-center gap-4 rounded-xl border pl-6 pr-4 py-4 transition-all hover:shadow-sm cursor-default ${urgencyBg(it.daysLeft)}`}
      >
        <div
          className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${urgencyBar(it.daysLeft)}`}
        />

        <div
          className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-full ${
            isMembresia
              ? "bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
              : "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
          }`}
        >
          {isMembresia ? (
            <Crown className="h-4 w-4" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold leading-tight">{who}</span>
            {it.alumnoCodigo && (
              <span className="text-xs text-muted-foreground font-mono shrink-0">
                {it.alumnoCodigo}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {/* Tag / programa */}
            {it.tag && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 h-4 shrink-0 border-emerald-300 text-emerald-700 dark:text-emerald-400"
              >
                {it.tag}
              </Badge>
            )}
            {/* Estado del alumno siempre visible */}
            {estado && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 h-4 shrink-0"
              >
                {estado}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 h-4 shrink-0"
            >
              Fase: {fase}
            </Badge>
            {/* Chip de membresia solo si el tipo ES membresia */}
            {isMembresia && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 h-4 shrink-0 border-purple-300 text-purple-600 dark:text-purple-400"
              >
                Membresia
              </Badge>
            )}
            {(it.membresiaCount ?? 0) > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 h-4 shrink-0 border-purple-300 text-purple-600 dark:text-purple-400"
              >
                Membresias: {it.membresiaCount}
              </Badge>
            )}
            {/* Badge de inactividad: avisa visualmente cuando es alta */}
            {typeof it.inactivityDays === "number" && it.inactivityDays > 0 && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 h-4 shrink-0 ${
                  it.inactivityDays >= 14
                    ? "border-rose-300 text-rose-600 dark:text-rose-400"
                    : it.inactivityDays >= 7
                      ? "border-amber-300 text-amber-600 dark:text-amber-400"
                      : ""
                }`}
              >
                Inactivo: {it.inactivityDays}d
              </Badge>
            )}
            {/* Alerta de accion requerida solo para contratos */}
            {requiereMembresia && (
              <Badge className="text-[10px] px-1.5 h-4 shrink-0 bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/10">
                Requiere membresia
              </Badge>
            )}
            {requiereIntervencion && (
              <Badge className="text-[10px] px-1.5 h-4 shrink-0 bg-orange-100 text-orange-600 border border-orange-300 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-400">
                Requiere intervencion
              </Badge>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            className={`text-sm font-semibold tabular-nums ${urgencyColor(it.daysLeft)}`}
          >
            {formatDaysLeft(it.daysLeft)}
          </div>
          <div className="flex items-center gap-1 justify-end mt-0.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="tabular-nums">{it.fechaVence}</span>
          </div>
        </div>

        {it.alumnoCodigo && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Enviar email de notificación"
            onClick={() => {
              setMailDialogItem(it);
              setMailDialogVariant(variant);
              // Selección automática de plantilla sugerida
              let suggested: ContractExpiryKey;
              if (variant === "overdue") {
                suggested = "contrato_completado_5d";
              } else if (it.venceTipo === "membresia") {
                suggested = "membresia_por_vencer_10d";
              } else {
                suggested = "contrato_por_vencer_15d";
              }
              setMailTemplateKey(suggested);
              setMailStudentEmail("");
              if (it.alumnoCodigo) {
                setFetchingEmail(true);
                apiFetch(`/users/${encodeURIComponent(it.alumnoCodigo)}`)
                  .then((resp: any) => {
                    const data = resp?.data ?? resp;
                    const email = String(
                      data?.correo ?? data?.email ?? data?.mail ?? "",
                    ).trim();
                    setMailStudentEmail(email);
                  })
                  .catch(() => {})
                  .finally(() => setFetchingEmail(false));
              }
            }}
          >
            <Mail className="h-4 w-4" />
          </Button>
        )}
        {it.alumnoCodigo && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() =>
              router.push(
                `/admin/alumnos/${encodeURIComponent(it.alumnoCodigo!)}/perfil`,
              )
            }
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="py-6 px-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Accesos</h1>
              <p className="text-sm text-muted-foreground">
                Monitoreo de vencimientos de acceso y membresias
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void exportToExcel(filteredDue, filteredOverdue)}
              disabled={
                loading ||
                (filteredDue.length === 0 && filteredOverdue.length === 0)
              }
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => refresh()}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {loading ? "Cargando..." : "Actualizar datos"}
            </Button>
          </div>
        </div>

        {/* Barra de progreso durante la carga */}
        {loading && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analizando accesos…{" "}
                {progress > 0 && progress < 100 ? `${progress}%` : ""}
              </span>
              {(dueCount > 0 || overdueCount > 0) && (
                <span>{dueCount + overdueCount} encontrados hasta ahora</span>
              )}
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${Math.max(progress, 2)}%` }}
              />
            </div>
          </div>
        )}

        {/* Tarjetas de resumen */}
        {(dueCount > 0 || overdueCount > 0 || !loading) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                <Clock className="h-3.5 w-3.5" />
                Por vencer
              </div>
              <div className="text-3xl font-bold">{filteredDue.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {filteredDue.length !== dueCount
                  ? `de ${dueCount} en ${windowLabel}`
                  : windowLabel}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-1.5 text-xs text-destructive font-medium uppercase tracking-wide mb-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Vencidos
              </div>
              <div className="text-3xl font-bold text-destructive">
                {filteredOverdue.length}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {filteredOverdue.length !== overdueCount
                  ? `de ${overdueCount} en 12 meses`
                  : "ultimos 12 meses"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setTab("due");
                setQuickFilter(quickFilter === "urgentes" ? null : "urgentes");
              }}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
                quickFilter === "urgentes"
                  ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30 ring-1 ring-orange-400"
                  : "bg-card hover:border-orange-300"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-orange-500 font-medium uppercase tracking-wide mb-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Urgentes
                {quickFilter === "urgentes" && (
                  <span className="ml-auto text-[10px] text-orange-400 normal-case">
                    activo
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-orange-500">
                {urgentCount}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                vencen en 7 dias o menos
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("due");
                setQuickFilter(
                  quickFilter === "membresia" ? null : "membresia",
                );
              }}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
                quickFilter === "membresia"
                  ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30 ring-1 ring-purple-400"
                  : "bg-card hover:border-purple-300"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium uppercase tracking-wide mb-2">
                <Crown className="h-3.5 w-3.5" />
                Membresias
                {quickFilter === "membresia" && (
                  <span className="ml-auto text-[10px] text-purple-400 normal-case">
                    activo
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-purple-600">
                {membresiasTotal}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {alumnosConMembresia} alumnos con membresia
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("due");
                setQuickFilter(
                  quickFilter === "contractual" ? null : "contractual",
                );
              }}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
                quickFilter === "contractual"
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-400"
                  : "bg-card hover:border-blue-300"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium uppercase tracking-wide mb-2">
                <KeyRound className="h-3.5 w-3.5" />
                Contratos
                {quickFilter === "contractual" && (
                  <span className="ml-auto text-[10px] text-blue-400 normal-case">
                    activo
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {contractualDueCount}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                vencen en {windowLabel}
              </div>
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, codigo o estado..."
              className="pl-9"
            />
          </div>
          <Select
            value={tipoFilter}
            onValueChange={(v) => setTipoFilter(v as TipoFilter)}
          >
            <SelectTrigger className="w-full sm:w-48 gap-2">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="membresia">Solo membresias</SelectItem>
              <SelectItem value="contractual">Solo contratos</SelectItem>
            </SelectContent>
          </Select>
          {tab === "due" && dueMesOptions.length > 0 && (
            <Select value={dueMes} onValueChange={setDueMes}>
              <SelectTrigger className="w-full sm:w-52 gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Todos los meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los meses</SelectItem>
                {dueMesOptions.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    <span className="flex items-center justify-between gap-4 w-full">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.count}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {tab === "overdue" && (
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-52 gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Todos los meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los meses</SelectItem>
                {monthOptions.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    <span className="flex items-center justify-between gap-4 w-full">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.count}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {tagOptions.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-full sm:w-52 gap-2">
                <SelectValue placeholder="Todos los programas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los programas</SelectItem>
                <SelectItem value="__sin_tag__">Sin programa</SelectItem>
                {tagOptions.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    <span className="flex items-center justify-between gap-4 w-full">
                      <span>{t.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.count}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* Filtro por días de inactividad */}
          <Select
            value={inactivityPreset}
            onValueChange={(v) => {
              const next = v as InactivityPreset;
              setInactivityPreset(next);
              if (next !== "custom") setInactivityCustomDays("");
            }}
          >
            <SelectTrigger className="w-full sm:w-52 gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Inactividad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Cualquier inactividad</SelectItem>
              <SelectItem value="7">+ 1 semana (7 dias)</SelectItem>
              <SelectItem value="14">+ 2 semanas (14 dias)</SelectItem>
              <SelectItem value="21">+ 3 semanas (21 dias)</SelectItem>
              <SelectItem value="30">+ 1 mes (30 dias)</SelectItem>
              <SelectItem value="custom">Personalizado…</SelectItem>
            </SelectContent>
          </Select>
          {inactivityPreset === "custom" && (
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              value={inactivityCustomDays}
              onChange={(e) =>
                setInactivityCustomDays(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="Dias"
              className="w-full sm:w-28"
            />
          )}
        </div>

        {/* Tabs */}
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as "due" | "overdue");
          }}
          className="space-y-4"
        >
          <TabsList className="h-10 w-full sm:w-auto">
            <TabsTrigger value="due" className="gap-2 px-5 flex-1 sm:flex-none">
              <Clock className="h-3.5 w-3.5" />
              Por vencer
              <Badge
                variant="secondary"
                className="text-xs ml-1 px-1.5 min-w-5 justify-center"
              >
                {filteredDue.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="gap-2 px-5 flex-1 sm:flex-none"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Vencidos
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-destructive text-white text-xs px-1.5 min-w-5 h-5">
                {filteredOverdue.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="due" className="mt-0">
            {loading && filteredDue.length === 0 ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Analizando accesos...</span>
              </div>
            ) : filteredDue.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground space-y-2">
                <Clock className="h-10 w-10 mx-auto opacity-20 mb-3" />
                <p className="text-sm font-medium">
                  {search || tipoFilter !== "todos"
                    ? "Sin resultados para los filtros aplicados"
                    : "No hay accesos por vencer en los proximos 30 dias"}
                </p>
                {(search ||
                  tipoFilter !== "todos" ||
                  quickFilter ||
                  tagFilter !== "todos" ||
                  inactivityPreset !== "todos" ||
                  dueMes !== "todos") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setTipoFilter("todos");
                      setQuickFilter(null);
                      setDueMes("todos");
                      setTagFilter("todos");
                      setInactivityPreset("todos");
                      setInactivityCustomDays("");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                  {filteredDue.map((it) => renderItem(it, "due"))}
                </div>
                {loading && (
                  <div className="flex items-center justify-center py-4 text-muted-foreground gap-2 text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Cargando más resultados…</span>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overdue" className="mt-0">
            {loading && filteredOverdue.length === 0 ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Analizando accesos...</span>
              </div>
            ) : filteredOverdue.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground space-y-2">
                <AlertTriangle className="h-10 w-10 mx-auto opacity-20 mb-3" />
                <p className="text-sm font-medium">
                  {search || tipoFilter !== "todos" || quickFilter
                    ? "Sin resultados para los filtros aplicados"
                    : "No hay accesos vencidos en ese mes"}
                </p>
                {(search ||
                  tipoFilter !== "todos" ||
                  quickFilter ||
                  tagFilter !== "todos" ||
                  inactivityPreset !== "todos") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setTipoFilter("todos");
                      setQuickFilter(null);
                      setTagFilter("todos");
                      setInactivityPreset("todos");
                      setInactivityCustomDays("");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                  {filteredOverdue.map((it) => renderItem(it, "overdue"))}
                </div>
                {loading && (
                  <div className="flex items-center justify-center py-4 text-muted-foreground gap-2 text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Cargando más resultados…</span>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Mail Dialog ─────────────────────────────── */}
      <Dialog
        open={!!mailDialogItem}
        onOpenChange={(open) => {
          if (!open) setMailDialogItem(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" /> Enviar email de notificación
            </DialogTitle>
            <DialogDescription>
              {mailDialogItem && (
                <span>
                  Alumno:{" "}
                  <strong>
                    {String(
                      mailDialogItem.alumnoNombre ??
                        mailDialogItem.alumnoCodigo ??
                        "",
                    )}
                  </strong>
                  {" — "}
                  {mailDialogVariant === "overdue"
                    ? "Correo post-vencimiento (completado)"
                    : mailDialogItem.venceTipo === "membresia"
                      ? "Correo membresía por vencer"
                      : "Correo contrato por vencer"}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {mailDialogItem && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  {CONTRACT_EXPIRY_TEMPLATES.map((tpl) => {
                    const checked = mailTemplateKey === tpl.key;
                    return (
                      <label
                        key={tpl.key}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${checked ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                      >
                        <input
                          type="radio"
                          name="mail-template"
                          value={tpl.key}
                          checked={checked}
                          onChange={() =>
                            setMailTemplateKey(tpl.key as ContractExpiryKey)
                          }
                          className="accent-primary"
                          disabled={mailSending}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold">
                            {tpl.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tpl.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div>
                  <Label
                    htmlFor="mail-accesos-email"
                    className="mb-1.5 block text-sm"
                  >
                    Email del alumno
                  </Label>
                  <div className="relative">
                    <Input
                      id="mail-accesos-email"
                      type="email"
                      placeholder="alumno@email.com"
                      value={mailStudentEmail}
                      onChange={(e) => setMailStudentEmail(e.target.value)}
                      disabled={mailSending || fetchingEmail}
                      className={fetchingEmail ? "pr-9" : ""}
                    />
                    {fetchingEmail && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setMailDialogItem(null)}
              disabled={mailSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendFromAccesos}
              disabled={
                mailSending ||
                !mailStudentEmail.trim() ||
                fetchingEmail ||
                !mailTemplateKey
              }
            >
              {mailSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" /> Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
