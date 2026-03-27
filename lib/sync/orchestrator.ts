import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import { getValidToken } from "@/lib/basecamp/auth";
import { syncPeople } from "./people";
import { syncProjects } from "./projects";
import { syncTodos } from "./todos";
import { syncCards } from "./cards";
import { syncSchedules } from "./schedules";

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

  try {
    const accessToken = await getValidToken();
    const client = new BasecampClient(accessToken);

    // 1. Sync people
    try {
      const peopleCount = await syncPeople(client);
      totalRecords += peopleCount;
    } catch (err) {
      const msg = `People sync failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[sync] ${msg}`);
      errors.push(msg);
    }

    // 2. Sync projects and get dock info
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

    // 3. Sync todos
    try {
      const todosCount = await syncTodos(client, projects);
      totalRecords += todosCount;
    } catch (err) {
      const msg = `Todos sync failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[sync] ${msg}`);
      errors.push(msg);
    }

    // 4. Sync cards
    try {
      const cardsCount = await syncCards(client, projects);
      totalRecords += cardsCount;
    } catch (err) {
      const msg = `Cards sync failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[sync] ${msg}`);
      errors.push(msg);
    }

    // 5. Sync schedules
    try {
      const schedulesCount = await syncSchedules(client, projects);
      totalRecords += schedulesCount;
    } catch (err) {
      const msg = `Schedules sync failed: ${err instanceof Error ? err.message : err}`;
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
