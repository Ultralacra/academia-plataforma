import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../styles";

interface MessageBubbleProps {
  text: string;
  isUser?: boolean;
  delay?: number;
}

export function MessageBubble({ text, isUser = false, delay = 0 }: MessageBubbleProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 120, mass: 0.6 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [20, 0]);
  const scale = interpolate(progress, [0, 0.8, 1], [0.8, 1.02, 1]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        padding: "0 24px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
          maxWidth: "75%",
          padding: "14px 20px",
          borderRadius: isUser ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
          background: isUser
            ? COLORS.accent
            : `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.primaryLight}10)`,
          color: isUser ? COLORS.white : COLORS.dark,
          fontSize: 18,
          lineHeight: 1.5,
          fontFamily: "Inter, system-ui, sans-serif",
          border: isUser ? "none" : `1px solid ${COLORS.primary}30`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {text}
      </div>
    </div>
  );
}
