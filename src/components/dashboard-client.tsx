"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MailItem = {
  id: string;
  conversationId: string;
  subject: string;
  from: string;
  fromAddress: string;
  receivedDateTime: string;
  lastMessageAt: string;
  bodyPreview: string;
  isRead: boolean;
  suggestedDeadline: string;
  actionTarget: string;
  reminderHours: number;
  webLink?: string;
};

type TaskItem = {
  id: string;
  title: string;
  status: string;
  importance: string;
  listId: string;
  listName: string;
  dueDateTime?: { dateTime: string; timeZone: string };
  suggestedDue?: string;
  actionTarget?: string;
  reminderHours?: number;
  createdDateTime?: string;
};

type Store = { mail: string[]; tasks: string[] };

const LS_KEY = "pulse-desk-dismissed-v1";
const HOUR = 60 * 60 * 1000;

function loadDismissed(): Store {
  if (typeof window === "undefined") return { mail: [], tasks: [] };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { mail: [], tasks: [] };
    const j = JSON.parse(raw) as Store;
    return { mail: j.mail ?? [], tasks: j.tasks ?? [] };
  } catch {
    return { mail: [], tasks: [] };
  }
}

function saveDismissed(s: Store) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function fmt(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function urgency(actionTarget: string, dismissed: boolean) {
  if (dismissed) return "muted";
  const t = new Date(actionTarget).getTime();
  const now = Date.now();
  if (now >= t + 4 * HOUR) return "critical";
  if (now >= t) return "hot";
  if (now >= t - HOUR) return "warm";
  return "cool";
}

export function DashboardClient() {
  const { data: session, status } = useSession();
  const [mail, setMail] = useState<MailItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Store>({ mail: [], tasks: [] });
  const notifiedSoft = useRef(new Set<string>());
  const notifiedHard = useRef(new Set<string>());

  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [m, t] = await Promise.all([
        fetch("/api/dashboard/mail", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/dashboard/tasks", { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (m.error) throw new Error(m.error);
      if (t.error) throw new Error(t.error);
      setMail(m.items ?? []);
      setTasks(t.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dismissMail = (conversationId: string) => {
    setDismissed((prev) => {
      const next = { ...prev, mail: Array.from(new Set([...prev.mail, conversationId])) };
      saveDismissed(next);
      return next;
    });
  };

  const dismissTask = (id: string) => {
    setDismissed((prev) => {
      const next = { ...prev, tasks: Array.from(new Set([...prev.tasks, id])) };
      saveDismissed(next);
      return next;
    });
  };

  const mailVisible = useMemo(
    () => mail.filter((m) => !dismissed.mail.includes(m.conversationId)),
    [mail, dismissed.mail]
  );
  const tasksVisible = useMemo(
    () => tasks.filter((t) => !dismissed.tasks.includes(t.id)),
    [tasks, dismissed.tasks]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (typeof window === "undefined" || Notification.permission !== "granted") return;
      const now = Date.now();

      for (const m of mailVisible) {
        const at = new Date(m.actionTarget).getTime();
        const anchor = new Date(m.lastMessageAt).getTime();
        const hard = anchor + 8 * HOUR;
        const keyS = `mail-soft:${m.conversationId}`;
        const keyH = `mail-hard:${m.conversationId}`;
        if (now >= at && !notifiedSoft.current.has(keyS)) {
          notifiedSoft.current.add(keyS);
          new Notification("Pulse · reply window", {
            body: `${m.from}: ${m.subject}`,
            tag: keyS,
          });
        }
        if (now >= hard && !notifiedHard.current.has(keyH)) {
          notifiedHard.current.add(keyH);
          new Notification("Pulse · still waiting", {
            body: `8h+ on thread: ${m.subject}`,
            tag: keyH,
          });
        }
      }

      for (const t of tasksVisible) {
        const at = t.actionTarget ? new Date(t.actionTarget).getTime() : 0;
        const anchor = new Date(
          t.createdDateTime || t.dueDateTime?.dateTime || Date.now()
        ).getTime();
        const hard = anchor + 8 * HOUR;
        const keyS = `task-soft:${t.id}`;
        const keyH = `task-hard:${t.id}`;
        if (at && now >= at && !notifiedSoft.current.has(keyS)) {
          notifiedSoft.current.add(keyS);
          new Notification("Pulse · task checkpoint", {
            body: t.title,
            tag: keyS,
          });
        }
        if (now >= hard && !notifiedHard.current.has(keyH)) {
          notifiedHard.current.add(keyH);
          new Notification("Pulse · task overdue lane", {
            body: t.title,
            tag: keyH,
          });
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [mailVisible, tasksVisible]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-mono text-sm text-cyan-300/80">
        Loading session…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-16">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-70" />
      <header className="relative z-10 border-b border-cyan-500/10 bg-slate-950/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-cyan-400/80">
              live surface
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-white">Pulse desk</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {session?.isDemo && (
              <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-200/90">
                Demo data
              </span>
            )}
            <span className="truncate font-mono text-xs text-slate-400">
              {session?.user?.email ?? session?.user?.name}
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-200 transition hover:bg-cyan-500/20"
            >
              Refresh
            </button>
            <Link
              href="/"
              className="rounded-lg border border-slate-600/60 px-3 py-1.5 font-mono text-xs text-slate-300 hover:bg-slate-800/60"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 font-mono text-xs text-violet-200 hover:bg-violet-500/20"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-10 px-6 pt-10">
        {err && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 font-mono text-sm text-red-200">
            {err}
          </div>
        )}

        <section className="glass p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Inbox · needs your reply</h2>
              <p className="mt-1 max-w-2xl font-mono text-xs text-slate-400">
                Threads where you are on the To line, the last message is not from you, and the
                model believes you have not sent a newer message in that conversation.
              </p>
            </div>
            <span className="font-mono text-xs text-cyan-400/80">
              {loading ? "scanning…" : `${mailVisible.length} open`}
            </span>
          </div>
          {loading && !mail.length ? (
            <p className="font-mono text-sm text-slate-500">
              {session?.isDemo ? "Loading sample mail…" : "Pulling mail from Microsoft…"}
            </p>
          ) : mailVisible.length === 0 ? (
            <p className="font-mono text-sm text-emerald-400/90">No direct threads waiting on you.</p>
          ) : (
            <ul className="space-y-4">
              {mailVisible.map((m) => {
                const u = urgency(m.actionTarget, false);
                return (
                  <li
                    key={m.conversationId}
                    className={`rounded-xl border px-4 py-4 sm:px-5 ${
                      u === "critical"
                        ? "border-red-500/50 bg-red-950/20"
                        : u === "hot"
                          ? "border-amber-500/40 bg-amber-950/15"
                          : u === "warm"
                            ? "border-cyan-500/35 bg-cyan-950/10"
                            : "border-slate-700/80 bg-slate-900/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-white">{m.subject}</p>
                        <p className="mt-1 font-mono text-xs text-slate-400">
                          <span className="text-cyan-300/90">{m.from}</span>
                          <span className="text-slate-600"> · </span>
                          {fmt(m.receivedDateTime)}
                        </p>
                        {m.bodyPreview && (
                          <p className="mt-2 line-clamp-2 text-sm text-slate-400">{m.bodyPreview}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                          respond by
                        </span>
                        <span className="font-mono text-xs text-violet-200">{fmt(m.suggestedDeadline)}</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          nudge ≈ {m.reminderHours.toFixed(1)}h · {fmt(m.actionTarget)}
                        </span>
                        <div className="mt-1 flex flex-wrap justify-end gap-2">
                          {m.webLink && !session?.isDemo && (
                            <a
                              href={m.webLink}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-cyan-500/40 px-2 py-1 font-mono text-[10px] text-cyan-200 hover:bg-cyan-500/15"
                            >
                              Open in Outlook
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => dismissMail(m.conversationId)}
                            className="rounded-lg border border-slate-600 px-2 py-1 font-mono text-[10px] text-slate-300 hover:bg-slate-800"
                          >
                            Clear from board
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="glass p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Tasks</h2>
              <p className="mt-1 max-w-2xl font-mono text-xs text-slate-400">
                {session?.isDemo
                  ? "Sample tasks across a few lists — same layout as a connected Microsoft To Do account."
                  : "Open tasks across your lists. Suggested deadlines fill in when a task has no due date in Outlook."}
              </p>
            </div>
            <span className="font-mono text-xs text-violet-300/80">
              {loading ? "syncing…" : `${tasksVisible.length} tasks`}
            </span>
          </div>
          {loading && !tasks.length ? (
            <p className="font-mono text-sm text-slate-500">
              {session?.isDemo ? "Loading sample tasks…" : "Pulling todo lists…"}
            </p>
          ) : tasksVisible.length === 0 ? (
            <p className="font-mono text-sm text-emerald-400/90">No open tasks.</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {tasksVisible.map((t) => {
                const at = t.actionTarget ?? "";
                const u = at ? urgency(at, false) : "cool";
                return (
                  <li
                    key={`${t.listId}-${t.id}`}
                    className={`flex flex-col rounded-xl border p-4 ${
                      u === "critical"
                        ? "border-red-500/45 bg-red-950/20"
                        : u === "hot"
                          ? "border-amber-500/35 bg-amber-950/15"
                          : "border-slate-700/80 bg-slate-900/45"
                    }`}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      {t.listName}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">{t.title}</p>
                    <div className="mt-3 space-y-1 font-mono text-[11px] text-slate-400">
                      <p>
                        <span className="text-slate-500">target · </span>
                        {t.dueDateTime?.dateTime
                          ? fmt(t.dueDateTime.dateTime)
                          : fmt(t.suggestedDue ?? "")}
                      </p>
                      {t.actionTarget && (
                        <p>
                          <span className="text-slate-500">nudge · </span>
                          {fmt(t.actionTarget)}
                          {t.reminderHours != null && (
                            <span className="text-slate-600"> ({t.reminderHours.toFixed(1)}h)</span>
                          )}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismissTask(t.id)}
                      className="mt-4 self-start rounded-lg border border-slate-600 px-2 py-1 font-mono text-[10px] text-slate-300 hover:bg-slate-800"
                    >
                      Clear from board
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
