import React from "react";
import { AbsoluteFill, Sequence, Img, staticFile, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../styles";

export function EmmaFullDemo() {
  return (
    <AbsoluteFill style={{ background: COLORS.white }}>
      <Sequence from={0} durationInFrames={120}>
        <IntroScene />
      </Sequence>

      <Sequence from={120} durationInFrames={120}>
        <CapabilitiesScene />
      </Sequence>

      <Sequence from={240} durationInFrames={300}>
        <ChatDemoScene />
      </Sequence>

      <Sequence from={540} durationInFrames={90}>
        <TicketProposalScene />
      </Sequence>

      <Sequence from={630} durationInFrames={90}>
        <TicketConfirmationScene />
      </Sequence>

      <Sequence from={720} durationInFrames={90}>
        <TicketSuccessScene />
      </Sequence>

      <Sequence from={810} durationInFrames={120}>
        <PausasScene />
      </Sequence>

      <Sequence from={930} durationInFrames={120}>
        <TareasScene />
      </Sequence>

      <Sequence from={1050} durationInFrames={120}>
        <TransferScene />
      </Sequence>

      <Sequence from={1170} durationInFrames={90}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
}

function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });

  const gradientAngle = interpolate(bgProgress, [0, 1], [0, 135]);
  const textProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 18, stiffness: 80, mass: 0.7 },
  });

  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textY = interpolate(textProgress, [0, 1], [50, 0]);

  const avatarProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const avatarScale = interpolate(avatarProgress, [0, 0.8, 1], [0.8, 1.05, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          overflow: "hidden",
          border: `4px solid ${COLORS.white}`,
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          transform: `scale(${avatarScale})`,
          marginBottom: 40,
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

      <h1
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          fontSize: 80,
          fontWeight: 800,
          color: COLORS.white,
          textAlign: "center",
          margin: 0,
          textShadow: "0 4px 20px rgba(0,0,0,0.2)",
          letterSpacing: "-0.02em",
        }}
      >
        Conoce a Emma
      </h1>

      <p
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          fontSize: 32,
          fontWeight: 400,
          color: `${COLORS.white}dd`,
          textAlign: "center",
          margin: 0,
          marginTop: 20,
        }}
      >
        Tu asistente IA de atención al cliente
      </p>
    </AbsoluteFill>
  );
}

