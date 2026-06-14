import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { EmmaAvatar } from "../components/EmmaAvatar";
import { COLORS } from "../styles";

export function EmmaIntro() {
  return (
    <AbsoluteFill style={{ background: COLORS.white }}>
      <Sequence from={0} durationInFrames={120}>
        <IntroScene />
      </Sequence>

      <Sequence from={120} durationInFrames={120}>
        <CapabilitiesScene />
      </Sequence>

      <Sequence from={240} durationInFrames={90}>
        <CTAScene />
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
      <EmmaAvatar size={120} delay={10} showName={false} showStatus={false} />

      <h1
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          fontSize: 80,
          fontWeight: 800,
          color: COLORS.white,
          textAlign: "center",
          margin: 0,
          marginTop: 40,
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
  const { fps } = useVideoConfig();

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

function CTAScene() {
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
      <EmmaAvatar size={100} delay={10} showName={false} showStatus={false} />

      <h2
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: COLORS.white,
          textAlign: "center",
          margin: 0,
          marginTop: 40,
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
