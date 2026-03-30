export async function register() {
  // Only run on the server (not during build or in edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSyncCron } = await import("@/lib/sync/cron");
    startSyncCron();
  }
}
