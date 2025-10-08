"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import MultiSelect from "./MultiSelect";

export default function ClientFilters(props: {
  stateOptions: string[];
  stageOptions: string[];
  statesFilter: string[];
  setStatesFilter: (v: string[]) => void;
  stagesFilter: string[];
  setStagesFilter: (v: string[]) => void;
  onAnyChange?: () => void;
}) {
  const {
    stateOptions,
    stageOptions,
    statesFilter,
    setStatesFilter,
    stagesFilter,
    setStagesFilter,
    onAnyChange,
  } = props;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Estados</label>
            <MultiSelect
              options={stateOptions}
              value={statesFilter}
              onChange={(v) => {
                setStatesFilter(v);
                onAnyChange?.();
              }}
              placeholder="Seleccionar estados"
            />
            {/* badges directly under select */}
            {!!statesFilter.length && (
              <div className="mt-2 flex flex-wrap gap-1">
                {statesFilter.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {s}
                    <button
                      className="ml-1 opacity-70 hover:opacity-100"
                      onClick={() =>
                        setStatesFilter(statesFilter.filter((x) => x !== s))
                      }
                      aria-label={`Quitar ${s}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Etapas</label>
            <MultiSelect
              options={stageOptions}
              value={stagesFilter}
              onChange={(v) => {
                setStagesFilter(v);
                onAnyChange?.();
              }}
              placeholder="Seleccionar etapas"
            />
            {/* badges directly under select */}
            {!!stagesFilter.length && (
              <div className="mt-2 flex flex-wrap gap-1">
                {stagesFilter.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {s}
                    <button
                      className="ml-1 opacity-70 hover:opacity-100"
                      onClick={() =>
                        setStagesFilter(stagesFilter.filter((x) => x !== s))
                      }
                      aria-label={`Quitar ${s}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
