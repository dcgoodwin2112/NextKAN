/**
 * Catch and log errors from fire-and-forget promises instead of silently swallowing them.
 */
export function silentCatch(promise: Promise<unknown>, context: string): void {
  promise.catch((err) => {
    console.error(`[${context}]`, err);
  });
}
