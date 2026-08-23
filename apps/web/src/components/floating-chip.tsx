import type { LucideIcon } from "lucide-react";

// Small "notification popped out of the product" chip, floated over the hero visual —
// layered composition reads as more dynamic than a single flat image, and (unlike a
// literal screenshot) never breaks when the real screen's layout changes.
export function FloatingChip({
  icon: Icon,
  title,
  subtitle,
  tone = "primary",
  className = "",
  delay = 0,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tone?: "primary" | "success";
  className?: string;
  delay?: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`animate-[float_6s_ease-in-out_infinite] rounded-xl border border-[var(--wz-border)] bg-[var(--wz-surface)]/95 px-3.5 py-2.5 shadow-xl shadow-blue-950/10 backdrop-blur ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
            tone === "success"
              ? "bg-[var(--wz-success)]/15 text-[var(--wz-success)]"
              : "bg-[var(--wz-primary)]/15 text-[var(--wz-primary)]"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-semibold text-[var(--wz-text-primary)]">{title}</p>
          <p className="text-[11px] text-[var(--wz-text-secondary)]">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
