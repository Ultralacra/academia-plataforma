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
import AudioBubble from "./AudioBubble";

function MessageAttachment({
  attachment,
  onPreview,
  isMine,
  timeLabel,
  delivered,
  read,
}: {
  attachment: Attachment;
  onPreview: (attachment: Attachment) => void;
  isMine: boolean;
  timeLabel?: string;
  delivered?: boolean;
  read?: boolean;
}) {
  const isImage = attachment.mime.startsWith("image/");
  const isAudio = attachment.mime.startsWith("audio/");
  return (
    <div className="mt-2">
      {isAudio && attachment.url ? (
        <div className="flex items-center gap-2">
          <AudioBubble
            src={attachment.url}
            isMine={isMine}
            timeLabel={timeLabel}
            delivered={delivered}
            read={read}
          />
          <Button size="icon" variant="ghost" asChild>
            <a href={attachment.url} download={attachment.name}>
              <Download className="w-4 h-4" />
            </a>
          </Button>
        </div>
      ) : (
        <div
          className="p-2 border rounded-md flex items-center gap-3 hover:bg-muted/50 cursor-pointer"
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
      )}
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
          <AvatarImage
            src="https://valinkgroup.com/wp-content/uploads/2025/09/LogoHAHL600x600px2.jpg"
            alt="Avatar"
          />
          <AvatarFallback>
            {message.sender.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      {/* Role badge */}
      <div className="flex items-center gap-2">
        <div className="text-xs font-semibold text-[#075e54]">
          {String(message.sender || "")
            .charAt(0)
            .toUpperCase() + String(message.sender || "").slice(1)}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium ${
            String(message.sender || "")
              .toLowerCase()
              .includes("coach")
              ? "bg-indigo-100 text-indigo-800"
              : String(message.sender || "")
                    .toLowerCase()
                    .includes("alum")
                ? "bg-emerald-100 text-emerald-800"
                : "bg-gray-100 text-gray-800"
          }`}
        >
          {String(message.sender || "")
            .toLowerCase()
            .includes("coach")
            ? "Coach"
            : String(message.sender || "")
                  .toLowerCase()
                  .includes("alum")
              ? "Alumno"
              : "Admin"}
        </span>
      </div>
      <div
        className={`max-w-md w-fit rounded-lg px-3 py-2 text-sm ${bubbleClasses}`}
      >
        <p>{message.text}</p>
        {message.attachments?.map((att: Attachment) => (
          <MessageAttachment
            key={att.id}
            attachment={att}
            onPreview={onPreviewAttachment}
            isMine={isMine}
            timeLabel={formatTime(message.at)}
            delivered={message.delivered}
            read={message.read}
          />
        ))}
        <div
          className={`text-xs mt-1 ${
            isMine ? "text-primary-foreground/70" : "text-muted-foreground/70"
          }`}
        >
          {formatTime(message.at)}
          {isMine && (
            <span className="ml-2 inline-flex items-center gap-1">
              {message.read ? (
                // doble check cuando está leído
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                  fill="currentColor"
                >
                  <path d="M1 14l4 4L15 8" />
                  <path d="M9 14l4 4L23 8" />
                </svg>
              ) : message.delivered ? (
                // un check cuando está entregado
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                  fill="currentColor"
                >
                  <path d="M1 14l4 4L15 8" />
                </svg>
              ) : null}
            </span>
          )}
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