function CapabilitiesScene() {
  const frame = useCurrentFrame();

  const capabilities = [
    { text: "Responde tus dudas al instante", icon: "💬", delay: 0 },
    { text: "Crea feedbacks para tu coach", icon: "📋", delay: 20 },
    { text: "Gestiona pausas y extensiones", icon: "⏸️", delay: 40 },
    { text: "Te conecta con ATC humano", icon: "👤", delay: 60 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: COLORS.white,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 80,
      }}
    >
      <h2
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: COLORS.dark,
          marginBottom: 60,
          textAlign: "center",
        }}
      >
        ¿Qué puede hacer Emma?
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        {capabilities.map((cap, i) => (
          <CapabilityItem key={i} {...cap} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

function CapabilityItem({ text, icon, delay }: { text: string; icon: string; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateX = interpolate(progress, [0, 1], [80, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${translateX}px)`,
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "24px 40px",
        borderRadius: 20,
        background: `linear-gradient(135deg, ${COLORS.primary}10, ${COLORS.primaryLight}08)`,
        border: `2px solid ${COLORS.primary}30`,
      }}
    >
      <div style={{ fontSize: 48 }}>{icon}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: COLORS.dark,
        }}
      >
        {text}
      </div>
    </div>
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
      delay: 260,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: COLORS.lightGray,
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

      <NarrationBubble frame={frame} text="Emma responde al instante con contexto" />
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

function TicketProposalScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80, mass: 0.8 },
  });

  const containerOpacity = interpolate(containerProgress, [0, 1], [0, 1]);

  const cardProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const cardOpacity = interpolate(cardProgress, [0, 1], [0, 1]);
  const cardScale = interpolate(cardProgress, [0, 0.8, 1], [0.8, 1.05, 1]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.lightGray,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        opacity: containerOpacity,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 800,
          background: COLORS.white,
          borderRadius: 24,
          padding: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: `2px solid ${COLORS.primary}30`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${COLORS.primary}`,
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
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.dark,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Emma propone crear un feedback
            </div>
            <div
              style={{
                fontSize: 14,
                color: COLORS.gray,
                fontFamily: "Inter, system-ui, sans-serif",
                marginTop: 4,
              }}
            >
              Tu coach lo revisará pronto
            </div>
          </div>
        </div>

        <div
          style={{
            opacity: cardOpacity,
            transform: `scale(${cardScale})`,
            padding: 32,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${COLORS.primary}10, ${COLORS.primaryLight}08)`,
            border: `2px solid ${COLORS.primary}40`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: COLORS.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              📋
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.primary,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Propuesta de feedback
            </div>
          </div>

          <h3
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: COLORS.dark,
              margin: 0,
              marginBottom: 16,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Consulta sobre pausa contractual
          </h3>

          <p
            style={{
              fontSize: 16,
              color: COLORS.gray,
              margin: 0,
              marginBottom: 24,
              lineHeight: 1.6,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            El alumno necesita información sobre cómo solicitar una pausa contractual por motivos de viaje laboral.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
            }}
          >
            <div
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                background: `${COLORS.primary}20`,
                color: COLORS.primary,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              ATC
            </div>
            <div
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                background: `${COLORS.warning}20`,
                color: COLORS.warning,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              PRIORIDAD MEDIA
            </div>
          </div>
        </div>
      </div>

      <NarrationBubble frame={frame} text="Emma detecta que necesitas ayuda de tu coach" />
    </AbsoluteFill>
  );
}

function TicketConfirmationScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const buttonProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.5 },
  });

  const buttonScale = interpolate(buttonProgress, [0, 0.8, 1], [0.8, 1.1, 1]);
  const pulseScale = 1 + Math.sin(frame * 0.15) * 0.03;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.white,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 60,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 700,
          background: COLORS.white,
          borderRadius: 24,
          padding: 48,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: `2px solid ${COLORS.primary}30`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 80,
            marginBottom: 32,
          }}
        >
          ✅
        </div>

        <h2
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: COLORS.dark,
            marginBottom: 20,
          }}
        >
          Confirma con un clic
        </h2>

        <p
          style={{
            fontSize: 20,
            color: COLORS.gray,
            marginBottom: 48,
            lineHeight: 1.5,
          }}
        >
          Emma te muestra la propuesta antes de enviarla a tu coach
        </p>

        <div
          style={{
            display: "flex",
            gap: 20,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              transform: `scale(${buttonScale * pulseScale})`,
              padding: "18px 40px",
              borderRadius: 14,
              background: COLORS.primary,
              color: COLORS.white,
              fontSize: 18,
              fontWeight: 600,
              boxShadow: `0 10px 30px ${COLORS.primary}40`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span>✓</span>
            Enviar feedback
          </div>

          <div
            style={{
              padding: "18px 40px",
              borderRadius: 14,
              background: COLORS.lightGray,
              color: COLORS.gray,
              fontSize: 18,
              fontWeight: 600,
              border: `2px solid ${COLORS.gray}40`,
            }}
          >
            No, gracias
          </div>
        </div>
      </div>

      <NarrationBubble frame={frame} text="Tú decides si enviarlo o no" />
    </AbsoluteFill>
  );
}

function TicketSuccessScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const checkProgress = spring({
    frame: frame - 20,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.5 },
  });

  const checkScale = interpolate(checkProgress, [0, 0.7, 1], [0, 1.3, 1]);
  const pulseScale = 1 + Math.sin(frame * 0.15) * 0.03;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.success}15, ${COLORS.success}08)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 60,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 700,
          background: COLORS.white,
          borderRadius: 24,
          padding: 48,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: `2px solid ${COLORS.success}40`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: `${COLORS.success}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
            margin: "0 auto 40px",
            transform: `scale(${checkScale * pulseScale})`,
          }}
        >
          <div
            style={{
              fontSize: 80,
              color: COLORS.success,
            }}
          >
            ✓
          </div>
        </div>

        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.success,
            marginBottom: 24,
          }}
        >
          ¡Feedback enviado!
        </h2>

        <p
          style={{
            fontSize: 22,
            color: COLORS.gray,
            lineHeight: 1.6,
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          Tu coach lo revisará pronto y te responderá directamente en el chat
        </p>
      </div>

      <NarrationBubble frame={frame} text="Tu coach recibe el feedback al instante" />
    </AbsoluteFill>
  );
}

function PausasScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80, mass: 0.8 },
  });

  const containerOpacity = interpolate(containerProgress, [0, 1], [0, 1]);

  const cardProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const cardScale = interpolate(cardProgress, [0, 0.8, 1], [0.8, 1.05, 1]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.lightGray,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        opacity: containerOpacity,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 800,
          background: COLORS.white,
          borderRadius: 24,
          padding: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: `2px solid ${COLORS.warning}40`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${COLORS.warning}`,
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
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.dark,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Gestión de Pausas
            </div>
            <div
              style={{
                fontSize: 14,
                color: COLORS.gray,
                fontFamily: "Inter, system-ui, sans-serif",
                marginTop: 4,
              }}
            >
              Pausa tu programa cuando lo necesites
            </div>
          </div>
        </div>

        <div
          style={{
            opacity: cardProgress,
            transform: `scale(${cardScale})`,
            padding: 32,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${COLORS.warning}15, ${COLORS.warning}08)`,
            border: `2px solid ${COLORS.warning}40`,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: COLORS.warning,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              ⏸️
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.warning,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Propuesta de pausa
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              fontSize: 16,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontWeight: 600, color: COLORS.dark }}>Desde:</span>
              <span style={{ color: COLORS.gray }}>15 Enero 2026</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontWeight: 600, color: COLORS.dark }}>Hasta:</span>
              <span style={{ color: COLORS.gray }}>15 Febrero 2026</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontWeight: 600, color: COLORS.dark }}>Motivo:</span>
              <span style={{ color: COLORS.gray }}>Viaje laboral</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              padding: "10px 20px",
              borderRadius: 10,
              background: `${COLORS.primary}20`,
              color: COLORS.primary,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              display: "inline-block",
            }}
          >
            CONTRACTUAL
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
          }}
        >
          <div
            style={{
              flex: 1,
              padding: "16px 24px",
              borderRadius: 12,
              background: COLORS.warning,
              color: COLORS.white,
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              textAlign: "center",
            }}
          >
            Registrar pausa
          </div>
          <div
            style={{
              flex: 1,
              padding: "16px 24px",
              borderRadius: 12,
              background: COLORS.lightGray,
              color: COLORS.gray,
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              textAlign: "center",
              border: `2px solid ${COLORS.gray}40`,
            }}
          >
            Cancelar
          </div>
        </div>
      </div>

      <NarrationBubble frame={frame} text="Emma gestiona pausas contractuales y extraordinarias" />
    </AbsoluteFill>
  );
}

function TareasScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80, mass: 0.8 },
  });

  const containerOpacity = interpolate(containerProgress, [0, 1], [0, 1]);

  const cardProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const cardScale = interpolate(cardProgress, [0, 0.8, 1], [0.8, 1.05, 1]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.lightGray,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        opacity: containerOpacity,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 800,
          background: COLORS.white,
          borderRadius: 24,
          padding: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: `2px solid ${COLORS.success}40`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${COLORS.success}`,
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
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.dark,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Entrega de Tareas
            </div>
            <div
              style={{
                fontSize: 14,
                color: COLORS.gray,
                fontFamily: "Inter, system-ui, sans-serif",
                marginTop: 4,
              }}
            >
              Envía tus tareas y recibe feedback
            </div>
          </div>
        </div>

        <div
          style={{
            opacity: cardProgress,
            transform: `scale(${cardScale})`,
            padding: 32,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${COLORS.success}15, ${COLORS.success}08)`,
            border: `2px solid ${COLORS.success}40`,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: COLORS.success,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              📎
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.success,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Entrega de tarea — Fase 3
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              fontSize: 16,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontWeight: 600, color: COLORS.dark }}>Nombre:</span>
              <span style={{ color: COLORS.gray }}>Análisis de mercado</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontWeight: 600, color: COLORS.dark }}>Fecha:</span>
              <span style={{ color: COLORS.gray }}>10 Enero 2026</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontWeight: 600, color: COLORS.dark }}>Doc:</span>
              <span style={{ color: COLORS.primary, textDecoration: "underline" }}>
                https://docs.google.com/...
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
          }}
        >
          <div
            style={{
              flex: 1,
              padding: "16px 24px",
              borderRadius: 12,
              background: COLORS.success,
              color: COLORS.white,
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              textAlign: "center",
            }}
          >
            Guardar tarea
          </div>
          <div
            style={{
              flex: 1,
              padding: "16px 24px",
              borderRadius: 12,
              background: COLORS.lightGray,
              color: COLORS.gray,
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              textAlign: "center",
              border: `2px solid ${COLORS.gray}40`,
            }}
          >
            Cancelar
          </div>
        </div>
      </div>

      <NarrationBubble frame={frame} text="Emma notifica a tu coach automáticamente" />
    </AbsoluteFill>
  );
}

function TransferScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80, mass: 0.8 },
  });

  const containerOpacity = interpolate(containerProgress, [0, 1], [0, 1]);

  const cardProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const cardScale = interpolate(cardProgress, [0, 0.8, 1], [0.8, 1.05, 1]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.lightGray,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        opacity: containerOpacity,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 800,
          background: COLORS.white,
          borderRadius: 24,
          padding: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: `2px solid ${COLORS.primary}40`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${COLORS.primary}`,
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
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.dark,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Transferencia a ATC
            </div>
            <div
              style={{
                fontSize: 14,
                color: COLORS.gray,
                fontFamily: "Inter, system-ui, sans-serif",
                marginTop: 4,
              }}
            >
              Conecta con un agente humano cuando lo necesites
            </div>
          </div>
        </div>

        <div
          style={{
            opacity: cardProgress,
            transform: `scale(${cardScale})`,
            padding: 32,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.primary}08)`,
            border: `2px solid ${COLORS.primary}40`,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: COLORS.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              💬
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.primary,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Conectar con tu Agente ATC
            </div>
          </div>

          <p
            style={{
              fontSize: 16,
              color: COLORS.dark,
              lineHeight: 1.6,
              fontFamily: "Inter, system-ui, sans-serif",
              margin: 0,
              marginBottom: 16,
            }}
          >
            ¿Quieres que te conecte con tu Agente de Atención al Cliente? Podrás continuar la conversación directamente en tu chat.
          </p>

          <div
            style={{
              padding: "12px 20px",
              borderRadius: 10,
              background: `${COLORS.primary}10`,
              color: COLORS.primary,
              fontSize: 14,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            <strong>Motivo:</strong> Consulta compleja sobre contrato
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
          }}
        >
          <div
            style={{
              flex: 1,
              padding: "16px 24px",
              borderRadius: 12,
              background: COLORS.primary,
              color: COLORS.white,
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              textAlign: "center",
            }}
          >
            Sí, conectarme
          </div>
          <div
            style={{
              flex: 1,
              padding: "16px 24px",
              borderRadius: 12,
              background: COLORS.lightGray,
              color: COLORS.gray,
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              textAlign: "center",
              border: `2px solid ${COLORS.gray}40`,
            }}
          >
            No, gracias
          </div>
        </div>
      </div>

      <NarrationBubble frame={frame} text="Emma te transfiere a un agente humano cuando lo necesitas" />
    </AbsoluteFill>
  );
}

function OutroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 80, mass: 0.7 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const scale = interpolate(progress, [0, 0.8, 1], [0.8, 1.05, 1]);
  const pulseScale = 1 + Math.sin(frame * 0.1) * 0.02;

  const avatarProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const avatarScale = interpolate(avatarProgress, [0, 0.8, 1], [0.8, 1.05, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        opacity,
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          overflow: "hidden",
          border: `4px solid ${COLORS.white}`,
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          transform: `scale(${avatarScale})`,
          marginBottom: 40,
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

      <h2
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: COLORS.white,
          textAlign: "center",
          margin: 0,
          textShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        ¿Listo para empezar?
      </h2>

      <div
        style={{
          transform: `scale(${scale * pulseScale})`,
          marginTop: 50,
          padding: "20px 50px",
          borderRadius: 16,
          background: COLORS.white,
          color: COLORS.primary,
          fontSize: 24,
          fontWeight: 700,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        Chatea con Emma ahora
      </div>
    </AbsoluteFill>
  );
}

function NarrationBubble({ frame, text }: { frame: number; text: string }) {
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - 20,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
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
      {text}
    </div>
  );
}
