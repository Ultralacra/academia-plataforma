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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Filtros</CardTitle>
        <CardDescription>{total} resultados en la vista</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
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
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            >
              {options.tipo.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "Todos los tipos" : s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <Input
              type="date"
              value={values.fechaDesde}
              onChange={(e) => onChange.fechaDesde(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              type="date"
              value={values.fechaHasta}
              onChange={(e) => onChange.fechaHasta(e.target.value)}
            />
          </div>
        </div>

        <Button variant="outline" onClick={onChange.reset}>
          Reiniciar filtros
        </Button>
      </CardContent>
    </Card>
  );
}
