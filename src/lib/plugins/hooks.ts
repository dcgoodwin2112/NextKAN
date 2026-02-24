export type HookCallback = (...args: any[]) => Promise<any>;

export class HookRegistry {
  private hooks: Map<string, HookCallback[]> = new Map();

  register(hookName: string, callback: HookCallback): void {
    const existing = this.hooks.get(hookName) || [];
    existing.push(callback);
    this.hooks.set(hookName, existing);
  }

  async run(hookName: string, ...args: any[]): Promise<any[]> {
    const callbacks = this.hooks.get(hookName);
    if (!callbacks) return [];
    const results: any[] = [];
    for (const cb of callbacks) {
      results.push(await cb(...args));
    }
    return results;
  }

  clear(): void {
    this.hooks.clear();
  }
}

export const hooks = new HookRegistry();
