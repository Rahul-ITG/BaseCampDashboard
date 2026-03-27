import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import type { ProjectWithDock } from "./projects";

interface CardTableResponse {
  id: number;
  title: string;
  lists: {
    id: number;
    title: string;
    position?: number;
    cards_count: number;
    cards_url: string;
  }[];
}

interface CardResponse {
  id: number;
  title: string;
  due_on: string | null;
  app_url: string;
  assignees: { id: number }[];
}

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
      // Fetch card table — columns (lists) are embedded in the response
      const table = await client.get<CardTableResponse>(
        `/buckets/${project.id}/card_tables/${cardTableId}.json`
      );

      const dbTable = await prisma.cardTable.upsert({
        where: { basecampId: BigInt(cardTableId) },
        update: { name: table.title || project.name + " - Card Table" },
        create: {
          basecampId: BigInt(cardTableId),
          projectId: dbProject.id,
          name: table.title || project.name + " - Card Table",
        },
      });
      count++;

      const columns = table.lists || [];

      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];

        const dbColumn = await prisma.cardColumn.upsert({
          where: { basecampId: BigInt(column.id) },
          update: {
            title: column.title,
            position: column.position ?? i,
          },
          create: {
            basecampId: BigInt(column.id),
            tableId: dbTable.id,
            title: column.title,
            position: column.position ?? i,
          },
        });
        count++;

        // Fetch cards for this column if it has any
        if (column.cards_count > 0) {
          try {
            const cards = await client.getAll<CardResponse>(
              `/buckets/${project.id}/card_tables/lists/${column.id}/cards.json`
            );

            for (const card of cards) {
              await prisma.card.upsert({
                where: { basecampId: BigInt(card.id) },
                update: {
                  title: card.title,
                  assigneeIds: card.assignees?.map((a) => BigInt(a.id)) || [],
                  dueOn: card.due_on ? new Date(card.due_on) : null,
                  url: card.app_url,
                },
                create: {
                  basecampId: BigInt(card.id),
                  columnId: dbColumn.id,
                  title: card.title,
                  assigneeIds: card.assignees?.map((a) => BigInt(a.id)) || [],
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
