export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckSquare,
  ListTodo,
  AlertTriangle,
  ExternalLink,
  Clock,
  CalendarDays,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AvatarGroup } from "@/components/dashboard/avatar-group";
import { format, formatDistanceToNow } from "date-fns";

export default async function TodosPage() {
  const [todoLists, overdueTodos, completionStats, recentCompleted, upcomingDue] =
    await Promise.all([
      prisma.todoList.findMany({
        include: {
          project: { select: { name: true } },
          _count: { select: { todos: true } },
          todos: {
            select: { completed: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.todoItem.findMany({
        where: {
          completed: false,
          dueOn: { lt: new Date() },
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
        _count: true,
      }),
      // Recently completed todos
      prisma.todoItem.findMany({
        where: {
          completed: true,
          completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
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
      // Upcoming due (next 7 days)
      prisma.todoItem.findMany({
        where: {
          completed: false,
          dueOn: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
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
    ]);

  const totalTodos = completionStats.reduce((sum, s) => sum + s._count, 0);
  const completedTodos =
    completionStats.find((s) => s.completed)?._count || 0;
  const completionRate =
    totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  // Gather all assignee IDs from overdue + upcoming
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
  const personMap = new Map(
    people.map((p) => [
      p.basecampId.toString(),
      { name: p.name, avatarUrl: p.avatarUrl },
    ])
  );

  function getAssigneePeople(ids: bigint[]) {
    return ids
      .map((id) => personMap.get(id.toString()))
      .filter(Boolean) as { name: string; avatarUrl: string | null }[];
  }

  // Group todo lists by project
  const projectGroups = new Map<
    string,
    { projectName: string; lists: typeof todoLists }
  >();
  for (const list of todoLists) {
    const key = list.project.name;
    if (!projectGroups.has(key)) {
      projectGroups.set(key, { projectName: key, lists: [] });
    }
    projectGroups.get(key)!.lists.push(list);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="label-uppercase">Task Management</p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">
          To-Do Progress
        </h2>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CheckSquare}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="Completion"
          value={`${completionRate}%`}
          subtitle={`${completedTodos.toLocaleString()} of ${totalTodos.toLocaleString()}`}
        />
        <StatCard
          icon={ListTodo}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
          label="Open"
          value={totalTodos - completedTodos}
          subtitle="Awaiting completion"
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-red-500/10"
          iconColor="text-destructive"
          label="Overdue"
          value={overdueTodos.length}
          subtitle="Past due date"
        />
        <StatCard
          icon={Clock}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          label="Completed This Week"
          value={recentCompleted.length}
          subtitle="Last 7 days"
        />
      </div>

      {/* Overdue items */}
      {overdueTodos.length > 0 && (
        <div>
          <h3 className="text-xl font-bold tracking-tight mb-4">
            Overdue To-Dos
          </h3>
          <Card>
            <CardContent className="pt-7">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>To-Do</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>List</TableHead>
                    <TableHead>Assignees</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Late</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueTodos.map((todo) => {
                    const daysLate = todo.dueOn
                      ? Math.floor(
                          (Date.now() - new Date(todo.dueOn).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : 0;
                    return (
                      <TableRow key={todo.id}>
                        <TableCell className="max-w-[280px] font-medium">
                          <div className="flex items-start gap-1">
                            <span className="h-2 w-2 rounded-full bg-destructive mt-1.5 shrink-0" />
                            {todo.url ? (
                              <a
                                href={todo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors inline-flex items-center gap-1"
                              >
                                <span className="truncate">{todo.content}</span>
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                              </a>
                            ) : (
                              <span className="truncate">{todo.content}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {todo.list.project.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {todo.list.name}
                        </TableCell>
                        <TableCell>
                          {todo.assigneeIds.length > 0 ? (
                            <AvatarGroup
                              people={getAssigneePeople(todo.assigneeIds)}
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {todo.dueOn
                            ? format(new Date(todo.dueOn), "MMM d, yyyy")
                            : "--"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="overdue">
                            {daysLate} {daysLate === 1 ? "day" : "days"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming due soon */}
      {upcomingDue.length > 0 && (
        <div>
          <h3 className="text-xl font-bold tracking-tight mb-4">
            Due This Week
          </h3>
          <Card>
            <CardContent className="pt-7">
              <div className="space-y-1">
                {upcomingDue.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-secondary"
                  >
                    <CalendarDays className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {todo.url ? (
                        <a
                          href={todo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:text-primary transition-colors inline-flex items-center gap-1"
                        >
                          {todo.content}
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                        </a>
                      ) : (
                        <p className="font-medium text-sm">{todo.content}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {todo.list.project.name} &bull; {todo.list.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {todo.dueOn
                          ? format(new Date(todo.dueOn), "MMM d")
                          : "--"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {todo.dueOn
                          ? formatDistanceToNow(new Date(todo.dueOn), {
                              addSuffix: true,
                            })
                          : ""}
                      </p>
                    </div>
                    {todo.assigneeIds.length > 0 && (
                      <AvatarGroup
                        people={getAssigneePeople(todo.assigneeIds)}
                        max={2}
                        size="sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recently completed */}
      {recentCompleted.length > 0 && (
        <div>
          <h3 className="text-xl font-bold tracking-tight mb-4">
            Recently Completed
          </h3>
          <Card>
            <CardContent className="pt-7">
              <div className="space-y-1">
                {recentCompleted.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-secondary"
                  >
                    <CheckSquare className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-muted-foreground line-through">
                        {todo.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {todo.list.project.name} &bull;{" "}
                        {todo.completedAt
                          ? formatDistanceToNow(new Date(todo.completedAt), {
                              addSuffix: true,
                            })
                          : "recently"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* To-Do Lists grouped by project */}
      <div>
        <h3 className="text-xl font-bold tracking-tight mb-4">
          To-Do Lists by Project
        </h3>
        {todoLists.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-sm text-muted-foreground text-center">
                No to-do lists found. Run a sync to pull data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" defaultValue={[]} className="space-y-3">
            {Array.from(projectGroups.entries()).map(
              ([projectName, { lists }]) => {
                const totalItems = lists.reduce(
                  (s, l) => s + l.todos.length,
                  0
                );
                const completedItems = lists.reduce(
                  (s, l) => s + l.todos.filter((t) => t.completed).length,
                  0
                );
                const projectRate =
                  totalItems > 0
                    ? Math.round((completedItems / totalItems) * 100)
                    : 0;

                return (
                  <AccordionItem
                    key={projectName}
                    value={projectName}
                    className="rounded-xl bg-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-7 py-5 hover:no-underline hover:bg-secondary/50">
                      <div className="flex items-center gap-4 text-left w-full mr-4">
                        <div className="flex-1">
                          <p className="font-semibold text-base">
                            {projectName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lists.length} lists &bull; {completedItems}/
                            {totalItems} items complete
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-24">
                            <Progress value={projectRate} className="h-2" />
                          </div>
                          <span className="text-sm font-semibold w-10 text-right">
                            {projectRate}%
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-7 pb-5">
                      <div className="space-y-4">
                        {lists.map((list) => {
                          const listCompleted = list.todos.filter(
                            (t) => t.completed
                          ).length;
                          const listTotal = list.todos.length;
                          const listRate =
                            listTotal > 0
                              ? Math.round(
                                  (listCompleted / listTotal) * 100
                                )
                              : 0;

                          return (
                            <div key={list.id} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  {list.url ? (
                                    <a
                                      href={list.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
                                    >
                                      {list.name}
                                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                    </a>
                                  ) : (
                                    <span className="font-medium">
                                      {list.name}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {listCompleted}/{listTotal}
                                  </span>
                                </div>
                                <span className="text-sm font-semibold">
                                  {listRate}%
                                </span>
                              </div>
                              <Progress
                                value={listRate}
                                className="h-1.5"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }
            )}
          </Accordion>
        )}
      </div>
    </div>
  );
}
