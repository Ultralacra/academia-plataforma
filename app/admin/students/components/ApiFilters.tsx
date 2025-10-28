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
import MultiSelect from "./MultiSelect";

export default function ApiFilters({
  search,
  setSearch,
  stateOptions,
  stageOptions,
  statesFilter,
  setStatesFilter,
  stagesFilter,
  setStagesFilter,
}: {
  search: string;
  setSearch: (v: string) => void;
  stateOptions: string[];
  stageOptions: string[];
  statesFilter: string[];
  setStatesFilter: (v: string[]) => void;
  stagesFilter: string[];
  setStagesFilter: (v: string[]) => void;
}) {
  return (
    <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
        </div>
      </CardContent>
    </Card>
  );
}
