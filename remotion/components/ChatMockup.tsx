import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../styles";
import { MessageBubble } from "./MessageBubble";

interface ChatMessage {
  text: string;
  isUser: boolean;
  delay: number;
}

interface ChatMockupProps {
  messages: ChatMessage[];
  showTyping?: boolean;
  typingDelay?: number;
}

export function ChatMockup({ messages, showTyping = false, typingDelay = 0 }: ChatMockupProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80, mass: 0.8 },
  });

  const containerOpacity = interpolate(containerProgress, [0, 1], [0, 1]);
  const containerScale = interpolate(containerProgress, [0, 1], [0.9, 1]);

  const typingProgress = spring({
    frame: frame - typingDelay,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const typingOpacity = interpolate(typingProgress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        opacity: containerOpacity,
        transform: `scale(${containerScale})`,
        width: "100%",
        maxWidth: 700,
        height: "100%",
        maxHeight: 600,
        borderRadius: 24,
        overflow: "hidden",
        background: COLORS.white,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        border: `1px solid ${COLORS.primary}20`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${COLORS.lightGray}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: `linear-gradient(135deg, ${COLORS.primary}08, ${COLORS.primaryLight}05)`,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          🤖
        </div>
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: COLORS.dark,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Emma · Asistente IA
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: COLORS.success,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: COLORS.success,
              }}
            />
            En línea
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 0",
          background: COLORS.lightGray,
        }}
      >
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            text={msg.text}
            isUser={msg.isUser}
            delay={msg.delay}
          />
        ))}

        {showTyping && (
          <div
            style={{
              opacity: typingOpacity,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 24px",
              marginTop: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              🤖
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: "12px 16px",
                borderRadius: 16,
                background: COLORS.white,
                border: `1px solid ${COLORS.primary}20`,
              }}
            >
              {[0, 1, 2].map((i) => (
                <TypingDot key={i} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: "16px 20px",
          borderTop: `1px solid ${COLORS.lightGray}`,
          display: "flex",
          gap: 12,
          alignItems: "center",
          background: COLORS.white,
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid ${COLORS.primary}30`,
            background: COLORS.lightGray,
            fontSize: 15,
            color: COLORS.gray,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Escríbeme tu consulta...
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: COLORS.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          ➤
        </div>
      </div>
    </div>
  );
}

function TypingDot({ index }: { index: number }) {
  const frame = useCurrentFrame();
  const bounce = Math.sin((frame + index * 8) * 0.15) * 3;

  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: COLORS.gray,
        transform: `translateY(${bounce}px)`,
      }}
    />
  );
}
