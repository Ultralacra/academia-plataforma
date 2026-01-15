"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Search, User, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { createLead } from "../api";
import { listLeadOrigins, type LeadOrigin } from "../api";
import { apiFetch } from "@/lib/api-config";
import { Badge } from "@/components/ui/badge";

export function CreateLeadDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
        >
          <Plus className="h-4 w-4" /> Nuevo lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear lead</DialogTitle>
        </DialogHeader>
        <CreateLeadForm
          onCreated={() => {
            setOpen(false);
            onCreated();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

type User = {
  id: number;
  codigo: string;
  name: string;
  email: string;
  role: string;
  tipo: string;
};

function CreateLeadForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [campaignCodigo, setCampaignCodigo] = React.useState<string>("");
  const [status, setStatus] = React.useState("new");
  const [loading, setLoading] = React.useState(false);

  // Estados para usuarios y asignación
  const [users, setUsers] = React.useState<User[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [selectedUserCodigo, setSelectedUserCodigo] =
    React.useState<string>("");
  const [userModalOpen, setUserModalOpen] = React.useState(false);
  const [userSearchQuery, setUserSearchQuery] = React.useState("");
  const [assigning, setAssigning] = React.useState(false);

  const DEFAULT_OWNER_CODIGO = (
    process.env.NEXT_PUBLIC_CRM_DEFAULT_OWNER_CODIGO || ""
  ).trim();

  const [campaigns, setCampaigns] = React.useState<LeadOrigin[]>([]);
  const [campaignsLoading, setCampaignsLoading] = React.useState(false);

  const loadCampaigns = React.useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const items = await listLeadOrigins();
      setCampaigns(Array.isArray(items) ? items : []);
    } catch (e: any) {
      setCampaigns([]);
      toast({
        title: "Error",
        description: e?.message || "No se pudieron cargar las campañas",
        variant: "destructive",
      });
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const loadUsers = React.useCallback(async () => {
    setUsersLoading(true);
    try {
      // Obtener todos los usuarios con pageSize grande
      const response = await apiFetch<{ data: User[]; total: number }>(
        "/users?pageSize=1000"
      );
      const usersData = response?.data || [];
      // Filtrar solo usuarios con role "sales"
      const salesUsers = usersData.filter((u: any) => u.role === "sales");
      setUsers(Array.isArray(salesUsers) ? salesUsers : []);
    } catch (e: any) {
      setUsers([]);
      toast({
        title: "Error",
        description: e?.message || "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // Cargar campañas para el selector de source
    loadCampaigns();
    // Cargar usuarios para asignación
    loadUsers();
  }, [loadCampaigns, loadUsers]);

  const submit = async () => {
    if (!name.trim()) return;

    const selectedCampaign = campaignCodigo
      ? campaigns.find((c) => String(c.codigo) === String(campaignCodigo))
      : null;

    // Si viene de campaña, asociamos por source_entity_id y dejamos un source legible.
    // Si no viene de campaña, usamos source=manual_form y aplicamos owner_codigo default (oculto).
    const computedSource = selectedCampaign
      ? String(selectedCampaign.name || selectedCampaign.codigo)
      : "manual_form";
    const computedOwnerCodigo = selectedCampaign
      ? undefined
      : DEFAULT_OWNER_CODIGO || undefined;

    setLoading(true);
    try {
      const result = await createLead({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source: computedSource,
        status: status.trim() || undefined,
        owner_codigo: computedOwnerCodigo,
        ...(selectedCampaign
          ? {
              source_entity_id: String(selectedCampaign.codigo),
              source_entity: "lead_origin",
            }
          : {}),
      });

      const leadCodigo = result?.codigo;

      // Si se seleccionó un usuario, asignar el lead
      if (selectedUserCodigo && leadCodigo) {
        setAssigning(true);
        try {
          await apiFetch(`/leads/${leadCodigo}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_codigo: selectedUserCodigo }),
          });
          toast({
            title: "Lead creado y asignado",
            description: `${name.trim()} asignado correctamente`,
          });
        } catch (assignError: any) {
          // Traducir errores específicos
          let errorMessage =
            assignError?.message || "No se pudo asignar el lead";

          if (errorMessage.includes("User is not a sales user")) {
            errorMessage = "El usuario seleccionado no es un usuario de ventas";
          }

          toast({
            title: "Lead creado pero no asignado",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setAssigning(false);
        }
      } else {
        toast({ title: "Lead creado", description: name.trim() });
      }

      onCreated();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo crear el lead",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 space-y-2">
        <Label>Nombre *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Teléfono</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Campaña (source)</Label>
        <select
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none"
          value={campaignCodigo}
          onChange={(e) => setCampaignCodigo(e.target.value)}
          disabled={campaignsLoading}
        >
          <option value="">
            {campaignsLoading ? "Cargando campañas..." : "Sin campaña"}
          </option>
          {campaigns.map((c) => (
            <option key={String(c.codigo)} value={String(c.codigo)}>
              {String(c.name || c.codigo)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Asignar a usuario</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 justify-between"
            onClick={() => setUserModalOpen(true)}
            disabled={usersLoading}
          >
            {selectedUserCodigo
              ? users.find((u) => u.codigo === selectedUserCodigo)?.name ||
                "Usuario seleccionado"
              : usersLoading
              ? "Cargando usuarios..."
              : "Seleccionar usuario (opcional)"}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          {selectedUserCodigo && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setSelectedUserCodigo("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Estado</Label>
        <select
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="new">Nuevo</option>
          <option value="contacted">Contactado</option>
          <option value="qualified">Calificado</option>
          <option value="won">Ganado</option>
          <option value="lost">Perdido</option>
        </select>
      </div>
      <div className="col-span-2 flex justify-end gap-2 mt-2">
        <Button
          variant="outline"
          onClick={() => {
            setName("");
            setEmail("");
            setPhone("");
            setCampaignCodigo("");
            setStatus("new");
          }}
        >
          Limpiar
        </Button>
        <Button
          onClick={submit}
          disabled={loading || assigning || !name.trim()}
        >
          {loading || assigning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {assigning ? "Asignando..." : "Crear lead"}
        </Button>
      </div>

      {/* Modal de selección de usuario */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Seleccionar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Lista de usuarios */}
            <div className="flex-1 overflow-y-auto border rounded-md">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="divide-y">
                  {users
                    .filter((user) => {
                      const query = userSearchQuery.toLowerCase();
                      return (
                        user.name.toLowerCase().includes(query) ||
                        user.email.toLowerCase().includes(query) ||
                        user.role.toLowerCase().includes(query)
                      );
                    })
                    .map((user) => (
                      <button
                        key={user.codigo}
                        onClick={() => {
                          setSelectedUserCodigo(user.codigo);
                          setUserModalOpen(false);
                          setUserSearchQuery("");
                        }}
                        className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                          selectedUserCodigo === user.codigo
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">
                                {user.name}
                              </p>
                              <Badge variant="secondary" className="text-xs">
                                Ventas
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500 truncate">
                              {user.email}
                            </p>
                          </div>
                          {selectedUserCodigo === user.codigo && (
                            <div className="text-blue-600">✓</div>
                          )}
                        </div>
                      </button>
                    ))}
                  {users.filter((user) => {
                    const query = userSearchQuery.toLowerCase();
                    return (
                      user.name.toLowerCase().includes(query) ||
                      user.email.toLowerCase().includes(query) ||
                      user.role.toLowerCase().includes(query)
                    );
                  }).length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      No se encontraron usuarios de ventas
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
