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
  const startedAt = new Date();
  const syncLog = await prisma.syncLog.create({
    data: { startedAt, status: "running" },
  });

  console.log(`[sync] Starting full sync at ${startedAt.toISOString()}`);

  try {
    // Get a valid access token
    const accessToken = await getValidToken();
    const client = new BasecampClient(accessToken);

    let totalRecords = 0;

    // 1. Sync people first (needed for assignee references)
    const peopleCount = await syncPeople(client);
    totalRecords += peopleCount;

    // 2. Sync projects and get dock info
    const { count: projectCount, projects } = await syncProjects(client);
    totalRecords += projectCount;

    // 3. Sync todos, cards, and schedules for each project
    const todosCount = await syncTodos(client, projects);
    totalRecords += todosCount;

    const cardsCount = await syncCards(client, projects);
    totalRecords += cardsCount;

    const schedulesCount = await syncSchedules(client, projects);
    totalRecords += schedulesCount;

    // Update sync log
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt,
        status: "success",
        recordsSynced: totalRecords,
        durationMs,
      },
    });

    console.log(
      `[sync] Completed in ${durationMs}ms. ${totalRecords} records synced.`
    );

    return { success: true, recordsSynced: totalRecords, durationMs };
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
        durationMs,
      },
    });

    console.error(`[sync] Failed after ${durationMs}ms:`, errorMessage);

    return {
      success: false,
      recordsSynced: 0,
      durationMs,
      error: errorMessage,
    };
  }
}
