import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import { getMessages } from "@/lib/basecamp/endpoints";
import type { ProjectWithDock } from "./projects";

export async function syncMessages(
  client: BasecampClient,
  projects: ProjectWithDock[]
): Promise<number> {
  let count = 0;

  for (const { project, messageBoardId } of projects) {
    if (!messageBoardId) continue;

    const dbProject = await prisma.project.findUnique({
      where: { basecampId: project.id },
    });
    if (!dbProject) continue;

    try {
      const dbBoard = await prisma.messageBoard.upsert({
        where: { basecampId: BigInt(messageBoardId) },
        update: { name: project.name + " - Messages" },
        create: {
          basecampId: BigInt(messageBoardId),
          projectId: dbProject.id,
          name: project.name + " - Messages",
        },
      });
      count++;

      let messages;
      try {
        const raw = await getMessages(client, project.id, messageBoardId);
        messages = Array.isArray(raw) ? raw : [];
      } catch (err) {
        console.error(
          `[sync] Failed to fetch messages for "${project.name}":`,
          err instanceof Error ? err.message : err
        );
        continue;
      }

      for (const msg of messages) {
        // Guard against missing creator or subject
        const subject = msg.subject || msg.title || "(No subject)";
        const creatorId = msg.creator?.id;
        const creatorName = msg.creator?.name || "Unknown";

        if (!creatorId) {
          console.warn(`[sync] Skipping message ${msg.id}: no creator ID`);
          continue;
        }

        try {
          await prisma.message.upsert({
            where: { basecampId: BigInt(msg.id) },
            update: {
              subject,
              creatorId: BigInt(creatorId),
              creatorName,
              url: msg.app_url || null,
              postedAt: new Date(msg.created_at),
            },
            create: {
              basecampId: BigInt(msg.id),
              boardId: dbBoard.id,
              subject,
              creatorId: BigInt(creatorId),
              creatorName,
              url: msg.app_url || null,
              postedAt: new Date(msg.created_at),
            },
          });
          count++;
        } catch (err) {
          console.error(
            `[sync] Error upserting message ${msg.id}:`,
            err instanceof Error ? err.message : err
          );
        }
      }

      if (messages.length > 0) {
        console.log(
          `[sync] ${project.name}: ${messages.length} messages`
        );
      }
    } catch (err) {
      console.error(
        `[sync] Error syncing messages for "${project.name}":`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(`[sync] Synced ${count} message boards and messages`);
  return count;
}
