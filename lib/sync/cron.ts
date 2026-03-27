import cron from "node-cron";
import { runFullSync } from "./orchestrator";

let isRunning = false;

export function startSyncCron() {
  const intervalMinutes = parseInt(
    process.env.SYNC_INTERVAL_MINUTES || "15",
    10
  );

  // Convert minutes to cron expression: "*/15 * * * *"
  const cronExpression = `*/${intervalMinutes} * * * *`;

  console.log(
    `[cron] Scheduling sync every ${intervalMinutes} minutes (${cronExpression})`
  );

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
