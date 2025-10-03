"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService, type Team, type TeamMember } from "@/lib/data-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";

/** Estructura que mostrará el modal */
export type CoachCandidate = TeamMember & {
  teamId: number;
  teamName: string;
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
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (c: CoachCandidate) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // 👇 Usar getTeams (el que intenta parsear alumnos del formato antiguo)
        const res = await dataService.getTeams({
          page: 1,
          pageSize: 1000,
        });
        if (!alive) return;
        setTeams(res.data ?? []);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setTeams([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  // Aplanar -> lista de candidatos
  const candidates: CoachCandidate[] = useMemo(() => {
    const out: CoachCandidate[] = [];
    teams.forEach((t) => {
      (t.alumnos ?? []).forEach((m) => {
        out.push({
          ...m,
          teamId: t.id,
          teamName: t.nombre,
          // si tu API de equipos tuviera puesto/área, mapéalos aquí
          puesto: t.puesto ?? null,
          area: t.area ?? null,
        });
      });
    });
    // dedup por name+url
    const uniq = new Map<string, CoachCandidate>();
    out.forEach((c) => {
      const key = `${c.name}|${c.url ?? ""}`;
      if (!uniq.has(key)) uniq.set(key, c);
    });
    return Array.from(uniq.values());
  }, [teams]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return candidates;
    return candidates.filter((c) => {
      const base = `${c.name} ${c.area ?? ""} ${c.puesto ?? ""} ${c.teamName}`;
      return normalize(base).includes(q);
    });
  }, [candidates, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Seleccionar integrante</DialogTitle>
          <DialogDescription>
            Busca y elige un miembro de equipo. (Cambios solo en demo/local)
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
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
            <div className="mt-2">
              Verifica que el endpoint <code>/team/get/team</code> devuelva
              <code> alumnos </code> (en el formato antiguo “Nombre (url)”).
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-10 text-center">
            Sin coincidencias.
          </div>
        ) : (
          <ul className="mt-2 space-y-2 max-h-[50vh] overflow-auto pr-2">
            {filtered.map((c, idx) => (
              <li
                key={`${c.name}-${c.url ?? ""}-${idx}`}
                className="rounded-lg border bg-card p-3 hover:bg-muted transition cursor-pointer"
                onClick={() => onPick(c)}
                title="Seleccionar este integrante"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                      <span className="truncate">Equipo: {c.teamName}</span>
                      {c.puesto ? (
                        <Badge variant="secondary" className="h-5 text-[11px]">
                          {c.puesto}
                        </Badge>
                      ) : null}
                      {c.area ? (
                        <Badge className="h-5 text-[11px]">{c.area}</Badge>
                      ) : null}
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
