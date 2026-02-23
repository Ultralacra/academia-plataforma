"use client";

import Link from "next/link";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/auth";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

type BrevoRow = Record<string, unknown>;

const STATIC_BREVO_EMAIL = "cesaramuroc@gmail.com";

const STATIC_BREVO_ROW: BrevoRow = {
  "Nombre JSON": "Cesar Muro",
  "Nombre CSV": "Cesar Muro",
  Correo: STATIC_BREVO_EMAIL,
  name_key: "cesar muro",
  best_df2_name_key: "cesar muro",
  match_score: 100,
  first_match: true,
  match_ok: true,
  "Usuario App": STATIC_BREVO_EMAIL,
  "Contraseña App": "5i__xhQPt-_C",
  app_row_index: null,
};

const SENT_EMAILS_STORAGE_KEY = "brevo.sentEmails.v1";

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

// El destinatario del correo SIEMPRE es "Correo".
function rowRecipientEmail(row: BrevoRow): string | null {
  const correo = extractEmails(row["Correo"]);
  return correo[0] ?? null;
}

// Credenciales: el usuario de acceso puede venir en "Usuario App".
function rowAppUsername(row: BrevoRow): string | undefined {
  const raw = String(row["Usuario App"] ?? "").trim();
  if (!raw) return undefined;
  if (isEmail(raw)) return raw.toLowerCase();
  return extractEmails(raw)[0];
}

function rowAppPassword(row: BrevoRow): string | undefined {
  return String(row["Contraseña App"] ?? "").trim() || undefined;
}

function rowName(row: BrevoRow): string {
  const a = String(row["Nombre CSV"] ?? "").trim();
  const b = String(row["Nombre JSON"] ?? "").trim();
  return a || b || "(sin nombre)";
}

