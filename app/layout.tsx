import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import Script from "next/script";
import { ConditionalAppOverlays } from "@/components/layout/ConditionalAppOverlays";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Academia X",
  description: "Plataforma de gestión para academia",
  generator: "",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Academia X",
    statusBarStyle: "black-translucent",
  },
  // Favicon e iconos. Coloca tu archivo en public/ (p. ej. /favicon.png o /favicon.ico)
  // o agrega app/icon.png para que Next lo detecte automáticamente.
  icons: {
    icon: [{ url: "/api/pwa/icon/32", type: "image/png" }],
    apple: [{ url: "/api/pwa/icon/180", type: "image/png" }],
    shortcut: ["/api/pwa/icon/32"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/new-notification-022-370046.mp3"
          as="audio"
          type="audio/mpeg"
        />
        <Script
          id="notification-audio-unlock"
          strategy="beforeInteractive"
        >{`(function(){
  try {
    if (typeof window === 'undefined') return;
    if (window.__notifAudioUnlockAttached) return;
    window.__notifAudioUnlockAttached = true;

    var AUDIO_ID = '__notification-audio';
    var SRC = '/new-notification-022-370046.mp3';

    function ensureAudioEl(){
      try {
        var el = document.getElementById(AUDIO_ID);
        if (el && String(el.tagName).toLowerCase() === 'audio') return el;
        el = document.createElement('audio');
        el.id = AUDIO_ID;
        el.src = SRC;
        el.preload = 'auto';
        el.volume = 0;
        el.setAttribute('playsinline','');
        el.style.display = 'none';

        var append = function(){
          try {
            if (document.body && !document.getElementById(AUDIO_ID)) {
              document.body.appendChild(el);
            }
          } catch(e){}
        };
        if (document.body) append();
        else document.addEventListener('DOMContentLoaded', append, { once: true });
        return el;
      } catch (e) {
        return null;
      }
    }

    function unlock(){
      try {
        if (window.__notifAudioUnlocked) return;
        window.__notifAudioUnlocked = true;

        // WebAudio resume (ayuda en Safari/iOS)
        try {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) {
            window.__notifAudioCtx = window.__notifAudioCtx || new Ctx();
            if (window.__notifAudioCtx && window.__notifAudioCtx.state === 'suspended') {
              window.__notifAudioCtx.resume().catch(function(){});
            }
          }
        } catch(e){}

        var el = ensureAudioEl();
        if (!el) return;
        try {
          var p = el.play();
          if (p && p.then) {
            p.then(function(){
              try { el.pause(); el.currentTime = 0; el.volume = 1; } catch(e){}
            }).catch(function(){
              try { el.pause(); el.volume = 1; } catch(e){}
            });
          }
        } catch(e){}
      } catch(e){}
    }

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
  } catch(e){}
})();`}</Script>

        <Script id="bip-capture" strategy="beforeInteractive">{`(function(){
  try {
    if (typeof window === 'undefined') return;
    // Captura beforeinstallprompt lo antes posible para no perder el evento.
    window.__deferredInstallPrompt = window.__deferredInstallPrompt || null;
    window.addEventListener('beforeinstallprompt', function(e){
      try {
        if (!e) return;
        if (e.preventDefault) e.preventDefault();
        window.__deferredInstallPrompt = e;
      } catch(_){}
    });
    window.addEventListener('appinstalled', function(){
      try { window.__deferredInstallPrompt = null; } catch(_){}
    });
  } catch(e){}
})();`}</Script>

        <Script id="sw-register" strategy="afterInteractive">{`(function(){
  try {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(){});
  } catch(e){}
})();`}</Script>
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConditionalAppOverlays>
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          </ConditionalAppOverlays>
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
