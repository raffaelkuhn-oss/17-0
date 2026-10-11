import { useEffect, useMemo, useState } from "react";

const COLORS = [
  "var(--color-primary)",
  "var(--color-pitch)",
  "var(--color-foreground)",
  "var(--color-accent, var(--color-primary))",
];

/** Lightweight CSS confetti burst for a title-winning campaign. */
export function Celebration({ perfect }: { perfect: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pieces = useMemo(
    () =>
      Array.from({ length: perfect ? 90 : 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 3 + Math.random() * 2.5,
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length]!,
      })),
    [perfect],
  );

  if (!mounted) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
