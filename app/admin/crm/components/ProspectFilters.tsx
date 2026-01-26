"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Search } from "lucide-react";

export function ProspectFilters({
  q,
  setQ,
  etapa,
  setEtapa,
  canal,
  setCanal,
  owner,
  setOwner,
  createdFrom,
  setCreatedFrom,
  createdTo,
  setCreatedTo,
  etapas,
  canales,
  owners,
  onClear,
}: {
  q: string;
  setQ: (v: string) => void;
  etapa: string;
  setEtapa: (v: string) => void;
  canal: string;
  setCanal: (v: string) => void;
  owner: string;
  setOwner: (v: string) => void;
  createdFrom: string;
  setCreatedFrom: (v: string) => void;
  createdTo: string;
  setCreatedTo: (v: string) => void;
  etapas: string[];
  canales: string[];
  owners: Array<{ value: string; label: string }>;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Filter className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Filtros rápidos
          </p>
          <p className="text-xs text-slate-500">
            Encuentra leads más rápido con criterios avanzados.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="relative md:col-span-2">
          <Label className="text-xs text-slate-500">Buscar</Label>
          <Search className="absolute left-3 top-9 h-4 w-4 text-slate-400" />
          <Input
            className="h-10 pl-9 bg-white"
            placeholder="Nombre, email o teléfono"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Etapa</Label>
          <Select value={etapa} onValueChange={setEtapa}>
            <SelectTrigger className="h-10 bg-white">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {etapas.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Canal</Label>
          <Select value={canal} onValueChange={setCanal}>
            <SelectTrigger className="h-10 bg-white">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {canales.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Desde</Label>
          <Input
            type="date"
            className="h-10 bg-white"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Hasta</Label>
          <Input
            type="date"
            className="h-10 bg-white"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-slate-500">Owner</Label>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger className="h-10 bg-white">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {owners.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={onClear}
            className="h-10 px-3 gap-2 text-slate-600"
          >
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  );
}
