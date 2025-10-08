"use client";

import {
  Calendar,
  Filter,
  UserCircle2,
  Loader2,
  ChevronsUpDown,
  Check,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import * as React from "react";
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
import { cn } from "@/lib/utils";

type CoachOpt = { id: number; codigo: string; nombre: string };
type Props = {
  coaches: CoachOpt[];
  coach: string; // codigo
  loadingCoaches?: boolean;
  onCoach: (code: string) => void;
  desde: string;
  hasta: string;
  onDesde: (v: string) => void;
  onHasta: (v: string) => void;
};

export default function Filters({
  coaches,
  coach,
  loadingCoaches,
  onCoach,
  desde,
  hasta,
  onDesde,
  onHasta,
}: Props) {
  const [openCoach, setOpenCoach] = React.useState(false);

  const selectedCoach = coaches.find((c) => c.codigo === coach);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-gray-200 bg-white"
    >
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-5 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/30">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Filtros
          </h3>
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
          Auto-aplicar
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12">
        {/* Coach select */}
        <div className="md:col-span-6">
          <label className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase mb-1 block">
            Coach
          </label>
          <Popover open={openCoach} onOpenChange={setOpenCoach}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Seleccionar coach"
                className={cn(
                  "group flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-medium shadow-sm outline-none transition-all",
                  "bg-gradient-to-r from-white to-white/90 dark:from-gray-800 dark:to-gray-800",
                  coach
                    ? "border-blue-500/60 ring-1 ring-blue-500/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                  "focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {loadingCoaches ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  ) : (
                    <UserCircle2
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        coach ? "text-blue-600" : "text-gray-400"
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "truncate",
                      coach
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-gray-500"
                    )}
                  >
                    {selectedCoach ? selectedCoach.nombre : "Todos los coachs"}
                  </span>
                  {coach && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-0.5 text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
                      Filtrando
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  {coach && (
                    <X
                      onClick={(e) => {
                        e.stopPropagation();
                        onCoach("");
                      }}
                      className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Limpiar coach"
                    />
                  )}
                  <ChevronsUpDown className="h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-[360px]"
              align="start"
              sideOffset={8}
            >
              <Command>
                <CommandInput
                  placeholder="Buscar coach..."
                  autoFocus
                  className="text-sm"
                />
                <CommandList className="max-h-64">
                  <CommandEmpty>No hay resultados.</CommandEmpty>
                  <CommandGroup heading="Coachs">
                    <CommandItem
                      key="all"
                      onSelect={() => {
                        onCoach("");
                        setOpenCoach(false);
                      }}
                      className="cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <UserCircle2 className="h-4 w-4 text-gray-400" />
                        Todos los coachs
                      </span>
                      {!coach && (
                        <Check className="ml-auto h-4 w-4 text-blue-600" />
                      )}
                    </CommandItem>
                    {coaches.map((c) => (
                      <CommandItem
                        key={c.codigo}
                        value={c.nombre}
                        onSelect={() => {
                          onCoach(c.codigo);
                          setOpenCoach(false);
                        }}
                        className="cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <UserCircle2 className="h-4 w-4 text-gray-400" />
                          {c.nombre}
                        </span>
                        {coach === c.codigo && (
                          <Check className="ml-auto h-4 w-4 text-blue-600" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Month picker eliminado a solicitud */}

        {/* Date from */}
        <div className="md:col-span-3">
          <div className="relative group">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 dark:focus-within:border-blue-400">
              <Calendar className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="date"
                value={desde}
                onChange={(e) => onDesde(e.target.value)}
                className="w-full py-2.5 text-sm outline-none bg-transparent text-gray-900 dark:text-gray-100"
              />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 ml-1">
              Desde
            </p>
          </div>
        </div>

        {/* Date to */}
        <div className="md:col-span-3">
          <div className="relative group">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 dark:focus-within:border-blue-400">
              <Calendar className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="date"
                value={hasta}
                onChange={(e) => onHasta(e.target.value)}
                className="w-full py-2.5 text-sm outline-none bg-transparent text-gray-900 dark:text-gray-100"
              />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 ml-1">
              Hasta
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
