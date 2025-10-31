"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function normalize(s: string | null | undefined) {
  return (s ?? "").toString().toLowerCase();
}

function includesAll(haystack: string, needle: string) {
  return haystack.includes(needle);
}

export type Fase3Row = {
  "Nombre del estudiante": string;
  "  Tipo de intervención sugerida"?: string;
  "Fecha de finalización"?: string;
  "Fecha de inicio"?: string;
  Fórmula?: string;
  "Obs del estado"?: string;
  "Paso a fase 4"?: string;
  "¿Requiere intervención?"?: string;
};

export type Fase4Row = {
  "Nombre del estudiante": string;
  "Fecha de inicio"?: string;
  "Fecha de asignación"?: string;
  "Días transcurridos"?: string;
  "Inversión en Pauta"?: string;
  Facturación?: string;
  ROAs?: string;
  Alcance?: string;
  Clics?: string;
  Visitas?: string;
  "Pagos iniciados"?: string;
  "Compra carnada"?: string;
  "Compra Bump 1"?: string;
  "Compra Bump 2"?: string;
  "Compra OTO 1"?: string;
  "Compra OTO 2"?: string;
  "Compra Downsell"?: string;
  "Carga de Página"?: string;
  "Efectividad Ads"?: string;
  "Efectividad pago iniciado"?: string;
  "Efectividad compra"?: string;
  "Obs del estado"?: string;
  "¿Requiere intervención?"?: string;
  "¿Requiere intervención? (1)"?: string;
  "¿Tiene pauta activa?"?: string;
  "  Tipo de intervención sugerida"?: string;
  "Coach de  Copy"?: string;
  "Coach de Plataformas"?: string;
  Fase?: string;
};

