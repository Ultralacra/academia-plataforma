import React from "react";
import { AbsoluteFill, Sequence, Img, staticFile, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../styles";

export function EmmaFeatures() {
  return (
    <AbsoluteFill style={{ background: COLORS.white }}>
      <Sequence from={0} durationInFrames={120}>
        <IntroScene />
      </Sequence>

      <Sequence from={120} durationInFrames={150}>
        <PausasScene />
      </Sequence>

      <Sequence from={270} durationInFrames={150}>
        <TareasScene />
      </Sequence>

      <Sequence from={420} durationInFrames={150}>
        <TransferScene />
      </Sequence>
    </AbsoluteFill>
  );
}

function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 80, mass: 0.7 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const scale = interpolate(progress, [0, 0.8, 1], [0.8, 1.05, 1]);

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
          width: 120,
          height: 120,
          borderRadius: "50%",
          overflow: "hidden",
          border: `4px solid ${COLORS.white}`,
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          transform: `scale(${scale})`,
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
          fontSize: 72,
          fontWeight: 800,
          color: COLORS.white,
          textAlign: "center",
          margin: 0,
          textShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        Funcionalidades de Emma
      </h1>

      <p
        style={{
          fontSize: 28,
          fontWeight: 400,
          color: `${COLORS.white}dd`,
          textAlign: "center",
          margin: 0,
          marginTop: 20,
        }}
      >
        Todo lo que necesitas en un solo lugar
      </p>
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
