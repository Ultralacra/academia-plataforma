"use client";

import { useEffect, useMemo, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsUpDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  placeholder?: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
};

export default function MultiSelect({
  placeholder = "Seleccionar...",
  options,
  value,
  onChange,
  className,
}: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240 });

  const measure = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 4 + window.scrollY,
      left: r.left + window.scrollX,
      width: r.width,
    });
  };
  const openMenu = () => {
    measure();
    requestAnimationFrame(() => setOpen(true));
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      const panel = document.getElementById(panelId);
      if (panel && panel.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onRelayout = () => measure();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onRelayout);
    window.addEventListener("scroll", onRelayout, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onRelayout);
      window.removeEventListener("scroll", onRelayout, true);
    };
  }, [open, panelId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o?.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const toggle = (opt: string) => {
    const has = value.includes(opt);
    onChange(has ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  const clearAll = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    onChange([]);
  };

  const label = value.length
    ? value.length === 1
      ? value[0]
      : `${value.length} seleccionadas`
    : placeholder;

  return (
    <>
      <Button
        ref={btnRef}
        type="button"
        variant="outline"
        onClick={openMenu}
        className={cn(
          "w-full justify-between",
          value.length ? "text-foreground" : "text-muted-foreground",
          className
        )}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="truncate">{label}</span>
        <div className="flex items-center gap-1">
          {!!value.length && (
            <X
              className="h-4 w-4 opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                clearAll(e);
              }}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-70" />
        </div>
      </Button>

      {open &&
        createPortal(
          <div
            id={panelId}
            style={{
              position: "absolute",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
            }}
            className="rounded-md border bg-popover shadow-xl"
          >
            <div className="p-2 border-b">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
              />
            </div>
            <div className="max-h-64 overflow-auto p-1">
              {filtered.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">
                  Sin opciones
                </div>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((opt) => {
                    const checked = value.includes(opt);
                    return (
                      <li key={opt}>
                        <button
                          type="button"
                          onClick={() => toggle(opt)}
                          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggle(opt)}
                            className="h-4 w-4"
                          />
                          <span className="flex-1 text-left">{opt}</span>
                          {checked && <Check className="h-4 w-4" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="p-2 flex justify-end gap-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearAll();
                  setSearch("");
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
