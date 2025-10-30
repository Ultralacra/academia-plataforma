"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Attachment } from "./chat-types";

export function AttachmentPreviewModal({
  open,
  onOpenChange,
  attachment,
  getAttachmentUrl,
  formatBytes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: Attachment | null;
  getAttachmentUrl: (attachment: Attachment) => string;
  formatBytes: (bytes?: number) => string;
}) {
  if (!attachment) return null;

  const url = getAttachmentUrl(attachment);
  const isImage = attachment.mime.startsWith("image/");
  const isVideo = attachment.mime.startsWith("video/");
  const isAudio = attachment.mime.startsWith("audio/");
  const isPdf = attachment.mime === "application/pdf";
  const isOther = !isImage && !isVideo && !isAudio && !isPdf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{attachment.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex items-center justify-center bg-muted/40 rounded-md">
          {isImage && (
            <img
              src={url}
              alt={attachment.name}
              className="max-w-full max-h-full object-contain"
            />
          )}
          {isVideo && (
            <video
              src={url}
              controls
              className="max-w-full max-h-full"
              autoPlay
            />
          )}
          {isAudio && <audio src={url} controls autoPlay className="w-full" />}
          {isPdf && (
            <iframe
              src={url}
              className="w-full h-full"
              title={attachment.name}
            />
          )}
          {isOther && (
            <div className="text-center p-8">
              <p className="text-lg font-semibold">
                Vista previa no disponible
              </p>
              <p className="text-muted-foreground">
                {attachment.name} ({formatBytes(attachment.size)})
              </p>
              <Button asChild className="mt-4">
                <a href={url} download={attachment.name}>
                  Descargar
                </a>
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button asChild>
            <a href={url} download={attachment.name}>
              Descargar
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
