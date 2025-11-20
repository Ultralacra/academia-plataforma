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
  Paperclip,
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
  type OpcionItem,
} from "@/app/admin/alumnos/api";
import { attachTicketFilesByIds } from "@/app/admin/alumnos/api";

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
        // Soporta contenido multilínea hasta el siguiente campo (**Campo2:) o fin de texto
        const re = new RegExp(
          String.raw`\*\*${field}\s*:\*\*\s*([\s\S]+?)(?=\r?\n\*\*|$)`,
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
        // Mapear área sugerida: usar `area` si viene de IA; si no, intentar con `tipo`
        let candidate = String(area || "").trim();
        if (!candidate && tipo) candidate = String(tipo).trim();
        if (candidate) {
          const aim = normalize(candidate);
          const match = ops.find(
            (o) => normalize(o.key) === aim || normalize(o.value) === aim
          );
          if (match) setAreaKey(match.key);
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
  }, [open, area, tipo, normalize, areaKey]);

  // ¿El tipo coincide con alguna opción de Área? Si no, se oculta en la sugerencia.
  const tipoMatchesArea = React.useMemo(() => {
    const v = String(tipo || "").trim();
    if (!v) return false;
    const aim = normalize(v);
    return areaOptions.some(
      (o) => normalize(o.key) === aim || normalize(o.value) === aim
    );
  }, [tipo, areaOptions, normalize]);

  const buildMarkdown = React.useCallback(() => {
    const lines: string[] = [];
    if (titulo) lines.push(`**Título (obligatorio):** ${titulo}`);
    if (descripcion) lines.push(`**Descripción:** ${descripcion}`);
    if (alumno) lines.push(`**Alumno:** ${alumno}`);
    {
      const selectedLabel =
        areaOptions.find((x) => x.key === areaKey)?.value || "";
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
      {flowStage === "idle" ? (
        <DialogContent className="sm:max-w-[1100px] max-h-[95vh] h-[90vh] p-0 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-2xl">
          {/* HEADER */}
          <DialogHeader className="px-6 py-4 border-b bg-white dark:bg-zinc-900 flex-shrink-0 z-10">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-zinc-800 dark:text-zinc-100">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/20">
                  <Wand2 className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span>Generar Ticket con IA</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Revisa el análisis y confirma los datos
                  </span>
                </div>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-violet-600"
                  onClick={() => {
                    if (!data) return;
                    // Lógica de restauración (mismo código que tenías, simplificado visualmente)
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
                        readFieldFromContent(c, "Nombre de cliente asignado") ||
                        alumno
                    );
                    setArea(
                      (p as any).area || readFieldFromContent(c, "Área") || area
                    );
                    setCoachNombre(
                      (p as any).coachNombre ||
                        readFieldFromContent(c, "Nombre de coach asignado") ||
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
                    const lt =
                      (p as any).links ||
                      readFieldFromContent(c, "Links") ||
                      "";
                    setLinks(parseLinks(lt));
                  }}
                >
                  <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                  Restaurar valores originales
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* BODY: SPLIT VIEW */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* LOADING STATE */}
            {loading && (
              <div className="absolute inset-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="relative grid place-items-center w-full max-w-md h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-950/30 dark:via-zinc-900 dark:to-indigo-950/30 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="sparkle s1" />
                    <div className="sparkle s2" />
                    <div className="sparkle s3" />
                    <div className="sparkle s4" />
                  </div>
                  <div className="flex flex-col items-center gap-4 relative z-10">
                    <div className="relative">
                      <span className="absolute -top-2 -right-2 text-yellow-500 animate-ping">
                        ✦
                      </span>
                      <span className="absolute -bottom-2 -left-2 text-pink-500 animate-pulse">
                        ✧
                      </span>
                      <div className="h-14 w-14 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600 text-white grid place-items-center shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30">
                        <Sparkles className="h-7 w-7 animate-spin-slow" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <h3 className="font-medium text-lg text-zinc-900 dark:text-zinc-100">
                        Analizando conversación
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Generando sugerencias y detectando archivos...
                      </p>
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
              </div>
            )}

            {/* ERROR STATE */}
            {error && (
              <div className="p-6 w-full">
                <Alert
                  variant="destructive"
                  className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error en el análisis</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {data && !loading && (
              <>
                {/* LEFT COLUMN: AI CONTEXT (READ ONLY) */}
                <div className="flex-1 lg:w-5/12 lg:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col min-h-0">
                  <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Análisis de IA
                    </span>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                      {/* AI Summary HTML */}
                      <div className="prose prose-sm dark:prose-invert max-w-none bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm break-words [&_*]:text-xs [&_pre]:whitespace-pre-wrap [&_pre]:break-all">
                        {data.parsed?.html ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: data.parsed.html,
                            }}
                          />
                        ) : (
                          <p className="text-zinc-500 italic">
                            Sin resumen HTML disponible.
                          </p>
                        )}
                      </div>

                      {/* Links Detected */}
                      {links.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Links Detectados
                          </h4>
                          <div className="grid gap-2">
                            {links.map((u, i) => (
                              <a
                                key={i}
                                href={normalizeUrl(u)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-violet-300 transition-colors group"
                              >
                                <div className="h-8 w-8 rounded-md bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-600 flex-shrink-0">
                                  <span className="text-xs font-bold">URL</span>
                                </div>
                                <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate flex-1 group-hover:text-violet-600">
                                  {u}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Attachments Detected */}
                      {normalizedAttachments.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Adjuntos ({normalizedAttachments.length})
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {normalizedAttachments.map((a) => {
                              const url = getAttachmentUrl(a);
                              const mime = resolveAttachmentMime(a);
                              const isImg = isImage(mime);
                              return (
                                <a
                                  key={a.id}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group flex items-center gap-3 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-violet-300 transition-all hover:shadow-sm"
                                >
                                  <div className="h-10 w-10 flex-shrink-0 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
                                    {isImg ? (
                                      <img
                                        src={url}
                                        alt={a.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Paperclip className="h-4 w-4 text-zinc-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate"
                                      title={a.name}
                                    >
                                      {a.name}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">
                                      {isImg ? "Imagen" : "Archivo"}
                                    </div>
                                  </div>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: EDIT FORM */}
                <div className="flex-1 lg:w-7/12 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
                  <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                      Editar Ticket Final
                    </span>
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-5 max-w-3xl mx-auto">
                      {/* Título */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="titulo"
                          className="text-xs font-medium text-zinc-500 uppercase"
                        >
                          Título del Ticket
                        </Label>
                        <Input
                          id="titulo"
                          value={titulo}
                          onChange={(e) => setTitulo(e.target.value)}
                          className="font-medium text-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-violet-500 h-11"
                          placeholder="Ej: Error en acceso a plataforma"
                        />
                      </div>

                      {/* Grid de Metadatos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="alumno"
                            className="text-xs font-medium text-zinc-500 uppercase"
                          >
                            Alumno / Cliente
                          </Label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-4 h-4"
                              >
                                <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                              </svg>
                            </div>
                            <Input
                              id="alumno"
                              value={alumno}
                              onChange={(e) => setAlumno(e.target.value)}
                              className="pl-9 border-zinc-200 dark:border-zinc-800"
                              placeholder="Nombre del alumno"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor="coach"
                            className="text-xs font-medium text-zinc-500 uppercase"
                          >
                            Coach Asignado
                          </Label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-4 h-4"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <Input
                              id="coach"
                              value={coachNombre}
                              onChange={(e) => setCoachNombre(e.target.value)}
                              className="pl-9 border-zinc-200 dark:border-zinc-800"
                              placeholder="Nombre del coach"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-zinc-500 uppercase">
                            Área
                          </Label>
                          <Select value={areaKey} onValueChange={setAreaKey}>
                            <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                              <SelectValue placeholder="Seleccionar..." />
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

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-zinc-500 uppercase">
                            Prioridad
                          </Label>
                          <Select
                            value={prioridad}
                            onValueChange={setPrioridad}
                          >
                            <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="Alta"
                                className="text-rose-600 font-medium"
                              >
                                Alta 🔥
                              </SelectItem>
                              <SelectItem
                                value="Media"
                                className="text-amber-600 font-medium"
                              >
                                Media ⚠️
                              </SelectItem>
                              <SelectItem
                                value="Baja"
                                className="text-emerald-600 font-medium"
                              >
                                Baja 🟢
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-zinc-500 uppercase">
                            Tipo
                          </Label>
                          <Input
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                            placeholder="Tipo de ticket"
                          />
                        </div>
                      </div>

                      {/* Descripción */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="descripcion"
                          className="text-xs font-medium text-zinc-500 uppercase"
                        >
                          Descripción Detallada
                        </Label>
                        <Textarea
                          id="descripcion"
                          value={descripcion}
                          onChange={(e) => setDescripcion(e.target.value)}
                          rows={6}
                          className="resize-none bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-violet-500"
                          placeholder="Describe el problema o solicitud..."
                        />
                      </div>

                      {/* Recomendación */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="recomendacion"
                          className="text-xs font-medium text-zinc-500 uppercase"
                        >
                          Recomendación / Siguiente Paso
                        </Label>
                        <div className="relative">
                          <div className="absolute top-3 left-3 text-violet-500">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <Textarea
                            id="recomendacion"
                            value={recomendacion}
                            onChange={(e) => setRecomendacion(e.target.value)}
                            rows={3}
                            className="pl-9 resize-none bg-violet-50/30 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/30 focus-visible:ring-violet-500"
                            placeholder="Sugerencia de la IA..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* FOOTER */}
          <DialogFooter className="px-6 py-4 border-t bg-white dark:bg-zinc-900 flex-shrink-0 z-10">
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-muted-foreground">
                {data && !loading && (
                  <span>
                    Se crearán <strong>{links.length} links</strong> y{" "}
                    <strong>{normalizedAttachments.length} adjuntos</strong>.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-zinc-200 dark:border-zinc-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      setActionError(null);
                      if (!data) return;
                      const content = data.content || "";
                      let alumnoCode = readFieldFromContent(
                        content,
                        "Código de cliente asignado"
                      );
                      if (!alumnoCode) {
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
                      let tipoToSend = (tipo || "").trim();
                      if (!tipoToSend) {
                        try {
                          const tipos = await getOpciones("tipo_ticket");
                          tipoToSend = tipos[0]?.key || "";
                        } catch {}
                      }
                      if (!tipoToSend) {
                        setActionError(
                          "No se encontró un tipo de ticket válido."
                        );
                        return;
                      }
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

                      const rawArch = Array.isArray(
                        (data as any)?.archivos_cargados
                      )
                        ? (data as any).archivos_cargados
                        : [];
                      const idsFromAi: string[] = Array.from(
                        new Set(
                          rawArch
                            .map(
                              (x: any) =>
                                x?.id_mensaje ||
                                x?.id ||
                                x?._id ||
                                x?.codigo ||
                                x?.code
                            )
                            .filter(Boolean)
                            .map((s: any) => String(s))
                        )
                      );

                      const files: File[] = [];
                      if (idsFromAi.length === 0) {
                        try {
                          for (const a of normalizedAttachments) {
                            const url = getAttachmentUrl(a);
                            if (!url) continue;
                            const mime =
                              resolveAttachmentMime(a) ||
                              "application/octet-stream";
                            const res = await fetch(url);
                            if (!res.ok) continue;
                            const blob = await res.blob();
                            const file = new File([blob], a.name || "adjunto", {
                              type: mime,
                            });
                            files.push(file);
                          }
                        } catch {}
                      }

                      setFlowStage("creating");
                      await new Promise((r) => setTimeout(r, 350));

                      const created = await createTicket({
                        nombre: (titulo || "Ticket IA").slice(0, 120),
                        id_alumno: alumnoCode,
                        tipo: tipoToSend,
                        descripcion: finalDescripcion,
                        archivos: files,
                        urls: links,
                        ai_run_id: (data as any)?.ai_run_id || undefined,
                        message_ids: Array.isArray((data as any)?.message_ids)
                          ? ((data as any).message_ids as any[]).map((s) =>
                              String(s)
                            )
                          : undefined,
                        file_ids: idsFromAi,
                      });
                      const payload = created?.data ?? created;

                      /*
                       * Bloque anterior para adjuntar archivos por IDs en segunda llamada.
                       * Ahora se envían file_ids directamente en createTicket.
                       */
                      /*
                      try {
                        const codigo = payload?.codigo
                          ? String(payload.codigo)
                          : undefined;
                        if (codigo && idsFromAi.length > 0) {
                          await attachTicketFilesByIds(codigo, idsFromAi);
                        }
                      } catch (err) {
                        console.warn("Adjunto por IDs falló:", err);
                      }
                      */

                      setFlowStage("created");
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
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 shadow-lg shadow-violet-200 dark:shadow-violet-900/20"
                >
                  <Wand2 className="h-4 w-4 mr-2" /> Confirmar y Crear
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      ) : (
        <DialogContent className="sm:max-w-[420px] p-8 border-none shadow-2xl bg-white dark:bg-zinc-900">
          {flowStage === "creating" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500 blur-xl opacity-20 animate-pulse" />
                <Spinner className="h-12 w-12 text-violet-600 relative z-10" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">Creando ticket...</div>
                <div className="text-sm text-muted-foreground">
                  Conectando con el CRM
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
                  ¡Ticket Creado!
                </h3>
                <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">
                  El ticket se ha registrado correctamente para{" "}
                  <strong>{alumno}</strong>.
                </p>
              </div>
              <Button
                className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setFlowStage("idle");
                  onOpenChange(false);
                }}
              >
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
