"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import ChatRealtime from "@/components/chat/ChatRealtime";
import { dataService, type StudentItem } from "@/lib/data-service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  createTicket,
  getOpciones,
  type OpcionItem,
} from "../admin/alumnos/api";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-gray-400",
    "bg-gray-500",
    "bg-slate-400",
    "bg-slate-500",
    "bg-zinc-400",
    "bg-zinc-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export default function ChatHubPage() {
  const search = useSearchParams();
  const transport = (search?.get("transport") === "local" ? "local" : "ws") as
    | "local"
    | "ws";
  const debug = search?.get("debug") === "1";
  const [q, setQ] = useState("");
  const [all, setAll] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StudentItem | null>(null);
  // Modal creación de ticket desde selección del chat
  const [showTicket, setShowTicket] = useState(false);
  const [ticketNombre, setTicketNombre] = useState("");
  const [ticketTipo, setTicketTipo] = useState<string>("");
  const [ticketTipos, setTicketTipos] = useState<OpcionItem[]>([]);
  const [ticketArchivos, setTicketArchivos] = useState<File[]>([]);
  const alumnoCodeForTicketRef = useRef<string | null>(null);
  const filePickerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await dataService.getStudents({ pageSize: 500 });
        if (!alive) return;
        setAll(res.items ?? []);
      } catch {
        if (!alive) return;
        setAll([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const k = normalize(q);
    if (!k) return all;
    return all.filter((s) =>
      [s.name, s.code, s.stage, s.state]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(k)
    );
  }, [all, q]);

  // Detectar móvil para cambiar layout a maestro-detalle
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1024px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  // Escuchar evento del chat para crear ticket con selección
  useEffect(() => {
    const base64ToFile = (base64: string, name: string, mime: string): File => {
      try {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], {
          type: mime || "application/octet-stream",
        });
        return new File([blob], name || "archivo", {
          type: mime || "application/octet-stream",
        });
      } catch {
        // fallback vacío
        return new File([new Blob([])], name || "archivo", {
          type: mime || "application/octet-stream",
        });
      }
    };

    const handler = async (ev: Event) => {
      const detail = (ev as CustomEvent).detail as
        | { room: string; selected: any[] }
        | undefined;
      if (!detail) return;
      const room = (detail.room || "").toLowerCase();
      const alumno = all.find((s) => (s.code || "").toLowerCase() === room);
      const alumnoCode = alumno?.code || room;
      alumnoCodeForTicketRef.current = alumnoCode || null;

      // Recopilar adjuntos de los mensajes seleccionados (máx 10)
      const files: File[] = [];
      for (const m of detail.selected || []) {
        const atts = Array.isArray(m.attachments) ? m.attachments : [];
        for (const a of atts) {
          if (files.length >= 10) break;
          if (!a?.data_base64) continue;
          const f = base64ToFile(
            String(a.data_base64),
            String(a.name || "archivo"),
            String(a.mime || "application/octet-stream")
          );
          files.push(f);
        }
        if (files.length >= 10) break;
      }

      // Nombre por defecto desde primer mensaje con texto
      const firstWithText = (detail.selected || []).find((m) =>
        (m?.text || "").trim()
      );
      const nombre = (firstWithText?.text || "Ticket desde chat").slice(0, 80);

      try {
        const opciones = await getOpciones("tipo_ticket");
        setTicketTipos(opciones);
        // preseleccionar primera opción si existe
        setTicketTipo(opciones[0]?.key || "");
      } catch {
        setTicketTipos([]);
        setTicketTipo("");
      }

      setTicketArchivos(files);
      setTicketNombre(nombre);
      setShowTicket(true);
    };

    window.addEventListener("chat:create-ticket", handler as EventListener);
    return () =>
      window.removeEventListener(
        "chat:create-ticket",
        handler as EventListener
      );
  }, [all]);

  async function submitTicketFromChat() {
    const alumnoCode = alumnoCodeForTicketRef.current;
    if (!alumnoCode) {
      toast({ title: "Alumno no encontrado" });
      return;
    }
    if (!ticketNombre.trim()) {
      toast({ title: "Agrega un nombre al ticket" });
      return;
    }
    if (!ticketTipo) {
      toast({ title: "Selecciona un tipo de ticket" });
      return;
    }
    try {
      await createTicket({
        nombre: ticketNombre.trim(),
        id_alumno: alumnoCode,
        tipo: ticketTipo,
        archivos: ticketArchivos,
      });
      toast({ title: "Ticket creado" });
      setShowTicket(false);
      setTicketArchivos([]);
      setTicketNombre("");
      setTicketTipo("");
    } catch (e: any) {
      toast({
        title: "No se pudo crear el ticket",
        description: String(e?.message || e || ""),
      });
    }
  }

  function onAddFilesFromPicker(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const max = 10;
    const next = [...ticketArchivos];
    for (const f of Array.from(list)) {
      if (next.length >= max) break;
      next.push(f);
    }
    setTicketArchivos(next);
    e.target.value = "";
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="flex flex-col flex-1 min-h-0">
          {/* Contenedor full-bleed para aprovechar todo el espacio disponible */}
          <div className="flex flex-1 overflow-hidden -m-6 sm:-m-6">
            {/* Sidebar de alumnos */}
            <div
              className={`${
                isMobile ? (selected ? "hidden" : "block") : "block"
              } w-full lg:w-96 border-r bg-card flex flex-col min-w-0`}
            >
              <div className="p-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar alumnos..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Cargando conversaciones...
                  </div>
                )}
                {!loading && filtered.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No se encontraron alumnos
                  </div>
                )}
                {filtered.map((s) => {
                  const hasCode = !!(s.code && s.code.trim());
                  const isSelected = selected?.id === s.id;

                  return (
                    <button
                      key={s.id}
                      onClick={() => hasCode && setSelected(s)}
                      disabled={!hasCode}
                      className={`w-full text-left px-4 py-3 transition-colors border-b border-border/50 last:border-b-0 ${
                        hasCode
                          ? "hover:bg-muted/50 cursor-pointer active:bg-muted"
                          : "opacity-50 cursor-not-allowed"
                      } ${isSelected ? "bg-muted" : "bg-transparent"}`}
                      title={
                        hasCode ? "Abrir chat" : "Este alumno no tiene código"
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarFallback
                            className={`${getAvatarColor(
                              s.name
                            )} text-white font-medium`}
                          >
                            {getInitials(s.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-0.5">
                            <h3 className="font-semibold text-sm truncate text-foreground">
                              {s.name}
                            </h3>
                            {hasCode && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {s.stage || ""}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs truncate ${
                              hasCode
                                ? "text-muted-foreground"
                                : "text-amber-600 font-medium"
                            }`}
                          >
                            {hasCode
                              ? `Código: ${s.code}`
                              : "Sin código asignado"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panel de conversación */}
            <div
              className={`flex-1 flex flex-col bg-background min-h-0 ${
                isMobile ? (selected ? "block" : "hidden") : "block"
              }`}
            >
              {selected ? (
                !selected.code || !selected.code.trim() ? (
                  <div className="flex items-center justify-center h-full p-6">
                    <div className="rounded-xl border bg-card p-6 text-sm text-amber-700 shadow-sm max-w-md">
                      Este alumno no tiene un código asignado. No se puede
                      iniciar el chat.
                    </div>
                  </div>
                ) : (
                  <ChatRealtime
                    room={(selected.code || String(selected.id)).toLowerCase()}
                    role="admin"
                    title={selected.name}
                    subtitle={`${selected.code ?? ""}`}
                    variant="fullscreen"
                    className="h-full"
                    transport={transport}
                    showRoleSwitch={debug}
                    onBack={isMobile ? () => setSelected(null) : undefined}
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full p-12">
                  <div className="max-w-sm mx-auto space-y-2 text-center">
                    <h3 className="font-medium text-foreground">
                      Selecciona una conversación
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Elige un alumno de la lista para iniciar el chat
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
      {/* Modal Crear Ticket desde chat */}
      <Dialog open={showTicket} onOpenChange={setShowTicket}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear ticket desde chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={ticketNombre}
                onChange={(e) => setTicketNombre(e.target.value)}
                placeholder="Asunto del ticket"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={ticketTipo} onValueChange={setTicketTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ticketTipos.map((op) => (
                    <SelectItem key={op.id} value={op.key}>
                      {op.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Archivos ({ticketArchivos.length}/10)</Label>
              {ticketArchivos.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No hay archivos seleccionados
                </p>
              ) : (
                <ul className="max-h-40 overflow-y-auto text-sm list-disc pl-5 space-y-1">
                  {ticketArchivos.map((f, idx) => (
                    <li
                      key={`${f.name}-${idx}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span
                        className="truncate"
                        title={`${f.name} • ${(f.size / 1024).toFixed(1)} KB`}
                      >
                        {f.name}
                      </span>
                      <button
                        className="text-xs text-red-600 hover:underline"
                        onClick={() =>
                          setTicketArchivos((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        type="button"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => filePickerRef.current?.click()}
                >
                  Añadir archivos
                </Button>
                <input
                  ref={filePickerRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onAddFilesFromPicker}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTicket(false)}
              type="button"
            >
              Cancelar
            </Button>
            <Button onClick={submitTicketFromChat} type="button">
              Crear ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
