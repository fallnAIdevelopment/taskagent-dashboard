/**
 * TaskAgent Control Plane API client (v0.2 — auth + background jobs).
 */

const API_BASE =
  process.env.NEXT_PUBLIC_TASKAGENT_API_URL || "http://localhost:8000";

export type Budget = {
  tokens: number;
  usd: number;
  wall_seconds: number;
  tool_calls: number;
  tokens_used?: number;
  usd_used?: number;
  wall_seconds_used?: number;
  tool_calls_used?: number;
};

export type PlanNode = {
  id: string;
  parent_id: string | null;
  task_id: string;
  title: string;
  description: string;
  status: string;
  success_criteria: { id: string; description: string; required: boolean }[];
  constraints: { id: string; description: string; hard: boolean }[];
  budget: Budget;
  children: PlanNode[];
  assigned_role: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type Task = {
  id: string;
  goal: string;
  status: string;
  constraints: { id: string; description: string; hard: boolean }[];
  budget: Budget;
  root_plan: PlanNode | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  owner_id: string | null;
  metadata: Record<string, unknown>;
  final_deliverable: string | null;
  error_summary: string | null;
};

export type EpisodicEvent = {
  id: string;
  task_id: string;
  plan_node_id: string | null;
  agent_id: string | null;
  event_type: string;
  content: Record<string, unknown>;
  summary: string;
  created_at: string;
  importance: number;
};

export type AuthSession = {
  access_token: string;
  user_id: string;
  email: string;
  api_key?: string | null;
};

const SESSION_KEY = "taskagent_session";

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function storeSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getStoredSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  } else if (session?.api_key) {
    headers["X-API-Key"] = session.api_key;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () =>
    request<{ status: string; tasks: number; tools: number; model: string; version?: string }>(
      "/health"
    ),

  register: (email: string, password: string, display_name = "") =>
    request<AuthSession & { token_type: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name }),
    }),

  login: (email: string, password: string) =>
    request<AuthSession & { token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<{ id: string; email: string; display_name: string; api_key?: string }>(
      "/auth/me"
    ),

  listTasks: () => request<Task[]>("/tasks"),

  getTask: (id: string) => request<Task>(`/tasks/${id}`),

  createTask: (body: {
    goal: string;
    constraints?: string[];
    budget?: Partial<Budget>;
  }) =>
    request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  runTask: (id: string, opts?: { use_llm_planner?: boolean; background?: boolean }) =>
    request<{ status: string; job_id?: string; task_id?: string; task?: Task }>(
      `/tasks/${id}/run`,
      {
        method: "POST",
        body: JSON.stringify({
          use_llm_planner: opts?.use_llm_planner ?? true,
          background: opts?.background ?? true,
        }),
      }
    ),

  getTrace: (id: string, limit = 100) =>
    request<EpisodicEvent[]>(`/tasks/${id}/trace?limit=${limit}`),

  listJobs: (id: string) =>
    request<
      {
        id: string;
        status: string;
        error: string | null;
        created_at: string | null;
        finished_at: string | null;
      }[]
    >(`/tasks/${id}/jobs`),

  listTools: () => request<Record<string, unknown>[]>("/tools"),
};
