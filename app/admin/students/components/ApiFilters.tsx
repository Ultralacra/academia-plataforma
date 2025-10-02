"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function ApiFilters({
  search,
  setSearch,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
}: {
  search: string;
  setSearch: (v: string) => void;
  fechaDesde: string;
  setFechaDesde: (v: string) => void;
  fechaHasta: string;
  setFechaHasta: (v: string) => void;
}) {
  return (
    <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader>
        <CardTitle>Consulta a la API</CardTitle>
        <CardDescription>Buscar y filtrar por rango de ingreso</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar (nombre, código)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="md:col-span-1">
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          * Se recuperan hasta 1000 registros.
        </p>
      </CardContent>
    </Card>
  );
}
