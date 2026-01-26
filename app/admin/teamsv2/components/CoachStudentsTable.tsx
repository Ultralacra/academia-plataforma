"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Eye, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { updateClientEtapa, updateClientIngreso } from "../api";

type Row = {
  id: number | string;
  name: string;
  code?: string | null;
  state?: string | null;
  stage?: string | null;
  ingreso?: string | null;
  tickets?: number | null;
  lastActivity?: string | null;
  inactividad?: number | null;
};

type StageOptionLike =
  | string
  | { key: string; value: string }
  | { opcion_key: string; opcion_value: string };

type StageOption = { key: string; value: string };

function badgeForState(value?: string | null) {
  const raw = String(value || "");
  const v = raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();
  if (!v)
    return {
      className:
        "rounded-md bg-muted text-muted-foreground px-2 py-0.5 text-xs",
      label: "—",
    } as const;
  // Map similar a ResultsTable (students)
  if (v.includes("INACTIVO POR PAGO"))
    return {
      className:
        "rounded-md bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.includes("INACTIVO"))
    return {
      className:
        "rounded-md bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.includes("PAUS"))
    return {
      className:
        "rounded-md bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.includes("PROGRESO"))
    return {
      className:
        "rounded-md bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.includes("ACTIVO"))
    return {
      className:
        "rounded-md bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  return {
    className: "rounded-md bg-muted text-foreground/80 px-2 py-0.5 text-xs",
    label: raw,
  } as const;
}

function badgeForStage(value?: string | null) {
  const raw = String(value || "");
  const v = raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();
  if (!v)
    return {
      className:
        "rounded-md bg-muted text-muted-foreground px-2 py-0.5 text-xs",
      label: "—",
    } as const;
  if (v.includes("ONBOARD"))
    return {
      className:
        "rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.startsWith("F1"))
    return {
      className:
        "rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.startsWith("F2"))
    return {
      className:
        "rounded-md bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-200 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.startsWith("F3"))
    return {
      className:
        "rounded-md bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.startsWith("F4"))
    return {
      className:
        "rounded-md bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.startsWith("F5"))
    return {
      className:
        "rounded-md bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  return {
    className: "rounded-md bg-muted text-foreground/80 px-2 py-0.5 text-xs",
    label: raw,
  } as const;
}

export default function CoachStudentsTable({
  rows,
  title = "ALUMNOS DEL COACH",
  onOffer,
  onView,
  stageOptions,
  onPatchRow,
}: {
  rows: Row[];
  title?: string;
  onOffer?: (row: Row) => void;
  onView?: (row: Row) => void;
  stageOptions?: StageOptionLike[];
  onPatchRow?: (code: string, patch: Partial<Row>) => void;
}) {
  const { toast } = useToast();
  const fmt = useMemo(() => new Intl.DateTimeFormat("es-ES"), []);
  const data = Array.isArray(rows) ? rows : [];

  const [openStageFor, setOpenStageFor] = useState<string | null>(null);
  const [updatingStageFor, setUpdatingStageFor] = useState<string | null>(null);

  const [openIngreso, setOpenIngreso] = useState(false);
  const [ingresoFor, setIngresoFor] = useState<{
    code: string;
    name: string;
    prev: string | null;
  } | null>(null);
  const [draftIngreso, setDraftIngreso] = useState<string>("");
  const [savingIngreso, setSavingIngreso] = useState(false);

  const defaultStages: StageOption[] = useMemo(
    () =>
      ["ONBOARDING", "F1", "F2", "F3", "F4", "F5"].map((s) => ({
        key: s,
        value: s,
      })),
    [],
  );

  const etapas: StageOption[] = useMemo(() => {
    const raw = Array.isArray(stageOptions) ? stageOptions : [];
    const mapped = raw
      .map((s) => {
        if (typeof s === "string") return { key: s, value: s };
        const anyS: any = s as any;
        if (anyS && typeof anyS.opcion_key === "string") {
          return {
            key: String(anyS.opcion_key),
            value: String(anyS.opcion_value ?? anyS.opcion_key),
          };
        }
        if (anyS && typeof anyS.key === "string") {
          return {
            key: String(anyS.key),
            value: String(anyS.value ?? anyS.key),
          };
        }
        return null;
      })
      .filter(Boolean) as StageOption[];

    return mapped.length ? mapped : defaultStages;
  }, [stageOptions, defaultStages]);

  const stageLabelFor = (stage?: string | null): string => {
    const raw = String(stage ?? "").trim();
    if (!raw) return "";
    const found = etapas.find((o) => o.key === raw || o.value === raw);
    return found?.value ?? raw;
  };

  const toDateInputValue = (value?: string | null) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const fmtDateSmart = (value?: string | null) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return fmt.format(d);
  };

  const openIngresoEditor = (row: Row) => {
    const code = String(row.code ?? "").trim();
    if (!code) return;
    setIngresoFor({
      code,
      name: String(row.name ?? code),
      prev: row.ingreso ?? null,
    });
    setDraftIngreso(toDateInputValue(row.ingreso));
    setOpenIngreso(true);
  };

  const saveIngreso = async () => {
    if (!ingresoFor) return;
    const code = ingresoFor.code;
    const next = draftIngreso.trim() ? draftIngreso.trim() : null;

    setSavingIngreso(true);
    onPatchRow?.(code, { ingreso: next });

    try {
      await updateClientIngreso(code, next);
      toast({
        title: "Ingreso actualizado",
        description: `${ingresoFor.name} → ${fmtDateSmart(next)}`,
      });
      setOpenIngreso(false);
      setIngresoFor(null);
    } catch (e: any) {
      onPatchRow?.(code, { ingreso: ingresoFor.prev });
      toast({
        title: "Error",
        description: e?.message ?? "No se pudo actualizar la fecha de ingreso",
        variant: "destructive",
      });
    } finally {
      setSavingIngreso(false);
    }
  };

  const [page, setPage] = useState(1);
  const pageSize = 25;
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = data.slice(start, end);

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground overflow-hidden">
      <div className="border-b border-border/60 px-5 py-4">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">
          Listado compacto · {total.toLocaleString("es-ES")} alumnos
        </p>
      </div>
      <div className="overflow-x-auto pb-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
              <th className="px-3 py-2 text-left">Alumno</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Fase</th>
              <th className="px-3 py-2 text-left">Ingreso</th>
              <th className="px-3 py-2 text-left">Última actividad</th>
              <th className="px-3 py-2 text-right">Inactividad (días)</th>
              <th className="px-3 py-2 text-right">Tickets</th>
              {onView && <th className="px-3 py-2 text-right">Sesiones</th>}
              {onOffer && <th className="px-3 py-2 text-right">Sesión</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={(() => {
                    let cols = 7;
                    if (onView) cols += 1;
                    if (onOffer) cols += 1;
                    return cols;
                  })()}
                  className="px-3 py-4 text-sm text-muted-foreground text-center"
                >
                  Sin alumnos
                </td>
              </tr>
            ) : (
              pageRows.map((r) => {
                const st = badgeForState(r.state);
                const ph = badgeForStage(stageLabelFor(r.stage));
                return (
                  <tr
                    key={`${r.id}`}
                    className="border-t border-border/60 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2 text-foreground truncate">
                      {r.code ? (
                        <Link
                          href={`/admin/alumnos/${encodeURIComponent(
                            String(r.code),
                          )}`}
                          className="hover:underline"
                        >
                          {r.name || r.code}
                        </Link>
                      ) : (
                        r.name || r.code || "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={st.className}>{st.label}</span>
                    </td>
                    <td className="px-3 py-2">
                      {(() => {
                        const code = String(r.code ?? "").trim();
                        const canEdit = Boolean(code);
                        const isOpen = openStageFor === code;
                        const isUpdating = updatingStageFor === code;

                        const badge = (
                          <span className={ph.className}>{ph.label}</span>
                        );

                        if (!canEdit) return badge;

                        return (
                          <Popover
                            open={isOpen}
                            onOpenChange={(o) =>
                              setOpenStageFor(o ? code : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                disabled={isUpdating}
                                aria-label={`Cambiar fase de ${r.name}`}
                                title="Cambiar fase"
                                className={cn(
                                  "inline-flex items-center gap-1 rounded hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                                  isUpdating
                                    ? "opacity-60 cursor-not-allowed"
                                    : "cursor-pointer",
                                )}
                              >
                                {badge}
                                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="p-0 w-[240px] shadow-none"
                              align="start"
                              sideOffset={8}
                            >
                              <Command>
                                <CommandInput
                                  placeholder="Cambiar fase..."
                                  autoFocus
                                  className="text-sm"
                                />
                                <CommandList className="max-h-64">
                                  <CommandEmpty>
                                    No hay resultados.
                                  </CommandEmpty>
                                  <CommandGroup heading="Fases">
                                    {etapas.map((opt) => (
                                      <CommandItem
                                        key={opt.key}
                                        value={`${opt.key} ${opt.value}`}
                                        onSelect={async () => {
                                          const nextKey = opt.key;
                                          const prevStage = r.stage ?? null;
                                          setUpdatingStageFor(code);
                                          // optimista
                                          onPatchRow?.(code, {
                                            stage: nextKey,
                                          });
                                          try {
                                            await updateClientEtapa(
                                              code,
                                              nextKey,
                                            );
                                            toast({
                                              title: "Fase actualizada",
                                              description: `${r.name} → ${opt.value}`,
                                            });
                                            setOpenStageFor(null);
                                          } catch (e: any) {
                                            // rollback
                                            onPatchRow?.(code, {
                                              stage: prevStage,
                                            });
                                            toast({
                                              title: "Error",
                                              description:
                                                e?.message ??
                                                "No se pudo actualizar la fase",
                                              variant: "destructive",
                                            });
                                          } finally {
                                            setUpdatingStageFor(null);
                                          }
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <span className="truncate">
                                          {opt.value}
                                        </span>
                                        {(String(r.stage || "").trim() ===
                                          opt.key ||
                                          String(r.stage || "").trim() ===
                                            opt.value) && (
                                          <Check className="ml-auto h-4 w-4 text-blue-600" />
                                        )}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>
                          {r.ingreso ? fmt.format(new Date(r.ingreso)) : "—"}
                        </span>
                        {r.code && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center h-7 w-7 rounded border border-border hover:bg-muted"
                            title="Editar ingreso"
                            onClick={() => openIngresoEditor(r)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.lastActivity
                        ? fmt.format(new Date(r.lastActivity))
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.inactividad == null || isNaN(Number(r.inactividad))
                        ? "—"
                        : Number(r.inactividad).toLocaleString("es-ES")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.tickets == null || isNaN(Number(r.tickets))
                        ? "—"
                        : Number(r.tickets).toLocaleString("es-ES")}
                    </td>
                    {onView && (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs border border-border hover:bg-muted"
                          title="Ver sesiones del alumno"
                          onClick={() => onView(r)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Sesiones
                        </button>
                      </td>
                    )}
                    {onOffer && (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs border border-border hover:bg-muted"
                          title="Ofrecer sesión"
                          onClick={() => onOffer(r)}
                        >
                          Sesión
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {total > pageSize && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 text-xs text-muted-foreground">
          <span>
            Mostrando {start + 1}–{Math.min(end, total)} de{" "}
            {total.toLocaleString("es-ES")} alumnos
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-2 py-1 rounded border border-border text-xs disabled:opacity-40"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              className="px-2 py-1 rounded border border-border text-xs disabled:opacity-40"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <Dialog open={openIngreso} onOpenChange={setOpenIngreso}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar ingreso</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <div className="text-sm text-muted-foreground">
              Alumno:{" "}
              <strong className="text-foreground">
                {ingresoFor?.name || "—"}
              </strong>
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">
                Fecha de ingreso
              </label>
              <Input
                type="date"
                value={draftIngreso}
                onChange={(e) => setDraftIngreso(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={savingIngreso}
              onClick={() => setOpenIngreso(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={savingIngreso || !ingresoFor}
              onClick={saveIngreso}
            >
              {savingIngreso ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
