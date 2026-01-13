"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/auth";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

type BrevoRow = Record<string, unknown>;

type Creds = {
  username?: string;
  password?: string;
};

function extractEmails(value: unknown): string[] {
  const s = String(value ?? "");
  // Soporta textos como: "correo: foo@bar.com" o múltiples emails en la misma celda
  const matches = s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  if (!matches) return [];
  const out: string[] = [];
  for (const m of matches) {
    const email = m.trim().toLowerCase();
    if (email && isEmail(email)) out.push(email);
  }
  // dedupe
  return Array.from(new Set(out));
}

function mergeCreds(a: Creds | undefined, b: Creds | undefined): Creds {
  return {
    username:
      (a?.username || "").trim() || (b?.username || "").trim() || undefined,
    password:
      (a?.password || "").trim() || (b?.password || "").trim() || undefined,
  };
}

function rowEmail(row: BrevoRow): string | null {
  const correo = extractEmails(row["Correo"]);
  if (correo[0]) return correo[0];
  const usuarioApp = extractEmails(row["Usuario App"]);
  if (usuarioApp[0]) return usuarioApp[0];
  return null;
}

function rowName(row: BrevoRow): string {
  const a = String(row["Nombre CSV"] ?? "").trim();
  const b = String(row["Nombre JSON"] ?? "").trim();
  return a || b || "(sin nombre)";
}

