"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

type UserType = {
  id: number;
  codigo: string;
  name: string;
  email: string;
  role: string;
  tipo: string;
};

export function CreateLeadDialog({ onCreated }: { onCreated: () => void }) {
  // Control de qué modal está visible: "create" | "users" | null
  const [activeModal, setActiveModal] = React.useState<
    "create" | "users" | null
  >(null);

  // Estados del formulario (persistentes mientras se navega entre modales)
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [campaignCodigo, setCampaignCodigo] = React.useState<string>("");
  const [status, setStatus] = React.useState("new");
  const [loading, setLoading] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);

  // Estados para usuarios
  const [users, setUsers] = React.useState<UserType[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [selectedUserCodigo, setSelectedUserCodigo] =
    React.useState<string>("");
  const [userSearchQuery, setUserSearchQuery] = React.useState("");

  // Campañas
  const [campaigns, setCampaigns] = React.useState<LeadOrigin[]>([]);
  const [campaignsLoading, setCampaignsLoading] = React.useState(false);

  const DEFAULT_OWNER_CODIGO = (
    process.env.NEXT_PUBLIC_CRM_DEFAULT_OWNER_CODIGO || ""
  ).trim();

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
      const response = await apiFetch<{ data: UserType[]; total: number }>(
        "/users?pageSize=1000",
      );
      const usersData = response?.data || [];
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

  // Cargar datos cuando se abre el modal de creación
  React.useEffect(() => {
    if (activeModal === "create") {
      loadCampaigns();
      loadUsers();
    }
  }, [activeModal, loadCampaigns, loadUsers]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setCampaignCodigo("");
    setStatus("new");
    setSelectedUserCodigo("");
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setActiveModal("create");
    } else {
      setActiveModal(null);
      resetForm();
    }
  };

  const submit = async () => {
    if (!name.trim()) return;

    const selectedCampaign = campaignCodigo
      ? campaigns.find((c) => String(c.codigo) === String(campaignCodigo))
      : null;

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

      setActiveModal(null);
      resetForm();
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

  const filteredUsers = users.filter((user) => {
    const query = userSearchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  return (
    <>
      {/* Botón para abrir */}
      <Button
        size="sm"
        className="gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow hover:from-indigo-600 hover:to-sky-600"
        onClick={() => setActiveModal("create")}
      >
        <Plus className="h-4 w-4" /> Nuevo lead
      </Button>

      {/* Modal de creación de lead */}
      <Dialog open={activeModal === "create"} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg border-0 bg-gradient-to-br from-white via-indigo-50/70 to-slate-50/80 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-semibold text-slate-900">
              Crear lead
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Completa los datos para registrar un nuevo prospecto.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nombre *
              </Label>
              <Input
                className="bg-white/90"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </Label>
              <Input
                className="bg-white/90"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Teléfono
              </Label>
              <Input
                className="bg-white/90"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Campaña (source)
              </Label>
              <select
                className="h-10 w-full rounded-md border border-indigo-200 bg-white/90 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </Label>
              <select
                className="h-10 w-full rounded-md border border-indigo-200 bg-white/90 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <div className="col-span-2 space-y-2">
              <Label>Asignar a usuario</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 justify-between"
                  onClick={() => setActiveModal("users")}
                  disabled={usersLoading}
                >
                  {selectedUserCodigo
                    ? users.find((u) => u.codigo === selectedUserCodigo)
                        ?.name || "Usuario seleccionado"
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
            <div className="col-span-2 flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={resetForm}
                className="rounded-full border-slate-300 hover:bg-slate-100"
              >
                Limpiar
              </Button>
              <Button
                onClick={submit}
                disabled={loading || assigning || !name.trim()}
                className="rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow hover:from-indigo-600 hover:to-sky-600"
              >
                {loading || assigning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {assigning ? "Asignando..." : "Crear lead"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de selección de usuario */}
      <Dialog
        open={activeModal === "users"}
        onOpenChange={(open) => {
          if (!open) setActiveModal("create");
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[600px] flex flex-col border-0 bg-gradient-to-br from-white via-indigo-50/60 to-slate-50/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Seleccionar Usuario
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Asigna el lead a un miembro del equipo de ventas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9 bg-white/90"
              />
            </div>

            {/* Lista de usuarios */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200/70 bg-white/60">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUserCodigo === user.codigo;
                    return (
                      <button
                        key={user.codigo}
                        onClick={() => {
                          setSelectedUserCodigo(user.codigo);
                          setUserSearchQuery("");
                          setActiveModal("create");
                        }}
                        className={`w-full p-4 text-left transition hover:bg-indigo-50/50 ${
                          isSelected
                            ? "bg-indigo-50 border-l-4 border-indigo-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-inner">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">
                                {user.name}
                              </p>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-indigo-100 text-indigo-600 border-indigo-200"
                              >
                                Ventas
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500 truncate">
                              {user.email}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="text-indigo-600 text-sm font-semibold">
                              Seleccionado
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      No se encontraron usuarios de ventas
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setUserSearchQuery("");
                setActiveModal("create");
              }}
              className="rounded-full border-slate-300 hover:bg-slate-100"
            >
              Volver al formulario
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
