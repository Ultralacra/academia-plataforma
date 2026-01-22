"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

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
    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="h-10 pl-9"
          placeholder="Buscar nombre/email/teléfono…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div>
        <Select value={etapa} onValueChange={setEtapa}>
          <SelectTrigger className="h-10">
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
      <div>
        <Select value={canal} onValueChange={setCanal}>
          <SelectTrigger className="h-10">
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

      <div>
        <Label className="sr-only">Desde</Label>
        <Input
          type="date"
          className="h-10"
          value={createdFrom}
          onChange={(e) => setCreatedFrom(e.target.value)}
        />
      </div>
      <div>
        <Label className="sr-only">Hasta</Label>
        <Input
          type="date"
          className="h-10"
          value={createdTo}
          onChange={(e) => setCreatedTo(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="h-10">
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
        <button
          onClick={onClear}
          className="h-10 px-3 rounded border bg-white hover:bg-slate-50 text-sm"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
