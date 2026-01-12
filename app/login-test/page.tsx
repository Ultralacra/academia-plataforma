"use client";

import * as React from "react";
import { buildUrl } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LoginStatus = "pending" | "running" | "success" | "error" | "skipped" | "aborted";

type LoginResult = {
  id?: string | number;
  codigo?: string;
  email?: string;
  name?: string;
  role?: string;
  tipo?: string;
  token?: string;
  [k: string]: unknown;
};

type LoginRow = {
  index: number;
  correo: string;
  email: string;
  password: string;
  status: LoginStatus;
  message?: string;
  result?: LoginResult;
  startedAt?: number;
  finishedAt?: number;
};

function stringifyCellValue(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function buildExportRows(okRows: LoginRow[], opts: { includeToken: boolean }) {
  // Aplanamos result + campos base. Para que Excel sea útil, incluimos columnas estables primero.
  const baseRows = okRows.map((r) => {
    const raw = {
      index: r.index + 1,
      correo: r.correo,
      email: r.email,
      password: r.password,
      status: r.status,
      message: r.message ?? "",
      ...(r.result ?? {}),
    } as Record<string, unknown>;

    if (!opts.includeToken && typeof raw.token === "string") {
      raw.token = "";
    }

    return raw;
  });

  // Normalizamos columnas (unión de keys) para que no falten campos.
  const keys = new Set<string>();
  for (const row of baseRows) {
    Object.keys(row).forEach((k) => keys.add(k));
  }

  const orderedKeys = [
    "index",
    "correo",
    "email",
    "password",
    "status",
    "message",
    "id",
    "codigo",
    "name",
    "role",
    "tipo",
    "token",
    ...Array.from(keys).filter(
      (k) =>
        ![
          "index",
          "correo",
          "email",
          "password",
          "status",
          "message",
          "id",
          "codigo",
          "name",
          "role",
          "tipo",
          "token",
        ].includes(k)
    ),
  ].filter((k, i, arr) => arr.indexOf(k) === i);

  const normalized = baseRows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const k of orderedKeys) out[k] = stringifyCellValue(row[k]);
    return out;
  });

  return { rows: normalized, columns: orderedKeys };
}

function sanitizeLooseJson(text: string) {
  // El JSON adjunto puede venir de pandas y traer valores NaN (no es JSON válido).
  // Los reemplazamos por null para que JSON.parse funcione.
  return text
    .replace(/\bNaN\b/g, "null")
    .replace(/\bInfinity\b/g, "null")
    .replace(/\b-Infinity\b/g, "null");
}

function extractLoginRows(parsed: any): LoginRow[] {
  const list: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.cruce_completo)
      ? parsed.cruce_completo
      : [];

  return list.map((r, i) => {
    const correo = String(r?.["Correo"] ?? "").trim();
    const email = String(r?.["Usuario App"] ?? "").trim();
    const password = String(r?.["Contraseña App"] ?? "").trim();

    const hasCreds = Boolean(email) && Boolean(password);

    return {
      index: i,
      correo,
      email,
      password,
      status: hasCreds ? "pending" : "skipped",
      message: hasCreds ? undefined : "Sin credenciales en el JSON",
    };
  });
}

function maskPassword(pw: string) {
  if (!pw) return "";
  if (pw.length <= 2) return "••";
  return `${"•".repeat(Math.min(10, pw.length - 2))}${pw.slice(-2)}`;
}

function statusBadgeVariant(status: LoginStatus):
  | "default"
  | "secondary"
  | "destructive"
  | "outline" {
  switch (status) {
    case "success":
      return "default";
    case "running":
      return "secondary";
    case "error":
      return "destructive";
    case "skipped":
    case "aborted":
    case "pending":
    default:
      return "outline";
  }
}

function statusLabel(status: LoginStatus) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "running":
      return "Probando";
    case "success":
      return "OK";
    case "error":
      return "Error";
    case "skipped":
      return "Saltado";
    case "aborted":
      return "Cancelado";
  }
}

