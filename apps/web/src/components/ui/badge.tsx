type Tone = "neutral" | "info" | "primary" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-[var(--wz-border)]/40 text-[var(--wz-text-secondary)]",
  info: "bg-[var(--wz-info)]/15 text-[var(--wz-info)]",
  primary: "bg-[var(--wz-primary)]/15 text-[var(--wz-primary)]",
  success: "bg-[var(--wz-success)]/15 text-[var(--wz-success)]",
  warning: "bg-[var(--wz-warning)]/15 text-[var(--wz-warning)]",
  danger: "bg-[var(--wz-danger)]/15 text-[var(--wz-danger)]",
};

// Maps every status string used across service_requests/work_orders/vehicles to a tone.
// Falls back to "neutral" for anything unmapped, so a new status never crashes rendering.
const STATUS_TONE: Record<string, Tone> = {
  OPEN: "info",
  WAITING_WORKSHOP: "info",
  SENT: "info",
  ACCEPTED: "primary",
  IN_PROGRESS: "primary",
  READY: "success",
  DELIVERED: "success",
  CLOSED: "success",
  ACTIVE: "success",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELED: "danger",
  SUSPENDED: "warning",
  BLOCKED: "danger",
  INACTIVE: "neutral",
  SUPERSEDED: "neutral",
  SCHEDULED: "info",
  CONFIRMED: "primary",
  DONE: "success",
  NO_SHOW: "danger",
  ON_TRACK: "info",
  AT_RISK: "warning",
  BREACHED: "danger",
  MET: "success",
  MISSED: "danger",
  NONE: "neutral",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{label ?? status}</Badge>;
}
