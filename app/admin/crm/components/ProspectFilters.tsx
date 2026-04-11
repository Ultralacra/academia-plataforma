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
  emailQ: string;
  setEmailQ: (v: string) => void;
  phoneQ: string;
  setPhoneQ: (v: string) => void;
  questionsQ: string;
  setQuestionsQ: (v: string) => void;
  closer: string;
  setCloser: (v: string) => void;
  combinedEtapa: string;
  setCombinedEtapa: (v: string) => void;
  createdFrom: string;
  setCreatedFrom: (v: string) => void;
  createdTo: string;
  setCreatedTo: (v: string) => void;
  closers: string[];
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
  emailQ,
  setEmailQ,
  phoneQ,
  setPhoneQ,
  questionsQ,
  setQuestionsQ,
  closer,
  setCloser,
  combinedEtapa,
  setCombinedEtapa,
  createdFrom,
  setCreatedFrom,
  createdTo,
  setCreatedTo,
  closers,
  onClear,
}: ProspectFiltersProps) {
  const activeCount = [
    q,
    emailQ,
    phoneQ,
    questionsQ,
    closer !== "all" ? closer : "",
    combinedEtapa !== "all" ? combinedEtapa : "",
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

      <div className="flex flex-col">
        <FilterLabel>Correo electrónico</FilterLabel>
        <div className="relative">
          <Search className="absolute left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            className="h-7 w-full pl-5 text-[11px] bg-white placeholder:text-slate-400"
            placeholder="Filtrar por email"
            value={emailQ}
            onChange={(e) => setEmailQ(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col">
        <FilterLabel>Teléfono</FilterLabel>
        <div className="relative">
          <Search className="absolute left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            className="h-7 w-full pl-5 text-[11px] bg-white placeholder:text-slate-400"
            placeholder="Filtrar por teléfono"
            value={phoneQ}
            onChange={(e) => setPhoneQ(e.target.value)}
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
        label="Etapa del lead"
        value={combinedEtapa}
        onChange={setCombinedEtapa}
        placeholder="Etapa del lead"
      >
        <SelectItem value="all">Todas</SelectItem>
        <SelectItem value="etapa:Nuevo">Nuevo</SelectItem>
        <SelectItem value="etapa:Contactado">Contactado</SelectItem>
        <SelectItem value="etapa:Calificado">Calificado</SelectItem>
        <SelectItem value="etapa:Ganado">Ganado</SelectItem>
        <SelectItem value="etapa:Perdido">Perdido</SelectItem>
        <SelectItem value="pipeline:agendado">Agendado</SelectItem>
        <SelectItem value="pipeline:confirmado">Confirmado</SelectItem>
        <SelectItem value="pipeline:no_show">No Show</SelectItem>
        <SelectItem value="pipeline:llamada_realizada">
          Llamada realizada
        </SelectItem>
        <SelectItem value="pipeline:decision">Decisión</SelectItem>
        <SelectItem value="pipeline:seguimiento">Seguimiento</SelectItem>
        <SelectItem value="pipeline:recuperacion">Recuperación</SelectItem>
        <SelectItem value="pipeline:lead_dormido">Lead dormido</SelectItem>
        <SelectItem value="pipeline:cerrado_ganado">Cerrado ganado</SelectItem>
        <SelectItem value="pipeline:cerrado_perdido">
          Cerrado perdido
        </SelectItem>
      </FilterSelect>

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
