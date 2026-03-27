import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import { getProjects } from "@/lib/basecamp/endpoints";
import type { BasecampProject } from "@/lib/basecamp/types";

export interface ProjectWithDock {
  project: BasecampProject;
  todoSetId: number | null;
  cardTableId: number | null;
  scheduleId: number | null;
}

export async function syncProjects(client: BasecampClient): Promise<{
  count: number;
  projects: ProjectWithDock[];
}> {
  const rawProjects = await getProjects(client);
  const projects: ProjectWithDock[] = [];
  let count = 0;

  for (const project of rawProjects) {
    // Skip archived or trashed projects
    if (project.status !== "active") continue;

    await prisma.project.upsert({
      where: { basecampId: project.id },
      update: {
        name: project.name,
        description: project.description || null,
        status: project.status,
        url: project.app_url,
      },
      create: {
        basecampId: project.id,
        name: project.name,
        description: project.description || null,
        status: project.status,
        url: project.app_url,
      },
    });
    count++;

    // Extract dock tool IDs
    const dock = project.dock || [];
    const todoSet = dock.find((d) => d.name === "todoset" && d.enabled);
    const cardTable = dock.find(
      (d) => d.name === "kanban_board" && d.enabled
    );
    const schedule = dock.find((d) => d.name === "schedule" && d.enabled);

    // Extract IDs from dock URLs
    projects.push({
      project,
      todoSetId: todoSet ? extractIdFromUrl(todoSet.url) : null,
      cardTableId: cardTable ? extractIdFromUrl(cardTable.url) : null,
      scheduleId: schedule ? extractIdFromUrl(schedule.url) : null,
    });
  }

  console.log(`[sync] Synced ${count} projects`);
  return { count, projects };
}

function extractIdFromUrl(url: string): number | null {
  // URLs look like: https://3.basecampapi.com/5402506/buckets/123/todosets/456.json
  const match = url.match(/\/(\d+)\.json$/);
  return match ? parseInt(match[1], 10) : null;
}
