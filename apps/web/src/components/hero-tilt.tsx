"use client";

import { useRef } from "react";

// Cursor-driven 3D tilt on the hero visual — a restrained, purposeful micro-interaction
// (2026 research: motion should guide/delight on direct interaction, not run unprompted).
// Pointer-only: touch devices get zero listeners and just see the static visual.
export function HeroTilt({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${py * -8}deg) rotateY(${px * 10}deg) scale(1.02)`;
  }

  function handlePointerLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`transition-transform duration-300 ease-out [transform-style:preserve-3d] ${className}`}
    >
      {children}
    </div>
  );
}
