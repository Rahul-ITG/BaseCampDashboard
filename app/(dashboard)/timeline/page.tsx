export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
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
import { AlertTriangle, RefreshCw, CalendarDays } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AvatarGroup } from "@/components/dashboard/avatar-group";
import { format, isPast, isToday, isFuture } from "date-fns";

export default async function TimelinePage() {
  const entries = await prisma.scheduleEntry.findMany({
    where: { project: { syncEnabled: true } },
    include: {
      project: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const allAssigneeIds = entries.flatMap((e) => e.assigneeIds);
  const uniqueIds = Array.from(new Set(allAssigneeIds.map(String)));
  const people =
    uniqueIds.length > 0
      ? await prisma.person.findMany({
          where: { basecampId: { in: uniqueIds.map(BigInt) } },
          select: { basecampId: true, name: true, avatarUrl: true },
        })
      : [];
  const personMap = new Map(
    people.map((p) => [p.basecampId.toString(), { name: p.name, avatarUrl: p.avatarUrl }])
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
      return <Badge variant="overdue">Past Due</Badge>;
    }
    if (
      entry.startsAt &&
      new Date(entry.startsAt) <= now &&
      new Date(entry.endsAt) >= now
    ) {
      return <Badge variant="active">In Progress</Badge>;
    }
    return <Badge variant="secondary">Upcoming</Badge>;
  }

  function getAssigneePeople(ids: bigint[]) {
    return ids
      .map((id) => personMap.get(id.toString()))
      .filter(Boolean) as { name: string; avatarUrl: string | null }[];
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="label-uppercase">Schedule Overview</p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">
          Timeline Master
        </h2>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-red-500/10"
          iconColor="text-destructive"
          label="Past Due"
          value={pastDue.length}
          subtitle="Requiring attention"
        />
        <StatCard
          icon={RefreshCw}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          label="In Progress"
          value={current.length}
          subtitle="Active now"
        />
        <StatCard
          icon={CalendarDays}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="Upcoming"
          value={upcoming.length}
          subtitle="Scheduled ahead"
        />
      </div>

      {/* Schedule entries table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold tracking-tight">
            All Schedule Entries
          </h3>
        </div>
        <Card>
          <CardContent className="pt-7">
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
                      <TableCell className="max-w-[300px] font-medium">
                        {entry.url ? (
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors"
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
                        {entry.assigneeIds.length > 0 ? (
                          <AvatarGroup
                            people={getAssigneePeople(entry.assigneeIds)}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Unassigned
                          </span>
                        )}
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
    </div>
  );
}
