"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, BrainCircuit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ChatHeader({
  title,
  subtitle,
  isConnected,
  onGenerateTicket,
  onDeleteChat,
}: {
  title: string;
  subtitle?: string;
  isConnected: boolean;
  onGenerateTicket: () => void;
  onDeleteChat: () => void;
}) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const brandAvatarSrc =
    "https://valinkgroup.com/wp-content/uploads/2025/09/LogoHAHL600x600px2.jpg";

  return (
    <>
      <div className="flex items-center p-4 border-b">
        <div className="mr-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={brandAvatarSrc} alt={title} />
            <AvatarFallback>
              {(title || "?").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="truncate">{title}</span>
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onGenerateTicket}>
              <BrainCircuit className="w-4 h-4 mr-2" />
              Generar Ticket (IA)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmDeleteOpen(true)}
              className="text-red-500 focus:text-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el historial de chat del
              servidor. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteChat();
                setConfirmDeleteOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
