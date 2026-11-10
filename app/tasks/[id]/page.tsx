"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type Task, type PlanNode, type EpisodicEvent } from "@/lib/api";

function PlanTree({ node, depth = 0 }: { node: PlanNode; depth?: number }) {
  return (
    <div className={depth ? "ml-4 border-l border-zinc-800 pl-3" : ""}>
      <div className="py-1.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-zinc-200">{node.title}</span>
          <span className="text-xs text-zinc-600">{node.status}</span>
          {node.assigned_role && (
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">{node.assigned_role}</span>
          )}
        </div>
      </div>
      {node.children?.map((c) => (
        <PlanTree key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [trace, setTrace] = useState<EpisodicEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, tr] = await Promise.all([api.getTask(id), api.getTrace(id)]);
      setTask(t);
      setTrace(tr);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load]);

  async function run() {
    setRunning(true);
    try {
      await api.runTask(id, { background: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  if (error && !task) {
    return (
      <div className="text-red-300">
        {error}{" "}
        <Link href="/" className="underline">Back</Link>
      </div>
    );
  }

  if (!task) return <div className="text-zinc-500">Loading…</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">← Tasks</Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Task {task.id.slice(0, 8)}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-300">{task.goal}</p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="rounded-full bg-zinc-800 px-2 py-0.5">{task.status}</span>
          </div>
        </div>
        <button onClick={run} disabled={running} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
          {running ? "Queuing…" : "Run (background)"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">Hierarchical Plan</h2>
          {task.root_plan ? <PlanTree node={task.root_plan} /> : (
            <p className="text-xs text-zinc-500">No plan yet. Run the task to generate one.</p>
          )}
        </section>
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">Episodic Trace</h2>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {[...trace].reverse().map((e) => (
              <div key={e.id} className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2">
                <span className="text-xs font-medium text-indigo-300">{e.event_type}</span>
                {e.summary && <p className="mt-0.5 text-xs text-zinc-400">{e.summary}</p>}
              </div>
            ))}
          </div>
        </section>
      </div>

      {task.final_deliverable && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">Final Deliverable</h2>
          <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-300">{task.final_deliverable}</pre>
        </section>
      )}
    </div>
  );
}
