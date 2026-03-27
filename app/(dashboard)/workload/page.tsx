export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { WorkloadChart } from "@/components/dashboard/workload-chart";

export default async function WorkloadPage() {
  const [openTodos, cards, scheduleEntries, people] = await Promise.all([
    prisma.todoItem.findMany({
      where: { completed: false },
      select: { assigneeIds: true },
    }),
    prisma.card.findMany({
      select: { assigneeIds: true },
    }),
    prisma.scheduleEntry.findMany({
      select: { assigneeIds: true },
    }),
    prisma.person.findMany({
      select: { basecampId: true, name: true },
    }),
  ]);

  const personMap = new Map(
    people.map((p) => [p.basecampId.toString(), p.name])
  );

  // Aggregate counts per person
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

  // Sort by total assignments descending
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Workload</h2>
        <p className="text-muted-foreground">
          Open items per person across all projects.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              People with Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sortedWorkload.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAssignments.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">
              Unassigned To-Dos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {unassignedTodos.toLocaleString()}
            </div>
          </CardContent>
        </Card>
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
      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
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
  );
}
