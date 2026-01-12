"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type SolicitudBonoDetailDialogRow = {
  bono_codigo?: string | null;
  estado?: string | null;
  correo_entrega?: string | null;
  nombre_solicitante?: string | null;
  descripcion?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  alumno_nombre?: string | null;
  alumno_fase?: string | null;
  data?: any;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  row: SolicitudBonoDetailDialogRow | null;
  bonoNombre: string;
  bonoCodigo: string;
  formatDateTime: (v: unknown) => string;
};

function normalizeKeyLabel(key: string) {
  const raw = String(key);
  const pretty = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

function isNonEmpty(v: unknown) {
  return v !== null && v !== undefined && String(v).trim() !== "";
}

function toClickableUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/[\s\n\r\t]/.test(s)) return null;

  // Ya viene con esquema
  if (/^https?:\/\//i.test(s)) return s;

  // www.
  if (/^www\./i.test(s)) return `https://${s}`;

  // localhost / dominio con puerto o ruta simple
  if (/^localhost(?::\d+)?(?:\/.*)?$/i.test(s)) return `http://${s}`;

  // Dominio típico con puerto opcional
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(?::\d+)?(?:\/.*)?$/i.test(s)) {
    return `https://${s}`;
  }

  return null;
}

function RenderValue({ value }: { value: unknown }) {
  if (typeof value !== "string") {
    return (
      <>{typeof value === "boolean" ? (value ? "sí" : "no") : String(value)}</>
    );
  }

  const url = toClickableUrl(value);
  if (!url) return <>{value}</>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline underline-offset-4 break-all hover:opacity-80"
    >
      {value}
    </a>
  );
}

function pickEntries(data: any, keys: string[]) {
  const out: Array<[string, unknown]> = [];
  for (const k of keys) {
    if (
      data &&
      Object.prototype.hasOwnProperty.call(data, k) &&
      isNonEmpty(data[k])
    ) {
      out.push([normalizeKeyLabel(k), data[k]]);
    }
  }
  return out;
}

function categorizeData(data: any) {
  if (!data || typeof data !== "object") {
    return {
      summary: [] as Array<[string, unknown]>,
      contacto: [] as Array<[string, unknown]>,
      producto: [] as Array<[string, unknown]>,
      credenciales: [] as Array<[string, unknown]>,
      links: [] as Array<[string, unknown]>,
      otros: [] as Array<[string, unknown]>,
    };
  }

  // Campos duplicados o poco útiles en el modal
  const hiddenKeys = new Set([
    "descripcion",
    "bonoCodigo",
    "bonoNombre",
    "studentCode",
  ]);

  const summary = pickEntries(data, ["confirmPrerequisitos"]);

  const contacto = pickEntries(data, [
    "nombre",
    "nombreCompleto",
    "correoEntrega",
    "whatsappSoporte",
    "linksGruposWhatsapp",
  ]);

  const producto = pickEntries(data, [
    "productoTipo",
    "productoCarnada",
    "prodCarnada",
    "prodOto",
    "prodOrderBumps",
  ]);

  const credenciales: Array<[string, unknown]> = [];
  const links: Array<[string, unknown]> = [];
  const otros: Array<[string, unknown]> = [];

  for (const [k, v] of Object.entries(data)) {
    if (!isNonEmpty(v)) continue;
    if (hiddenKeys.has(k)) continue;

    const keyLower = k.toLowerCase();
    const label = normalizeKeyLabel(k);

    if (keyLower.startsWith("cred")) {
      // evitar duplicar los campos ya listados explícitamente
      if (!credenciales.some(([lbl]) => lbl === label))
        credenciales.push([label, v]);
      continue;
    }

    if (
      keyLower.startsWith("drive") ||
      keyLower.startsWith("link") ||
      keyLower.includes("url") ||
      keyLower.includes("drive")
    ) {
      if (!links.some(([lbl]) => lbl === label)) links.push([label, v]);
      continue;
    }

    // ya capturados en listas explícitas
    const alreadyIn = [...summary, ...contacto, ...producto].some(
      ([lbl]) => lbl === label
    );
    if (!alreadyIn) otros.push([label, v]);
  }

  // Orden agradable
  credenciales.sort(([a], [b]) => a.localeCompare(b));
  links.sort(([a], [b]) => a.localeCompare(b));
  otros.sort(([a], [b]) => a.localeCompare(b));

  return { summary, contacto, producto, credenciales, links, otros };
}