async function loginRequest(email: string, password: string, signal?: AbortSignal) {
  const res = await fetch(buildUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    try {
      const parsed = text ? JSON.parse(text) : null;
      const msg =
        (parsed as any)?.error ||
        (parsed as any)?.message ||
        (parsed as any)?.details?.message ||
        text ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  return (await res.json()) as LoginResult;
}

export default function LoginTestPage() {
  const [rows, setRows] = React.useState<LoginRow[]>([]);
  const [parseError, setParseError] = React.useState<string>("");
  const [running, setRunning] = React.useState(false);
  const [showPasswords, setShowPasswords] = React.useState(false);
  const [includeToken, setIncludeToken] = React.useState(false);
  const [delayMs, setDelayMs] = React.useState<number>(150);
  const abortRef = React.useRef<AbortController | null>(null);

  const totals = React.useMemo(() => {
    const total = rows.length;
    const ok = rows.filter((r) => r.status === "success").length;
    const err = rows.filter((r) => r.status === "error").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const skipped = rows.filter((r) => r.status === "skipped").length;
    const aborted = rows.filter((r) => r.status === "aborted").length;
    const runningCount = rows.filter((r) => r.status === "running").length;
    return { total, ok, err, pending, skipped, aborted, runningCount };
  }, [rows]);

  const loadJsonFile = async (file: File | null) => {
    setParseError("");
    if (!file) return;

    try {
      const text = await file.text();
      const sanitized = sanitizeLooseJson(text);
      const parsed = JSON.parse(sanitized);
      const extracted = extractLoginRows(parsed);
      setRows(extracted);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo leer el JSON";
      setParseError(msg);
      setRows([]);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const downloadCsvOk = () => {
    const okRows = rows.filter((r) => r.status === "success" && r.result);
    if (okRows.length === 0) return;

    const { rows: exportRows, columns } = buildExportRows(okRows, { includeToken });

    const escapeCsv = (s: unknown) => {
      const str = String(s ?? "");
      if (/[\n\r",]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };

    const header = columns.map(escapeCsv).join(",");
    const lines = exportRows.map((r) => columns.map((c) => escapeCsv((r as any)[c])).join(","));
    const csv = [header, ...lines].join("\n");

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `login_test_ok_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadExcelOk = async () => {
    const okRows = rows.filter((r) => r.status === "success" && r.result);
    if (okRows.length === 0) return;

    const { rows: exportRows } = buildExportRows(okRows, { includeToken });

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filename = `login_test_ok_${stamp}.xlsx`;

    const res = await fetch("/api/login-test/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: exportRows, filename }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "No se pudo generar el Excel");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const run = async (mode: "all" | "failed") => {
    if (running) return;
    if (rows.length === 0) return;

    setRunning(true);
    setParseError("");

    const controller = new AbortController();
    abortRef.current = controller;

    const shouldAttempt = (r: LoginRow) => {
      if (r.status === "skipped") return false;
      if (mode === "all") return r.status === "pending" || r.status === "error" || r.status === "aborted";
      return r.status === "error" || r.status === "aborted";
    };

    try {
      for (let i = 0; i < rows.length; i++) {
        if (controller.signal.aborted) break;

        const current = rows[i];
        if (!shouldAttempt(current)) continue;

        setRows((prev) =>
          prev.map((r) =>
            r.index === current.index
              ? { ...r, status: "running", message: undefined, result: undefined, startedAt: Date.now(), finishedAt: undefined }
              : r
          )
        );

        try {
          const result = await loginRequest(current.email, current.password, controller.signal);
          setRows((prev) =>
            prev.map((r) =>
              r.index === current.index
                ? { ...r, status: "success", result, finishedAt: Date.now() }
                : r
            )
          );
        } catch (e) {
          if (controller.signal.aborted) {
            setRows((prev) =>
              prev.map((r) =>
                r.index === current.index
                  ? { ...r, status: "aborted", message: "Proceso cancelado", finishedAt: Date.now() }
                  : r
              )
            );
            break;
          }

          const msg = e instanceof Error ? e.message : "Error desconocido";
          setRows((prev) =>
            prev.map((r) =>
              r.index === current.index
                ? { ...r, status: "error", message: msg, finishedAt: Date.now() }
                : r
            )
          );
        }

        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      // Si se abortó, marcamos los "running" restantes como aborted.
      if (controller.signal.aborted) {
        setRows((prev) =>
          prev.map((r) =>
            r.status === "running" ? { ...r, status: "aborted", message: "Proceso cancelado" } : r
          )
        );
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
    }
  };

  React.useEffect(() => {
    return () => stop();
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Login Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Carga tu JSON (ej. <span className="font-mono">cruce_completo_todo.json</span>) y prueba el login de cada usuario uno por uno contra <span className="font-mono">/v1/auth/login</span>.
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="space-y-1">
              <div className="text-sm font-medium">Archivo JSON</div>
              <Input
                type="file"
                accept="application/json,.json"
                disabled={running}
                onChange={(e) => loadJsonFile(e.target.files?.[0] ?? null)}
              />
              {parseError ? (
                <div className="text-sm text-red-600">{parseError}</div>
              ) : null}
            </div>

            <div className="flex items-center gap-2 md:ml-auto">
              <div className="text-sm">Mostrar contraseñas</div>
              <Switch
                checked={showPasswords}
                onCheckedChange={(v) => setShowPasswords(Boolean(v))}
                disabled={running}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm">Incluir token en export</div>
              <Switch
                checked={includeToken}
                onCheckedChange={(v) => setIncludeToken(Boolean(v))}
                disabled={running}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Delay (ms)</div>
              <Input
                type="number"
                min={0}
                step={50}
                value={delayMs}
                disabled={running}
                onChange={(e) => setDelayMs(Number(e.target.value || 0))}
                className="w-32"
              />
            </div>

            <div className="flex gap-2">
              <Button disabled={running || rows.length === 0} onClick={() => run("all")}
              >
                Iniciar (todos)
              </Button>
              <Button
                variant="secondary"
                disabled={running || rows.length === 0}
                onClick={() => run("failed")}
              >
                Reintentar fallidos
              </Button>
              <Button variant="destructive" disabled={!running} onClick={stop}>
                Detener
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">Total: {totals.total}</Badge>
            <Badge>OK: {totals.ok}</Badge>
            <Badge variant="destructive">Error: {totals.err}</Badge>
            <Badge variant="secondary">Probando: {totals.runningCount}</Badge>
            <Badge variant="outline">Pendiente: {totals.pending}</Badge>
            <Badge variant="outline">Saltado: {totals.skipped}</Badge>
            <Badge variant="outline">Cancelado: {totals.aborted}</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={running || totals.ok === 0}
              onClick={downloadExcelOk}
            >
              Descargar Excel (OK)
            </Button>
            <Button
              variant="outline"
              disabled={running || totals.ok === 0}
              onClick={downloadCsvOk}
            >
              Descargar CSV (OK)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Correo (JSON)</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Respuesta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.index}>
                  <TableCell className="text-muted-foreground">{r.index + 1}</TableCell>
                  <TableCell className="font-mono">{r.correo || "—"}</TableCell>
                  <TableCell className="font-mono">{r.email || "—"}</TableCell>
                  <TableCell className="font-mono">
                    {showPasswords ? r.password || "—" : maskPassword(r.password) || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(r.status)}>{statusLabel(r.status)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[420px] whitespace-normal">
                    {r.message ? <span className="text-sm">{r.message}</span> : ""}
                  </TableCell>
                  <TableCell className="max-w-[520px] whitespace-normal">
                    {r.result ? (
                      <pre className="text-xs bg-muted/40 rounded p-2 overflow-auto max-h-28">
                        {JSON.stringify(
                          {
                            id: r.result.id,
                            codigo: r.result.codigo,
                            email: r.result.email,
                            name: r.result.name,
                            role: r.result.role,
                            tipo: r.result.tipo,
                            token: r.result.token ? "(token recibido)" : undefined,
                          },
                          null,
                          2
                        )}
                      </pre>
                    ) : (
                      ""
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-3">
              No hay datos todavía. Carga el JSON para empezar.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
