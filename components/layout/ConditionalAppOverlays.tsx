"use client";

import React from "react";
import { usePathname } from "next/navigation";

import { SseNotificationsProvider } from "@/components/hooks/useSseNotifications";
import { GlobalChatNotifications } from "@/components/chat/GlobalChatNotifications";
import { CoachChatNotifier } from "@/components/chat/CoachChatNotifier";
import { CoachChatSnackbar } from "@/components/chat/CoachChatSnackbar";
import { StudentChatSnackbar } from "@/components/chat/StudentChatSnackbar";
import { SseTicketSnackbar } from "@/components/hooks/SseTicketSnackbar";
import { PwaPushClient } from "@/components/pwa/PwaPushClient";

function isPublicNoNotificationsPath(pathname: string) {
  if (!pathname) return false;
  return pathname === "/booking" || pathname.startsWith("/booking/");
}

export function ConditionalAppOverlays({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";

  // En páginas públicas (ej. formulario de registro) no queremos snackbars/notificaciones.
  if (isPublicNoNotificationsPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <SseNotificationsProvider>
      <PwaPushClient />
      <GlobalChatNotifications />
      <CoachChatNotifier />
      <CoachChatSnackbar />
      <StudentChatSnackbar />
      <SseTicketSnackbar />
      {children}
    </SseNotificationsProvider>
  );
}