export default function AdsStudentsTable({
  fase3,
  fase4,
  loading,
}: {
  fase3: Fase3Row[];
  fase4: Fase4Row[];
  loading?: boolean;
}) {
  const [tab, setTab] = useState<"f3" | "f4">("f4");
  const [q, setQ] = useState("");
  const [onlyInterv, setOnlyInterv] = useState(false);
  const [onlyPauta, setOnlyPauta] = useState(false);
  const [faseFilter, setFaseFilter] = useState<
    "all" | "testeo" | "optimizacion" | "escala"
  >("all");
  const [sortBy, setSortBy] = useState<
    "roas" | "inversion" | "facturacion" | null
  >("roas");
  const qn = useMemo(() => normalize(q), [q]);

  const f3 = useMemo(() => {
    const list = Array.isArray(fase3) ? fase3 : [];
    if (!qn) return list;
    return list.filter((r) => {
      const s = [
        r["Nombre del estudiante"],
        r["Obs del estado"],
        r["  Tipo de intervención sugerida"],
      ]
        .map((x) => normalize(x))
        .join(" ");
      return includesAll(s, qn);
    });
  }, [fase3, qn]);

  const f4 = useMemo(() => {
    let list = Array.isArray(fase4) ? fase4 : [];
    // Texto
    if (qn) {
      list = list.filter((r) => {
        const s = [
          r["Nombre del estudiante"],
          r["Obs del estado"],
          r["  Tipo de intervención sugerida"],
          r["Coach de  Copy"],
          r["Coach de Plataformas"],
          r["Fase"],
        ]
          .map((x) => normalize(x))
          .join(" ");
        return includesAll(s, qn);
      });
    }
    // Filtros rápidos
    if (onlyInterv) {
      list = list.filter((r) =>
        /sí|si|true|1/i.test(
          String(
            r["¿Requiere intervención?"] ||
              r["¿Requiere intervención? (1)"] ||
              ""
          )
        )
      );
    }
    if (onlyPauta) {
      list = list.filter((r) => {
        const s = String(r["¿Tiene pauta activa?"] || "").toLowerCase();
        return s === "sí" || s === "si" || s === "true" || s === "1";
      });
    }
    if (faseFilter !== "all") {
      const key =
        faseFilter === "testeo"
          ? "testeo"
          : faseFilter === "optimizacion"
          ? "optimiz"
          : "escala";
      list = list.filter((r) => normalize(r["Fase"]).includes(key));
    }
    // Orden
    const toNumLocal = (v?: string | number | null) => {
      if (v == null) return null;
      const s = String(v).trim();
      if (!s) return null;
      return Number(s.replace(/\./g, "").replace(/,/g, "."));
    };
    if (sortBy) {
      list = [...list].sort((a, b) => {
        if (sortBy === "roas") {
          const av = toNumLocal(a["ROAs"]) ?? -Infinity;
          const bv = toNumLocal(b["ROAs"]) ?? -Infinity;
          return bv - av;
        }
        if (sortBy === "inversion") {
          const av = toNumLocal(a["Inversión en Pauta"]) ?? -Infinity;
          const bv = toNumLocal(b["Inversión en Pauta"]) ?? -Infinity;
          return bv - av;
        }
        if (sortBy === "facturacion") {
          const av = toNumLocal(a["Facturación"]) ?? -Infinity;
          const bv = toNumLocal(b["Facturación"]) ?? -Infinity;
          return bv - av;
        }
        return 0;
      });
    }
    return list;
  }, [fase4, qn, onlyInterv, onlyPauta, faseFilter, sortBy]);

  // Helpers UI/format
  function toNum(v?: string | number | null): number | null {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s) return null;
    // normaliza coma decimal y separadores
    // primero quitar separador de miles punto, luego convertir coma a punto
    const n = Number(s.replace(/\./g, "").replace(/,/g, "."));
    return Number.isFinite(n) ? n : null;
  }
  const fmtNumber = (n?: string | number | null) => {
    const v = toNum(n);
    if (v == null) return "—";
    return new Intl.NumberFormat("es-CO").format(v);
  };
  const fmtMoney = (n?: string | number | null) => {
    const v = toNum(n);
    if (v == null) return "—";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(v);
  };
  const fmtPercent = (n?: string | number | null) => {
    const v = toNum(n);
    if (v == null) return "—";
    const pct = v <= 1 ? v * 100 : v;
    return `${pct.toFixed(1)}%`;
  };
  const fmtRoas = (n?: string | number | null) => {
    const v = toNum(n);
    if (v == null) return "—";
    return v.toFixed(2);
  };
  const faseBadgeClass = (fase?: string) => {
    const s = (fase || "").toLowerCase();
    if (s.includes("escala"))
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (s.includes("optimiz"))
      return "bg-amber-100 text-amber-800 border-amber-200";
    if (s.includes("testeo"))
      return "bg-slate-100 text-slate-700 border-slate-200";
    return "";
  };
  const rowClass = (r: Fase4Row) => {
    const p = String(r["¿Tiene pauta activa?"] || "").toLowerCase();
    const active = p === "sí" || p === "si" || p === "true" || p === "1";
    const interv = /sí/i.test(String(r["¿Requiere intervención?"] || ""));
    return active
      ? "bg-emerald-50/40 hover:bg-emerald-50"
      : interv
      ? "bg-amber-50/40 hover:bg-amber-50"
      : "hover:bg-muted/50";
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as any)}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <TabsList>
          <TabsTrigger value="f4">Fase 4</TabsTrigger>
          <TabsTrigger value="f3">Fase 3</TabsTrigger>
        </TabsList>
        <Input
          placeholder="Buscar alumno, coach, estado, fase..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        {/* Filtros rápidos */}
        <div className="ml-auto flex items-center gap-1">
          <Toggle
            aria-label="Solo intervención"
            pressed={onlyInterv}
            onPressedChange={setOnlyInterv}
            variant="outline"
          >
            Intervención
          </Toggle>
          <Toggle
            aria-label="Solo pauta activa"
            pressed={onlyPauta}
            onPressedChange={setOnlyPauta}
            variant="outline"
          >
            Pauta activa
          </Toggle>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Fase:</span>
          <button
            className={`px-2 py-1 rounded-md border ${
              faseFilter === "all" ? "bg-gray-100" : "bg-white"
            }`}
            onClick={() => setFaseFilter("all")}
          >
            Todas
          </button>
          <button
            className={`px-2 py-1 rounded-md border ${
              faseFilter === "testeo" ? "bg-gray-100" : "bg-white"
            }`}
            onClick={() => setFaseFilter("testeo")}
          >
            Testeo
          </button>
          <button
            className={`px-2 py-1 rounded-md border ${
              faseFilter === "optimizacion" ? "bg-gray-100" : "bg-white"
            }`}
            onClick={() => setFaseFilter("optimizacion")}
          >
            Optimización
          </button>
          <button
            className={`px-2 py-1 rounded-md border ${
              faseFilter === "escala" ? "bg-gray-100" : "bg-white"
            }`}
            onClick={() => setFaseFilter("escala")}
          >
            Escala
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Orden:</span>
          <button
            className={`px-2 py-1 rounded-md border ${
              sortBy === "roas" ? "bg-gray-100" : "bg-white"
            }`}
            onClick={() => setSortBy("roas")}
          >
            ROAS
          </button>
          <button
            className={`px-2 py-1 rounded-md border ${
              sortBy === "inversion" ? "bg-gray-100" : "bg-white"
            }`}
            onClick={() => setSortBy("inversion")}
          >
            Inversión
          </button>
          <button
            className={`px-2 py-1 rounded-md border ${
              sortBy === "facturacion" ? "bg-gray-100" : "bg-white"
            }`}
            onClick={() => setSortBy("facturacion")}
          >
            Facturación
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          Cargando alumnos…
        </div>
      ) : (
        <>
          <TabsContent value="f4" className="mt-0">
            <div className="overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Alumno</TableHead>
                    <TableHead className="whitespace-nowrap">Inicio</TableHead>
                    <TableHead className="whitespace-nowrap">Asig.</TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Días
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Inv. pauta
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Facturación
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      ROAS
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Alcance
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Clics
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Visitas
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Pagos
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Carga
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Efect. Ads
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Efect. Pago
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Efect. Compra
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Compras</TableHead>
                    <TableHead className="whitespace-nowrap">Interv.</TableHead>
                    <TableHead className="whitespace-nowrap">Pauta</TableHead>
                    <TableHead className="whitespace-nowrap">Notas</TableHead>
                    <TableHead className="whitespace-nowrap">Copy</TableHead>
                    <TableHead className="whitespace-nowrap">
                      Plataformas
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Fase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {f4.map((r, i) => (
                    <TableRow
                      key={i}
                      className={`odd:bg-muted/10 ${rowClass(r)}`}
                    >
                      <TableCell
                        className="font-medium max-w-[260px] truncate"
                        title={r["Nombre del estudiante"] || undefined}
                      >
                        {r["Nombre del estudiante"] || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r["Fecha de inicio"] || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r["Fecha de asignación"] || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtNumber(r["Días transcurridos"])}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtMoney(r["Inversión en Pauta"])}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtMoney(r["Facturación"])}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtRoas(r["ROAs"])}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtNumber(r["Alcance"])}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtNumber(r["Clics"])}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtNumber(r["Visitas"])}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtNumber(r["Pagos iniciados"])}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtPercent(r["Carga de Página"])}
                      </TableCell>
                      <TableCell>
                        <PercentBar
                          value={toNum(r["Efectividad Ads"]) ?? null}
                        />
                      </TableCell>
                      <TableCell>
                        <PercentBar
                          value={toNum(r["Efectividad pago iniciado"]) ?? null}
                        />
                      </TableCell>
                      <TableCell>
                        <PercentBar
                          value={toNum(r["Efectividad compra"]) ?? null}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const items: Array<{
                              key: string;
                              label: string;
                              val: number | null;
                              cls?: string;
                            }> = [
                              {
                                key: "Compra carnada",
                                label: "Cn",
                                val: toNum(r["Compra carnada"]),
                              },
                              {
                                key: "Compra Bump 1",
                                label: "B1",
                                val: toNum(r["Compra Bump 1"]),
                              },
                              {
                                key: "Compra Bump 2",
                                label: "B2",
                                val: toNum(r["Compra Bump 2"]),
                              },
                              {
                                key: "Compra OTO 1",
                                label: "O1",
                                val: toNum(r["Compra OTO 1"]),
                              },
                              {
                                key: "Compra OTO 2",
                                label: "O2",
                                val: toNum(r["Compra OTO 2"]),
                              },
                              {
                                key: "Compra Downsell",
                                label: "Dn",
                                val: toNum(r["Compra Downsell"]),
                              },
                            ];
                            return items
                              .filter((x) => (x.val ?? 0) > 0)
                              .map((x) => (
                                <Badge
                                  key={x.key}
                                  className="bg-slate-100 text-slate-700 border-slate-200"
                                  title={x.key}
                                >
                                  {x.label}: {fmtNumber(x.val)}
                                </Badge>
                              ));
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const s = String(
                            r["¿Requiere intervención?"] ||
                              r["¿Requiere intervención? (1)"] ||
                              ""
                          );
                          const yes = /sí|si|true|1/i.test(s);
                          const no = /no|false|0/i.test(s);
                          return (
                            <Badge
                              className={
                                yes
                                  ? "bg-amber-100 text-amber-800 border-amber-200"
                                  : no
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : ""
                              }
                            >
                              {yes ? "Sí" : no ? "No" : "—"}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const s = (r["¿Tiene pauta activa?"] || "")
                            .toString()
                            .toLowerCase();
                          const yes =
                            s === "sí" ||
                            s === "si" ||
                            s === "true" ||
                            s === "1";
                          const no = s === "no" || s === "false" || s === "0";
                          return (
                            <Badge
                              className={
                                yes
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : no
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : ""
                              }
                            >
                              {yes ? "Sí" : no ? "No" : "—"}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="truncate" title={undefined}>
                                {r["Obs del estado"] ||
                                  r["  Tipo de intervención sugerida"] ||
                                  "—"}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[380px] whitespace-pre-wrap">
                              {r["Obs del estado"] ||
                                r["  Tipo de intervención sugerida"] ||
                                "—"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={r["Coach de  Copy"] || undefined}
                      >
                        {r["Coach de  Copy"] || "—"}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={r["Coach de Plataformas"] || undefined}
                      >
                        {r["Coach de Plataformas"] || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={faseBadgeClass(r["Fase"]) || undefined}
                        >
                          {r["Fase"] || "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {f4.length === 0 && (
              <div className="text-sm text-muted-foreground mt-2">
                Sin alumnos de Fase 4
              </div>
            )}
          </TabsContent>

          <TabsContent value="f3" className="mt-0">
            <div className="overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Alumno</TableHead>
                    <TableHead className="whitespace-nowrap">Inicio</TableHead>
                    <TableHead className="whitespace-nowrap">Fin</TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Fórmula
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Obs</TableHead>
                    <TableHead className="whitespace-nowrap">
                      Req. interv.
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Paso a F4
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Intervención
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {f3.map((r, i) => (
                    <TableRow
                      key={i}
                      className="odd:bg-muted/10 hover:bg-muted/50"
                    >
                      <TableCell
                        className="font-medium max-w-[240px] truncate"
                        title={r["Nombre del estudiante"] || undefined}
                      >
                        {r["Nombre del estudiante"] || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r["Fecha de inicio"] || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r["Fecha de finalización"] || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {r["Fórmula"] || "—"}
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="truncate" title={undefined}>
                                {r["Obs del estado"] || "—"}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[380px] whitespace-pre-wrap">
                              {r["Obs del estado"] || "—"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const s = String(r["¿Requiere intervención?"] || "");
                          const yes = /sí|si|true|1/i.test(s);
                          const no = /no|false|0/i.test(s);
                          return (
                            <Badge
                              className={
                                yes
                                  ? "bg-amber-100 text-amber-800 border-amber-200"
                                  : no
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : ""
                              }
                            >
                              {yes ? "Sí" : no ? "No" : "—"}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {r["Paso a fase 4"] ? (
                          <Badge
                            className={
                              /sí/i.test(r["Paso a fase 4"] || "")
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }
                          >
                            {r["Paso a fase 4"]}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="truncate" title={undefined}>
                                {r["  Tipo de intervención sugerida"] || "—"}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[380px] whitespace-pre-wrap">
                              {r["  Tipo de intervención sugerida"] || "—"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {f3.length === 0 && (
              <div className="text-sm text-muted-foreground mt-2">
                Sin alumnos de Fase 3
              </div>
            )}
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}

function PercentBar({ value }: { value: number | null }) {
  if (value == null || !Number.isFinite(value)) return <span>—</span>;
  const pct = value <= 1 ? value * 100 : value;
  const w = Math.max(0, Math.min(100, pct));
  const color = w >= 66 ? "#10b981" : w >= 33 ? "#f59e0b" : "#ef4444";
  return (
    <div className="w-40 max-w-full">
      <div className="h-2.5 w-full rounded-full bg-gray-200">
        <div
          className="h-2.5 rounded-full"
          style={{ width: `${w}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-1">{w.toFixed(1)}%</div>
    </div>
  );
}
