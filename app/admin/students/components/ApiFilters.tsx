"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ChevronsUpDown, Check, X } from "lucide-react";
import MultiSelect from "./MultiSelect";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import type { CoachOpt } from "./api";

export default function ApiFilters({
  search,
  setSearch,
  stateOptions,
  stageOptions,
  statesFilter,
  setStatesFilter,
  stagesFilter,
  setStagesFilter,
  coaches,
  coach,
  setCoach,
  loadingCoaches,
  fechaDesde,
  fechaHasta,
  setFechaDesde,
  setFechaHasta,
}: {
  search: string;
  setSearch: (v: string) => void;
  stateOptions: string[];
  stageOptions: string[];
  statesFilter: string[];
  setStatesFilter: (v: string[]) => void;
  stagesFilter: string[];
  setStagesFilter: (v: string[]) => void;
  coaches: CoachOpt[];
  coach: string;
  setCoach: (v: string) => void;
  loadingCoaches?: boolean;
  fechaDesde: string;
  fechaHasta: string;
  setFechaDesde: (v: string) => void;
  setFechaHasta: (v: string) => void;
}) {
  const [openCoach, setOpenCoach] = useState(false);

  const selectedCoach = useMemo(
    () => coaches.find((c) => c.codigo === coach),
    [coaches, coach],
  );

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alumno..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Estados</label>
            <MultiSelect
              options={stateOptions}
              value={statesFilter}
              onChange={setStatesFilter}
              placeholder="Seleccionar estados"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Etapas</label>
            <MultiSelect
              options={stageOptions}
              value={stagesFilter}
              onChange={setStagesFilter}
              placeholder="Seleccionar etapas"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">
              Coach (métricas)
            </label>
            <Popover open={openCoach} onOpenChange={setOpenCoach}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span className="truncate">
                    {loadingCoaches
                      ? "Cargando..."
                      : (selectedCoach?.nombre ?? "Todos")}
                  </span>
                  <span className="flex items-center gap-1">
                    {coach ? (
                      <X
                        className="h-4 w-4 text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoach("");
                        }}
                        aria-label="Limpiar coach"
                      />
                    ) : null}
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start" sideOffset={8}>
                <Command>
                  <CommandInput placeholder="Buscar coach..." autoFocus />
                  <CommandList className="max-h-64">
                    <CommandEmpty>No hay resultados.</CommandEmpty>
                    <CommandGroup heading="Coachs">
                      {coaches.map((c) => (
                        <CommandItem
                          key={c.codigo}
                          value={c.nombre}
                          onSelect={() => {
                            setCoach(c.codigo);
                            setOpenCoach(false);
                          }}
                          className="cursor-pointer"
                        >
                          <span className="truncate">{c.nombre}</span>
                          {coach === c.codigo ? (
                            <Check className="ml-auto h-4 w-4" />
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
