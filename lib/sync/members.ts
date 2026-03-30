import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import { getProjectPeople } from "@/lib/basecamp/endpoints";
import type { ProjectWithDock } from "./projects";

export async function syncMembers(
  client: BasecampClient,
  projects: ProjectWithDock[]
): Promise<number> {
  let count = 0;

  for (const { project } of projects) {
    const dbProject = await prisma.project.findUnique({
      where: { basecampId: project.id },
    });
    if (!dbProject) continue;

    try {
      const members = await getProjectPeople(client, project.id);

      // Replace all members for this project
      await prisma.projectMember.deleteMany({
        where: { projectId: dbProject.id },
      });

      for (const member of members) {
        await prisma.projectMember.create({
          data: {
            projectId: dbProject.id,
            personId: BigInt(member.id),
          },
        });
        count++;
      }
    } catch (err) {
      console.error(
        `[sync] Error syncing members for "${project.name}":`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(`[sync] Synced ${count} project memberships`);
  return count;
}
