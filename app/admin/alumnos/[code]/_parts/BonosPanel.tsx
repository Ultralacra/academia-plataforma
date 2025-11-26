"use client";

import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Check } from "lucide-react";
import { BONOS_CONTRACTUALES, BONOS_EXTRA, type BonoItem } from "@/lib/bonos";

export default function BonosPanel({ studentCode }: { studentCode: string }) {
  const { user } = useAuth();
  const isStudent = (user?.role || "").toLowerCase() === "student";
  const storageKey = `bonos:${studentCode}`;
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setSelected(parsed);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentCode]);

  function toggle(key: string, checked: boolean) {
    setSelected((prev) => {
      const set = new Set(prev);
      if (checked) set.add(key);
      else set.delete(key);
      return Array.from(set);
    });
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(selected));
      toast({
        title: "Bonos guardados",
        description: "La selección se guardó para este alumno.",
      });
    } catch (e) {
      console.error(e);
      toast({ title: "No se pudo guardar", variant: "destructive" });
    }
  }

  const countContract = useMemo(
    () =>
      selected.filter((k) => BONOS_CONTRACTUALES.some((b) => b.key === k))
        .length,
    [selected]
  );
  const countExtra = useMemo(
    () => selected.filter((k) => BONOS_EXTRA.some((b) => b.key === k)).length,
    [selected]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Asigna los bonos del programa a este alumno.
        </div>
        {!isStudent && (
          <Button size="sm" onClick={save} className="ml-auto">
            Guardar selección
          </Button>
        )}
      </div>

      <section className="space-y-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">
            Bonos contractuales {countContract > 0 ? `(${countContract})` : ""}
          </div>
          <p className="text-xs text-muted-foreground">
            Forman parte del contrato. Algunos son aplicables por única vez.
          </p>
        </div>

        <div className="space-y-3">
          {BONOS_CONTRACTUALES.map((b) => {
            const isSel = selected.includes(b.key);
            return (
              <div
                key={b.key}
                role="button"
                tabIndex={0}
                onClick={() => (!isStudent ? toggle(b.key, !isSel) : undefined)}
                onKeyDown={(e) => {
                  if (isStudent) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(b.key, !isSel);
                  }
                }}
                className={`relative rounded-lg border p-4 transition-all cursor-pointer ${
                  isSel
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSel}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(v) =>
                      !isStudent && toggle(b.key, Boolean(v))
                    }
                    disabled={isStudent}
                    aria-label={`Seleccionar ${b.title}`}
                  />
                  <div className="space-y-1 pr-8">
                    <div className="text-sm font-medium text-foreground">
                      {b.title}
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      {b.description}
                    </div>
                  </div>
                </div>
                {isSel && (
                  <div className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">
            Bonos extra {countExtra > 0 ? `(${countExtra})` : ""}
          </div>
          <p className="text-xs text-muted-foreground">
            Se solicitan fuera de las cláusulas contractuales y requieren pago y
            acuerdo mutuo.
          </p>
        </div>
        <div className="space-y-3">
          {BONOS_EXTRA.map((b) => {
            const isSel = selected.includes(b.key);
            return (
              <div
                key={b.key}
                role="button"
                tabIndex={0}
                onClick={() => (!isStudent ? toggle(b.key, !isSel) : undefined)}
                onKeyDown={(e) => {
                  if (isStudent) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(b.key, !isSel);
                  }
                }}
                className={`relative rounded-lg border p-4 transition-all cursor-pointer ${
                  isSel
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSel}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(v) =>
                      !isStudent && toggle(b.key, Boolean(v))
                    }
                    disabled={isStudent}
                    aria-label={`Seleccionar ${b.title}`}
                  />
                  <div className="space-y-1 pr-8">
                    <div className="text-sm font-medium text-foreground">
                      {b.title}
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      {b.description}
                    </div>
                  </div>
                </div>
                {isSel && (
                  <div className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {isStudent && (
        <div className="text-xs text-muted-foreground">
          Solo administradores pueden modificar los bonos.
        </div>
      )}
    </div>
  );
}
