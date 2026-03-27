export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

  // Get assignee names for overdue todos
  const allAssigneeIds = overdueTodos.flatMap((t) => t.assigneeIds);
  const uniqueAssigneeIds = Array.from(new Set(allAssigneeIds.map(String)));
  const people = await prisma.person.findMany({
    where: { basecampId: { in: uniqueAssigneeIds.map(BigInt) } },
    select: { basecampId: true, name: true },
  });
  const personMap = new Map(
    people.map((p) => [p.basecampId.toString(), p.name])
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">To-Dos</h2>
        <p className="text-muted-foreground">
          Progress, overdue items, and completion stats across all projects.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-2" />
            <p className="mt-1 text-xs text-muted-foreground">
              {completedTodos.toLocaleString()} of {totalTodos.toLocaleString()} to-dos complete
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open To-Dos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalTodos - completedTodos).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {overdueTodos.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue items */}
      {overdueTodos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Overdue To-Dos</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <TableCell className="max-w-[300px] truncate font-medium">
                      {todo.url ? (
                        <a
                          href={todo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
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
                      {todo.assigneeIds.length > 0
                        ? todo.assigneeIds
                            .map(
                              (id) =>
                                personMap.get(id.toString()) || "Unknown"
                            )
                            .join(", ")
                        : "Unassigned"}
                    </TableCell>
                    <TableCell>
                      {todo.dueOn && (
                        <Badge variant="destructive">
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
      )}

      {/* To-Do Lists with progress */}
      <Card>
        <CardHeader>
          <CardTitle>To-Do Lists</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todoLists.map((list) => (
              <div key={list.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{list.name}</span>
                    <span className="text-muted-foreground">
                      — {list.project.name}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
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
  );
}
