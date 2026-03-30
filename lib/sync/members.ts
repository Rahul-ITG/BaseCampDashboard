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
      let members;
      try {
        const raw = await getProjectPeople(client, project.id);
        members = Array.isArray(raw) ? raw : [];
      } catch (err) {
        // This endpoint may not be available for all project types
        console.warn(
          `[sync] Could not fetch members for "${project.name}":`,
          err instanceof Error ? err.message : err
        );
        continue;
      }

      if (members.length === 0) continue;

      // Replace all members for this project
      await prisma.projectMember.deleteMany({
        where: { projectId: dbProject.id },
      });

      // Batch create for efficiency
      const memberData = members
        .filter((m) => m && m.id)
        .map((member) => ({
          projectId: dbProject.id,
          personId: BigInt(member.id),
        }));

      if (memberData.length > 0) {
        await prisma.projectMember.createMany({
          data: memberData,
          skipDuplicates: true,
        });
        count += memberData.length;
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
