"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { fetchUser, updateUser, type SysUser } from "../api";
import { fetchRoles, type Role } from "../../access/roles/api";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="sm:col-span-3">{children}</div>
    </div>
  );
}

function ProfileForm({
  user,
  onSaved,
}: {
  user: SysUser;
  onSaved: (u: SysUser) => void;
}) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [role, setRole] = useState(user?.role || "alumno");
  const [roles, setRoles] = useState<Role[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setRole(user?.role || "alumno");
  }, [user?.name, user?.email, user?.role]);

  useEffect(() => {
    let alive = true;
    fetchRoles({ page: 1, pageSize: 100 })
      .then((res) => {
        if (!alive) return;
        setRoles(res.data || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function handleConfirm() {
    try {
      setSaving(true);
      const res = await updateUser(user.codigo || String(user.id), {
        name,
        email,
        role,
      });
      const updated = (res as any)?.data ?? null;
      if (updated) onSaved(updated as SysUser);
      toast({
        title: "Usuario actualizado",
        description: `Se guardaron los cambios de perfil.`,
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo actualizar",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  const dirty =
    name !== (user?.name || "") ||
    email !== (user?.email || "") ||
    role !== (user?.role || "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Datos del usuario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre completo"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </Field>
        <Field label="Rol">
          <Select value={role} onValueChange={setRole as any}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar rol" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem value={r.name} key={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex justify-end">
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button disabled={!dirty || saving}>
                <Save className="h-4 w-4 mr-2" /> Guardar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar guardado</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Deseas guardar los cambios en el perfil del usuario?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm} disabled={saving}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordForm({ user }: { user: SysUser }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleConfirm() {
    try {
      setSaving(true);
      await updateUser(user.codigo || String(user.id), { password });
      toast({
        title: "Contraseña actualizada",
        description: `La clave fue actualizada correctamente.`,
      });
      setPassword("");
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo actualizar la clave",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  const disabled = !password || password.length < 8;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Cambiar contraseña</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Nueva clave">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ContraseñaSegura123!"
          />
        </Field>
        <div className="flex justify-end">
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button disabled={disabled || saving} variant="outline">
                <Save className="h-4 w-4 mr-2" /> Actualizar clave
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar actualización</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Seguro que deseas actualizar la contraseña de este usuario?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm} disabled={saving}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function UserDetailInner() {
  const params = useParams();
  const router = useRouter();
  const codigo = String(params?.codigo || "");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SysUser | null>(null);

  useEffect(() => {
    let alive = true;
    if (!codigo) return;
    setLoading(true);
    fetchUser(codigo)
      .then((u) => {
        if (!alive) return;
        setUser(u);
      })
      .catch((e) => {
        toast({
          title: "Error",
          description: "No se pudo cargar el usuario",
          variant: "destructive",
        });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [codigo]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Cargando usuario…</div>
    );
  }
  if (!user) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Usuario no encontrado.
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/users")}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/users")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Usuario</h1>
          <p className="text-xs text-muted-foreground">
            Código: {user.codigo || user.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProfileForm user={user} onSaved={setUser as any} />
        <PasswordForm user={user} />
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <UserDetailInner />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
