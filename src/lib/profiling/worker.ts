import { Worker } from "node:worker_threads";

import type { ProfileOptions, ProfileResult } from "./types";

// Worker entry is referenced via `new URL("./worker.entry.ts", import.meta.url)`.
// Next.js compiles this pattern into a sibling worker chunk at build time so
// the Server Action that consumes `profileInWorker` ships a working artifact.
//
// LIMITATION: This pattern requires the Next.js build pipeline. Invoking the
// profiler from a plain `npx tsx` script fails because the spawned worker
// boots with Node's module loader, which does not resolve the `@/*` tsconfig
// alias used by `./worker.entry.ts → ./index → @/lib/duckdb`. Workarounds:
//   1) Run via `next dev` / `next build` (production path)
//   2) For tests/scripts, call `profileResource()` directly in-process and
//      inject it via `profileDistribution(id, { profiler })` — this is the
//      pattern used by `test-data/seed-pivot-fixture.ts`.
//
// Vitest's loader also does not propagate to spawned workers, so end-to-end
// worker coverage lives in the Phase 4 Server Action integration tests rather
// than here — the in-process `profileResource()` already has full unit coverage.

export class ProfileTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Profiling exceeded timeout of ${timeoutMs}ms`);
    this.name = "ProfileTimeoutError";
  }
}

export interface ProfileInWorkerOptions extends ProfileOptions {
  /** Optional hard ceiling. The worker is terminated when this elapses. */
  timeoutMs?: number;
}

const WORKER_URL = new URL("./worker.entry.ts", import.meta.url);

interface WorkerSuccess {
  ok: true;
  result: ProfileResult;
}
interface WorkerFailure {
  ok: false;
  error: { message: string; stack?: string };
}
type WorkerReply = WorkerSuccess | WorkerFailure;

/**
 * Off-main-thread profiling. Spawns a fresh worker for each call so DuckDB
 * memory is reclaimed cleanly. A timeout aborts the worker hard.
 *
 * Resolves with the `ProfileResult` or rejects with `ProfileTimeoutError`
 * (timeout) or an `Error` with the worker's failure message.
 */
export function profileInWorker(
  opts: ProfileInWorkerOptions,
): Promise<ProfileResult> {
  const { timeoutMs, ...payload } = opts;

  return new Promise<ProfileResult>((resolve, reject) => {
    const worker = new Worker(WORKER_URL);
    let settled = false;
    let timer: NodeJS.Timeout | undefined;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      worker.removeAllListeners();
      worker.terminate().catch(() => {});
    };

    worker.once("message", (msg: WorkerReply) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (msg.ok) resolve(msg.result);
      else reject(new Error(msg.error.message));
    });

    worker.once("error", (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    });

    worker.once("exit", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`profiling worker exited unexpectedly (code ${code})`));
    });

    if (timeoutMs && timeoutMs > 0) {
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new ProfileTimeoutError(timeoutMs));
      }, timeoutMs);
    }

    worker.postMessage(payload);
  });
}
