export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
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
import { format, isPast, isToday, isFuture } from "date-fns";

export default async function TimelinePage() {
  const entries = await prisma.scheduleEntry.findMany({
    include: {
      project: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  // Get assignee names
  const allAssigneeIds = entries.flatMap((e) => e.assigneeIds);
  const uniqueIds = Array.from(new Set(allAssigneeIds.map(String)));
  const people = uniqueIds.length > 0
    ? await prisma.person.findMany({
        where: { basecampId: { in: uniqueIds.map(BigInt) } },
        select: { basecampId: true, name: true },
      })
    : [];
  const personMap = new Map(
    people.map((p) => [p.basecampId.toString(), p.name])
  );

  const now = new Date();
  const pastDue = entries.filter(
    (e) => e.endsAt && isPast(new Date(e.endsAt)) && !isToday(new Date(e.endsAt))
  );
  const upcoming = entries.filter(
    (e) =>
      e.startsAt &&
      (isFuture(new Date(e.startsAt)) || isToday(new Date(e.startsAt)))
  );
  const current = entries.filter(
    (e) =>
      e.startsAt &&
      e.endsAt &&
      new Date(e.startsAt) <= now &&
      new Date(e.endsAt) >= now
  );

  function getStatusBadge(entry: (typeof entries)[0]) {
    if (!entry.endsAt) return <Badge variant="secondary">No end date</Badge>;
    if (isPast(new Date(entry.endsAt)) && !isToday(new Date(entry.endsAt))) {
      return <Badge variant="destructive">Past due</Badge>;
    }
    if (
      entry.startsAt &&
      new Date(entry.startsAt) <= now &&
      new Date(entry.endsAt) >= now
    ) {
      return <Badge className="bg-green-600 text-white">In progress</Badge>;
    }
    return <Badge variant="secondary">Upcoming</Badge>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Timeline</h2>
        <p className="text-muted-foreground">
          Schedule entries and milestones across all projects.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Past Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {pastDue.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {current.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcoming.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule entries table */}
      <Card>
        <CardHeader>
          <CardTitle>All Schedule Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No schedule entries found. Run a sync to pull data.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Assignees</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="max-w-[300px] truncate font-medium">
                      {entry.url ? (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {entry.summary}
                        </a>
                      ) : (
                        entry.summary
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.project.name}
                    </TableCell>
                    <TableCell>
                      {entry.startsAt
                        ? format(new Date(entry.startsAt), "MMM d, yyyy")
                        : "--"}
                    </TableCell>
                    <TableCell>
                      {entry.endsAt
                        ? format(new Date(entry.endsAt), "MMM d, yyyy")
                        : "--"}
                    </TableCell>
                    <TableCell>
                      {entry.assigneeIds.length > 0
                        ? entry.assigneeIds
                            .map(
                              (id) =>
                                personMap.get(id.toString()) || "Unknown"
                            )
                            .join(", ")
                        : "Unassigned"}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
