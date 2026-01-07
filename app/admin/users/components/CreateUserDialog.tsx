"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { createUser } from "../api";
import { fetchRoles, type Role } from "../../access/roles/api";
import { getOptions, type OpcionItem } from "../../opciones/api";

const TIPO_OPTIONS = ["equipo", "cliente"] as const;
const NONE_VALUE = "__none__";

export function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [roles, setRoles] = React.useState<Role[]>([]);
  const [puestoOptions, setPuestoOptions] = React.useState<OpcionItem[]>([]);
  const [areaOptions, setAreaOptions] = React.useState<OpcionItem[]>([]);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<string>("equipo");
  const [tipo, setTipo] = React.useState<string>("equipo");
  const [puesto, setPuesto] = React.useState<string>(NONE_VALUE);
  const [area, setArea] = React.useState<string>(NONE_VALUE);

  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const [rolesRes, puestosRes, areasRes] = await Promise.all([
          fetchRoles({ page: 1, pageSize: 200 }),
          getOptions("puesto"),
          getOptions("area"),
        ]);
        if (!alive) return;
        setRoles(Array.isArray(rolesRes?.data) ? rolesRes.data : []);
        setPuestoOptions(Array.isArray(puestosRes) ? puestosRes : []);
        setAreaOptions(Array.isArray(areasRes) ? areasRes : []);

        // Defaults razonables si vienen opciones
        if (puesto === NONE_VALUE && puestosRes?.[0]?.opcion_key)
          setPuesto(puestosRes[0].opcion_key);
        if (area === NONE_VALUE && areasRes?.[0]?.opcion_key)
          setArea(areasRes[0].opcion_key);
      } catch {
        // si fallan las opciones, dejamos selects vacíos
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit = Boolean(name.trim() && email.trim() && password);

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("equipo");
    setTipo("equipo");
    setPuesto(NONE_VALUE);
    setArea(NONE_VALUE);
  };

  const doCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        tipo,
        puesto: puesto === NONE_VALUE ? "" : puesto,
        area: area === NONE_VALUE ? "" : area,
      });
      toast({
        title: "Usuario creado",
        description: `${name.trim()} (${email.trim()})`,
      });
      setConfirmOpen(false);
      setOpen(false);
      reset();
      onCreated();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirmOpen(false);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" /> Crear usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Contraseña</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ContraseñaSegura123!"
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar role" />
              </SelectTrigger>
              <SelectContent>
                {(roles.length
                  ? roles.map((r) => r.name)
                  : ["admin", "equipo", "alumno"]
                ).map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Puesto</Label>
            <Select value={puesto} onValueChange={setPuesto}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar puesto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>(Sin definir)</SelectItem>
                {puestoOptions.map((o) => (
                  <SelectItem
                    key={String(o.codigo ?? o.opcion_key)}
                    value={o.opcion_key}
                  >
                    {o.opcion_value || o.opcion_key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Área</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>(Sin definir)</SelectItem>
                {areaOptions.map((o) => (
                  <SelectItem
                    key={String(o.codigo ?? o.opcion_key)}
                    value={o.opcion_key}
                  >
                    {o.opcion_value || o.opcion_key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={reset} disabled={submitting}>
            Limpiar
          </Button>

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Crear
          </Button>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar creación</AlertDialogTitle>
              <AlertDialogDescription>
                Se creará el usuario con:
                <br />
                <span className="font-medium">
                  {name || "(sin nombre)"}
                </span> — {email || "(sin email)"}
                <br />
                role={role}, tipo={tipo}, puesto={puesto || "(sin definir)"},
                area={area || "(sin definir)"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void doCreate();
                }}
                disabled={submitting || !canSubmit}
              >
                Confirmar crear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
