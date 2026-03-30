import cron from "node-cron";
import { runFullSync } from "./orchestrator";

let isRunning = false;

export function startSyncCron() {
  // Run once per day at 2:00 AM UTC
  const cronExpression = "0 2 * * *";

  console.log(`[cron] Scheduling daily sync at 2:00 AM UTC`);

  cron.schedule(cronExpression, async () => {
    if (isRunning) {
      console.log("[cron] Sync already in progress, skipping");
      return;
    }

    isRunning = true;
    try {
      await runFullSync();
    } catch (err) {
      console.error("[cron] Sync failed:", err);
    } finally {
      isRunning = false;
    }
  });
}
