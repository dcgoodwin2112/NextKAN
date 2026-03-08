import slugify from "slugify";
import { prisma } from "@/lib/db";

export function generateSlug(text: string): string {
  return slugify(text, { lower: true, strict: true });
}

/**
 * Generate a unique dataset slug, appending -2, -3, etc. on collision.
 */
export async function ensureUniqueSlug(
  candidate: string,
  excludeId?: string
): Promise<string> {
  let slug = candidate;
  let suffix = 2;

  while (true) {
    const existing = await prisma.dataset.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return slug;
    slug = `${candidate}-${suffix}`;
    suffix++;
  }
}
