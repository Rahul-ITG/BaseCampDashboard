import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import { getValidToken } from "@/lib/basecamp/auth";
import { syncPeople } from "./people";
import { syncProjects } from "./projects";
import { syncTodos } from "./todos";
import { syncCards } from "./cards";
import { syncSchedules } from "./schedules";
import { syncMessages } from "./messages";
import { syncMembers } from "./members";
import { cleanupDisabledProjects } from "./cleanup";

export async function runFullSync(): Promise<{
  success: boolean;
  recordsSynced: number;
  durationMs: number;
  error?: string;
}> {
  // Clean up any stuck "running" syncs from previous crashed runs
  await prisma.syncLog.updateMany({
    where: { status: "running" },
    data: { status: "crashed", completedAt: new Date() },
  });

  const startedAt = new Date();
  const syncLog = await prisma.syncLog.create({
    data: { startedAt, status: "running" },
  });

  console.log(`[sync] Starting full sync at ${startedAt.toISOString()}`);

  let totalRecords = 0;
  const errors: string[] = [];

  // Helper: persist progress to DB after each step so we can debug crashes
  async function updateProgress(step: string) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        recordsSynced: totalRecords,
        errors: errors.length > 0 ? `[${step}] ${errors.join("; ")}` : `[${step}] in progress`,
      },
    }).catch(() => {}); // don't let logging errors crash the sync
  }

  try {
    await updateProgress("getToken");
    const accessToken = await getValidToken();
    const client = new BasecampClient(accessToken);

    // 1. Sync people
    await updateProgress("people:start");
    try {
      const peopleCount = await syncPeople(client);
      totalRecords += peopleCount;
    } catch (err) {
      const msg = `People sync failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[sync] ${msg}`);
      errors.push(msg);
    }

    // 2. Sync projects and get dock info
    await updateProgress("projects:start");
    let projects: Awaited<ReturnType<typeof syncProjects>>["projects"] = [];
    try {
      const result = await syncProjects(client);
      totalRecords += result.count;
      projects = result.projects;
    } catch (err) {
      const msg = `Projects sync failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[sync] ${msg}`);
      errors.push(msg);
    }

    // Filter to only sync-enabled projects
    const enabledBasecampIds = new Set(
      (await prisma.project.findMany({
        where: { syncEnabled: true },
        select: { basecampId: true },
      })).map((p) => p.basecampId.toString())
    );
    const enabledProjects = projects.filter((p) =>
      enabledBasecampIds.has(p.project.id.toString())
    );
    console.log(
      `[sync] ${enabledProjects.length} of ${projects.length} projects enabled for sync`
    );

    // 3. Sync todos
    await updateProgress("todos:start");
    try {
      const todosCount = await syncTodos(client, enabledProjects);
      totalRecords += todosCount;
    } catch (err) {
      const msg = `Todos sync failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[sync] ${msg}`);
      errors.push(msg);
    }

    // 4. Sync cards
    await updateProgress("cards:start");
    try {
      const cardsCount = await syncCards(client, enabledProjects);
      totalRecords += cardsCount;
    } catch (err) {
      const msg = `Cards sync failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[sync] ${msg}`);
      errors.push(msg);
    }

    // 5. Sync schedules
    await updateProgress("schedules:start");
    try {
      const schedulesCount = await syncSchedules(client, enabledProjects);
      totalRecords += schedulesCount;
    } catch (err) {
      const msg = `Schedules sync failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[sync] ${msg}`);
      errors.push(msg);
    }

    // 6. Sync messages
    await updateProgress("messages:start");
    try {
      const messagesCount = await syncMessages(client, enabledProjects);
      totalRecords += messagesCount;
    } catch (err) {
      const msg = `Messages sync failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[sync] ${msg}`);
      errors.push(msg);
    }

    // 7. Sync project membership
    await updateProgress("members:start");
    try {
      const membersCount = await syncMembers(client, enabledProjects);
      totalRecords += membersCount;
    } catch (err) {
      const msg = `Members sync failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[sync] ${msg}`);
      errors.push(msg);
    }

    // 8. Cleanup disabled projects
    await updateProgress("cleanup:start");
    try {
      const cleanedCount = await cleanupDisabledProjects();
      if (cleanedCount > 0) {
        console.log(`[sync] Cleaned ${cleanedCount} records from disabled projects`);
      }
    } catch (err) {
      const msg = `Cleanup failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[sync] ${msg}`);
      errors.push(msg);
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const status = errors.length > 0 ? "partial" : "success";

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt,
        status,
        recordsSynced: totalRecords,
        errors: errors.length > 0 ? errors.join("; ") : null,
        durationMs,
      },
    });

    console.log(
      `[sync] ${status} in ${durationMs}ms. ${totalRecords} records synced.${errors.length > 0 ? ` Errors: ${errors.join("; ")}` : ""}`
    );

    return {
      success: errors.length === 0,
      recordsSynced: totalRecords,
      durationMs,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    };
  } catch (error) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt,
        status: "error",
        errors: errorMessage,
        recordsSynced: totalRecords,
        durationMs,
      },
    });

    console.error(`[sync] Failed after ${durationMs}ms:`, errorMessage);

    return {
      success: false,
      recordsSynced: totalRecords,
      durationMs,
      error: errorMessage,
    };
  }
}
