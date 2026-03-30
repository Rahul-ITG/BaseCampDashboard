export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { TodosView } from "@/components/dashboard/todos-view";

const enabledViaList = { list: { project: { syncEnabled: true } } };

export default async function TodosPage() {
  const [todoLists, overdueTodos, completionStats, recentCompleted, upcomingDue, projects] =
    await Promise.all([
      prisma.todoList.findMany({
        where: { project: { syncEnabled: true } },
        include: {
          project: { select: { name: true, createdAt: true } },
          _count: { select: { todos: true } },
          todos: {
            select: { completed: true },
          },
        },
        orderBy: { project: { createdAt: "desc" } },
        take: 100,
      }),
      prisma.todoItem.findMany({
        where: {
          completed: false,
          dueOn: { lt: new Date() },
          ...enabledViaList,
        },
        include: {
          list: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
        orderBy: { dueOn: "asc" },
        take: 50,
      }),
      prisma.todoItem.groupBy({
        by: ["completed"],
        where: { ...enabledViaList },
        _count: true,
      }),
      prisma.todoItem.findMany({
        where: {
          completed: true,
          completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          ...enabledViaList,
        },
        include: {
          list: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
        orderBy: { completedAt: "desc" },
        take: 10,
      }),
      prisma.todoItem.findMany({
        where: {
          completed: false,
          dueOn: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          ...enabledViaList,
        },
        include: {
          list: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
        orderBy: { dueOn: "asc" },
        take: 20,
      }),
      prisma.project.findMany({
        where: { syncEnabled: true },
        select: { name: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const totalTodos = completionStats.reduce((sum, s) => sum + s._count, 0);
  const completedTodos =
    completionStats.find((s) => s.completed)?._count || 0;
  const completionRate =
    totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  // Gather assignee IDs
  const allAssigneeIds = [
    ...overdueTodos.flatMap((t) => t.assigneeIds),
    ...upcomingDue.flatMap((t) => t.assigneeIds),
  ];
  const uniqueAssigneeIds = Array.from(new Set(allAssigneeIds.map(String)));
  const people =
    uniqueAssigneeIds.length > 0
      ? await prisma.person.findMany({
          where: { basecampId: { in: uniqueAssigneeIds.map(BigInt) } },
          select: { basecampId: true, name: true, avatarUrl: true },
        })
      : [];
  const personMap: Record<string, { name: string; avatarUrl: string | null }> =
    Object.fromEntries(
      people.map((p) => [
        p.basecampId.toString(),
        { name: p.name, avatarUrl: p.avatarUrl },
      ])
    );

  // Serialize for client component
  const serialized = {
    projectNames: projects.map((p) => p.name),
    stats: { totalTodos, completedTodos, completionRate, overdueCount: overdueTodos.length, recentCompletedCount: recentCompleted.length },
    overdueTodos: overdueTodos.map((t) => ({
      id: t.id,
      content: t.content,
      url: t.url,
      dueOn: t.dueOn?.toISOString() || null,
      assigneeIds: t.assigneeIds.map(String),
      projectName: t.list.project.name,
      listName: t.list.name,
    })),
    upcomingDue: upcomingDue.map((t) => ({
      id: t.id,
      content: t.content,
      url: t.url,
      dueOn: t.dueOn?.toISOString() || null,
      assigneeIds: t.assigneeIds.map(String),
      projectName: t.list.project.name,
      listName: t.list.name,
    })),
    recentCompleted: recentCompleted.map((t) => ({
      id: t.id,
      content: t.content,
      completedAt: t.completedAt?.toISOString() || null,
      projectName: t.list.project.name,
    })),
    todoLists: todoLists.map((l) => ({
      id: l.id,
      name: l.name,
      url: l.url,
      projectName: l.project.name,
      totalItems: l.todos.length,
      completedItems: l.todos.filter((t) => t.completed).length,
    })),
    personMap,
  };

  return <TodosView data={serialized} />;
}
