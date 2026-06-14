import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../styles";

interface OutroCardProps {
  title?: string;
  subtitle?: string;
  cta?: string;
}

export function OutroCard({
  title = "¿Listo para empezar?",
  subtitle = "Emma está disponible 24/7 para ayudarte",
  cta = "Chatea con Emma ahora",
}: OutroCardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 80, mass: 0.7 },
  });

  const subtitleProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 18, stiffness: 80, mass: 0.7 },
  });

  const ctaProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleProgress, [0, 1], [30, 0]);

  const ctaOpacity = interpolate(ctaProgress, [0, 1], [0, 1]);
  const ctaScale = interpolate(ctaProgress, [0, 0.8, 1], [0.8, 1.05, 1]);

  const pulseScale = 1 + Math.sin(frame * 0.1) * 0.02;

  const gradientAngle = interpolate(frame, [0, 200], [135, 180]);

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
          fontSize: 80,
          marginBottom: 30,
          transform: `scale(${pulseScale})`,
        }}
      >
        🚀
      </div>

      <h2
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 56,
          fontWeight: 800,
          color: COLORS.white,
          textAlign: "center",
          margin: 0,
          padding: "0 40px",
          textShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        {title}
      </h2>

      <p
        style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          fontSize: 24,
          fontWeight: 400,
          color: `${COLORS.white}dd`,
          textAlign: "center",
          margin: 0,
          marginTop: 16,
          padding: "0 60px",
        }}
      >
        {subtitle}
      </p>

      <div
        style={{
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
          marginTop: 50,
          padding: "18px 40px",
          borderRadius: 16,
          background: COLORS.white,
          color: COLORS.primary,
          fontSize: 20,
          fontWeight: 700,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        {cta}
      </div>
    </AbsoluteFill>
  );
}
