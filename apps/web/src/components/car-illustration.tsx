// Hand-built SVG car silhouette — no external image assets, no licensing to track, and it
// never goes stale or breaks like a hotlinked stock photo would. Gradient fill uses only the
// existing brand tokens (blue/cyan) so it reads as "Wezcar", not generic stock art.
export function CarIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Ilustração de um carro"
    >
      <defs>
        <linearGradient id="wz-car-body" x1="40" y1="60" x2="560" y2="240" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--wz-cyan)" />
          <stop offset="1" stopColor="var(--wz-primary-dark)" />
        </linearGradient>
        <linearGradient id="wz-car-glass" x1="180" y1="70" x2="440" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" stopOpacity="0.55" />
          <stop offset="1" stopColor="white" stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id="wz-car-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--wz-cyan)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--wz-cyan)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* speed lines — suggest motion/journey */}
      <g opacity="0.35" stroke="var(--wz-cyan)" strokeWidth="4" strokeLinecap="round">
        <line x1="20" y1="120" x2="70" y2="120" />
        <line x1="10" y1="150" x2="80" y2="150" />
        <line x1="25" y1="180" x2="65" y2="180" />
      </g>

      {/* ground shadow */}
      <ellipse cx="310" cy="253" rx="230" ry="14" fill="black" opacity="0.12" />

      {/* body */}
      <path
        d="M95,205
           C75,205 55,196 55,178
           C55,158 78,140 108,132
           L158,84
           C182,60 214,46 248,46
           L372,46
           C404,46 434,62 452,88
           L486,128
           C526,132 555,155 555,178
           C555,196 538,205 518,205
           L495,205
           L155,205
           Z"
        fill="url(#wz-car-body)"
      />

      {/* cabin glass */}
      <path
        d="M188,132 L216,90 C230,72 252,62 274,62 L360,62 C382,62 402,73 414,92 L440,132 Z"
        fill="url(#wz-car-glass)"
      />
      <line x1="284" y1="62" x2="278" y2="132" stroke="var(--wz-primary-dark)" strokeWidth="3" opacity="0.4" />

      {/* headlight */}
      <circle cx="495" cy="185" r="26" fill="url(#wz-car-glow)" />
      <rect x="472" y="150" width="26" height="14" rx="6" fill="white" opacity="0.9" />

      {/* door line */}
      <line x1="330" y1="132" x2="330" y2="205" stroke="var(--wz-primary-dark)" strokeWidth="2" opacity="0.25" />

      {/* wheels */}
      <Wheel cx={180} cy={208} />
      <Wheel cx={430} cy={208} />
    </svg>
  );
}

function Wheel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="42" fill="var(--wz-text-primary)" opacity="0.9" />
      <circle cx={cx} cy={cy} r="24" fill="var(--wz-border)" />
      <circle cx={cx} cy={cy} r="9" fill="var(--wz-cyan)" />
    </g>
  );
}
