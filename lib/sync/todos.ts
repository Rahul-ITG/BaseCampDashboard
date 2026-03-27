import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import { getTodoLists, getTodos } from "@/lib/basecamp/endpoints";
import type { ProjectWithDock } from "./projects";

export async function syncTodos(
  client: BasecampClient,
  projects: ProjectWithDock[]
): Promise<number> {
  let count = 0;

  for (const { project, todoSetId } of projects) {
    if (!todoSetId) continue;

    const dbProject = await prisma.project.findUnique({
      where: { basecampId: project.id },
    });
    if (!dbProject) continue;

    try {
      const todoLists = await getTodoLists(client, project.id, todoSetId);

      for (const list of todoLists) {
        const dbList = await prisma.todoList.upsert({
          where: { basecampId: list.id },
          update: {
            name: list.title || list.name,
            completedRatio: parseFloat(list.completed_ratio) || 0,
            url: list.app_url,
          },
          create: {
            basecampId: list.id,
            projectId: dbProject.id,
            name: list.title || list.name,
            completedRatio: parseFloat(list.completed_ratio) || 0,
            url: list.app_url,
          },
        });
        count++;

        // Fetch individual todos for this list
        try {
          const todos = await getTodos(client, project.id, list.id);

          for (const todo of todos) {
            await prisma.todoItem.upsert({
              where: { basecampId: todo.id },
              update: {
                content: todo.content || todo.title,
                assigneeIds: todo.assignees?.map((a) => a.id) || [],
                dueOn: todo.due_on ? new Date(todo.due_on) : null,
                completed: todo.completed,
                completedAt: todo.completed_at
                  ? new Date(todo.completed_at)
                  : null,
                url: todo.app_url,
              },
              create: {
                basecampId: todo.id,
                listId: dbList.id,
                content: todo.content || todo.title,
                assigneeIds: todo.assignees?.map((a) => a.id) || [],
                dueOn: todo.due_on ? new Date(todo.due_on) : null,
                completed: todo.completed,
                completedAt: todo.completed_at
                  ? new Date(todo.completed_at)
                  : null,
                url: todo.app_url,
              },
            });
            count++;
          }
        } catch (err) {
          console.error(
            `[sync] Error syncing todos for list ${list.id}:`,
            err
          );
        }
      }
    } catch (err) {
      console.error(
        `[sync] Error syncing todo lists for project ${project.id}:`,
        err
      );
    }
  }

  console.log(`[sync] Synced ${count} todo lists and items`);
  return count;
}
