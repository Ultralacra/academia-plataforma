"use client";

import { useEffect, useMemo, useState } from "react";
import type { TeamMember } from "@/lib/data-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search } from "lucide-react";
import { apiFetch } from "@/lib/api-config";

/** Estructura que mostrará el modal */
export type CoachCandidate = TeamMember & {
  key: string;
  teamCode: string; // codigo from team endpoint
  teamId?: number;
  teamName?: string;
  puesto?: string | null;
  area?: string | null;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export default function CoachPickerModal({
  open,
  onOpenChange,
  onConfirm,
  mode = "multi",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm?: (selected: CoachCandidate[]) => void;
  mode?: "single" | "multi";
}) {
  const [loading, setLoading] = useState(false);
  const [teamsRaw, setTeamsRaw] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // Llamar al endpoint explícito que devuelve los equipos/coach
        const j = await apiFetch<any>("/team/get/team?page=1&pageSize=50");
        const rows = Array.isArray(j?.data) ? j.data : [];
        if (!alive) return;
        setTeamsRaw(rows);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setTeamsRaw([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  // Mapear rows del endpoint team -> candidatos (cada team es un coach)
  const candidates: CoachCandidate[] = useMemo(() => {
    return (teamsRaw || []).map((t: any, idx: number) => {
      const name = t.nombre ?? t.name ?? "";
      const teamCode = t.codigo ?? (t.id != null ? String(t.id) : "");
      const teamId = t.id ?? undefined;
      const key = String(teamCode || teamId || `${name}-${idx}`);
      return {
        key,
        name,
        teamCode,
        teamId,
        teamName: t.nombre ?? undefined,
        puesto: t.puesto ?? null,
        area: t.area ?? null,
        url: undefined,
      };
    });
  }, [teamsRaw]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return candidates;
    return candidates.filter((c) => {
      const base = `${c.name} ${c.area ?? ""} ${c.puesto ?? ""} ${c.teamName}`;
      return normalize(base).includes(q);
    });
  }, [candidates, query]);

  const selectedCandidates = useMemo(() => {
    const keys = Object.keys(selected).filter((k) => selected[k]);
    if (keys.length === 0) return [] as CoachCandidate[];
    const keySet = new Set(keys);
    return candidates.filter((c) => keySet.has(c.key));
  }, [candidates, selected]);

  function toggleKey(k: string) {
    setSelected((prev) => {
      const isOn = !!prev[k];
      if (mode === "single") {
        return isOn ? {} : { [k]: true };
      }
      return { ...prev, [k]: !isOn };
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-3xl max-h-[85vh] overflow-hidden rounded-xl border border-border bg-card shadow-none">
        <DialogHeader>
          <DialogTitle>
            {mode === "single" ? "Cambiar coach" : "Asignar coaches"}
          </DialogTitle>
          <DialogDescription>
            {mode === "single"
              ? "Busca y selecciona un coach para reemplazar el actual."
              : "Busca y selecciona uno o varios coaches para asignarlos al alumno."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 border-border bg-background"
            placeholder="Buscar por nombre, área, puesto o equipo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando equipos…
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-sm text-muted-foreground py-10 text-center">
            No se encontraron integrantes en los equipos.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-10 text-center">
            Sin coincidencias.
          </div>
        ) : (
          <div className="mt-2 max-h-[50vh] overflow-auto pr-2">
            <ul className="space-y-2">
              {filtered.map((c, idx) => {
                const key = c.key;
                const isSelected = !!selected[key];
                return (
                  <li
                    key={key}
                    className={`flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-muted/50 ${
                      isSelected ? "ring-2 ring-primary/30" : ""
                    }`}
                    onClick={() => {
                      toggleKey(key);
                    }}
                    title="Seleccionar este integrante"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleKey(key)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                          <span className="truncate">Código: {c.teamCode}</span>
                          {c.puesto ? (
                            <Badge
                              variant="secondary"
                              className="h-5 text-[11px]"
                            >
                              {c.puesto}
                            </Badge>
                          ) : null}
                          {c.area ? (
                            <Badge className="h-5 text-[11px]">{c.area}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Abrir perfil
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Footer con botón Asignar para confirmar selección múltiple */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">
                {selectedCount} seleccionados
              </div>
              {selectedCount > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedCandidates.slice(0, 3).map((c) => (
                    <Badge key={c.key} variant="secondary" className="h-5">
                      {c.name}
                    </Badge>
                  ))}
                  {selectedCandidates.length > 3 ? (
                    <Badge variant="secondary" className="h-5">
                      +{selectedCandidates.length - 3}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (onConfirm) onConfirm(selectedCandidates);
                  onOpenChange(false);
                }}
                disabled={selectedCount === 0}
              >
                {mode === "single" ? "Confirmar" : `Asignar (${selectedCount})`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
