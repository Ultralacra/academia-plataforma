"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Paperclip, Download } from "lucide-react";
import { Message, Attachment, Sender } from "./chat-types";
import { Button } from "@/components/ui/button";

function MessageAttachment({
  attachment,
  onPreview,
}: {
  attachment: Attachment;
  onPreview: (attachment: Attachment) => void;
}) {
  const isImage = attachment.mime.startsWith("image/");
  return (
    <div
      className="mt-2 p-2 border rounded-md flex items-center gap-3 hover:bg-muted/50 cursor-pointer"
      onClick={() => onPreview(attachment)}
    >
      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
        {isImage && attachment.url ? (
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <Paperclip className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium truncate">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">{attachment.mime}</p>
      </div>
      <Button size="icon" variant="ghost" asChild>
        <a
          href={attachment.url}
          download={attachment.name}
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-4 h-4" />
        </a>
      </Button>
    </div>
  );
}

function MessageBubble({
  message,
  isMine,
  formatTime,
  onPreviewAttachment,
}: {
  message: Message;
  isMine: boolean;
  formatTime: (iso: string | undefined) => string;
  onPreviewAttachment: (attachment: Attachment) => void;
}) {
  const bubbleClasses = isMine
    ? "bg-primary text-primary-foreground self-end"
    : "bg-muted text-muted-foreground self-start";

  return (
    <div className={`flex items-end gap-2 ${isMine ? "justify-end" : ""}`}>
      {!isMine && (
        <Avatar className="w-8 h-8">
          <AvatarImage />
          <AvatarFallback>
            {message.sender.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={`max-w-md w-fit rounded-lg px-3 py-2 text-sm ${bubbleClasses}`}
      >
        <p>{message.text}</p>
        {message.attachments?.map((att: Attachment) => (
          <MessageAttachment
            key={att.id}
            attachment={att}
            onPreview={onPreviewAttachment}
          />
        ))}
        <div
          className={`text-xs mt-1 ${
            isMine ? "text-primary-foreground/70" : "text-muted-foreground/70"
          }`}
        >
          {formatTime(message.at)}
        </div>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  myRole,
  scrollRef,
  bottomRef,
  onScroll,
  formatTime,
  onPreviewAttachment,
}: {
  messages: Message[];
  myRole: Sender;
  scrollRef: React.RefObject<HTMLDivElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
  formatTime: (iso: string | undefined) => string;
  onPreviewAttachment: (attachment: Attachment) => void;
}) {
  const mine = (sender: Sender) =>
    (sender || "").toLowerCase() === myRole.toLowerCase();

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 p-4 overflow-y-auto"
    >
      <div className="flex flex-col gap-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMine={mine(msg.sender)}
            formatTime={formatTime}
            onPreviewAttachment={onPreviewAttachment}
          />
        ))}
      </div>
      <div ref={bottomRef} className="h-px" />
    </div>
  );
}