export function BrevoClientPage() {
  const { toast } = useToast();

  const [origin, setOrigin] = useState<string>(
    "https://academia.valinkgroup.com"
  );
  const [appName, setAppName] = useState<string>("Sistema Hotselling");
  const [subject, setSubject] = useState<string>("");
  const [portalLink, setPortalLink] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [useAllUsers, setUseAllUsers] = useState<boolean>(false);

  const [search, setSearch] = useState<string>("");
  const [rows, setRows] = useState<BrevoRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState<boolean>(false);

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(
    () => new Set()
  );

  const [knownNamesByEmail, setKnownNamesByEmail] = useState<
    Record<string, string>
  >(() => ({}));

  const [credsByEmail, setCredsByEmail] = useState<Record<string, Creds>>(
    () => ({})
  );
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(
    () => new Set()
  );

  const [sending, setSending] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const selectedList = useMemo(() => {
    return Array.from(selectedEmails).filter((x) => isEmail(x));
  }, [selectedEmails]);

  const credsStats = useMemo(() => {
    const visibleRows = rows.filter((r) => {
      if (!search.trim()) return true;
      const haystack = `${rowName(r)} ${String(r["Correo"] ?? "")} ${String(
        r["Usuario App"] ?? ""
      )}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });

    const pageWithCreds = visibleRows.reduce((acc, r) => {
      const email = rowEmail(r);
      if (!email) return acc;
      return acc + (credsByEmail[email]?.password ? 1 : 0);
    }, 0);

    const selectedWithCreds = selectedList.reduce(
      (acc, email) => acc + (credsByEmail[email]?.password ? 1 : 0),
      0
    );
    const totalCreds = Object.keys(credsByEmail).length;
    return { pageWithCreds, selectedWithCreds, totalCreds };
  }, [credsByEmail, rows, search, selectedList]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = `${rowName(r)} ${String(r["Correo"] ?? "")} ${String(
        r["Usuario App"] ?? ""
      )}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const visibleEmails = useMemo(() => {
    const out: string[] = [];
    for (const r of visibleRows) {
      const email = rowEmail(r);
      if (email) out.push(email);
    }
    return out;
  }, [visibleRows]);

  const pageSelectionState = useMemo<boolean | "indeterminate">(() => {
    if (visibleEmails.length === 0) return false;
    const selectedCount = visibleEmails.reduce(
      (acc, email) => acc + (selectedEmails.has(email) ? 1 : 0),
      0
    );
    if (selectedCount === 0) return false;
    if (selectedCount === visibleEmails.length) return true;
    return "indeterminate";
  }, [selectedEmails, visibleEmails]);

  async function loadBrevoRows() {
    setRowsLoading(true);
    try {
      const res = await fetch("/api/brevo/claves", { cache: "no-store" });
      const json = await res.json();
      const loaded: BrevoRow[] = Array.isArray(json?.cruce_completo)
        ? json.cruce_completo
        : [];

      setRows(loaded);

      // Deriva nombres/credenciales por email desde el dataset
      const nextNames: Record<string, string> = {};
      const nextCreds: Record<string, Creds> = {};
      for (const r of loaded) {
        const email = rowEmail(r);
        if (!email) continue;

        const name = rowName(r);
        if (name && name !== "(sin nombre)") nextNames[email] = name;

        const usernameRaw = String(r["Usuario App"] ?? "").trim();
        const username = isEmail(usernameRaw)
          ? usernameRaw.toLowerCase()
          : extractEmails(usernameRaw)[0];

        const passwordValue =
          String(r["Contraseña App"] ?? "").trim() || undefined;

        if (username || passwordValue) {
          nextCreds[email] = mergeCreds(nextCreds[email], {
            ...(username ? { username } : {}),
            ...(passwordValue ? { password: passwordValue } : {}),
          });
        }
      }

      setKnownNamesByEmail(nextNames);
      setCredsByEmail(nextCreds);
      setRevealedPasswords(new Set());
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message ?? "No se pudo cargar claves.json",
        variant: "destructive",
      });
      setRows([]);
      setKnownNamesByEmail({});
      setCredsByEmail({});
      setRevealedPasswords(new Set());
    } finally {
      setRowsLoading(false);
    }
  }

  useEffect(() => {
    void loadBrevoRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUploadClavesJson(file: File) {
    try {
      const raw = await file.text();
      // Algunos exports traen NaN (no es JSON válido). Lo normalizamos a null.
      const sanitized = raw.replace(/\bNaN\b/g, "null");
      const parsed: any = JSON.parse(sanitized);
      const rows: any[] = Array.isArray(parsed?.cruce_completo)
        ? parsed.cruce_completo
        : [];

      setRows(rows);

      const next: Record<string, Creds> = {};

      for (const row of rows) {
        if (!row || typeof row !== "object") continue;

        const correoEmails = extractEmails((row as any)["Correo"]);
        const usuarioAppRaw = String((row as any)["Usuario App"] ?? "").trim();
        const usuarioAppEmails = extractEmails(usuarioAppRaw);
        const passRaw = String((row as any)["Contraseña App"] ?? "").trim();

        const username =
          usuarioAppRaw && isEmail(usuarioAppRaw)
            ? usuarioAppRaw.toLowerCase()
            : usuarioAppEmails[0];
        const passwordValue = passRaw || undefined;

        const keys = Array.from(
          new Set([...correoEmails, ...usuarioAppEmails])
        );
        if (keys.length === 0) continue;

        for (const emailKey of keys) {
          next[emailKey] = mergeCreds(next[emailKey], {
            ...(username ? { username } : {}),
            ...(passwordValue ? { password: passwordValue } : {}),
          });
        }
      }

      setCredsByEmail(next);
      setRevealedPasswords(new Set());
      toast({
        title: "Claves cargadas",
        description: `Se cargaron ${
          Object.keys(next).length
        } registros (por email).`,
      });
    } catch (e: any) {
      toast({
        title: "No se pudo leer claves.json",
        description: e?.message ?? "Archivo inválido",
        variant: "destructive",
      });
    }
  }

  async function sendReal() {
    setSending(true);
    setLastResult(null);

    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "No autorizado",
          description: "Inicia sesión nuevamente.",
          variant: "destructive",
        });
        return;
      }

      const allRecipients = (() => {
        const map = new Map<
          string,
          { email: string; name?: string; username?: string; password?: string }
        >();

        for (const r of rows) {
          const email = rowEmail(r);
          if (!email) continue;
          const creds = credsByEmail[email];
          const name = knownNamesByEmail[email] || rowName(r);
          const existing = map.get(email);
          const next = {
            email,
            ...(name && name !== "(sin nombre)" ? { name } : {}),
            ...(creds?.username ? { username: creds.username } : {}),
            ...(creds?.password ? { password: creds.password } : {}),
          };
          if (!existing) map.set(email, next);
          else if (!existing.name && next.name) map.set(email, next);
        }
        return Array.from(map.values());
      })();

      const recipients = useAllUsers
        ? allRecipients
        : selectedList.map((email) => {
            const creds = credsByEmail[email];
            const name = knownNamesByEmail[email] || undefined;
            return {
              email,
              ...(name ? { name } : {}),
              ...(creds?.username ? { username: creds.username } : {}),
              ...(creds?.password ? { password: creds.password } : {}),
            };
          });
      if (recipients.length === 0) {
        toast({
          title: "Sin destinatarios",
          description: useAllUsers
            ? "No se encontraron emails válidos."
            : "Selecciona al menos un usuario.",
          variant: "destructive",
        });
        return;
      }

      const res = await fetch("/api/brevo/send-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          template: "welcome",
          recipients,
          origin,
          appName,
          subject,
          portalLink,
          password,
        }),
      });

      const json = await res.json().catch(() => null);
      setLastResult(json);

      if (!res.ok || json?.status !== "success") {
        toast({
          title: "Error enviando",
          description: String(json?.message ?? `HTTP ${res.status}`),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Enviado",
        description: `Se enviaron ${
          json?.toCount ?? recipients.length
        } correo(s).`,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brevo · Envío de bienvenida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="origin">Origen (para links)</Label>
              <Input
                id="origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="https://sistemahotselling.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appName">Nombre de la app</Label>
              <Input
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Sistema Hotselling"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Asunto (opcional)</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="(usa el default; opcional: {{name}})"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="portalLink">Link del portal (opcional)</Label>
              <Input
                id="portalLink"
                value={portalLink}
                onChange={(e) => setPortalLink(e.target.value)}
                placeholder="(si vacío, usa Origen + /login)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña (opcional)</Label>
              <Input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="(se incluirá en el correo si la completas)"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clavesJson">Claves (claves.json)</Label>
              <Input
                id="clavesJson"
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUploadClavesJson(file);
                }}
              />
              <div className="text-xs text-muted-foreground">
                Carga automática desde el servidor + opción de subir un archivo.
                Se cruza por email usando <b>Correo</b> y/o <b>Usuario App</b>.
                {credsStats.totalCreds ? (
                  <>
                    {" "}
                    Cargados: <b>{credsStats.totalCreds}</b>.
                  </>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estado de claves</Label>
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                En esta página: <b>{credsStats.pageWithCreds}</b> con contraseña
                · Seleccionados: <b>{credsStats.selectedWithCreds}</b> con
                contraseña
              </div>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={rowsLoading}
                  onClick={() => void loadBrevoRows()}
                >
                  {rowsLoading ? "Cargando..." : "Recargar dataset"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Switch checked={useAllUsers} onCheckedChange={setUseAllUsers} />
              <div>
                <div className="text-sm font-medium">
                  Enviar a todos los usuarios
                </div>
                <div className="text-xs text-muted-foreground">
                  Si activas esto, se enviará a todos los emails válidos.
                </div>
              </div>
            </div>

            <Button disabled={sending} onClick={() => void sendReal()}>
              {sending ? "Enviando..." : "Enviar correo real"}
            </Button>
          </div>

          {!useAllUsers ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar (dataset Brevo)</Label>
                  <Input
                    id="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nombre o correo"
                  />
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setSelectedEmails(new Set());
                    }}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px]">
                        <Checkbox
                          checked={pageSelectionState}
                          onCheckedChange={(v) => {
                            const isChecked = v === true;
                            setSelectedEmails((prev) => {
                              const next = new Set(prev);
                              if (isChecked) {
                                for (const email of visibleEmails)
                                  next.add(email);
                              } else {
                                for (const email of visibleEmails)
                                  next.delete(email);
                              }
                              return next;
                            });
                          }}
                          aria-label="Seleccionar todos en esta página"
                        />
                      </TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Usuario App</TableHead>
                      <TableHead>Contraseña App</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rowsLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          Cargando dataset...
                        </TableCell>
                      </TableRow>
                    ) : visibleRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          No hay registros para mostrar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleRows.map((r, idx) => {
                        const email = rowEmail(r);
                        if (!email) return null;
                        const displayName = rowName(r);
                        const checked = selectedEmails.has(email);
                        const creds = credsByEmail[email];
                        const shown = revealedPasswords.has(email);
                        const masked = creds?.password
                          ? "•".repeat(Math.min(12, creds.password.length))
                          : "";
                        const matchOk = Boolean(r["match_ok"]);
                        const score = Number(r["match_score"] ?? 0);
                        return (
                          <TableRow key={`${email}-${idx}`}>
                            <TableCell>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const isChecked = v === true;
                                  setSelectedEmails((prev) => {
                                    const next = new Set(prev);
                                    if (isChecked) next.add(email);
                                    else next.delete(email);
                                    return next;
                                  });
                                }}
                                aria-label={`Seleccionar ${email}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {displayName}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {email}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {creds?.username ?? "-"}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {creds?.password ? (
                                <div className="flex items-center gap-2">
                                  <span>
                                    {shown
                                      ? creds.password
                                      : masked || "••••••"}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setRevealedPasswords((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(email)) next.delete(email);
                                        else next.add(email);
                                        return next;
                                      });
                                    }}
                                  >
                                    {shown ? "Ocultar" : "Ver"}
                                  </Button>
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {matchOk ? "OK" : "Revisar"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {Number.isFinite(score) ? score.toFixed(2) : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="text-sm text-muted-foreground">
                Registros: <b>{visibleRows.length}</b> · Seleccionados:{" "}
                <b>{selectedList.length}</b>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTitle>Envío masivo</AlertTitle>
              <AlertDescription>
                Se enviará el correo de bienvenida a todos los registros del
                dataset con email válido.
              </AlertDescription>
            </Alert>
          )}

          {lastResult ? (
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">Último resultado</div>
              <pre className="mt-2 whitespace-pre-wrap break-words">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
