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

      const messages = await getMessages(client, project.id, messageBoardId);

      for (const msg of messages) {
        await prisma.message.upsert({
          where: { basecampId: BigInt(msg.id) },
          update: {
            subject: msg.subject || msg.title,
            creatorId: BigInt(msg.creator.id),
            creatorName: msg.creator.name,
            url: msg.app_url,
            postedAt: new Date(msg.created_at),
          },
          create: {
            basecampId: BigInt(msg.id),
            boardId: dbBoard.id,
            subject: msg.subject || msg.title,
            creatorId: BigInt(msg.creator.id),
            creatorName: msg.creator.name,
            url: msg.app_url,
            postedAt: new Date(msg.created_at),
          },
        });
        count++;
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
