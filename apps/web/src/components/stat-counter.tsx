"use client";

import { useEffect, useRef, useState } from "react";

// Count-up on scroll-into-view. The numbers themselves are real, verifiable facts about
// this codebase (migration/test counts, architectural guarantees) — 2026 conversion
// research is explicit that fabricated social proof doesn't convert and specific, honest
// numbers do, so there is no invented customer count or rating here.
export function StatCounter({
  value,
  suffix = "",
  label,
}: {
  value: number;
  suffix?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const duration = 1200;
        const start = performance.now();

        function tick(now: number) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(value * eased));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <p className="bg-gradient-to-br from-[var(--wz-primary)] to-[var(--wz-cyan)] bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
        {display}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-[var(--wz-text-secondary)]">{label}</p>
    </div>
  );
}
