"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Mic, Send, X, CornerDownLeft } from "lucide-react";
import { PendingAttachment } from "./chat-types";
import Image from "next/image";

function PendingAttachmentItem({
  attachment,
  onRemove,
}: {
  attachment: PendingAttachment;
  onRemove: () => void;
}) {
  return (
    <div className="relative group w-20 h-20 rounded-md overflow-hidden border">
      {attachment.preview ? (
        <Image
          src={attachment.preview}
          alt={attachment.file.name}
          layout="fill"
          objectFit="cover"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <Paperclip className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/20"
          onClick={onRemove}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

export function MessageInput({
  text,
  setText,
  onSend,
  onFileSelect,
  onNotifyTyping,
  isRecording,
  onToggleRecording,
  pendingAttachments,
  onRemoveAttachment,
  isSending,
}: {
  text: string;
  setText: (text: string) => void;
  onSend: () => void;
  onFileSelect: (files: FileList | null) => void;
  onNotifyTyping: (on: boolean) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  pendingAttachments: PendingAttachment[];
  onRemoveAttachment: (index: number) => void;
  isSending: boolean;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t p-4 bg-background">
      {pendingAttachments.length > 0 && (
        <div className="mb-2 p-2 border rounded-md">
          <div className="flex items-center gap-2 flex-wrap">
            {pendingAttachments.map((att, i) => (
              <PendingAttachmentItem
                key={i}
                attachment={att}
                onRemove={() => onRemoveAttachment(i)}
              />
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => onFileSelect(e.target.files)}
          className="hidden"
          multiple
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-5 h-5" />
        </Button>
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Escribe un mensaje..."
            className="pr-10"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onNotifyTyping(true);
            }}
            onBlur={() => onNotifyTyping(false)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <CornerDownLeft className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <Button
          size="icon"
          variant={isRecording ? "destructive" : "ghost"}
          onClick={onToggleRecording}
        >
          <Mic className="w-5 h-5" />
        </Button>
        <Button size="icon" onClick={onSend} disabled={isSending}>
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
