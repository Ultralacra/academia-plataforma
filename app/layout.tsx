import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { SseNotificationsProvider } from "@/components/hooks/useSseNotifications";
import { GlobalChatNotifications } from "@/components/chat/GlobalChatNotifications";
import { CoachChatNotifier } from "@/components/chat/CoachChatNotifier";
import { CoachChatSnackbar } from "@/components/chat/CoachChatSnackbar";
import { SseTicketSnackbar } from "@/components/hooks/SseTicketSnackbar";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Academia X",
  description: "Plataforma de gestión para academia",
  generator: "",
  // Favicon e iconos. Coloca tu archivo en public/ (p. ej. /favicon.png o /favicon.ico)
  // o agrega app/icon.png para que Next lo detecte automáticamente.
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SseNotificationsProvider>
            <GlobalChatNotifications />
            <CoachChatNotifier />
            <CoachChatSnackbar />
            <SseTicketSnackbar />
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          </SseNotificationsProvider>
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
