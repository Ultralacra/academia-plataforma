"use client";

type Props = {
  value: number; // 0..100
  size?: number; // px
  strokeWidth?: number; // px
  showLabel?: boolean; // mostrar % en el centro
  className?: string;
};

export default function CircularProgress({
  value,
  size = 112,
  strokeWidth = 10,
  showLabel = true,
  className = "",
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const dash = circumference * (1 - pct / 100);

  return (
    <div
      className={`relative inline-flex items-center justify-center`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className={className}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* fondo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-800"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* progreso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          className="text-blue-600 dark:text-blue-400"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      {showLabel && (
        <span className="absolute text-sm font-semibold text-gray-900 dark:text-gray-100">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
