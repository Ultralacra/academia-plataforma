"use client";

export default function Spinner({
  size = 24,
  thickness = 3,
  className = "",
  label,
}: {
  size?: number;
  thickness?: number;
  className?: string;
  label?: string;
}) {
  const border = `${Math.max(1, Math.min(8, thickness))}px`;
  const s = Math.max(12, Math.min(256, size));
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        aria-label={label || "Cargando"}
        role="status"
        className="rounded-full border-gray-300 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-400 animate-spin"
        style={{
          width: s,
          height: s,
          borderWidth: border,
        }}
      />
      {label && (
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {label}
        </span>
      )}
    </div>
  );
}
