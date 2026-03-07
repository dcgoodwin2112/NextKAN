import { AsyncLocalStorage } from "async_hooks";

export type TokenUser = {
  id: string;
  email?: string;
  name?: string | null;
  role: string;
  organizationId?: string | null;
};

export const tokenAuthContext = new AsyncLocalStorage<TokenUser>();
