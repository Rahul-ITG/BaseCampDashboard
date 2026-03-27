import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import { getScheduleEntries } from "@/lib/basecamp/endpoints";
import type { ProjectWithDock } from "./projects";

export async function syncSchedules(
  client: BasecampClient,
  projects: ProjectWithDock[]
): Promise<number> {
  let count = 0;

  for (const { project, scheduleId } of projects) {
    if (!scheduleId) continue;

    const dbProject = await prisma.project.findUnique({
      where: { basecampId: project.id },
    });
    if (!dbProject) continue;

    try {
      const entries = await getScheduleEntries(
        client,
        project.id,
        scheduleId
      );

      for (const entry of entries) {
        await prisma.scheduleEntry.upsert({
          where: { basecampId: entry.id },
          update: {
            summary: entry.summary || entry.title,
            startsAt: entry.starts_at ? new Date(entry.starts_at) : null,
            endsAt: entry.ends_at ? new Date(entry.ends_at) : null,
            assigneeIds: entry.assignees?.map((a) => a.id) || [],
            url: entry.app_url,
          },
          create: {
            basecampId: entry.id,
            projectId: dbProject.id,
            summary: entry.summary || entry.title,
            startsAt: entry.starts_at ? new Date(entry.starts_at) : null,
            endsAt: entry.ends_at ? new Date(entry.ends_at) : null,
            assigneeIds: entry.assignees?.map((a) => a.id) || [],
            url: entry.app_url,
          },
        });
        count++;
      }
    } catch (err) {
      console.error(
        `[sync] Error syncing schedule for project ${project.id}:`,
        err
      );
    }
  }

  console.log(`[sync] Synced ${count} schedule entries`);
  return count;
}
