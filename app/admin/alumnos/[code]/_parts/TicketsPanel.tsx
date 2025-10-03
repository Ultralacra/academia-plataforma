"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudentItem, Ticket } from "@/lib/data-service";
import { dataService } from "@/lib/data-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Search, TicketIcon } from "lucide-react";

/* ========= helpers ========= */

function isoDay(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(".", "");
}
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

// rng determinístico para datos demo
function hashString(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(seedStr: string) {
  let x = hashString(seedStr) || 123456789;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967295;
  };
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

type StatusKey = "ABIERTO" | "EN_CURSO" | "RESUELTO" | "CERRADO";
const STATUS_LABEL: Record<StatusKey, string> = {
  ABIERTO: "Abierto",
  EN_CURSO: "En curso",
  RESUELTO: "Resuelto",
  CERRADO: "Cerrado",
};

const STATUS_STYLE: Record<StatusKey, string> = {
  ABIERTO:
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  EN_CURSO:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  RESUELTO:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  CERRADO:
    "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/50 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
};

function coerceStatus(raw?: string | null): StatusKey {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("RESUELTO") || s.includes("COMPLETO")) return "RESUELTO";
  if (s.includes("CERR")) return "CERRADO";
  if (s.includes("CURSO") || s.includes("PROGRES")) return "EN_CURSO";
  return "ABIERTO";
}

/* ========= demo tickets (si la API no trae nada) ========= */

function demoTicketsFor(student: StudentItem): Ticket[] {
  const seed =
    (student.code || String(student.id) || student.name || "seed") + "|tickets";
  const rng = makeRng(seed);
  const today = new Date(isoDay(new Date()));
  const subjects = [
    "Consulta de módulo",
    "Duda sobre tarea",
    "Solicitud de extensión",
    "Problema con acceso",
    "Feedback de proyecto",
    "Revisión de entregable",
    "Reporte de bug en plataforma",
  ];
  const tipos = ["Consulta", "Técnico", "Administrativo"];

  const n = 5 + Math.floor(rng() * 4); // 5..8
  const items: Ticket[] = [];
  for (let i = 0; i < n; i++) {
    const created = addDays(today, -Math.floor(rng() * 60));
    const statusPool: StatusKey[] = ["ABIERTO", "EN_CURSO", "RESUELTO"];
    const status = statusPool[Math.floor(rng() * statusPool.length)];
    const deadline =
      Math.random() > 0.5 ? addDays(created, 7 + Math.floor(rng() * 14)) : null;
    items.push({
      id: 100000 + i,
      id_externo: null,
      nombre: subjects[Math.floor(rng() * subjects.length)],
      alumno_nombre: student.name,
      estado: status,
      tipo: tipos[Math.floor(rng() * tipos.length)],
      creacion: created.toISOString(),
      deadline: deadline?.toISOString() ?? null,
      equipo_urls: [], // opcional para demo
    });
  }
  return items;
}

/* ========= componente ========= */

export default function TicketsPanel({ student }: { student: StudentItem }) {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<Ticket[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusKey | "ALL">("ALL");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await dataService.getTickets({
          // ayuda a servidores con búsqueda por texto
          search: student.name,
        });

        const byName = (res.items ?? []).filter((t) =>
          t.alumno_nombre
            ? normalize(t.alumno_nombre) === normalize(student.name)
            : false
        );

        // fallback por matching de equipo (urls)
        let matched = byName;
        if (matched.length === 0 && student.teamMembers?.length) {
          const urls = new Set(
            (student.teamMembers ?? []).map((m) => m.url || "").filter(Boolean)
          );
          if (urls.size > 0) {
            matched = (res.items ?? []).filter((t) =>
              (t.equipo_urls ?? []).some((u) => urls.has(u))
            );
          }
        }

        // si sigue vacío => rellenar con DEMO
        const finalList =
          matched.length > 0 ? matched : demoTicketsFor(student);
        if (!alive) return;
        setAll(
          finalList
            .map((t) => ({ ...t, estado: coerceStatus(t.estado) }))
            .sort((a, b) => (a.creacion > b.creacion ? -1 : 1))
        );
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setAll(demoTicketsFor(student));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [student]);

  const counts = useMemo(() => {
    const acc: Record<StatusKey, number> = {
      ABIERTO: 0,
      EN_CURSO: 0,
      RESUELTO: 0,
      CERRADO: 0,
    };
    all.forEach((t) => (acc[coerceStatus(t.estado)] += 1));
    return acc;
  }, [all]);

  const filtered = useMemo(() => {
    let rows = all;
    if (status !== "ALL")
      rows = rows.filter((t) => coerceStatus(t.estado) === status);
    if (query.trim()) {
      const q = normalize(query);
      rows = rows.filter(
        (t) =>
          normalize(t.nombre ?? "").includes(q) ||
          normalize(t.tipo ?? "").includes(q)
      );
    }
    return rows;
  }, [all, status, query]);

  const addDemo = () => {
    const more = demoTicketsFor(student).slice(0, 1);
    setAll((prev) =>
      [...more, ...prev].sort((a, b) => (a.creacion > b.creacion ? -1 : 1))
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Tickets del alumno</h3>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={addDemo}
            className="h-8 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo
          </Button>
        </div>

        {/* Summary pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["ALL", "ABIERTO", "EN_CURSO", "RESUELTO"] as const).map((k) => {
            const count = k === "ALL" ? all.length : counts[k as StatusKey];
            return (
              <button
                key={k}
                onClick={() => setStatus(k as any)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  status === k
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <span className="font-semibold">{count}</span>
                {k === "ALL" ? "Todos" : STATUS_LABEL[k as StatusKey]}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            placeholder="Buscar por asunto o tipo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando tickets…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No hay tickets en este filtro
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((t) => {
              const tone = coerceStatus(t.estado);
              return (
                <li
                  key={`${t.id}-${t.creacion}`}
                  className="rounded-md border bg-background p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[tone]}`}
                    >
                      {STATUS_LABEL[tone]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium leading-tight">
                        {t.nombre ?? "Ticket"}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Creado: {fmtDate(t.creacion)}</span>
                        {t.tipo && <span>· {t.tipo}</span>}
                        {t.deadline && (
                          <span>· Vence: {fmtDate(t.deadline)}</span>
                        )}
                        {t.id_externo && <span>· Ref: {t.id_externo}</span>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