function PairsGrid({ pairs }: { pairs: Array<[string, unknown]> }) {
  const clean = pairs.filter(([, v]) => isNonEmpty(v));
  if (clean.length === 0) return null;
  return (
    <div className="grid gap-2">
      {clean.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4">
          <div className="text-xs text-muted-foreground">{k}</div>
          <div className="text-sm text-right break-words max-w-[70%]">
            <RenderValue value={v} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

export default function SolicitudBonoDetailDialog(props: Props) {
  const {
    open,
    onOpenChange,
    loading,
    error,
    row,
    bonoNombre,
    bonoCodigo,
    formatDateTime,
  } = props;

  const estado = String(row?.estado ?? "").trim();
  const descripcion =
    String(row?.descripcion ?? "").trim() ||
    String((row as any)?.data?.descripcion ?? "").trim();

  const organized = React.useMemo(
    () => categorizeData((row as any)?.data),
    [row]
  );

  const confirm = (row as any)?.data?.confirmPrerequisitos;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalle de solicitud</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : !row ? (
          <div className="text-sm text-muted-foreground">
            No se pudo cargar el detalle.
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    {bonoNombre ? (
                      <div className="font-medium truncate" title={bonoNombre}>
                        {bonoNombre}
                      </div>
                    ) : null}
                    {bonoCodigo ? (
                      <div className="text-xs text-muted-foreground font-mono">
                        {bonoCodigo}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {estado ? (
                      <Badge variant="secondary" className="capitalize">
                        {estado}
                      </Badge>
                    ) : null}
                    {typeof confirm === "boolean" ? (
                      <Badge variant={confirm ? "default" : "destructive"}>
                        {confirm
                          ? "Prerequisitos confirmados"
                          : "Prerequisitos no confirmados"}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {row?.alumno_nombre ? (
                    <div className="text-sm">
                      Alumno: {String(row.alumno_nombre)}
                    </div>
                  ) : null}
                  {row?.alumno_fase ? (
                    <Badge variant="muted" className="font-mono">
                      {String(row.alumno_fase)}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <Section title="Resumen">
              <PairsGrid
                pairs={[
                  ["Correo entrega", row?.correo_entrega],
                  ["Nombre solicitante", row?.nombre_solicitante],
                  ["Creado", formatDateTime(row?.created_at)],
                  ["Actualizado", formatDateTime(row?.updated_at)],
                ]}
              />
            </Section>

            {descripcion ? (
              <Accordion
                type="single"
                collapsible
                className="rounded-md border bg-muted/20 px-3"
              >
                <AccordionItem value="descripcion" className="border-b-0">
                  <AccordionTrigger className="py-3">
                    Descripción
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="rounded-md border bg-background p-3 max-h-[260px] overflow-auto">
                      <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {descripcion}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}

            {organized.contacto.length ? (
              <Section title="Contacto">
                <PairsGrid pairs={organized.contacto} />
              </Section>
            ) : null}

            {organized.producto.length ? (
              <Section title="Producto">
                <PairsGrid pairs={organized.producto} />
              </Section>
            ) : null}

            {organized.credenciales.length ? (
              <Section title="Credenciales / Accesos">
                <PairsGrid pairs={organized.credenciales} />
              </Section>
            ) : null}

            {organized.links.length ? (
              <Section title="Links / Drive">
                <PairsGrid pairs={organized.links} />
              </Section>
            ) : null}

            {organized.otros.length ? (
              <Section title="Otros">
                <PairsGrid pairs={organized.otros} />
              </Section>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
