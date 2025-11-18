"use client";

import React from "react";
import StudentChatInline from "@/components/chat/StudentChatInline";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";

export default function StudentChatWidget({
  initialOpen = true,
  initialCode,
  title = "Chat con Soporte X Academy",
}: {
  initialOpen?: boolean;
  initialCode?: string;
  title?: string;
}) {
  const [open, setOpen] = React.useState<boolean>(initialOpen);
  const [code, setCode] = React.useState<string>("");
  const [room, setRoom] = React.useState<string | null>(null);

  // Cargar código inicial desde query/localStorage
  React.useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      setRoom(initialCode.trim().toLowerCase());
      try {
        localStorage.setItem("studentChat:code", initialCode);
      } catch {}
      return;
    }
    try {
      const url = new URL(window.location.href);
      const q = (url.searchParams.get("code") || "").trim();
      const cached = localStorage.getItem("studentChat:code") || "";
      const v = (q || cached).toLowerCase();
      if (v) {
        setCode(v);
        setRoom(v);
      }
    } catch {}
  }, [initialCode]);

  function join(e?: React.FormEvent) {
    e?.preventDefault();
    const v = (code || "").toLowerCase().trim();
    if (!v) return;
    setRoom(v);
    try {
      localStorage.setItem("studentChat:code", v);
    } catch {}
  }

  return (
    <>
      {/* Botón flotante (por si se cierra el modal) */}
      <div className="fixed bottom-5 right-5 z-40">
        <Button
          onClick={() => setOpen(true)}
          className="rounded-full h-12 w-12 p-0 shadow-lg"
          title="Abrir chat"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 sm:max-w-[420px] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
            <div className="text-sm font-semibold truncate">{title}</div>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="h-[540px] w-full bg-white">
            {!room ? (
              <div className="h-full flex flex-col items-center justify-center p-4">
                <form onSubmit={join} className="w-full max-w-sm space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Ingresa tu código de alumno para iniciar el chat.
                  </div>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Tu código (p. ej. CXA-574)"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" className="text-sm">
                      Iniciar
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="h-full">
                <StudentChatInline
                  code={room}
                  title="Soporte X Academy"
                  subtitle="Atención al Cliente"
                  className="h-full"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
