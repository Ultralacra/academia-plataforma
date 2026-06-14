import React from "react";
import { AbsoluteFill, Sequence, Img, staticFile, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../styles";

export function EmmaChatDemo() {
  return (
    <AbsoluteFill style={{ background: COLORS.lightGray }}>
      <Sequence from={0} durationInFrames={500}>
        <ChatDemoScene />
      </Sequence>
    </AbsoluteFill>
  );
}

function ChatDemoScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80, mass: 0.8 },
  });

  const containerOpacity = interpolate(containerProgress, [0, 1], [0, 1]);
  const containerScale = interpolate(containerProgress, [0, 1], [0.9, 1]);

  const messages = [
    {
      text: "¡Hola! 👋 Soy Emma, tu asistente IA. ¿En qué puedo ayudarte hoy?",
      isUser: false,
      delay: 30,
    },
    {
      text: "Hola Emma, tengo una duda sobre mi membresía",
      isUser: true,
      delay: 100,
    },
    {
      text: "¡Claro! Puedo ayudarte con información sobre membresías, pausas, extensiones y más. ¿Qué necesitas saber específicamente?",
      isUser: false,
      delay: 180,
    },
    {
      text: "¿Puedo pausar mi programa por un mes?",
      isUser: true,
      delay: 280,
    },
    {
      text: "Sí, puedes solicitar una pausa contractual. Te ayudo a gestionarla ahora mismo. ¿Cuál es el motivo de la pausa?",
      isUser: false,
      delay: 360,
    },
    {
      text: "Voy a viajar por trabajo",
      isUser: true,
      delay: 450,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        opacity: containerOpacity,
        transform: `scale(${containerScale})`,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          height: "100%",
          maxHeight: 750,
          borderRadius: 24,
          overflow: "hidden",
          background: COLORS.white,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: `1px solid ${COLORS.primary}20`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ChatHeader />
        <ChatMessages messages={messages} />
        <ChatInput />
      </div>

      <NarrationBubble frame={frame} />
    </AbsoluteFill>
  );
}

function ChatHeader() {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderBottom: `1px solid ${COLORS.lightGray}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: `linear-gradient(135deg, ${COLORS.primary}08, ${COLORS.primaryLight}05)`,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          overflow: "hidden",
          border: `2px solid ${COLORS.primary}`,
        }}
      >
        <Img
          src={staticFile("emma-avatar.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
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
            gap: 8,
            fontSize: 13,
            color: COLORS.success,
            fontFamily: "Inter, system-ui, sans-serif",
            marginTop: 4,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: COLORS.success,
            }}
          />
          En línea
        </div>
      </div>
    </div>
  );
}

function ChatMessages({ messages }: { messages: Array<{ text: string; isUser: boolean; delay: number }> }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 0",
        background: COLORS.lightGray,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {messages.map((msg, i) => {
        const progress = spring({
          frame: frame - msg.delay,
          fps,
          config: { damping: 15, stiffness: 120, mass: 0.6 },
        });

        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const translateY = interpolate(progress, [0, 1], [20, 0]);
        const scale = interpolate(progress, [0, 0.8, 1], [0.8, 1.02, 1]);

        return (
          <div
            key={i}
            style={{
              opacity,
              transform: `translateY(${translateY}px) scale(${scale})`,
              display: "flex",
              justifyContent: msg.isUser ? "flex-end" : "flex-start",
              padding: "0 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                flexDirection: msg.isUser ? "row-reverse" : "row",
              }}
            >
              {!msg.isUser && (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <Img
                    src={staticFile("emma-avatar.png")}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              )}
              <div
                style={{
                  maxWidth: "70%",
                  padding: "14px 20px",
                  borderRadius: msg.isUser ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
                  background: msg.isUser ? COLORS.accent : COLORS.white,
                  color: msg.isUser ? COLORS.white : COLORS.dark,
                  fontSize: 16,
                  lineHeight: 1.5,
                  fontFamily: "Inter, system-ui, sans-serif",
                  border: msg.isUser ? "none" : `1px solid ${COLORS.primary}20`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                {msg.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChatInput() {
  return (
    <div
      style={{
        padding: "20px 24px",
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
          padding: "14px 20px",
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
          width: 48,
          height: 48,
          borderRadius: 12,
          background: COLORS.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          color: COLORS.white,
        }}
      >
        ➤
      </div>
    </div>
  );
}

function NarrationBubble({ frame }: { frame: number }) {
  const { fps } = useVideoConfig();

  const narrations = [
    { text: "Emma responde al instante", start: 50, end: 150 },
    { text: "Conversación natural", start: 200, end: 300 },
    { text: "Emma entiende el contexto", start: 380, end: 480 },
  ];

  const current = narrations.find((n) => frame >= n.start && frame < n.end);

  if (!current) return null;

  const progress = spring({
    frame: frame - current.start,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: "50%",
        transform: `translateX(-50%) translateY(${translateY}px)`,
        opacity,
        padding: "16px 32px",
        borderRadius: 16,
        background: COLORS.dark,
        color: COLORS.white,
        fontSize: 20,
        fontWeight: 600,
        fontFamily: "Inter, system-ui, sans-serif",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      }}
    >
      {current.text}
    </div>
  );
}
