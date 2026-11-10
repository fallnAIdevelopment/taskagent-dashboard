"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  getStoredSession,
  storeSession,
  type AuthSession,
  type Task,
} from "@/lib/api";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-zinc-700 text-zinc-200",
  planning: "bg-blue-800 text-blue-100",
  executing: "bg-amber-900 text-amber-100",
  verifying: "bg-purple-900 text-purple-100",
  succeeded: "bg-emerald-900 text-emerald-100",
  failed_safe: "bg-red-950 text-red-200",
  escalated: "bg-red-900 text-red-100",
};

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<{ status: string; tasks: number; model: string; version?: string } | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [t, h] = await Promise.all([api.listTasks(), api.health()]);
      setTasks(t);
      setHealth(h);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot reach TaskAgent API");
    }
  }, []);

  useEffect(() => {
    setSession(getStoredSession());
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  async function onAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setError(null);
    try {
      const res = authMode === "login" ? await api.login(email, password) : await api.register(email, password);
      const s: AuthSession = { access_token: res.access_token, user_id: res.user_id, email: res.email, api_key: res.api_key };
      storeSession(s);
      setSession(s);
      setPassword("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setAuthBusy(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.createTask({ goal: goal.trim() });
      setGoal("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function onRun(id: string) {
    setRunningId(id);
    try {
      await api.runTask(id, { background: true });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-zinc-400">TaskAgent control plane · FallnAI</p>
        </div>
        {health && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
            v{health.version || "0.2"} · <span className="text-emerald-400">{health.status}</span> · {health.model}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {!session && (
        <form onSubmit={onAuth} className="max-w-md space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={() => setAuthMode("login")} className={authMode === "login" ? "text-indigo-400" : "text-zinc-500"}>Login</button>
            <span className="text-zinc-700">/</span>
            <button type="button" onClick={() => setAuthMode("register")} className={authMode === "register" ? "text-indigo-400" : "text-zinc-500"}>Register</button>
          </div>
          <input type="email" required placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
          <input type="password" required minLength={8} placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
          <button type="submit" disabled={authBusy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{authBusy ? "…" : authMode === "login" ? "Sign in" : "Create account"}</button>
        </form>
      )}

      <form onSubmit={onCreate} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} placeholder="Goal for TaskAgent…" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
        <button type="submit" disabled={loading || !goal.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{loading ? "Creating…" : "Create Task"}</button>
      </form>

      <div className="space-y-3">
        {tasks.map((t) => (
          <div key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status] || STATUS_COLOR.pending}`}>{t.status}</span>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-200">{t.goal}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/tasks/${t.id}`} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">Open</Link>
                <button onClick={() => onRun(t.id)} disabled={runningId === t.id} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50">{runningId === t.id ? "Queuing…" : "Run"}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
