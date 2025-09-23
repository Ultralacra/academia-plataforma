"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import {
  MessageSquare,
  Clock,
  User,
  AlertCircle,
  Send,
  Paperclip,
  Eye,
  Trash2,
  Download,
  ImageIcon,
  FileText,
} from "lucide-react";

// ---------- Tipos locales ----------
type Student = {
  id: string;
  name: string;
  email: string;
  coachId: string;
  courseId: string;
  enrollmentDate: string;
  status: "active" | "suspended" | "completed" | "dropped";
  paymentPlan: "monthly" | "quarterly" | "full";
  nextPaymentDate: string;
  progress: number;
  contractSigned: boolean;
};

type TicketResponse = {
  id: string;
  authorId: string;
  authorRole: "coach" | "student" | "admin";
  message: string;
  createdAt: string;
};

type Attachment = {
  id: string;
  name: string;
  url: string; // data URL o URL pública
  mime: string;
  size: number;
};

type Ticket = {
  id: string;
  studentId: string;
  coachId: string;
  courseId: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  category: "technical" | "academic" | "payment" | "general";
  createdAt: string;
  updatedAt: string;
  responses: TicketResponse[];
  attachments?: Attachment[]; // evidencias del ticket
};

// ---------- Datos demo embebidos ----------
const DEMO_STUDENTS: Student[] = [
  {
    id: "1",
    name: "Ana García",
    email: "ana@example.com",
    coachId: "2",
    courseId: "1",
    enrollmentDate: "2024-01-15",
    status: "active",
    paymentPlan: "monthly",
    nextPaymentDate: "2024-12-15",
    progress: 75,
    contractSigned: true,
  },
  {
    id: "2",
    name: "Carlos López",
    email: "carlos@example.com",
    coachId: "2",
    courseId: "1",
    enrollmentDate: "2024-02-01",
    status: "active",
    paymentPlan: "quarterly",
    nextPaymentDate: "2024-12-01",
    progress: 60,
    contractSigned: true,
  },
  {
    id: "3",
    name: "María Rodríguez",
    email: "maria@example.com",
    coachId: "2",
    courseId: "2",
    enrollmentDate: "2024-03-10",
    status: "suspended",
    paymentPlan: "monthly",
    nextPaymentDate: "2024-11-10",
    progress: 45,
    contractSigned: true,
  },
];

const DEMO_TICKETS: Ticket[] = [
  {
    id: "1",
    studentId: "1",
    coachId: "2",
    courseId: "1",
    title: "Problema con acceso al módulo 3 - Marketing Digital",
    description:
      "No puedo acceder al contenido del módulo 3 del curso de Marketing Digital, me aparece un error cuando intento abrir las lecciones.",
    status: "open",
    priority: "medium",
    category: "technical",
    createdAt: "2024-12-01T10:00:00Z",
    updatedAt: "2024-12-01T10:00:00Z",
    responses: [],
    attachments: [
      {
        id: "att-1",
        name: "captura-error.png",
        url: "", // puedes dejar vacío; el usuario subirá nuevas evidencias
        mime: "image/png",
        size: 0,
      },
    ],
  },
  {
    id: "2",
    studentId: "2",
    coachId: "2",
    courseId: "1",
    title: "Consulta sobre tarea final - Estrategias de Contenido",
    description:
      "Tengo dudas sobre los requisitos de la tarea final del módulo 2 de Marketing Digital. ¿Podrías ayudarme?",
    status: "resolved",
    priority: "low",
    category: "academic",
    createdAt: "2024-11-28T14:30:00Z",
    updatedAt: "2024-11-29T09:15:00Z",
    responses: [
      {
        id: "r-1",
        authorId: "2",
        authorRole: "coach",
        message:
          "Los requisitos están en el documento adjunto al módulo 2. También puedes revisar los ejemplos que subí la semana pasada.",
        createdAt: "2024-11-29T09:15:00Z",
      },
    ],
    attachments: [],
  },
  {
    id: "3",
    studentId: "3",
    coachId: "2",
    courseId: "2",
    title: "Problema con el pago mensual",
    description:
      "Mi tarjeta fue rechazada y no puedo acceder al contenido del curso de Desarrollo Web. ¿Cómo puedo solucionarlo?",
    status: "in-progress",
    priority: "high",
    category: "payment",
    createdAt: "2024-12-02T16:45:00Z",
    updatedAt: "2024-12-02T17:30:00Z",
    responses: [
      {
        id: "r-2",
        authorId: "2",
        authorRole: "coach",
        message:
          "He escalado tu caso al equipo de pagos. Te contactarán en las próximas 24 horas para resolver el problema.",
        createdAt: "2024-12-02T17:30:00Z",
      },
    ],
    attachments: [],
  },
];

