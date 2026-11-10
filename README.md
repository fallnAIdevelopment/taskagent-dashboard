# TaskAgent Dashboard

Next.js control plane for [TaskAgent](https://github.com/fallnAIdevelopment/taskagent-dashboard) — reliability-first AI agent runtime by FallnAI.

## Local dev

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_TASKAGENT_API_URL` to your Python runtime (default `http://localhost:8000`).

## Deploy

Deployed on Vercel. Configure env:

- `NEXT_PUBLIC_TASKAGENT_API_URL` — public URL of the TaskAgent FastAPI runtime
