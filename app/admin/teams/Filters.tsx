"use client";

import { Search, Calendar } from "lucide-react";

type Props = {
  search: string;
  onSearch: (v: string) => void;
  desde: string;
  hasta: string;
  onDesde: (v: string) => void;
  onHasta: (v: string) => void;
};

export default function Filters({
  search,
  onSearch,
  desde,
  hasta,
  onDesde,
  onHasta,
}: Props) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h3 className="text-sm font-semibold">Filtros</h3>
        <span className="text-xs text-muted-foreground">Auto-apply</span>
      </div>
      <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-12">
        <div className="md:col-span-6">
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar por nombre, código, área o puesto…"
              className="w-full rounded-xl border bg-white/80 pl-9 pr-3 py-2 text-sm outline-none transition focus:ring-4 focus:ring-sky-100"
            />
          </div>
        </div>
        <div className="md:col-span-3">
          <div className="flex items-center gap-2 rounded-xl border px-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={desde}
              onChange={(e) => onDesde(e.target.value)}
              className="w-full py-2 text-sm outline-none"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Desde</p>
        </div>
        <div className="md:col-span-3">
          <div className="flex items-center gap-2 rounded-xl border px-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={hasta}
              onChange={(e) => onHasta(e.target.value)}
              className="w-full py-2 text-sm outline-none"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Hasta</p>
        </div>
      </div>
    </div>
  );
}
