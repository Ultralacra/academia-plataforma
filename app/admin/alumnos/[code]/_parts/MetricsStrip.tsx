"use client";

import { Calendar, Clock, TrendingUp, Target, Users } from "lucide-react";
import { fmtES, getOptionBadgeClass } from "./detail-utils";

export default function MetricsStrip({
  statusLabel,
  permanencia,
  lastTaskAt,
  faseActual,
  ingreso,
  salida,
  onEdit,
  onSaveLastTask,
  coachCount,
  coachNames,
  onJumpToCoaches,
}: {
  statusLabel: string;
  permanencia: number;
  lastTaskAt?: string | null;
  faseActual: string;
  ingreso?: string | null;
  salida?: string | null;
  onEdit?: (mode?: "estado" | "etapa" | "nicho" | "all") => void;
  onSaveLastTask?: (isoLocal: string) => void | Promise<void>;
  coachCount?: number;
  coachNames?: string[];
  onJumpToCoaches?: () => void;
}) {
  function isoToLocalInput(v?: string | null) {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  const items: Array<{
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    editable?: boolean;
    mode?: "estado" | "etapa" | "nicho" | "all";
    renderAsBadge?: "estado" | "etapa";
    ctaLabel?: string;
  }> = [
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Estado",
      value: statusLabel || "",
      sub: "",
      editable: true,
      mode: "estado",
      renderAsBadge: "estado",
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: "Permanencia",
      value: ingreso ? `${permanencia} días` : "",
      sub: ingreso ? `${fmtES(ingreso)} → ${fmtES(salida)}` : "",
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: "Última tarea",
      value: lastTaskAt ? fmtES(lastTaskAt) : "",
      sub: lastTaskAt ? "Fecha de entrega" : "",
    },
    {
      icon: <Target className="h-4 w-4" />,
      label: "Fase actual",
      value: faseActual || "",
      sub: "",
      editable: true,
      mode: "etapa",
      renderAsBadge: "etapa",
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Equipo asignado",
      value: String(coachCount ?? 0),
      sub:
        coachNames && coachNames.length > 0
          ? `${coachNames.slice(0, 2).join(", ")}${
              coachNames.length > 2 ? ` +${coachNames.length - 2} más` : ""
            }`
          : "Sin asignar",
      ctaLabel: onJumpToCoaches ? "Gestionar" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span className="text-muted-foreground/60">{it.icon}</span>
                {it.label}
              </div>
              {it.editable && onEdit && (
                <button
                  className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:bg-muted/10"
                  onClick={() => onEdit(it.mode)}
                  aria-label={
                    it.mode === "estado"
                      ? "Editar estado"
                      : it.mode === "etapa"
                      ? "Editar fase"
                      : "Editar"
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                    />
                  </svg>
                </button>
              )}
              <div className="mt-2 text-2xl font-semibold tracking-tight">
                {it.renderAsBadge === "estado" && it.value ? (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getOptionBadgeClass(
                      "estado",
                      it.value
                    )}`}
                  >
                    {it.value}
                  </span>
                ) : it.renderAsBadge === "etapa" && it.value ? (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getOptionBadgeClass(
                      "etapa",
                      it.value
                    )}`}
                  >
                    {it.value}
                  </span>
                ) : (
                  it.value || "—"
                )}
              </div>
              {/* Campo para establecer última tarea */}
              {onSaveLastTask && it.label === "Última tarea" && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] items-center">
                  <input
                    type="datetime-local"
                    defaultValue={isoToLocalInput(lastTaskAt)}
                    className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                    onChange={(e) => {
                      // almacenar provisionalmente en el elemento para el botón
                      (e.currentTarget as any)._pending = e.currentTarget.value;
                    }}
                  />
                  <button
                    onClick={(ev) => {
                      const inputEl =
                        (ev.currentTarget.parentElement?.querySelector(
                          'input[type="datetime-local"]'
                        ) as HTMLInputElement) || null;
                      const v = (inputEl as any)?._pending || inputEl?.value;
                      if (!v) return;
                      Promise.resolve(onSaveLastTask(v)).catch(() => {});
                    }}
                    className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Guardar
                  </button>
                </div>
              )}
              {it.sub && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {it.sub}
                </div>
              )}
            </div>
            {!it.editable && it.ctaLabel && onJumpToCoaches && (
              <button
                onClick={onJumpToCoaches}
                className="ml-2 inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {it.ctaLabel}
              </button>
            )}
          </div>
          {/* Subtle hover effect */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/0 to-primary/0 opacity-0 transition-opacity group-hover:from-primary/5 group-hover:to-primary/0 group-hover:opacity-100" />
        </div>
      ))}
    </div>
  );
}
