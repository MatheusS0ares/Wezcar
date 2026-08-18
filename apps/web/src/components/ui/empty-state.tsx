import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--wz-border)] px-6 py-12 text-center">
      <Icon className="mb-1 h-8 w-8 text-[var(--wz-text-secondary)]" strokeWidth={1.5} />
      <p className="font-medium text-[var(--wz-text-primary)]">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-[var(--wz-text-secondary)]">{description}</p>
      )}
      {action}
    </div>
  );
}
