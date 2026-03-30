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
import { CheckSquare, ListTodo, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AvatarGroup } from "@/components/dashboard/avatar-group";
import { format } from "date-fns";

export default async function TodosPage() {
  const [todoLists, overdueTodos, completionStats] = await Promise.all([
    prisma.todoList.findMany({
      include: {
        project: { select: { name: true } },
        _count: { select: { todos: true } },
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
  ]);

  const totalTodos = completionStats.reduce((sum, s) => sum + s._count, 0);
  const completedTodos =
    completionStats.find((s) => s.completed)?._count || 0;
  const completionRate =
    totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  const allAssigneeIds = overdueTodos.flatMap((t) => t.assigneeIds);
  const uniqueAssigneeIds = Array.from(new Set(allAssigneeIds.map(String)));
  const people = uniqueAssigneeIds.length > 0
    ? await prisma.person.findMany({
        where: { basecampId: { in: uniqueAssigneeIds.map(BigInt) } },
        select: { basecampId: true, name: true, avatarUrl: true },
      })
    : [];
  const personMap = new Map(
    people.map((p) => [p.basecampId.toString(), { name: p.name, avatarUrl: p.avatarUrl }])
  );

  function getAssigneePeople(ids: bigint[]) {
    return ids
      .map((id) => personMap.get(id.toString()))
      .filter(Boolean) as { name: string; avatarUrl: string | null }[];
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="label-uppercase">Task Management</p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">To-Do Progress</h2>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={CheckSquare}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="Overall Completion"
          value={`${completionRate}%`}
          subtitle={`${completedTodos.toLocaleString()} of ${totalTodos.toLocaleString()} complete`}
        />
        <StatCard
          icon={ListTodo}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
          label="Open To-Dos"
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueTodos.map((todo) => (
                    <TableRow key={todo.id}>
                      <TableCell className="max-w-[300px] font-medium">
                        {todo.url ? (
                          <a
                            href={todo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors"
                          >
                            {todo.content}
                          </a>
                        ) : (
                          todo.content
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {todo.list.project.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {todo.list.name}
                      </TableCell>
                      <TableCell>
                        {todo.assigneeIds.length > 0 ? (
                          <AvatarGroup
                            people={getAssigneePeople(todo.assigneeIds)}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {todo.dueOn && (
                          <Badge variant="overdue">
                            {format(new Date(todo.dueOn), "MMM d, yyyy")}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* To-Do Lists with progress */}
      <div>
        <h3 className="text-xl font-bold tracking-tight mb-4">To-Do Lists</h3>
        <Card>
          <CardContent className="pt-7">
            <div className="space-y-5">
              {todoLists.map((list) => (
                <div key={list.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{list.name}</span>
                      <span className="text-muted-foreground">
                        {list.project.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">
                      {Math.round(list.completedRatio * 100)}%
                    </span>
                  </div>
                  <Progress value={list.completedRatio * 100} className="h-2" />
                </div>
              ))}
              {todoLists.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No to-do lists found. Run a sync to pull data.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