// ---------- Auxiliares UI ----------
const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

export function TicketManagement() {
  const { user } = useAuth(); // espera { id, role }
  const [students] = useState<Student[]>(DEMO_STUDENTS);
  const [tickets, setTickets] = useState<Ticket[]>(DEMO_TICKETS);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filtrar por coach
  const myTickets = useMemo(
    () =>
      tickets.filter((t) =>
        user?.role === "coach" ? t.coachId === user?.id : true
      ),
    [tickets, user]
  );

  const filteredTickets = useMemo(
    () =>
      myTickets.filter((t) =>
        statusFilter === "all" ? true : t.status === statusFilter
      ),
    [myTickets, statusFilter]
  );

  const getStudentName = (studentId: string) =>
    students.find((s) => s.id === studentId)?.name ?? "Estudiante";

  const getStatusBadge = (status: Ticket["status"]) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Abierto</Badge>;
      case "in-progress":
        return <Badge variant="default">En Progreso</Badge>;
      case "resolved":
        return <Badge variant="secondary">Resuelto</Badge>;
      case "closed":
        return <Badge variant="outline">Cerrado</Badge>;
    }
  };

  const getPriorityBadge = (priority: Ticket["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">Alta</Badge>;
      case "medium":
        return <Badge variant="default">Media</Badge>;
      case "low":
        return <Badge variant="secondary">Baja</Badge>;
    }
  };

  const getCategoryIcon = (category: Ticket["category"]) => {
    switch (category) {
      case "technical":
        return <AlertCircle className="h-4 w-4" />;
      case "academic":
        return <MessageSquare className="h-4 w-4" />;
      case "payment":
        return <Clock className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  // ---------- Acciones ----------
  const handleUpdateStatus = (
    ticketId: string,
    newStatus: Ticket["status"]
  ) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
          : t
      )
    );
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((t) =>
        t ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
      );
    }
  };

  const handleSendResponse = () => {
    if (!selectedTicket || !responseMessage.trim() || !user) return;
    const newResponse: TicketResponse = {
      id: crypto.randomUUID(),
      authorId: user.id,
      authorRole: "coach",
      message: responseMessage.trim(),
      createdAt: new Date().toISOString(),
    };
    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicket.id
          ? {
              ...t,
              responses: [...t.responses, newResponse],
              status: t.status === "open" ? "in-progress" : t.status,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
    setSelectedTicket((t) =>
      t
        ? {
            ...t,
            responses: [...t.responses, newResponse],
            status: t.status === "open" ? "in-progress" : t.status,
            updatedAt: new Date().toISOString(),
          }
        : t
    );
    setResponseMessage("");
  };

  const handleAddAttachments = async (files: FileList | null) => {
    if (!selectedTicket || !files || files.length === 0) return;
    const toDataUrl = (file: File) =>
      new Promise<Attachment>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve({
            id: crypto.randomUUID(),
            name: file.name,
            url: reader.result as string,
            mime: file.type,
            size: file.size,
          });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    const attachments = await Promise.all(Array.from(files).map(toDataUrl));

    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicket.id
          ? {
              ...t,
              attachments: [...(t.attachments ?? []), ...attachments],
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
    setSelectedTicket((t) =>
      t ? { ...t, attachments: [...(t.attachments ?? []), ...attachments] } : t
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAttachment = (ticketId: string, attachmentId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              attachments: (t.attachments ?? []).filter(
                (a) => a.id !== attachmentId
              ),
            }
          : t
      )
    );
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((t) =>
        t
          ? {
              ...t,
              attachments: (t.attachments ?? []).filter(
                (a) => a.id !== attachmentId
              ),
            }
          : t
      );
    }
  };

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tickets de Soporte</h2>
          <p className="text-muted-foreground">
            Gestiona las consultas de tus estudiantes
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="open">Abiertos</SelectItem>
            <SelectItem value="in-progress">En Progreso</SelectItem>
            <SelectItem value="resolved">Resueltos</SelectItem>
            <SelectItem value="closed">Cerrados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(ticket.category)}
                    <CardTitle className="text-lg">{ticket.title}</CardTitle>
                  </div>
                  <CardDescription className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {getStudentName(ticket.studentId)}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  {getStatusBadge(ticket.status)}
                  {getPriorityBadge(ticket.priority)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {ticket.description}
              </p>

              {/* Chips de categoría y respuestas */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {ticket.category === "technical" && "Técnico"}
                    {ticket.category === "academic" && "Académico"}
                    {ticket.category === "payment" && "Pago"}
                    {ticket.category === "general" && "General"}
                  </Badge>
                  <span>{ticket.responses.length} respuestas</span>
                </div>

                {/* Botón Detalle/Responder */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTicket(ticket)}
                      className="gap-1"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Detalle / Responder
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        {getCategoryIcon(ticket.category)}
                        {ticket.title}
                      </DialogTitle>
                      <DialogDescription>
                        Ticket de {getStudentName(ticket.studentId)} —{" "}
                        {ticket.category}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5">
                      {/* Info base */}
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm">{ticket.description}</p>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                          <span>
                            Creado:{" "}
                            <b>{new Date(ticket.createdAt).toLocaleString()}</b>
                          </span>
                          <span>
                            Actualizado:{" "}
                            <b>{new Date(ticket.updatedAt).toLocaleString()}</b>
                          </span>
                          <span>
                            Prioridad: <b className="ml-1">{ticket.priority}</b>
                          </span>
                        </div>
                      </div>

                      {/* Evidencias */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium flex items-center gap-2">
                            <Paperclip className="h-4 w-4" /> Evidencias
                            adjuntas
                          </h4>
                          <div className="flex items-center gap-3">
                            <Select
                              value={ticket.status}
                              onValueChange={(value: Ticket["status"]) =>
                                handleUpdateStatus(ticket.id, value)
                              }
                            >
                              <SelectTrigger className="w-44 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Abierto</SelectItem>
                                <SelectItem value="in-progress">
                                  En Progreso
                                </SelectItem>
                                <SelectItem value="resolved">
                                  Resuelto
                                </SelectItem>
                                <SelectItem value="closed">Cerrado</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              <Input
                                ref={fileInputRef}
                                id="evidencias"
                                type="file"
                                accept="image/*,.pdf,.doc,.docx,.txt"
                                multiple
                                className="h-8 file:mr-3 file:rounded file:border file:px-3 file:py-1 file:text-xs"
                                onChange={(e) =>
                                  handleAddAttachments(e.target.files)
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Galería / lista de adjuntos */}
                        <ScrollArea className="h-40 rounded-md border p-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {(ticket.attachments ?? []).length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                Sin evidencias aún.
                              </p>
                            )}

                            {(ticket.attachments ?? []).map((att) => {
                              const isImage = att.mime?.startsWith("image/");
                              return (
                                <div
                                  key={att.id}
                                  className="border rounded-lg p-2 flex flex-col gap-2 bg-card"
                                >
                                  <div className="flex items-center justify-between">
                                    <span
                                      className="text-xs truncate"
                                      title={att.name}
                                    >
                                      {att.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatBytes(att.size)}
                                    </span>
                                  </div>

                                  <div className="relative h-28 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                    {isImage ? (
                                      att.url ? (
                                        // mini preview
                                        <img
                                          src={att.url}
                                          alt={att.name}
                                          className="object-cover w-full h-full cursor-zoom-in"
                                          onClick={() =>
                                            setPreviewImage(att.url)
                                          }
                                        />
                                      ) : (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <ImageIcon className="h-5 w-5" /> (sin
                                          imagen)
                                        </div>
                                      )
                                    ) : (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <FileText className="h-5 w-5" />
                                        <span className="text-xs">Archivo</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex justify-end gap-2">
                                    {att.url && (
                                      <a href={att.url} download={att.name}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          title="Descargar"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </a>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-600"
                                      title="Eliminar"
                                      onClick={() =>
                                        handleRemoveAttachment(
                                          ticket.id,
                                          att.id
                                        )
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Conversación */}
                      {ticket.responses.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium">Conversación</h4>
                          <div className="space-y-2">
                            {ticket.responses.map((r) => (
                              <div
                                key={r.id}
                                className="bg-card p-3 rounded-lg border"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {r.authorRole === "coach"
                                      ? "Coach"
                                      : r.authorRole === "student"
                                      ? "Estudiante"
                                      : "Admin"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(r.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm">{r.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Responder */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Tu respuesta</h4>
                        <Textarea
                          placeholder="Escribe tu respuesta aquí..."
                          value={responseMessage}
                          onChange={(e) => setResponseMessage(e.target.value)}
                          rows={4}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={handleSendResponse}
                            disabled={!responseMessage.trim()}
                            className="gap-1"
                          >
                            <Send className="h-4 w-4" />
                            Enviar Respuesta
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Modal de imagen en grande */}
                    {previewImage && (
                      <div
                        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
                        onClick={() => setPreviewImage(null)}
                      >
                        <img
                          src={previewImage}
                          alt="preview"
                          className="max-h-[90vh] max-w-[90vw] rounded-lg"
                        />
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTickets.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No hay tickets</h3>
              <p>
                {statusFilter === "all"
                  ? "No tienes tickets de soporte asignados."
                  : `No hay tickets con estado "${statusFilter}".`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
