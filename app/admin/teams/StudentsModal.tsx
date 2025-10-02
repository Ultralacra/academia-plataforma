"use client";

import { useEffect } from "react";
import { X, User } from "lucide-react";
import type { Team } from "@/lib/data-service";

export default function StudentsModal({
  open,
  onClose,
  team,
}: {
  open: boolean;
  onClose: () => void;
  team: Team | null;
}) {
  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const totalFromCount =
    typeof team?.nAlumnos === "number" ? team?.nAlumnos : undefined;
  const totalFromList = team?.alumnos?.length ?? 0;
  const total = totalFromCount ?? totalFromList;

  const hasOnlyCounter =
    (team?.alumnos?.length ?? 0) === 0 && (totalFromCount ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div
        className="relative mx-4 w-full max-w-3xl rounded-2xl border bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="students-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h3 id="students-modal-title" className="text-base font-semibold">
              {team ? `Alumnos de ${team.nombre}` : "Alumnos"}
            </h3>
            {typeof total === "number" && (
              <p className="text-xs text-muted-foreground">
                Total: <span className="font-medium">{total}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body */}
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
          {!team ? (
            <div className="text-sm text-gray-500">Sin datos</div>
          ) : team.alumnos.length === 0 ? (
            hasOnlyCounter ? (
              <p className="text-sm text-gray-600">
                Este equipo tiene{" "}
                <span className="font-medium">{totalFromCount}</span> alumno(s),
                pero la API de esta vista no devuelve el listado de nombres.
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Este equipo no tiene alumnos registrados.
              </p>
            )
          ) : (
            <ul className="grid grid-cols-1 gap-2">
              {team.alumnos.map((a, i) => (
                <li
                  key={`${a.name || "alumno"}-${i}`}
                  className="flex items-center justify-between rounded-xl border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.name || "—"}</p>
                      {a.url ? (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-600 hover:underline"
                        >
                          {a.url}
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sin URL</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
