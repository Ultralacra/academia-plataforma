import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../styles";

interface TitleCardProps {
  title: string;
  subtitle?: string;
  emoji?: string;
}

export function TitleCard({ title, subtitle, emoji = "🤖" }: TitleCardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 80, mass: 0.7 },
  });

  const subtitleProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 18, stiffness: 80, mass: 0.7 },
  });

  const emojiProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.5 },
  });

  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleProgress, [0, 1], [30, 0]);

  const emojiScale = interpolate(emojiProgress, [0, 0.7, 1], [0, 1.2, 1]);
  const emojiRotate = interpolate(emojiProgress, [0, 1], [-15, 0]);

  const gradientAngle = interpolate(frame, [0, 300], [135, 180]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, ${COLORS.primary}, ${COLORS.primaryLight}, ${COLORS.primary})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          transform: `scale(${emojiScale}) rotate(${emojiRotate}deg)`,
          fontSize: 100,
          marginBottom: 30,
        }}
      >
        {emoji}
      </div>

      <h1
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 72,
          fontWeight: 800,
          color: COLORS.white,
          textAlign: "center",
          margin: 0,
          padding: "0 40px",
          textShadow: "0 4px 20px rgba(0,0,0,0.2)",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h1>

      {subtitle && (
        <p
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            fontSize: 28,
            fontWeight: 400,
            color: `${COLORS.white}dd`,
            textAlign: "center",
            margin: 0,
            marginTop: 20,
            padding: "0 60px",
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      )}
    </AbsoluteFill>
  );
}
