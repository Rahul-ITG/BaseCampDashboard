import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import type { ProjectWithDock } from "./projects";

interface CardTableResponse {
  id: number;
  title: string;
  lists: {
    id: number;
    title: string;
    url: string;
    position?: number;
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
      // Fetch card table — columns (lists) are embedded
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

      const embeddedColumns = table.lists || [];

      for (let i = 0; i < embeddedColumns.length; i++) {
        const col = embeddedColumns[i];

        const dbColumn = await prisma.cardColumn.upsert({
          where: { basecampId: BigInt(col.id) },
          update: {
            title: col.title,
            position: col.position ?? i,
          },
          create: {
            basecampId: BigInt(col.id),
            tableId: dbTable.id,
            title: col.title,
            position: col.position ?? i,
          },
        });
        count++;

        // Fetch cards using the known URL pattern — no extra API call needed
        try {
          const cardsUrl = `/buckets/${project.id}/card_tables/lists/${col.id}/cards.json`;
          const cards = await client.getAll<CardResponse>(cardsUrl);

          if (cards.length > 0) {
            console.log(
              `[sync] ${project.name} > "${col.title}": ${cards.length} cards`
            );
          }

          for (const card of cards) {
            await prisma.card.upsert({
              where: { basecampId: BigInt(card.id) },
              update: {
                title: card.title,
                assigneeIds:
                  card.assignees?.map((a) => BigInt(a.id)) || [],
                dueOn: card.due_on ? new Date(card.due_on) : null,
                url: card.app_url,
              },
              create: {
                basecampId: BigInt(card.id),
                columnId: dbColumn.id,
                title: card.title,
                assigneeIds:
                  card.assignees?.map((a) => BigInt(a.id)) || [],
                dueOn: card.due_on ? new Date(card.due_on) : null,
                url: card.app_url,
              },
            });
            count++;
          }
        } catch (err) {
          console.error(
            `[sync] Error fetching cards for column "${col.title}":`,
            err instanceof Error ? err.message : err
          );
        }
      }
    } catch (err) {
      console.error(
        `[sync] Error syncing card table for project "${project.name}":`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(`[sync] Synced ${count} card tables, columns, and cards`);
  return count;
}
