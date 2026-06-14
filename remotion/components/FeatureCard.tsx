import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../styles";

interface FeatureCardProps {
  title: string;
  description: string;
  emoji: string;
  delay?: number;
  color?: string;
}

export function FeatureCard({
  title,
  description,
  emoji,
  delay = 0,
  color = COLORS.primary,
}: FeatureCardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [50, 0]);
  const scale = interpolate(progress, [0, 0.8, 1], [0.8, 1.05, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        width: 320,
        padding: 32,
        borderRadius: 24,
        background: COLORS.white,
        boxShadow: `0 20px 50px ${color}25`,
        border: `2px solid ${color}30`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${color}20, ${color}10)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
          marginBottom: 20,
        }}
      >
        {emoji}
      </div>

      <h3
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: COLORS.dark,
          margin: 0,
          marginBottom: 12,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: 15,
          color: COLORS.gray,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
}
