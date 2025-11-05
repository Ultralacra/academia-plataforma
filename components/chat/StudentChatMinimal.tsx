"use client";

import React from "react";
import StudentChatInline from "@/components/chat/StudentChatInline";

// Wrapper de compatibilidad: mantiene la firma anterior pero delega a la nueva
// interfaz unificada basada en CoachChatInline.
export default function StudentChatMinimal({
  room,
  title = "Chat con administración",
  subtitle,
  className,
}: {
  room: string;
  role?: "admin" | "alumno" | "coach"; // ignorado: siempre alumno en la nueva UI
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const code = React.useMemo(() => (room || "").trim().toLowerCase(), [room]);
  return (
    <StudentChatInline
      code={code}
      title={title}
      subtitle={subtitle}
      className={className}
    />
  );
}
