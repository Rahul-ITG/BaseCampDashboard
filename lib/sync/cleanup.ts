import { prisma } from "@/lib/db";

/**
 * Remove all synced data for projects that have syncEnabled = false.
 * Cascade deletes handle child records (TodoItems, Cards, Messages, etc.)
 */
export async function cleanupDisabledProjects(): Promise<number> {
  const disabledProjects = await prisma.project.findMany({
    where: { syncEnabled: false },
    select: { id: true, name: true },
  });

  if (disabledProjects.length === 0) return 0;

  let cleaned = 0;

  for (const project of disabledProjects) {
    try {
      // Cascade deletes handle child records
      const [todos, cards, schedules, messages, members] = await Promise.all([
        prisma.todoList.deleteMany({ where: { projectId: project.id } }),
        prisma.cardTable.deleteMany({ where: { projectId: project.id } }),
        prisma.scheduleEntry.deleteMany({ where: { projectId: project.id } }),
        prisma.messageBoard.deleteMany({ where: { projectId: project.id } }),
        prisma.projectMember.deleteMany({ where: { projectId: project.id } }),
      ]);

      const total =
        todos.count + cards.count + schedules.count + messages.count + members.count;

      if (total > 0) {
        console.log(
          `[sync] Cleaned up ${total} records for disabled project "${project.name}"`
        );
        cleaned += total;
      }
    } catch (err) {
      console.error(
        `[sync] Error cleaning up project "${project.name}":`,
        err instanceof Error ? err.message : err
      );
    }
  }

  if (cleaned > 0) {
    console.log(`[sync] Total cleanup: ${cleaned} records from ${disabledProjects.length} disabled projects`);
  }

  return cleaned;
}
