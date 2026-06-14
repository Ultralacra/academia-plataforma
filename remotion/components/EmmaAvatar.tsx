import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../styles";

interface EmmaAvatarProps {
  size?: number;
  delay?: number;
  showName?: boolean;
  showStatus?: boolean;
}

export function EmmaAvatar({ size = 60, delay = 0, showName = true, showStatus = true }: EmmaAvatarProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const scale = interpolate(progress, [0, 0.8, 1], [0.8, 1.05, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: `0 8px 24px ${COLORS.primary}40`,
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

      {(showName || showStatus) && (
        <div>
          {showName && (
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.dark,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Emma · Asistente IA
            </div>
          )}
          {showStatus && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
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
          )}
        </div>
      )}
    </div>
  );
}
