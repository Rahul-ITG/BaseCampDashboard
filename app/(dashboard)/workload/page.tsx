export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, ListTodo, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { WorkloadChart } from "@/components/dashboard/workload-chart";

export default async function WorkloadPage() {
  const [openTodos, cards, scheduleEntries, people] = await Promise.all([
    prisma.todoItem.findMany({
      where: { completed: false, list: { project: { syncEnabled: true } } },
      select: { assigneeIds: true },
    }),
    prisma.card.findMany({
      where: { column: { table: { project: { syncEnabled: true } } } },
      select: { assigneeIds: true },
    }),
    prisma.scheduleEntry.findMany({
      where: { project: { syncEnabled: true } },
      select: { assigneeIds: true },
    }),
    prisma.person.findMany({
      select: { basecampId: true, name: true },
    }),
  ]);

  const personMap = new Map(
    people.map((p) => [p.basecampId.toString(), p.name])
  );

  const workload = new Map<
    string,
    { name: string; todos: number; cards: number; schedules: number }
  >();

  function ensurePerson(id: bigint) {
    const key = id.toString();
    if (!workload.has(key)) {
      workload.set(key, {
        name: personMap.get(key) || `Unknown (${key})`,
        todos: 0,
        cards: 0,
        schedules: 0,
      });
    }
    return workload.get(key)!;
  }

  for (const todo of openTodos) {
    for (const id of todo.assigneeIds) {
      ensurePerson(id).todos++;
    }
  }

  for (const card of cards) {
    for (const id of card.assigneeIds) {
      ensurePerson(id).cards++;
    }
  }

  for (const entry of scheduleEntries) {
    for (const id of entry.assigneeIds) {
      ensurePerson(id).schedules++;
    }
  }

  const sortedWorkload = Array.from(workload.values()).sort(
    (a, b) =>
      b.todos + b.cards + b.schedules - (a.todos + a.cards + a.schedules)
  );

  const totalAssignments = sortedWorkload.reduce(
    (sum, w) => sum + w.todos + w.cards + w.schedules,
    0
  );
  const unassignedTodos = openTodos.filter(
    (t) => t.assigneeIds.length === 0
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="label-uppercase">Resource Management</p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">
          Team Workload
        </h2>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="People with Assignments"
          value={sortedWorkload.length}
          subtitle="Active contributors"
        />
        <StatCard
          icon={ListTodo}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          label="Total Assignments"
          value={totalAssignments}
          subtitle="Across all projects"
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
          label="Unassigned To-Dos"
          value={unassignedTodos}
          subtitle="Need assignment"
        />
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Assignments by Person</CardTitle>
          <CardDescription>
            Stacked bar chart of open to-dos, cards, and schedule entries per
            team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkloadChart data={sortedWorkload} />
        </CardContent>
      </Card>

      {/* Detailed table */}
      <div>
        <h3 className="text-xl font-bold tracking-tight mb-4">
          Detailed Breakdown
        </h3>
        <Card>
          <CardContent className="pt-7">
            {sortedWorkload.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assignments found. Run a sync to pull data.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead className="text-right">Open To-Dos</TableHead>
                    <TableHead className="text-right">Cards</TableHead>
                    <TableHead className="text-right">Schedule</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedWorkload.map((person) => {
                    const total =
                      person.todos + person.cards + person.schedules;
                    return (
                      <TableRow key={person.name}>
                        <TableCell className="font-medium">
                          {person.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {person.todos > 0 ? (
                            <Badge variant="secondary">{person.todos}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {person.cards > 0 ? (
                            <Badge variant="secondary">{person.cards}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {person.schedules > 0 ? (
                            <Badge variant="secondary">
                              {person.schedules}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {total}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