export function BrevoClientPage() {
  const { toast } = useToast();

  const [template, setTemplate] = useState<"welcome" | "reminder">("welcome");
  const [origin, setOrigin] = useState<string>(
    "https://academia.valinkgroup.com",
  );
  const [appName, setAppName] = useState<string>("Sistema Hotselling");
  const [subject, setSubject] = useState<string>("");
  const [portalLink, setPortalLink] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [useAllUsers, setUseAllUsers] = useState<boolean>(false);

  const [search, setSearch] = useState<string>("");
  const [rows, setRows] = useState<BrevoRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState<boolean>(false);

  const [listTab, setListTab] = useState<"pending" | "sent">("pending");
  const [sentEmails, setSentEmails] = useState<Set<string>>(() => new Set());

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(
    () => new Set(),
  );

  const [knownNamesByEmail, setKnownNamesByEmail] = useState<
    Record<string, string>
  >(() => ({}));

  const [credsByEmail, setCredsByEmail] = useState<Record<string, Creds>>(
    () => ({}),
  );
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(
    () => new Set(),
  );

  const [sending, setSending] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const exportVisibleRowsToExcel = async () => {
    try {
      if (rowsLoading) return;
      if (rowsFilteredBySearch.length === 0) return;

      const exportRows = rowsFilteredBySearch
        .map((r) => {
          const email = rowRecipientEmail(r);
          if (!email) return null;

          const displayName = rowName(r);
          const creds = credsByEmail[email];
          const matchOk = Boolean(r["match_ok"]);
          const score = Number(r["match_score"] ?? 0);

          return {
            Nombre: displayName,
            Email: email,
            "Usuario App": creds?.username ?? "-",
            "Contraseña App": creds?.password ?? "-",
            Match: matchOk ? "OK" : "Revisar",
            Score: Number.isFinite(score) ? Number(score.toFixed(2)) : "-",
          };
        })
        .filter(Boolean);

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const filename = `brevo_usuarios_${stamp}.xlsx`;

      let token: string | null = null;
      try {
        token = await Promise.resolve(getAuthToken());
      } catch {
        token = null;
      }
      const res = await fetch("/api/brevo/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error exportando";
      toast({
        title: "No se pudo exportar",
        description: msg,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SENT_EMAILS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSentEmails(
          new Set(
            parsed
              .map((x) =>
                String(x ?? "")
                  .trim()
                  .toLowerCase(),
              )
              .filter((x) => isEmail(x)),
          ),
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        SENT_EMAILS_STORAGE_KEY,
        JSON.stringify(Array.from(sentEmails)),
      );
    } catch {
      // ignore
    }
  }, [sentEmails]);

  function markEmailsAsSent(emails: string[]) {
    setSentEmails((prev) => {
      const next = new Set(prev);
      for (const email of emails) {
        const normalized = String(email ?? "")
          .trim()
          .toLowerCase();
        if (isEmail(normalized)) next.add(normalized);
      }
      return next;
    });
  }

  function markEmailsAsPending(emails: string[]) {
    setSentEmails((prev) => {
      const next = new Set(prev);
      for (const email of emails) {
        const normalized = String(email ?? "")
          .trim()
          .toLowerCase();
        if (isEmail(normalized)) next.delete(normalized);
      }
      return next;
    });
  }

  const selectedList = useMemo(() => {
    return Array.from(selectedEmails).filter((x) => isEmail(x));
  }, [selectedEmails]);

  const credsStats = useMemo(() => {
    const visibleRows = rows.filter((r) => {
      if (!search.trim()) return true;
      const haystack = `${rowName(r)} ${String(r["Correo"] ?? "")} ${String(
        r["Usuario App"] ?? "",
      )}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });

    const pageWithCreds = visibleRows.reduce((acc, r) => {
      const email = rowRecipientEmail(r);
      if (!email) return acc;
      return acc + (credsByEmail[email]?.password ? 1 : 0);
    }, 0);

    const selectedWithCreds = selectedList.reduce(
      (acc, email) => acc + (credsByEmail[email]?.password ? 1 : 0),
      0,
    );
    const totalCreds = Object.keys(credsByEmail).length;
    return { pageWithCreds, selectedWithCreds, totalCreds };
  }, [credsByEmail, rows, search, selectedList]);

  const rowsFilteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = `${rowName(r)} ${String(r["Correo"] ?? "")} ${String(
        r["Usuario App"] ?? "",
      )}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const visibleRows = useMemo(() => {
    return rowsFilteredBySearch.filter((r) => {
      const email = rowRecipientEmail(r);
      if (!email) return false;
      const isSent = sentEmails.has(email);
      return listTab === "sent" ? isSent : !isSent;
    });
  }, [listTab, rowsFilteredBySearch, sentEmails]);

  const visibleEmails = useMemo(() => {
    const out: string[] = [];
    for (const r of visibleRows) {
      const email = rowRecipientEmail(r);
      if (email) out.push(email);
    }
    return out;
  }, [visibleRows]);

  const listCounts = useMemo(() => {
    const emailsInDataset = new Set<string>();
    for (const r of rows) {
      const email = rowRecipientEmail(r);
      if (email) emailsInDataset.add(email);
    }
    let sent = 0;
    let pending = 0;
    for (const email of emailsInDataset) {
      if (sentEmails.has(email)) sent += 1;
      else pending += 1;
    }
    return { sent, pending, total: emailsInDataset.size };
  }, [rows, sentEmails]);

  const pageSelectionState = useMemo<boolean | "indeterminate">(() => {
    if (visibleEmails.length === 0) return false;
    const selectedCount = visibleEmails.reduce(
      (acc, email) => acc + (selectedEmails.has(email) ? 1 : 0),
      0,
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

      const alreadyHasStatic = loaded.some(
        (r) => (rowRecipientEmail(r) ?? "") === STATIC_BREVO_EMAIL,
      );

      const loadedWithStatic = alreadyHasStatic
        ? loaded
        : [STATIC_BREVO_ROW, ...loaded];

      setRows(loadedWithStatic);

      // Deriva nombres/credenciales por email desde el dataset
      const nextNames: Record<string, string> = {};
      const nextCreds: Record<string, Creds> = {};
      for (const r of loadedWithStatic) {
        const email = rowRecipientEmail(r);
        if (!email) continue;

        const name = rowName(r);
        if (name && name !== "(sin nombre)") nextNames[email] = name;

        const username = rowAppUsername(r);
        const passwordValue = rowAppPassword(r);

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

      const alreadyHasStatic = rows.some(
        (r) => (rowRecipientEmail(r as BrevoRow) ?? "") === STATIC_BREVO_EMAIL,
      );
      const rowsWithStatic = alreadyHasStatic
        ? rows
        : [STATIC_BREVO_ROW, ...rows];

      setRows(rowsWithStatic as BrevoRow[]);

      const next: Record<string, Creds> = {};

      for (const row of rowsWithStatic) {
        if (!row || typeof row !== "object") continue;

        const recipientEmail = rowRecipientEmail(row as BrevoRow);
        if (!recipientEmail) continue;

        const username = rowAppUsername(row as BrevoRow);
        const passwordValue = rowAppPassword(row as BrevoRow);

        if (username || passwordValue) {
          next[recipientEmail] = mergeCreds(next[recipientEmail], {
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
          const email = rowRecipientEmail(r);
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
          template,
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

      markEmailsAsSent(recipients.map((r) => r.email));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Brevo · Envío de correos</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/brevo/events">Ver estado de correos</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="template">Plantilla de correo</Label>
            <Select
              value={template}
              onValueChange={(v) => setTemplate(v as "welcome" | "reminder")}
            >
              <SelectTrigger id="template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome">
                  Día 1 - Bienvenida (con credenciales)
                </SelectItem>
                <SelectItem value="reminder">
                  Día 2 - Recordatorio del Portal
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              {template === "welcome"
                ? "Correo inicial con credenciales de acceso al portal"
                : "Recordatorio para usar el portal como canal principal"}
            </div>
          </div>

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
            {template === "welcome" && (
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña (opcional)</Label>
                <Input
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="(se incluirá en el correo si la completas)"
                />
              </div>
            )}
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
                Se envía al email de <b>Correo</b>. <b>Usuario App</b> es solo
                el acceso.
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
              <Tabs value={listTab} onValueChange={(v) => setListTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="pending">
                    Pendientes ({listCounts.pending})
                  </TabsTrigger>
                  <TabsTrigger value="sent">
                    Enviados ({listCounts.sent})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

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

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="default"
                    disabled={rowsLoading || rowsFilteredBySearch.length === 0}
                    onClick={exportVisibleRowsToExcel}
                  >
                    Exportar Excel ({rowsFilteredBySearch.length})
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={selectedList.length === 0}
                    onClick={() => {
                      if (listTab === "pending") markEmailsAsSent(selectedList);
                      else markEmailsAsPending(selectedList);
                    }}
                  >
                    {listTab === "pending"
                      ? "Mover seleccionados a enviados"
                      : "Mover seleccionados a pendientes"}
                  </Button>
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
                      <TableHead className="w-[180px]">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rowsLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          Cargando dataset...
                        </TableCell>
                      </TableRow>
                    ) : visibleRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          No hay registros para mostrar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleRows.map((r, idx) => {
                        const email = rowRecipientEmail(r);
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
                            <TableCell className="text-sm">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (listTab === "pending")
                                    markEmailsAsSent([email]);
                                  else markEmailsAsPending([email]);
                                }}
                              >
                                {listTab === "pending"
                                  ? "Marcar como enviado"
                                  : "Volver a pendientes"}
                              </Button>
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
