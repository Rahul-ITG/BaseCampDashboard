import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import { getCardColumns, getCards } from "@/lib/basecamp/endpoints";
import type { ProjectWithDock } from "./projects";

export async function syncCards(
  client: BasecampClient,
  projects: ProjectWithDock[]
): Promise<number> {
  let count = 0;

  for (const { project, cardTableId } of projects) {
    if (!cardTableId) continue;

    const dbProject = await prisma.project.findUnique({
      where: { basecampId: project.id },
    });
    if (!dbProject) continue;

    try {
      // Upsert the card table
      const dbTable = await prisma.cardTable.upsert({
        where: { basecampId: cardTableId },
        update: {
          name: project.name + " - Card Table",
        },
        create: {
          basecampId: cardTableId,
          projectId: dbProject.id,
          name: project.name + " - Card Table",
        },
      });
      count++;

      const columns = await getCardColumns(client, project.id, cardTableId);

      for (const column of columns) {
        const dbColumn = await prisma.cardColumn.upsert({
          where: { basecampId: column.id },
          update: {
            title: column.title,
            position: column.position,
          },
          create: {
            basecampId: column.id,
            tableId: dbTable.id,
            title: column.title,
            position: column.position,
          },
        });
        count++;

        // Fetch cards for this column
        try {
          const cards = await getCards(client, project.id, column.id);

          for (const card of cards) {
            await prisma.card.upsert({
              where: { basecampId: card.id },
              update: {
                title: card.title,
                assigneeIds: card.assignees?.map((a) => a.id) || [],
                dueOn: card.due_on ? new Date(card.due_on) : null,
                url: card.app_url,
              },
              create: {
                basecampId: card.id,
                columnId: dbColumn.id,
                title: card.title,
                assigneeIds: card.assignees?.map((a) => a.id) || [],
                dueOn: card.due_on ? new Date(card.due_on) : null,
                url: card.app_url,
              },
            });
            count++;
          }
        } catch (err) {
          console.error(
            `[sync] Error syncing cards for column ${column.id}:`,
            err
          );
        }
      }
    } catch (err) {
      console.error(
        `[sync] Error syncing card table for project ${project.id}:`,
        err
      );
    }
  }

  console.log(`[sync] Synced ${count} card tables, columns, and cards`);
  return count;
}
