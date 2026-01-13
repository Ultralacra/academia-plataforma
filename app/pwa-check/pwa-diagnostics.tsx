"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CheckItem = {
  label: string;
  ok?: boolean;
  detail?: string;
};

async function safeFetch(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, init);
    return res;
  } catch (e: any) {
    return { ok: false, status: 0, statusText: e?.message ?? String(e) } as any;
  }
}

function boolLabel(v: boolean) {
  return v ? "OK" : "NO";
}

export function PwaDiagnostics() {
  const [checks, setChecks] = React.useState<CheckItem[]>([]);
  const [running, setRunning] = React.useState(false);

  const run = React.useCallback(async () => {
    setRunning(true);
    try {
      const next: CheckItem[] = [];

      const isSecure =
        typeof window !== "undefined" ? window.isSecureContext : false;
      next.push({
        label: "Contexto seguro (HTTPS / localhost)",
        ok: isSecure,
        detail: `isSecureContext=${boolLabel(isSecure)}; origin=${
          typeof window !== "undefined" ? window.location.origin : ""
        }`,
      });

      const hasSW =
        typeof navigator !== "undefined" && "serviceWorker" in navigator;
      next.push({
        label: "Soporte de Service Worker",
        ok: hasSW,
        detail: `serviceWorker in navigator=${boolLabel(hasSW)}`,
      });

      // manifest
      const manifestRes = await safeFetch("/manifest.webmanifest", {
        cache: "no-store",
      });
      const manifestCt =
        (manifestRes as Response).headers?.get?.("content-type") ?? "";
      next.push({
        label: "Manifest accesible (/manifest.webmanifest)",
        ok: (manifestRes as Response).ok,
        detail: `status=${(manifestRes as Response).status} ${
          (manifestRes as Response).statusText
        }; content-type=${manifestCt}`,
      });

      let manifestJson: any = null;
      if ((manifestRes as Response).ok) {
        try {
          manifestJson = await (manifestRes as Response).json();
        } catch (e: any) {
          next.push({
            label: "Manifest JSON válido",
            ok: false,
            detail: e?.message ?? String(e),
          });
        }
      }

      if (manifestJson) {
        next.push({
          label: "Manifest: display=standalone",
          ok: String(manifestJson.display || "").toLowerCase() === "standalone",
          detail: `display=${manifestJson.display}`,
        });

        const icons: any[] = Array.isArray(manifestJson.icons)
          ? manifestJson.icons
          : [];
        next.push({
          label: "Manifest: tiene iconos",
          ok: icons.length > 0,
          detail: `icons=${icons.length}`,
        });

        // comprobar que los iconos responden 200 y son image/*
        for (const icon of icons.slice(0, 6)) {
          const src = String(icon?.src ?? "");
          if (!src) continue;
          const r = await safeFetch(src, { method: "GET", cache: "no-store" });
          const ct = (r as Response).headers?.get?.("content-type") ?? "";
          next.push({
            label: `Icono: ${src}`,
            ok: (r as Response).ok && ct.includes("image"),
            detail: `status=${
              (r as Response).status
            }; content-type=${ct}; sizes=${icon?.sizes ?? ""}`,
          });
        }
      }

      // sw.js
      const swRes = await safeFetch("/sw.js", { cache: "no-store" });
      const swCt = (swRes as Response).headers?.get?.("content-type") ?? "";
      next.push({
        label: "Service Worker file accesible (/sw.js)",
        ok: (swRes as Response).ok,
        detail: `status=${(swRes as Response).status}; content-type=${swCt}`,
      });

      // control
      if (hasSW) {
        try {
          const reg = await navigator.serviceWorker.getRegistration("/");
          next.push({
            label: "SW registrado en scope '/'",
            ok: Boolean(reg),
            detail: reg ? `scope=${reg.scope}` : "no registration",
          });

          const controlled = Boolean(navigator.serviceWorker.controller);
          next.push({
            label: "La página está controlada por el SW",
            ok: controlled,
            detail: controlled
              ? "controller=present"
              : "controller=null (recarga la página)",
          });
        } catch (e: any) {
          next.push({
            label: "Estado del SW",
            ok: false,
            detail: e?.message ?? String(e),
          });
        }
      }

      // iOS standalone flag
      const isStandaloneDisplay = window.matchMedia?.(
        "(display-mode: standalone)"
      )?.matches;
      const isIOSStandalone = (window.navigator as any)?.standalone === true;
      next.push({
        label: "Standalone mode (detectado)",
        ok: Boolean(isStandaloneDisplay || isIOSStandalone),
        detail: `display-mode=${boolLabel(
          Boolean(isStandaloneDisplay)
        )}; iosStandalone=${boolLabel(Boolean(isIOSStandalone))}`,
      });

      setChecks(next);
    } finally {
      setRunning(false);
    }
  }, []);

  React.useEffect(() => {
    run();
  }, [run]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={running}>
          {running ? "Comprobando..." : "Recomprobar"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Abre esta URL en el celular y revisa qué marca NO.
        </span>
      </div>

      <div className="space-y-2">
        {checks.map((c, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">{c.label}</div>
                {c.detail ? (
                  <div className="text-xs text-muted-foreground break-all">
                    {c.detail}
                  </div>
                ) : null}
              </div>
              <div
                className={
                  "text-xs font-semibold px-2 py-1 rounded " +
                  (c.ok
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-red-500/15 text-red-700")
                }
              >
                {c.ok ? "OK" : "NO"}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Si en Android no aparece instalable, normalmente fallan: contexto
        seguro, manifest, o alguno de los iconos (status 200 + content-type
        image/*).
      </p>
    </div>
  );
}
