"use client";

import { Search } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Filters({
  values,
  options,
  onChange,
  total,
}: {
  values: {
    search: string;
    estado: string;
    tipo: string;
    fechaDesde: string;
    fechaHasta: string;
  };
  options: { estado: string[]; tipo: string[] };
  onChange: {
    search: (v: string) => void;
    estado: (v: string) => void;
    tipo: (v: string) => void;
    fechaDesde: (v: string) => void;
    fechaHasta: (v: string) => void;
    reset: () => void;
  };
  total: number;
}) {
  return (
    <Card className="border-gray-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px]">Filtros</CardTitle>
        <CardDescription className="text-xs">
          {total} resultados en la vista
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por asunto, alumno, id externo…"
                value={values.search}
                onChange={(e) => onChange.search(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <select
              value={values.estado}
              onChange={(e) => onChange.estado(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {options.estado.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "Todos los estados" : s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={values.tipo}
              onChange={(e) => onChange.tipo(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {options.tipo.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "Todos los tipos" : s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <Input
              type="date"
              value={values.fechaDesde}
              onChange={(e) => onChange.fechaDesde(e.target.value)}
              className="rounded-xl"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Desde</p>
          </div>
          <div className="md:col-span-1">
            <Input
              type="date"
              value={values.fechaHasta}
              onChange={(e) => onChange.fechaHasta(e.target.value)}
              className="rounded-xl"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Hasta</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onChange.reset}>
            Reiniciar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
