export const COLORS = {
  primary: "#2d9eea",
  primaryLight: "#7aaad7",
  accent: "#dd4970",
  warning: "#f5b460",
  success: "#83d79e",
  white: "#ffffff",
  dark: "#1a1a2e",
  gray: "#6b7280",
  lightGray: "#f3f4f6",
} as const;

export const FONTS = {
  heading: "Inter, system-ui, sans-serif",
  body: "Inter, system-ui, sans-serif",
} as const;

export const ANIMATIONS = {
  spring: {
    damping: 20,
    stiffness: 100,
    mass: 0.5,
  },
  fadeIn: {
    durationInFrames: 30,
  },
  slideUp: {
    durationInFrames: 20,
    delay: 10,
  },
} as const;
