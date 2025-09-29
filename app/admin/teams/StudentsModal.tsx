"use client";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative mx-4 w-full max-w-3xl rounded-2xl border bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h3 className="text-base font-semibold">
              {team ? `Alumnos de ${team.nombre}` : "Alumnos"}
            </h3>
            {team?.nAlumnos !== undefined && (
              <p className="text-xs text-muted-foreground">
                Total: <span className="font-medium">{team.nAlumnos}</span>
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

        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
          {!team ? (
            <div className="text-sm text-gray-500">Sin datos</div>
          ) : team.alumnos.length === 0 ? (
            <p className="text-sm text-gray-500">
              Este equipo no tiene alumnos registrados.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2">
              {team.alumnos.map((a, i) => (
                <li
                  key={`${a.name}-${i}`}
                  className="flex items-center justify-between rounded-xl border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
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
