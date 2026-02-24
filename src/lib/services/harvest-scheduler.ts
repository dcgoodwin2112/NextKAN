import cron from "node-cron";
import { prisma } from "@/lib/db";
import { runHarvest } from "./harvest";

let schedulerStarted = false;

/** Start the harvest scheduler. Checks enabled sources each minute. */
export function startHarvestScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  cron.schedule("* * * * *", async () => {
    try {
      const sources = await prisma.harvestSource.findMany({
        where: { enabled: true, schedule: { not: null } },
      });

      for (const source of sources) {
        if (source.schedule && cron.validate(source.schedule)) {
          // Check if this source's cron schedule should run now
          // Simple approach: only run if no harvest in last interval
          const lastRun = source.lastHarvestAt?.getTime() ?? 0;
          const now = Date.now();
          const minutesSinceLastRun = (now - lastRun) / (1000 * 60);

          // Parse cron to get minimum interval (simplified)
          if (minutesSinceLastRun >= 60) {
            runHarvest(source.id).catch(() => {});
          }
        }
      }
    } catch {
      // Non-fatal scheduler error
    }
  });
}
