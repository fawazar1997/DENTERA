// «تحديث الآن»: starts the finance robot (GitHub Actions, .github/workflows/pms-sync.yml)
// in its «refresh» mode through the GitHub API, with a lock and a 20-minute gap.
// The token (GITHUB_ACTIONS_TOKEN, a sensitive Vercel variable: a fine-grained
// token for this repository with «Actions: Read and write» only) stays on the server.

import { readFinanceStatus, readRefreshRequest, saveRefreshRequest, type FinanceRun, type RefreshBy } from "./finance";
import { REFRESH_GAP_MINUTES } from "./financeRefreshText";

const API = (process.env.GITHUB_API_BASE || "https://api.github.com").replace(/\/+$/, "");
const REPO = process.env.FINANCE_ROBOT_REPO || "fawazar1997/DENTERA";
const WORKFLOW = "pms-sync.yml";
const REF = process.env.FINANCE_ROBOT_REF || "claude/dentera-website-admin-panel-64epvc";
/** A press with no run record after it for this long is over (the job's own limit is 45 minutes). */
const PENDING_MAX_MS = 50 * 60_000;

const token = () => (process.env.GITHUB_ACTIONS_TOKEN || "").trim();
export const refreshConfigured = () => token().length > 0;

type GhRun = { status: string; conclusion: string | null; event: string; created_at: string; run_started_at?: string };

async function gh(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API}/repos/${REPO}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

/** The robot's latest runs (scheduled, manual or started from here), newest first. */
async function latestRuns(): Promise<GhRun[] | null> {
  if (!refreshConfigured()) return null;
  try {
    const res = await gh(`/actions/workflows/${WORKFLOW}/runs?per_page=10`);
    if (!res.ok) return null;
    const body = (await res.json()) as { workflow_runs?: GhRun[] };
    return body.workflow_runs ?? [];
  } catch {
    return null;
  }
}

const active = (r: GhRun) => r.status !== "completed";

export type RefreshState = {
  configured: boolean;
  /** A run is going (any: scheduled or manual) or a press hasn't reported yet. */
  running: boolean;
  since?: string;
  /** The latest robot or manual run's record. */
  last?: Pick<FinanceRun, "at" | "ok" | "source" | "by" | "rows" | "reason">;
  lastSuccessAt?: string;
  /** When «تحديث الآن» can be pressed again (ISO), if not yet. */
  nextAt?: string;
  /** The last press. */
  requestedAt?: string;
};

export async function refreshState(): Promise<RefreshState> {
  const [status, request, runs] = await Promise.all([readFinanceStatus(), readRefreshRequest(), latestRuns()]);
  const last = status.runs.find((r) => r.source !== "upload");
  const now = Date.now();
  const going = runs?.find(active);
  // Pressed, and no run has reported since (the dispatched run can take a few seconds to show up).
  const pending = request && now - Date.parse(request.at) < PENDING_MAX_MS && !(last && last.at >= request.at);
  // A run that ended without reporting (cancelled, or the job itself failed) ends the wait too.
  const endedSilently =
    pending && runs && !going && runs.some((r) => r.event === "workflow_dispatch" && r.created_at >= request!.at && r.status === "completed");
  const nextAtMs = request ? Date.parse(request.at) + REFRESH_GAP_MINUTES * 60_000 : 0;
  const state: RefreshState = {
    configured: refreshConfigured(),
    running: Boolean(going) || Boolean(pending && !endedSilently),
    since: going?.run_started_at ?? going?.created_at ?? (pending ? request!.at : undefined),
    last: last && { at: last.at, ok: last.ok, source: last.source, by: last.by, rows: last.rows, reason: last.reason },
    lastSuccessAt: status.lastSuccessAt,
    nextAt: nextAtMs > now ? new Date(nextAtMs).toISOString() : undefined,
    requestedAt: request?.at,
  };
  if (endedSilently) {
    const run = runs!.find((r) => r.event === "workflow_dispatch" && r.created_at >= request!.at)!;
    state.last = { at: run.created_at, ok: false, source: "manual", by: request!.by, reason: run.conclusion === "cancelled" ? "cancelled" : "other" };
  }
  return state;
}

export type StartResult =
  | { ok: true; state: RefreshState }
  | { ok: false; error: "no-token" | "too-soon" | "running" | "dispatch"; waitSeconds?: number; state?: RefreshState };

/** Starts a refresh run: the 20-minute gap, then the lock, then the dispatch. */
export async function startRefresh(by: RefreshBy): Promise<StartResult> {
  if (!refreshConfigured()) return { ok: false, error: "no-token" };
  const request = await readRefreshRequest();
  const now = Date.now();
  if (request) {
    const wait = Date.parse(request.at) + REFRESH_GAP_MINUTES * 60_000 - now;
    if (wait > 0) return { ok: false, error: "too-soon", waitSeconds: Math.ceil(wait / 1000) };
  }
  const runs = await latestRuns();
  if (runs === null) return { ok: false, error: "dispatch" };
  if (runs.some(active)) return { ok: false, error: "running", state: await refreshState() };
  // Hold the gap first (a second press in the same moment sees it), then start.
  const at = new Date(now).toISOString();
  await saveRefreshRequest({ at, by });
  try {
    const res = await gh(`/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ ref: REF, inputs: { mode: "refresh", requested_by: by } }),
    });
    if (res.status !== 204) throw new Error(String(res.status));
  } catch {
    // Not started: give the gap back.
    await saveRefreshRequest(request ?? null);
    return { ok: false, error: "dispatch" };
  }
  return { ok: true, state: await refreshState() };
}
