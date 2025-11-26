"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Home,
  ExternalLink,
  MessageSquare,
  CalendarClock,
  Gift,
  GraduationCap,
  BarChart3,
} from "lucide-react";

function CredsCard({
  title,
  storageKey,
  placeholderUrl,
}: {
  title: string;
  storageKey: string;
  placeholderUrl?: string;
}) {
  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const j = JSON.parse(raw);
        setUrl(j?.url || "");
        setUser(j?.user || "");
        setPass(j?.pass || "");
      }
    } catch {}
  }, [storageKey]);

  function save() {
    try {
      setSaving(true);
      const payload = { url: url.trim(), user: user.trim(), pass };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
    setTimeout(() => setSaving(false), 400);
  }

  const href = (url || "").trim();

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2">
          <div className="space-y-1">
            <Label>URL</Label>
            <Input
              placeholder={placeholderUrl || "https://..."}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Usuario</Label>
            <Input
              placeholder="usuario"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Clave</Label>
            <Input
              type="password"
              placeholder="********"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          <Button asChild disabled={!href}>
            <a href={href || "#"} target="_blank" rel="noreferrer">
              Abrir <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InternalCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description?: string;
  href: string;
  icon: any;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button asChild variant="secondary">
          <Link href={href}>Entrar</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function StudentInicioPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
      <DashboardLayout>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Home className="w-5 h-5" /> Inicio
          </h1>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <CredsCard
            title="Notion de la academia"
            storageKey={`inicio:notion:${code}`}
            placeholderUrl="https://notion.so/..."
          />

          <CredsCard
            title="Mi School"
            storageKey={`inicio:school:${code}`}
            placeholderUrl="https://school.com/..."
          />

          <InternalCard
            title="Chat soporte"
            description="Habla con Atención al Cliente"
            href={`/admin/alumnos/${code}/chat`}
            icon={MessageSquare}
          />

          <InternalCard
            title="Sesiones"
            description="Gestiona y solicita sesiones"
            href={`/admin/alumnos/${code}/sesiones`}
            icon={CalendarClock}
          />

          <InternalCard
            title="Bonos"
            description="Bonos asignados y extra"
            href={`/admin/alumnos/${code}/bonos`}
            icon={Gift}
          />

          <InternalCard
            title="Mi perfil"
            description="Datos y progreso del alumno"
            href={`/admin/alumnos/${code}/perfil`}
            icon={GraduationCap}
          />

          <InternalCard
            title="Métricas ADS"
            description="Rendimiento de campañas"
            href={`/admin/alumnos/${code}/ads`}
            icon={BarChart3}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
