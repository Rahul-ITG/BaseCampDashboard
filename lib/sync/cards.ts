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

interface ColumnDetailResponse {
  id: number;
  title: string;
  cards_count: number;
  cards_url: string;
  color: string | null;
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
      // Fetch card table — columns (lists) are embedded but lack cards_url
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
      console.log(
        `[sync] Card table "${table.title}" (${project.name}): ${embeddedColumns.length} columns`
      );

      for (let i = 0; i < embeddedColumns.length; i++) {
        const col = embeddedColumns[i];

        try {
          // Fetch column detail to get cards_count and cards_url
          const colDetail = await client.get<ColumnDetailResponse>(col.url);

          const dbColumn = await prisma.cardColumn.upsert({
            where: { basecampId: BigInt(col.id) },
            update: {
              title: colDetail.title,
              position: col.position ?? i,
            },
            create: {
              basecampId: BigInt(col.id),
              tableId: dbTable.id,
              title: colDetail.title,
              position: col.position ?? i,
            },
          });
          count++;

          // Fetch cards if column has any
          if (colDetail.cards_count > 0 && colDetail.cards_url) {
            const cards = await client.getAll<CardResponse>(
              colDetail.cards_url
            );

            console.log(
              `[sync]   Column "${colDetail.title}": ${cards.length} cards`
            );

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
          }
        } catch (err) {
          console.error(
            `[sync] Error syncing column ${col.id} "${col.title}":`,
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
