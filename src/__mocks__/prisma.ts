import { PrismaClient } from "@/generated/prisma/client";
import { beforeEach, type Mock } from "vitest";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";

export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

// Prisma 7's generated methods use `SelectSubset<T, Args>` overloads that the
// vitest-mock-extended deep proxy doesn't expose `mockResolvedValue` on. Use
// `asMock(prismaMock.x.create).mockResolvedValue(row)` at call sites.
export function asMock(fn: unknown): Mock {
  return fn as unknown as Mock;
}

export default prismaMock;
