"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    <div className="flex items-center gap-1 sm:gap-1.5 rounded-md border border-slate-200/70 bg-white/80 px-1 sm:px-1.5 py-0.5 sm:py-1 shadow-sm backdrop-blur overflow-x-auto">
      <div className="relative flex-shrink-0">
        <Search className="absolute left-1 sm:left-1.5 top-1/2 h-2 sm:h-2.5 w-2 sm:w-2.5 -translate-y-1/2 text-slate-400" />
        <Input
          className="h-5 sm:h-6 w-16 sm:w-24 pl-5 sm:pl-6 text-[9px] sm:text-[10px] bg-white placeholder:text-[9px] sm:placeholder:text-[10px]"
          placeholder="Buscar..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <span className="hidden sm:inline text-[9px] text-slate-500 whitespace-nowrap">
          Etapa:
        </span>
        <Select value={etapa} onValueChange={setEtapa}>
          <SelectTrigger className="h-5 sm:h-6 w-16 sm:w-20 text-[9px] sm:text-[10px] bg-white">
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
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <span className="hidden sm:inline text-[9px] text-slate-500 whitespace-nowrap">
          Canal:
        </span>
        <Select value={canal} onValueChange={setCanal}>
          <SelectTrigger className="h-5 sm:h-6 w-16 sm:w-20 text-[9px] sm:text-[10px] bg-white">
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
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <span className="hidden sm:inline text-[9px] text-slate-500 whitespace-nowrap">
          Desde:
        </span>
        <Input
          type="date"
          className="h-5 sm:h-6 w-[90px] sm:w-[100px] text-[9px] sm:text-[10px] bg-white px-0.5 sm:px-1 cursor-pointer"
          value={createdFrom}
          onChange={(e) => setCreatedFrom(e.target.value)}
          onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
        />
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <span className="hidden sm:inline text-[9px] text-slate-500 whitespace-nowrap">
          Hasta:
        </span>
        <Input
          type="date"
          className="h-5 sm:h-6 w-[90px] sm:w-[100px] text-[9px] sm:text-[10px] bg-white px-0.5 sm:px-1 cursor-pointer"
          value={createdTo}
          onChange={(e) => setCreatedTo(e.target.value)}
          onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
        />
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <span className="hidden sm:inline text-[9px] text-slate-500 whitespace-nowrap">
          Owner:
        </span>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="h-5 sm:h-6 w-16 sm:w-24 text-[9px] sm:text-[10px] bg-white">
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
        size="sm"
        onClick={onClear}
        className="h-5 sm:h-6 px-1.5 sm:px-2 text-[9px] sm:text-[10px] text-slate-600 flex-shrink-0"
      >
        Limpiar
      </Button>
    </div>
  );
}
