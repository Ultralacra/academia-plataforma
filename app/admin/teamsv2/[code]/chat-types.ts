export type Sender = "admin" | "alumno" | "coach";

export type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  data_base64: string;
  url?: string;
  created_at?: string;
};

export type Message = {
  id: string;
  room: string;
  sender: Sender;
  text: string;
  at: string; // ISO
  delivered?: boolean;
  read?: boolean;
  srcParticipantId?: string | number | null;
  attachments?: Attachment[];
  // Clave de UI estable para evitar parpadeos al cambiar id tras ACK del servidor
  uiKey?: string;
};

export type SocketIOConfig = {
  url?: string;
  token?: string;
  idEquipo?: string;
  idCliente?: string;
  participants?: any[];
  autoCreate?: boolean;
  autoJoin?: boolean;
  chatId?: string | number;
};

export type ChatInfo = {
  chatId: string | number | null;
  myParticipantId: string | number | null;
  participants?: any[] | null;
};

export type TicketData = {
  nombre?: string;
  sugerencia?: string;
  tipo?: string;
  descripcion?: string;
  archivos_cargados?: any[];
  content?: string;
  parsed?: {
    titulo?: string;
    descripcion?: string;
    prioridad?: string;
    categoria?: string;
    html?: string;
  };
};

export type PendingAttachment = {
  file: File;
  preview?: string;
};
