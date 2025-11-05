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
import { AlertCircle, Sparkles, Wand2, RefreshCcw } from "lucide-react";
import { TicketData, Attachment } from "./chat-types";
import {
  getAttachmentUrl,
  resolveAttachmentMime,
  isImage,
  isVideo,
  isAudio,
} from "./chat-attachments";
import { simpleMarkdownToHtml } from "./chat-utils";

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
  const [coachCodigo, setCoachCodigo] = React.useState("");
  const [coachNombre, setCoachNombre] = React.useState("");
  const [recomendacion, setRecomendacion] = React.useState("");

  // Intenta leer un valor del contenido markdown con formato **Campo:** valor
  const readFieldFromContent = React.useCallback(
    (content: string, field: string) => {
      try {
        const re = new RegExp(`\n?\*\*${field}\s*:\*\*\s*(.+?)(?:\n|$)`, "i");
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
      parsed.categoria || readFieldFromContent(content, "Categoría") || ""
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
        data.nombre ||
        ""
    );
    setArea(
      (parsed as any).area || readFieldFromContent(content, "Área") || ""
    );
    const codigoCoach =
      (parsed as any).coachCodigo ||
      readFieldFromContent(content, "Código de coach asignado") ||
      "";
    setCoachCodigo(codigoCoach);
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
  }, [data, readFieldFromContent]);

  const buildMarkdown = React.useCallback(() => {
    const lines: string[] = [];
    if (titulo) lines.push(`**Título (obligatorio):** ${titulo}`);
    if (descripcion) lines.push(`**Descripción:** ${descripcion}`);
    if (alumno) lines.push(`**Alumno:** ${alumno}`);
    if (area) lines.push(`**Área:** ${area}`);
    if (prioridad) lines.push(`**Prioridad:** ${prioridad}`);
    if (categoria) lines.push(`**Categoría:** ${categoria}`);
    if (tipo) lines.push(`**Tipo de ticket:** ${tipo}`);
    if (coachCodigo || coachNombre) {
      lines.push(`**Código de coach asignado:** ${coachCodigo || "N/A"}`);
      if (coachNombre)
        lines.push(`**Nombre de coach asignado:** ${coachNombre}`);
    }
    if (recomendacion)
      lines.push(`**Recomendación o siguiente paso:** ${recomendacion}`);
    return lines.join("  \\n");
  }, [
    titulo,
    descripcion,
    alumno,
    area,
    prioridad,
    categoria,
    tipo,
    coachCodigo,
    coachNombre,
    recomendacion,
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
          {data && (
            <div className="space-y-4">
              {/* Toggle Formulario / Vista previa */}
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Generador de ticket</div>
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
                              readFieldFromContent(c, "Título (obligatorio)") ||
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
                              alumno
                          );
                          setArea(
                            (p as any).area ||
                              readFieldFromContent(c, "Área") ||
                              area
                          );
                          setCoachCodigo(
                            (p as any).coachCodigo ||
                              readFieldFromContent(
                                c,
                                "Código de coach asignado"
                              ) ||
                              coachCodigo
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
                        <Input
                          id="area"
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                          placeholder="Ej. Copy, Ads, Funnel"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Prioridad</Label>
                        <Select value={prioridad} onValueChange={setPrioridad}>
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
                      <div>
                        <Label htmlFor="categoria">Categoría</Label>
                        <Input
                          id="categoria"
                          value={categoria}
                          onChange={(e) => setCategoria(e.target.value)}
                          placeholder="Ej. Solicitud de información"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="tipo">Tipo de ticket</Label>
                        <Input
                          id="tipo"
                          value={tipo}
                          onChange={(e) => setTipo(e.target.value)}
                          placeholder="Ej. Duda de Copy"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="coachCodigo">Código coach</Label>
                          <Input
                            id="coachCodigo"
                            value={coachCodigo}
                            onChange={(e) => setCoachCodigo(e.target.value)}
                            placeholder="Ej. C-123"
                          />
                        </div>
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
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: data.parsed.html,
                            }}
                          />
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
                                  {area || "—"}
                                </span>
                              </div>
                              <div className="opacity-80">
                                Código coach:{" "}
                                <span className="font-medium">
                                  {coachCodigo || "N/A"}
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
                                <audio src={url} controls className="w-full" />
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
            onClick={() => {
              if (!data) return;
              const next: TicketData = {
                ...data,
                tipo,
                content: buildMarkdown(),
              };
              onConfirm(next);
            }}
            disabled={!data || loading}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Wand2 className="h-4 w-4" />
            Confirmar y Crear Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
