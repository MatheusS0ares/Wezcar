"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(app)/notifications/actions";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell({
  notifications,
  align = "right",
}: {
  notifications: NotificationItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleClick(n: NotificationItem) {
    setOpen(false);
    if (!n.read_at) {
      await markNotificationRead(n.id);
      router.refresh();
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificações"
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-[var(--wz-text-secondary)] hover:bg-[var(--wz-background)]"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--wz-danger)] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-10 z-20 max-h-96 w-80 overflow-y-auto rounded-xl border border-[var(--wz-border)] bg-[var(--wz-surface)] p-2 shadow-lg ${
              align === "left" ? "left-0" : "right-0"
            }`}
          >
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--wz-text-secondary)]">
                Notificações
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-[var(--wz-primary)]"
                >
                  Marcar tudo como lido
                </button>
              )}
            </div>

            {notifications.length ? (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "#"}
                  onClick={() => handleClick(n)}
                  className={`block rounded-lg px-3 py-2 text-sm hover:bg-[var(--wz-background)] ${
                    !n.read_at ? "bg-[var(--wz-primary)]/5" : ""
                  }`}
                >
                  <p className="font-medium text-[var(--wz-text-primary)]">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--wz-text-secondary)]">{n.body}</p>
                  )}
                  <p className="mt-1 text-[10px] text-[var(--wz-text-secondary)]">
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </p>
                </Link>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-sm text-[var(--wz-text-secondary)]">
                Nenhuma notificação
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
