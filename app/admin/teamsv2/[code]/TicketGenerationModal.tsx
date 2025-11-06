"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Spinner from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Sparkles,
  Wand2,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";
import { TicketData, Attachment } from "./chat-types";
import {
  getAttachmentUrl,
  resolveAttachmentMime,
  isImage,
  isVideo,
  isAudio,
} from "./chat-attachments";
import { simpleMarkdownToHtml } from "./chat-utils";
import {
  getOpciones,
  createTicket,
  updateTicket,
  type OpcionItem,
} from "@/app/admin/alumnos/api";

export function TicketGenerationModal({
  open,
  onOpenChange,
  loading,
  error,
  data,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  data: TicketData | null;
  onConfirm: (data: TicketData) => void;
}) {
  const [mode, setMode] = React.useState<"form" | "preview">("form");
  const [titulo, setTitulo] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [prioridad, setPrioridad] = React.useState("");
  const [categoria, setCategoria] = React.useState("");
  const [tipo, setTipo] = React.useState("");
  const [alumno, setAlumno] = React.useState("");
  const [area, setArea] = React.useState("");
  const [areaKey, setAreaKey] = React.useState("");
  const [areaOptions, setAreaOptions] = React.useState<OpcionItem[]>([]);
  const [areasLoading, setAreasLoading] = React.useState(false);
  const [coachNombre, setCoachNombre] = React.useState("");
  const [recomendacion, setRecomendacion] = React.useState("");
  const [links, setLinks] = React.useState<string[]>([]);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [flowStage, setFlowStage] = React.useState<
    "idle" | "creating" | "created"
  >("idle");

  // Utilidades para links
  const isLikelyUrl = React.useCallback((s: string) => {
    const str = String(s || "").trim();
    return /^(https?:\/\/|www\.)\S+$/i.test(str);
  }, []);

  const normalizeUrl = React.useCallback((s: string) => {
    const str = String(s || "").trim();
    if (!str) return "";
    return str.startsWith("http://") || str.startsWith("https://")
      ? str
      : `https://${str}`;
  }, []);

  const parseLinks = React.useCallback(
    (s: string) => {
      const text = String(s || "")
        .replace(/\r?\n/g, ",")
        .trim();
      if (!text) return [] as string[];
      return text
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && isLikelyUrl(t));
    },
    [isLikelyUrl]
  );

  // Intenta leer un valor del contenido markdown con formato **Campo:** valor
  const readFieldFromContent = React.useCallback(
    (content: string, field: string) => {
      try {
        // Busca líneas del tipo **Campo:** valor
        // Escapes dobles para que la expresión regular sea válida en string
        // Soporta fin de línea con \r?\n o fin de texto
        const re = new RegExp(
          String.raw`\*\*${field}\s*:\*\*\s*(.+?)(?:\r?\n|$)`,
          "i"
        );
        const m = content.match(re);
        return m?.[1]?.trim() || "";
      } catch {
        return "";
      }
    },
    []
  );

  React.useEffect(() => {
    if (!data) return;
    const parsed = data.parsed || {};
    const content = data.content || "";
    setTitulo(
      parsed.titulo ||
        readFieldFromContent(content, "Título (obligatorio)") ||
        readFieldFromContent(content, "Título") ||
        ""
    );
    setDescripcion(
      parsed.descripcion || readFieldFromContent(content, "Descripción") || ""
    );
    setPrioridad(
      (
        parsed.prioridad ||
        readFieldFromContent(content, "Prioridad") ||
        ""
      ).trim()
    );
    setCategoria(
      (parsed as any).categoria ||
        readFieldFromContent(content, "Categoría") ||
        ""
    );
    setTipo(
      (
        data.tipo ||
        readFieldFromContent(content, "Tipo de ticket") ||
        ""
      ).trim()
    );
    setAlumno(
      (parsed as any).alumno ||
        readFieldFromContent(content, "Alumno") ||
        readFieldFromContent(content, "Nombre de cliente asignado") ||
        data.nombre ||
        ""
    );
    setArea(
      (parsed as any).area || readFieldFromContent(content, "Área") || ""
    );
    setCoachNombre(
      (parsed as any).coachNombre ||
        readFieldFromContent(content, "Nombre de coach asignado") ||
        ""
    );
    setRecomendacion(
      (parsed as any).recomendacion ||
        readFieldFromContent(content, "Recomendación o siguiente paso") ||
        readFieldFromContent(content, "Recomendación") ||
        readFieldFromContent(content, "Siguiente paso") ||
        ""
    );

    // Links desde IA
    const linksText =
      (parsed as any).links || readFieldFromContent(content, "Links") || "";
    setLinks(parseLinks(linksText));
  }, [data, readFieldFromContent]);

  // Normalizador simple para comparar claves/labels
  const normalize = React.useCallback((s: string) => {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();
  }, []);

  // Cargar opciones de área cuando abre el modal y mapear el texto actual a una opción
  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        setAreasLoading(true);
        const ops = await getOpciones("area");
        if (!alive) return;
        setAreaOptions(ops);
        // Mapear el texto de `area` (si viene de IA) a una key de opción
        const aiArea = area;
        if (aiArea) {
          const aim = normalize(aiArea);
          const match = ops.find(
            (o) => normalize(o.key) === aim || normalize(o.value) === aim
          );
          if (match) setAreaKey(match.key);
        } else if (!areaKey && ops.length) {
          setAreaKey(ops[0].key);
        }
      } catch {
        // fallback: sin opciones
        setAreaOptions([]);
      } finally {
        if (alive) setAreasLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, area, normalize, areaKey]);

  const buildMarkdown = React.useCallback(() => {
    const lines: string[] = [];
    if (titulo) lines.push(`**Título (obligatorio):** ${titulo}`);
    if (descripcion) lines.push(`**Descripción:** ${descripcion}`);
    if (alumno) lines.push(`**Alumno:** ${alumno}`);
    {
      const selectedLabel =
        areaOptions.find((x) => x.key === areaKey)?.value || area || "";
      if (selectedLabel) lines.push(`**Área:** ${selectedLabel}`);
    }
    if (prioridad) lines.push(`**Prioridad:** ${prioridad}`);
    // Campos no necesarios en los inputs del modal (Categoría y Tipo) omitidos del contenido generado
    if (coachNombre) lines.push(`**Nombre de coach asignado:** ${coachNombre}`);
    if (recomendacion)
      lines.push(`**Recomendación o siguiente paso:** ${recomendacion}`);
    if (links.length > 0) lines.push(`**Links:** ${links.join(", ")}`);
    return lines.join("  \\n");
  }, [
    titulo,
    descripcion,
    alumno,
    area,
    areaKey,
    areaOptions,
    prioridad,
    categoria,
    tipo,
    coachNombre,
    recomendacion,
    links,
  ]);

  const normalizedAttachments: Attachment[] = React.useMemo(() => {
    if (!data?.archivos_cargados || !Array.isArray(data.archivos_cargados))
      return [] as Attachment[];
    return data.archivos_cargados.map((x: any, idx: number) => {
      const name =
        x?.name || x?.filename || x?.originalname || `archivo-${idx + 1}`;
      const mime = x?.mime || x?.mimetype || undefined;
      const url = x?.url || x?.path || undefined;
      const data_base64 = x?.data_base64 || x?.base64 || "";
      const att: Attachment = {
        id: String(x?.id || x?._id || idx),
        name,
        mime:
          mime ||
          resolveAttachmentMime({
            name,
            mime: "",
            size: 0,
            data_base64,
          } as any),
        size: Number(x?.size || 0),
        data_base64,
        url,
        created_at: x?.created_at || x?.createdAt || undefined,
      };
      return att;
    });
  }, [data?.archivos_cargados]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {flowStage === "idle" && (
        <DialogContent className="sm:max-w-[960px] max-h-[90vh] p-0 flex flex-col bg-white dark:bg-zinc-950">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-violet-500 to-indigo-600 text-white">
                <Wand2 className="h-4 w-4" />
              </span>
              Generar Ticket con IA
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 pt-4 flex-1 min-h-0 overflow-y-auto">
            {loading && (
              <div className="relative grid place-items-center h-56 rounded-xl overflow-hidden bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-950/30 dark:via-zinc-900 dark:to-indigo-950/30 border">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="sparkle s1" />
                  <div className="sparkle s2" />
                  <div className="sparkle s3" />
                  <div className="sparkle s4" />
                </div>
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <div className="relative">
                    <span className="absolute -top-2 -right-2 text-yellow-500 animate-ping">
                      ✦
                    </span>
                    <span className="absolute -bottom-2 -left-2 text-pink-500 animate-pulse">
                      ✧
                    </span>
                    <div className="h-12 w-12 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600 text-white grid place-items-center shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30">
                      <Sparkles className="h-6 w-6 animate-spin-slow" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner size={18} />
                    <span>Analizando conversación y generando ticket…</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground/80">
                    IA en curso — suele tardar pocos segundos
                  </div>
                </div>
                <style jsx>{`
                  .sparkle {
                    position: absolute;
                    opacity: 0.6;
                    filter: blur(0.2px);
                  }
                  .sparkle::after {
                    content: "✦";
                    font-size: 18px;
                    color: #8b5cf6;
                  }
                  .sparkle.s1 {
                    top: 16%;
                    left: 22%;
                    animation: float1 6s ease-in-out infinite;
                  }
                  .sparkle.s2 {
                    top: 68%;
                    left: 14%;
                    animation: float2 7s ease-in-out infinite;
                  }
                  .sparkle.s3 {
                    top: 28%;
                    right: 18%;
                    animation: float3 8s ease-in-out infinite;
                  }
                  .sparkle.s4 {
                    bottom: 12%;
                    right: 26%;
                    animation: float4 5.5s ease-in-out infinite;
                  }
                  @keyframes float1 {
                    0% {
                      transform: translateY(0);
                    }
                    50% {
                      transform: translateY(-8px);
                    }
                    100% {
                      transform: translateY(0);
                    }
                  }
                  @keyframes float2 {
                    0% {
                      transform: translateX(0);
                    }
                    50% {
                      transform: translateX(10px);
                    }
                    100% {
                      transform: translateX(0);
                    }
                  }
                  @keyframes float3 {
                    0% {
                      transform: translate(0, 0);
                    }
                    50% {
                      transform: translate(-10px, 6px);
                    }
                    100% {
                      transform: translate(0, 0);
                    }
                  }
                  @keyframes float4 {
                    0% {
                      transform: translate(0, 0);
                    }
                    50% {
                      transform: translate(8px, -6px);
                    }
                    100% {
                      transform: translate(0, 0);
                    }
                  }
                  :global(.animate-spin-slow) {
                    animation: spin 3.5s linear infinite;
                  }
                `}</style>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {actionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
            {data && (
              <div className="space-y-4">
                {/* Toggle Formulario / Vista previa */}
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">
                    Generador de ticket
                  </div>
                  <div className="inline-flex items-center rounded-md border bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setMode("form")}
                      className={`px-3 py-1.5 text-xs ${
                        mode === "form"
                          ? "bg-violet-600 text-white"
                          : "hover:bg-gray-50"
                      }`}
                      title="Editar campos"
                    >
                      Formulario
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("preview")}
                      className={`px-3 py-1.5 text-xs border-l ${
                        mode === "preview"
                          ? "bg-violet-600 text-white"
                          : "hover:bg-gray-50"
                      }`}
                      title="Vista previa del ticket"
                    >
                      Vista previa
                    </button>
                  </div>
                </div>

                {mode === "form" ? (
                  <>
                    {/* Bloque de formulario + sugerencia + adjuntos (igual que antes) */}
                    {/* BEGIN form block */}
                    <div className="space-y-3 rounded-lg border bg-white dark:bg-zinc-900 p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">
                          Datos del ticket
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            if (!data) return;
                            const p = data.parsed || {};
                            const c = data.content || "";
                            setTitulo(
                              p.titulo ||
                                readFieldFromContent(
                                  c,
                                  "Título (obligatorio)"
                                ) ||
                                titulo
                            );
                            setDescripcion(
                              p.descripcion ||
                                readFieldFromContent(c, "Descripción") ||
                                descripcion
                            );
                            setPrioridad(
                              (
                                p.prioridad ||
                                readFieldFromContent(c, "Prioridad") ||
                                prioridad
                              ).trim()
                            );
                            setCategoria(
                              p.categoria ||
                                readFieldFromContent(c, "Categoría") ||
                                categoria
                            );
                            setTipo(
                              (
                                data.tipo ||
                                readFieldFromContent(c, "Tipo de ticket") ||
                                tipo
                              ).trim()
                            );
                            setAlumno(
                              (p as any).alumno ||
                                readFieldFromContent(c, "Alumno") ||
                                readFieldFromContent(
                                  c,
                                  "Nombre de cliente asignado"
                                ) ||
                                alumno
                            );
                            setArea(
                              (p as any).area ||
                                readFieldFromContent(c, "Área") ||
                                area
                            );
                            setCoachNombre(
                              (p as any).coachNombre ||
                                readFieldFromContent(
                                  c,
                                  "Nombre de coach asignado"
                                ) ||
                                coachNombre
                            );
                            setRecomendacion(
                              (p as any).recomendacion ||
                                readFieldFromContent(
                                  c,
                                  "Recomendación o siguiente paso"
                                ) ||
                                readFieldFromContent(c, "Recomendación") ||
                                readFieldFromContent(c, "Siguiente paso") ||
                                recomendacion
                            );
                            // Links (IA)
                            {
                              const lt =
                                (p as any).links ||
                                readFieldFromContent(c, "Links") ||
                                "";
                              setLinks(parseLinks(lt));
                            }
                          }}
                          title="Rellenar desde la sugerencia de IA"
                        >
                          <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Rellenar
                          desde IA
                        </Button>
                      </div>
                      <div>
                        <Label htmlFor="titulo">Título</Label>
                        <Input
                          id="titulo"
                          value={titulo}
                          onChange={(e) => setTitulo(e.target.value)}
                          placeholder="Título del ticket"
                        />
                      </div>
                      <div>
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea
                          id="descripcion"
                          value={descripcion}
                          onChange={(e) => setDescripcion(e.target.value)}
                          rows={5}
                          placeholder="Describe el problema o solicitud"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="alumno">Alumno</Label>
                          <Input
                            id="alumno"
                            value={alumno}
                            onChange={(e) => setAlumno(e.target.value)}
                            placeholder="Nombre del alumno"
                          />
                        </div>
                        <div>
                          <Label htmlFor="area">Área</Label>
                          <Select
                            value={areaKey}
                            onValueChange={(v) => setAreaKey(v)}
                          >
                            <SelectTrigger id="area">
                              <SelectValue
                                placeholder={
                                  areasLoading
                                    ? "Cargando…"
                                    : "Selecciona un área"
                                }
                              >
                                {areaOptions.find((o) => o.key === areaKey)
                                  ?.value ||
                                  area ||
                                  (areasLoading
                                    ? "Cargando…"
                                    : "Selecciona un área")}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {areaOptions.map((op) => (
                                <SelectItem key={op.id} value={op.key}>
                                  {op.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Prioridad</Label>
                          <Select
                            value={prioridad}
                            onValueChange={setPrioridad}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona prioridad" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Alta">Alta</SelectItem>
                              <SelectItem value="Media">Media</SelectItem>
                              <SelectItem value="Baja">Baja</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="coachNombre">Nombre coach</Label>
                          <Input
                            id="coachNombre"
                            value={coachNombre}
                            onChange={(e) => setCoachNombre(e.target.value)}
                            placeholder="Nombre y apellido"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="recomendacion">
                          Recomendación o siguiente paso
                        </Label>
                        <Textarea
                          id="recomendacion"
                          value={recomendacion}
                          onChange={(e) => setRecomendacion(e.target.value)}
                          rows={3}
                          placeholder="Sugerencia o siguiente paso propuesto por la IA"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg border bg-white dark:bg-zinc-900 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm">
                            Sugerencia de Ticket
                          </h3>
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5" /> IA
                          </span>
                        </div>
                        <ScrollArea className="h-72 pr-3">
                          {data.parsed?.html ? (
                            <>
                              <div
                                className="prose prose-sm dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{
                                  __html: data.parsed.html,
                                }}
                              />
                              {links.length > 0 && (
                                <div className="pt-2">
                                  <span className="font-semibold text-sm">
                                    Links:
                                  </span>
                                  <div className="flex flex-col gap-1 mt-1">
                                    {links.map((u, i) => (
                                      <a
                                        key={i}
                                        href={normalizeUrl(u)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sky-600 dark:text-sky-400 underline break-all text-sm"
                                      >
                                        {u}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="font-semibold">Título:</span>{" "}
                                {titulo || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Descripción:
                                </span>{" "}
                                {descripcion || "—"}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {prioridad && (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${
                                      prioridad === "Alta"
                                        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 text-rose-700 dark:text-rose-300"
                                        : prioridad === "Media"
                                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 text-amber-700 dark:text-amber-300"
                                        : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 text-emerald-700 dark:text-emerald-300"
                                    }`}
                                  >
                                    Prioridad: {prioridad}
                                  </span>
                                )}
                                {categoria && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border bg-sky-50 dark:bg-sky-900/20 border-sky-200 text-sky-700 dark:text-sky-300">
                                    Categoría: {categoria}
                                  </span>
                                )}
                                {tipo && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-700 dark:text-indigo-300">
                                    Tipo: {tipo}
                                  </span>
                                )}
                              </div>
                              {links.length > 0 && (
                                <div className="pt-1">
                                  <span className="font-semibold">Links:</span>
                                  <div className="flex flex-col gap-1 mt-1">
                                    {links.map((u, i) => (
                                      <a
                                        key={i}
                                        href={normalizeUrl(u)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sky-600 dark:text-sky-400 underline break-all"
                                      >
                                        {u}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2 pt-1 text-[13px]">
                                <div className="opacity-80">
                                  Alumno:{" "}
                                  <span className="font-medium">
                                    {alumno || "—"}
                                  </span>
                                </div>
                                <div className="opacity-80">
                                  Área:{" "}
                                  <span className="font-medium">
                                    {areaOptions.find((o) => o.key === areaKey)
                                      ?.value ||
                                      area ||
                                      "—"}
                                  </span>
                                </div>

                                <div className="opacity-80">
                                  Nombre coach:{" "}
                                  <span className="font-medium">
                                    {coachNombre || "—"}
                                  </span>
                                </div>
                                <div className="col-span-2 opacity-80">
                                  Recomendación:{" "}
                                  <span className="font-medium">
                                    {recomendacion || "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                      <div className="rounded-lg border bg-white dark:bg-zinc-900 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm">
                            Archivos adjuntos
                          </h3>
                          <span className="text-[11px] text-muted-foreground">
                            {normalizedAttachments.length} archivo(s)
                          </span>
                        </div>
                        {normalizedAttachments.length === 0 ? (
                          <div className="text-xs text-muted-foreground">
                            No hay adjuntos
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {normalizedAttachments.map((a) => {
                              const url = getAttachmentUrl(a);
                              const mime = resolveAttachmentMime(a);
                              if (isImage(mime)) {
                                return (
                                  <div
                                    key={a.id}
                                    className="rounded border overflow-hidden bg-white dark:bg-zinc-950"
                                  >
                                    <img
                                      src={url}
                                      alt={a.name}
                                      className="w-full h-auto object-cover"
                                    />
                                    <div
                                      className="px-2 py-1 text-[11px] truncate"
                                      title={a.name}
                                    >
                                      {a.name}
                                    </div>
                                  </div>
                                );
                              }
                              if (isVideo(mime)) {
                                return (
                                  <div
                                    key={a.id}
                                    className="rounded border overflow-hidden bg-white dark:bg-zinc-950"
                                  >
                                    <video
                                      src={url}
                                      controls
                                      className="w-full max-h-40"
                                    />
                                    <div
                                      className="px-2 py-1 text-[11px] truncate"
                                      title={a.name}
                                    >
                                      {a.name}
                                    </div>
                                  </div>
                                );
                              }
                              if (isAudio(mime)) {
                                return (
                                  <div
                                    key={a.id}
                                    className="rounded border overflow-hidden bg-white dark:bg-zinc-950 p-2"
                                  >
                                    <audio
                                      src={url}
                                      controls
                                      className="w-full"
                                    />
                                    <div
                                      className="px-1 pt-1 text-[11px] truncate"
                                      title={a.name}
                                    >
                                      {a.name}
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <a
                                  key={a.id}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded border bg-white dark:bg-zinc-950 p-2 text-xs underline break-words"
                                  title={a.name}
                                >
                                  {a.name}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* END form block */}
                  </>
                ) : (
                  <div className="rounded-lg border bg-white dark:bg-zinc-900 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">Vista previa</h3>
                      <span className="text-[11px] text-muted-foreground">
                        {normalizedAttachments.length} archivo(s)
                      </span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: simpleMarkdownToHtml(buildMarkdown()),
                        }}
                      />
                    </div>
                    {links.length > 0 && (
                      <div className="mb-3">
                        <div className="font-semibold text-xs">Links</div>
                        <div className="flex flex-col gap-1 mt-1">
                          {links.map((u, i) => (
                            <a
                              key={i}
                              href={normalizeUrl(u)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-600 dark:text-sky-400 underline break-all text-xs"
                            >
                              {u}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {normalizedAttachments.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-semibold text-xs">Adjuntos</div>
                        <div className="grid grid-cols-2 gap-2">
                          {normalizedAttachments.map((a) => {
                            const url = getAttachmentUrl(a);
                            const mime = resolveAttachmentMime(a);
                            if (isImage(mime)) {
                              return (
                                <div
                                  key={a.id}
                                  className="rounded border overflow-hidden bg-white dark:bg-zinc-950"
                                >
                                  <img
                                    src={url}
                                    alt={a.name}
                                    className="w-full h-auto object-cover"
                                  />
                                  <div
                                    className="px-2 py-1 text-[11px] truncate"
                                    title={a.name}
                                  >
                                    {a.name}
                                  </div>
                                </div>
                              );
                            }
                            if (isVideo(mime)) {
                              return (
                                <div
                                  key={a.id}
                                  className="rounded border overflow-hidden bg-white dark:bg-zinc-950"
                                >
                                  <video
                                    src={url}
                                    controls
                                    className="w-full max-h-40"
                                  />
                                  <div
                                    className="px-2 py-1 text-[11px] truncate"
                                    title={a.name}
                                  >
                                    {a.name}
                                  </div>
                                </div>
                              );
                            }
                            if (isAudio(mime)) {
                              return (
                                <div
                                  key={a.id}
                                  className="rounded border overflow-hidden bg-white dark:bg-zinc-950 p-2"
                                >
                                  <audio
                                    src={url}
                                    controls
                                    className="w-full"
                                  />
                                  <div
                                    className="px-1 pt-1 text-[11px] truncate"
                                    title={a.name}
                                  >
                                    {a.name}
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <a
                                key={a.id}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded border bg-white dark:bg-zinc-950 p-2 text-xs underline break-words"
                                title={a.name}
                              >
                                {a.name}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 border-t bg-white dark:bg-zinc-950">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                try {
                  setActionError(null);
                  if (!data) return;
                  // Determinar id del alumno (código)
                  const content = data.content || "";
                  let alumnoCode = readFieldFromContent(
                    content,
                    "Código de cliente asignado"
                  );
                  if (!alumnoCode) {
                    // fallback: intentar leer algún identificador alterno
                    alumnoCode =
                      readFieldFromContent(content, "ID cliente") ||
                      readFieldFromContent(content, "Código de cliente");
                  }
                  if (!alumnoCode) {
                    setActionError(
                      "No se encontró el código del alumno en la sugerencia."
                    );
                    return;
                  }
                  // Determinar tipo
                  let tipoToSend = (tipo || "").trim();
                  if (!tipoToSend) {
                    try {
                      const tipos = await getOpciones("tipo_ticket");
                      tipoToSend = tipos[0]?.key || "";
                    } catch {}
                  }
                  if (!tipoToSend) {
                    setActionError("No se encontró un tipo de ticket válido.");
                    return;
                  }

                  // Construir descripción: Área + Sugerencia + Siguiente paso + Links
                  const selectedAreaLabel =
                    areaOptions.find((x) => x.key === areaKey)?.value ||
                    area ||
                    "";
                  const descParts: string[] = [];
                  if (selectedAreaLabel)
                    descParts.push(`Área: ${selectedAreaLabel}`);
                  if (descripcion)
                    descParts.push(`Sugerencia de Ticket: ${descripcion}`);
                  if (recomendacion)
                    descParts.push(
                      `Recomendación o siguiente paso: ${recomendacion}`
                    );
                  if (links.length > 0)
                    descParts.push(`Links: ${links.join(", ")}`);
                  const finalDescripcion = descParts
                    .join("\n\n")
                    .slice(0, 4000);

                  // Preparar archivos a partir de adjuntos (descargar por URL si es posible)
                  const files: File[] = [];
                  try {
                    for (const a of normalizedAttachments) {
                      const url = getAttachmentUrl(a);
                      if (!url) continue;
                      const mime =
                        resolveAttachmentMime(a) || "application/octet-stream";
                      const res = await fetch(url);
                      if (!res.ok) continue;
                      const blob = await res.blob();
                      const file = new File([blob], a.name || "adjunto", {
                        type: mime,
                      });
                      files.push(file);
                    }
                  } catch {}

                  setFlowStage("creating");
                  // Pequeño delay para mostrar el estado "creando"
                  await new Promise((r) => setTimeout(r, 350));

                  const created = await createTicket({
                    nombre: (titulo || "Ticket IA").slice(0, 120),
                    id_alumno: alumnoCode,
                    tipo: tipoToSend,
                    descripcion: finalDescripcion,
                    archivos: files,
                    urls: links,
                  });
                  const payload = created?.data ?? created;

                  // Intentar asignar estado por defecto
                  try {
                    const estados = await getOpciones("estado_tickets");
                    const prefer = ["PENDIENTE", "EN_PROGRESO"];
                    let chosen = estados.find((e) =>
                      prefer.includes(e.key)
                    )?.key;
                    if (!chosen) chosen = estados[0]?.key || undefined;
                    const codigo = payload?.codigo
                      ? String(payload.codigo)
                      : undefined;
                    if (codigo && chosen)
                      await updateTicket(codigo, { estado: chosen });
                  } catch {}

                  setFlowStage("created");
                  // Mostrar confirmación un instante
                  await new Promise((r) => setTimeout(r, 900));
                  onConfirm({
                    ...data,
                    tipo: tipoToSend,
                    content: buildMarkdown(),
                  });
                } catch (e: any) {
                  setActionError(
                    String(e?.message || e || "Error creando ticket")
                  );
                  setFlowStage("idle");
                }
              }}
              disabled={!data || loading || flowStage !== "idle"}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Wand2 className="h-4 w-4" />
              Confirmar y Crear Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
      {/* Overlay de proceso de creación */}
      <Dialog
        open={flowStage !== "idle"}
        onOpenChange={(o) => {
          if (!o) {
            setFlowStage("idle");
            onOpenChange(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px] p-6">
          {flowStage === "creating" ? (
            <div className="flex items-center gap-3">
              <Spinner className="h-5 w-5 text-violet-600" />
              <div>
                <div className="font-medium">Creando ticket…</div>
                <div className="text-sm text-muted-foreground">
                  Un momento, por favor.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="font-medium">Ticket creado con éxito</div>
                <div className="text-sm text-muted-foreground">
                  {`Alumno: ${alumno || "(sin nombre)"}. Coach: ${
                    coachNombre || "(sin nombre)"
                  }.`}
                </div>
                <div className="pt-1">
                  <button
                    className="mt-2 inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                    onClick={() => {
                      setFlowStage("idle");
                      onOpenChange(false);
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
