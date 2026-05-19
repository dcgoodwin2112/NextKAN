import { parentPort } from "node:worker_threads";

import { profileResource } from "./index";
import type { ProfileOptions, ProfileResult } from "./types";

if (!parentPort) {
  throw new Error("profiling/worker.entry must be loaded as a worker thread");
}

parentPort.on("message", async (msg: ProfileOptions) => {
  try {
    const result: ProfileResult = await profileResource(msg);
    parentPort!.postMessage({ ok: true, result });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    parentPort!.postMessage({ ok: false, error: { message: error.message, stack: error.stack } });
  }
});
