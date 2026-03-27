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
  lists_url?: string;
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

      console.log(
        `[sync] Card table "${table.title}" for project ${project.name}: ${
          (table.lists || []).length
        } columns, lists_url: ${table.lists_url || "none"}`
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

      // Try embedded lists first, fall back to fetching lists_url
      let columns = table.lists || [];

      if (columns.length === 0 && table.lists_url) {
        console.log(
          `[sync] No embedded lists, fetching from lists_url: ${table.lists_url}`
        );
        try {
          columns = await client.getAll<CardTableResponse["lists"][0]>(
            table.lists_url
          );
        } catch (err) {
          console.error(`[sync] Error fetching lists_url:`, err);
        }
      }

      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];

        console.log(
          `[sync]   Column "${column.title}": cards_count=${column.cards_count}, cards_url=${column.cards_url}`
        );

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

        // Always try to fetch cards — don't trust cards_count
        try {
          // Use cards_url from the API response if available, otherwise construct it
          const cardsUrl =
            column.cards_url ||
            `/buckets/${project.id}/card_tables/lists/${column.id}/cards.json`;

          const cards = await client.getAll<CardResponse>(cardsUrl);

          console.log(
            `[sync]     Fetched ${cards.length} cards from column "${column.title}"`
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
            `[sync] Error syncing cards for column ${column.id} "${column.title}":`,
            err
          );
        }
      }
    } catch (err) {
      console.error(
        `[sync] Error syncing card table for project ${project.id} "${project.name}":`,
        err
      );
    }
  }

  console.log(`[sync] Synced ${count} card tables, columns, and cards`);
  return count;
}
