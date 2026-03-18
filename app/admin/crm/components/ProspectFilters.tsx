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
import { Search, X, CalendarDays, SlidersHorizontal } from "lucide-react";

interface ProspectFiltersProps {
  q: string;
  setQ: (v: string) => void;
  questionsQ: string;
  setQuestionsQ: (v: string) => void;
  closer: string;
  setCloser: (v: string) => void;
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
  closers: string[];
  owners: Array<{ value: string; label: string }>;
  onClear: () => void;
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5 block">
      {children}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  placeholder,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  const isActive = value !== "all";
  return (
    <div className="flex flex-col">
      <FilterLabel>{label}</FilterLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={`h-7 w-full text-[11px] transition-colors ${
            isActive
              ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium"
              : "bg-white text-slate-700"
          }`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

export function ProspectFilters({
  q,
  setQ,
  questionsQ,
  setQuestionsQ,
  closer,
  setCloser,
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
  closers,
  owners,
  onClear,
}: ProspectFiltersProps) {
  const activeCount = [
    q,
    questionsQ,
    closer !== "all" ? closer : "",
    etapa !== "all" ? etapa : "",
    canal !== "all" ? canal : "",
    owner !== "all" ? owner : "",
    createdFrom,
    createdTo,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200/70 bg-white/90 p-3 shadow-sm">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-700">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold">Filtros</span>
          {activeCount > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-100 px-1 text-[9px] font-bold text-indigo-600">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-5 px-1.5 text-[10px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
          >
            <X className="h-2.5 w-2.5 mr-0.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Búsqueda lead */}
      <div className="flex flex-col">
        <FilterLabel>Buscar</FilterLabel>
        <div className="relative">
          <Search className="absolute left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            className="h-7 w-full pl-5 text-[11px] bg-white placeholder:text-slate-400"
            placeholder="Nombre, email, tel..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Búsqueda preguntas */}
      <div className="flex flex-col">
        <FilterLabel>Preguntas</FilterLabel>
        <div className="relative">
          <Search className="absolute left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            className="h-7 w-full pl-5 text-[11px] bg-white placeholder:text-slate-400"
            placeholder="Buscar en respuestas..."
            value={questionsQ}
            onChange={(e) => setQuestionsQ(e.target.value)}
          />
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      <FilterSelect
        label="Etapa"
        value={etapa}
        onChange={setEtapa}
        placeholder="Etapa"
      >
        <SelectItem value="all">Todas las etapas</SelectItem>
        {etapas.map((e) => (
          <SelectItem key={e} value={e}>
            {e}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Canal"
        value={canal}
        onChange={setCanal}
        placeholder="Canal"
      >
        <SelectItem value="all">Todos los canales</SelectItem>
        {canales.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </FilterSelect>

      {owners.length > 0 && (
        <FilterSelect
          label="Owner"
          value={owner}
          onChange={setOwner}
          placeholder="Owner"
        >
          <SelectItem value="all">Todos los owners</SelectItem>
          {owners.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </FilterSelect>
      )}

      {closers.length > 0 && (
        <FilterSelect
          label="Closer"
          value={closer}
          onChange={setCloser}
          placeholder="Closer"
        >
          <SelectItem value="all">Todos los closers</SelectItem>
          {closers.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </FilterSelect>
      )}

      <div className="h-px bg-slate-100" />

      {/* Rango de fechas */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1 mb-0.5">
          <CalendarDays className="h-3 w-3 text-slate-400" />
          <FilterLabel>Fecha de registro</FilterLabel>
        </div>
        <div className="flex flex-col gap-1">
          <input
            type="date"
            className={`h-7 w-full rounded-md border px-2 text-[11px] cursor-pointer outline-none transition-colors ${
              createdFrom
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            title="Desde"
          />
          <input
            type="date"
            className={`h-7 w-full rounded-md border px-2 text-[11px] cursor-pointer outline-none transition-colors ${
              createdTo
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            title="Hasta"
          />
        </div>
      </div>
    </div>
  );
}
