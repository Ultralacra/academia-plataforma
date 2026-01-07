"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Eye, Send, UserMinus } from "lucide-react";
import * as alumnosApi from "@/app/admin/alumnos/api";
import RequestBonoImplementacionTecnicaDialog from "./RequestBonoImplementacionTecnicaDialog";
import RequestBonoEdicionVslDialog from "./RequestBonoEdicionVslDialog";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toSqlDatetimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export default function BonosPanel({ studentCode }: { studentCode: string }) {
  const { user } = useAuth();
  const isStudent = (user?.role || "").toLowerCase() === "student";

  const actorId = useMemo(() => {
    const u: any = user as any;
    return String(u?.id ?? u?.user_id ?? u?.codigo ?? u?.email ?? "unknown");
  }, [user]);

  const [loading, setLoading] = useState(true);
  const [assigned, setAssigned] = useState<alumnosApi.BonoAssignment[]>([]);
  const [allBonos, setAllBonos] = useState<alumnosApi.Bono[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedToAssign, setSelectedToAssign] = useState<Set<string>>(
    () => new Set()
  );

  const [unassignOpen, setUnassignOpen] = useState(false);
  const [unassignCodigo, setUnassignCodigo] = useState<string | null>(null);
  const [unassignNombre, setUnassignNombre] = useState<string | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCodigo, setDetailCodigo] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<alumnosApi.Bono | null>(null);

  const [requestModal, setRequestModal] = useState<
    "implementacion" | "vsl" | null
  >(null);

  const isBonoImplementacionTecnica = (b: alumnosApi.BonoAssignment) => {
    const norm = (v: unknown) =>
      String(v ?? "")
        .trim()
        .toUpperCase();
    const normName = (v: unknown) =>
      String(v ?? "")
        .trim()
        .toLowerCase();
    const codeA = norm((b as any)?.bono_codigo);
    const codeB = norm((b as any)?.codigo);
    const name = normName((b as any)?.nombre);
    return (
      codeA === "BONO_IMPLEMENTACION_TECNICA" ||
      codeB === "BONO_IMPLEMENTACION_TECNICA" ||
      (name.includes("implementación") && name.includes("técnica")) ||
      (name.includes("implementacion") && name.includes("tecnica"))
    );
  };

  const isBonoEdicionVsl = (b: alumnosApi.BonoAssignment) => {
    const norm = (v: unknown) =>
      String(v ?? "")
        .trim()
        .toUpperCase();
    const normName = (v: unknown) =>
      String(v ?? "")
        .trim()
        .toLowerCase();
    const codeA = norm((b as any)?.bono_codigo);
    const codeB = norm((b as any)?.codigo);
    const name = normName((b as any)?.nombre);
    return (
      codeA === "BONO_EDICION_VSL" ||
      codeB === "BONO_EDICION_VSL" ||
      (name.includes("vsl") &&
        (name.includes("edición") || name.includes("edicion")))
    );
  };

  async function refreshAssigned() {
    setLoading(true);
    try {
      const rows = await alumnosApi.getBonoAssignmentsByAlumnoCodigo(
        studentCode
      );
      setAssigned(rows);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "No se pudieron cargar los bonos",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadAllBonos() {
    try {
      const rows = await alumnosApi.getAllBonos();
      setAllBonos(rows);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "No se pudieron cargar los bonos disponibles",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    refreshAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentCode]);

  useEffect(() => {
    if (!isStudent) loadAllBonos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent]);

  useEffect(() => {
    if (!detailOpen || !detailCodigo) return;
    setDetailLoading(true);
    setDetail(null);
    (async () => {
      try {
        const d = await alumnosApi.getBonoByCodigo(detailCodigo);
        setDetail(d);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "No se pudo cargar el detalle",
          description: e?.message ?? "Error desconocido",
          variant: "destructive",
        });
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [detailOpen, detailCodigo]);

  const assignedCount = assigned?.length ?? 0;

  const assignedCodes = useMemo(() => {
    const set = new Set<string>();
    for (const a of assigned ?? []) {
      if (a?.bono_codigo) set.add(String(a.bono_codigo));
    }
    return set;
  }, [assigned]);

  const availableOptions = useMemo(() => {
    // Por defecto escondemos inactivados si el backend los devuelve.
    return (allBonos ?? []).filter((b) => !b?.inactivado);
  }, [allBonos]);

  const unassignedOptions = useMemo(() => {
    return availableOptions.filter((b) => !assignedCodes.has(String(b.codigo)));
  }, [availableOptions, assignedCodes]);

  // Mantener la selección consistente cuando cambian los bonos disponibles.
  useEffect(() => {
    setSelectedToAssign((prev) => {
      if (prev.size === 0) return prev;
      const allowed = new Set(unassignedOptions.map((b) => String(b.codigo)));
      const next = new Set<string>();
      for (const c of prev) if (allowed.has(String(c))) next.add(String(c));
      return next;
    });
  }, [unassignedOptions]);

  async function assignMany(codigos: string[]) {
    if (codigos.length === 0) {
      toast({ title: "Selecciona al menos un bono", variant: "destructive" });
      return;
    }

    const now = new Date();
    const venc = new Date(now);
    venc.setFullYear(venc.getFullYear() + 10);
    venc.setHours(0, 0, 0, 0);

    const notas = `Asignado por ${actorId} el ${now.toISOString()}`;

    setAssigning(true);
    try {
      const failed: string[] = [];
      for (const codigo of codigos) {
        try {
          await alumnosApi.assignBonoToAlumno({
            bono_codigo: codigo,
            alumno_codigo: studentCode,
            cantidad: 1,
            fecha_vencimiento: toSqlDatetimeLocal(venc),
            notas,
          });
        } catch {
          failed.push(codigo);
        }
      }

      if (failed.length === 0) {
        toast({
          title: "Bonos asignados",
          description: "Se asignaron correctamente.",
        });
      } else {
        toast({
          title: "Asignación parcial",
          description: `Fallaron: ${failed.join(", ")}`,
          variant: "destructive",
        });
      }

      setSelectedToAssign(new Set());
      await refreshAssigned();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "No se pudo asignar",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  }

  async function unassignOne(codigo: string) {
    if (!codigo) return;
    setUnassigning(true);
    try {
      await alumnosApi.unassignBonoFromAlumno(codigo);
      toast({
        title: "Bono desasignado",
        description: "Se desasignó correctamente.",
      });
      await refreshAssigned();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "No se pudo desasignar",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setUnassigning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">
            Bonos asignados {assignedCount > 0 ? `(${assignedCount})` : ""}
          </div>
          <p className="text-xs text-muted-foreground">
            El alumno solo puede ver sus bonos. La asignación la gestiona el
            equipo.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Cargando bonos...
          </div>
        ) : assignedCount === 0 ? (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            No hay bonos asignados.
          </div>
        ) : (
          assigned.map((b) => {
            const canRequestImpl = isBonoImplementacionTecnica(b);
            const canRequestVsl = isBonoEdicionVsl(b);
            return (
              <div
                key={`${b.bono_codigo}-${b.id}`}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {b.nombre}
                    </div>
                    {b.descripcion ? (
                      <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {b.descripcion}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canRequestImpl ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Solicitar bono"
                            onClick={() => {
                              setRequestModal("implementacion");
                            }}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>
                          Solicitar bono
                        </TooltipContent>
                      </Tooltip>
                    ) : null}

                    {canRequestVsl ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Solicitar bono"
                            onClick={() => {
                              setRequestModal("vsl");
                            }}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>
                          Solicitar bono
                        </TooltipContent>
                      </Tooltip>
                    ) : null}

                    {!isStudent ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Desasignar bono"
                            onClick={() => {
                              setUnassignCodigo(String(b.bono_codigo));
                              setUnassignNombre(String(b.nombre ?? ""));
                              setUnassignOpen(true);
                            }}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>
                          Desasignar
                        </TooltipContent>
                      </Tooltip>
                    ) : null}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Detalle del bono"
                          onClick={() => {
                            setDetailCodigo(b.bono_codigo);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>Detalle</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Separator />

      {/* Asignar más bonos (solo coach/admin/equipo) */}
      {!isStudent ? (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-foreground">
              Asignar más bonos
            </div>
            <p className="text-xs text-muted-foreground">
              Aquí aparecen solo los bonos no asignados aún.
            </p>
          </div>

          {unassignedOptions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No hay bonos disponibles para asignar.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  Selecciona uno o varios bonos y asigna.
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedToAssign(
                        new Set(unassignedOptions.map((b) => String(b.codigo)))
                      )
                    }
                    disabled={assigning}
                  >
                    Seleccionar todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedToAssign(new Set())}
                    disabled={assigning}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="max-h-72 overflow-auto rounded-md border border-border bg-background/40">
                <div className="p-2 space-y-2">
                  {unassignedOptions.map((b) => {
                    const checked = selectedToAssign.has(String(b.codigo));
                    return (
                      <label
                        key={b.codigo}
                        className="flex items-start gap-3 rounded-md border border-border bg-card p-3 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const on = Boolean(v);
                            setSelectedToAssign((prev) => {
                              const next = new Set(prev);
                              if (on) next.add(String(b.codigo));
                              else next.delete(String(b.codigo));
                              return next;
                            });
                          }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {b.nombre}
                          </div>
                          {b.descripcion ? (
                            <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
                              {b.descripcion}
                            </div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => assignMany(Array.from(selectedToAssign))}
                  disabled={assigning}
                >
                  {assigning ? "Asignando..." : "Asignar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Modal: Detalle */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del bono</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="text-sm text-muted-foreground">Cargando...</div>
          ) : !detail ? (
            <div className="text-sm text-muted-foreground">
              No se pudo cargar el detalle.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <div className="text-sm font-medium text-foreground">
                  {detail.nombre}
                </div>
                {detail.descripcion ? (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {detail.descripcion}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar desasignación */}
      <AlertDialog
        open={unassignOpen}
        onOpenChange={(v) => {
          if (unassigning) return;
          setUnassignOpen(v);
          if (!v) {
            setUnassignCodigo(null);
            setUnassignNombre(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-sm p-4">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-base">
              Desasignar bono
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              ¿Seguro que quieres desasignar este bono
              {unassignNombre ? `: ${unassignNombre}` : ""}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unassigning}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={unassigning || !unassignCodigo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const codigo = unassignCodigo;
                setUnassignOpen(false);
                setUnassignCodigo(null);
                setUnassignNombre(null);
                await unassignOne(String(codigo || ""));
              }}
            >
              {unassigning ? "Desasignando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Solicitar bono (solo implementación técnica por ahora) */}
      <RequestBonoImplementacionTecnicaDialog
        open={requestModal === "implementacion"}
        onOpenChange={(v) => setRequestModal(v ? "implementacion" : null)}
        studentCode={studentCode}
      />

      {/* Modal: Solicitar bono (Edición de VSL) */}
      <RequestBonoEdicionVslDialog
        open={requestModal === "vsl"}
        onOpenChange={(v) => setRequestModal(v ? "vsl" : null)}
        studentCode={studentCode}
      />
    </div>
  );
}
