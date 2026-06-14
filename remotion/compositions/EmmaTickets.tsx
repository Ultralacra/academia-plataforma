import React from "react";
import { AbsoluteFill, Sequence, Img, staticFile, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../styles";

export function EmmaTickets() {
  return (
    <AbsoluteFill style={{ background: COLORS.lightGray }}>
      <Sequence from={0} durationInFrames={150}>
        <TicketProposalScene />
      </Sequence>

      <Sequence from={150} durationInFrames={120}>
        <TicketConfirmationScene />
      </Sequence>

      <Sequence from={270} durationInFrames={120}>
        <TicketSuccessScene />
      </Sequence>
    </AbsoluteFill>
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
              marginBottom: 24,
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
