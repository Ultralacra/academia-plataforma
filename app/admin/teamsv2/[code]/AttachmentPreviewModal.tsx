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
import VideoPlayer from "@/components/chat/VideoPlayer";

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
      <DialogContent
        className={
          isImage
            ? "max-w-[95vw] h-[95vh] flex flex-col p-3"
            : "max-w-4xl h-[90vh] flex flex-col"
        }
      >
        <DialogHeader className="pb-2">
          <DialogTitle
            className="text-xs font-semibold truncate"
            title={attachment.name}
          >
            {attachment.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex items-center justify-center bg-black/80 rounded-md overflow-hidden">
          {isImage && (
            <img
              src={url}
              alt={attachment.name}
              className="w-full h-full object-contain"
            />
          )}
          {isVideo && (
            <VideoPlayer src={url} className="max-w-full max-h-full" />
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
            <div className="w-full h-full flex flex-col items-center justify-center px-6 py-8 text-center">
              <div className="mb-4 h-12 w-12 rounded-xl bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700">
                DOC
              </div>
              <p
                className="text-sm font-semibold mb-1 truncate max-w-[90%]"
                title={attachment.name}
              >
                {attachment.name}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {formatBytes(attachment.size)}
              </p>
              <Button asChild className="mt-1">
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
