import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckSquare, Kanban, Calendar, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { SyncButton } from "@/components/dashboard/sync-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [openTodos, activeCards, upcomingEvents, teamMembers, lastSync] =
    await Promise.all([
      prisma.todoItem.count({ where: { completed: false } }),
      prisma.card.count(),
      prisma.scheduleEntry.count(),
      prisma.person.count(),
      prisma.syncLog.findFirst({
        orderBy: { startedAt: "desc" },
        where: { status: { not: "running" } },
      }),
    ]);

  const stats = [
    { label: "Open To-Dos", value: openTodos, icon: CheckSquare },
    { label: "Active Cards", value: activeCards, icon: Kanban },
    { label: "Schedule Entries", value: upcomingEvents, icon: Calendar },
    { label: "Team Members", value: teamMembers, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of all Basecamp activity across projects.
          </p>
        </div>
        <SyncButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overdue Items</CardTitle>
            <CardDescription>
              To-dos and cards past their due date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openTodos === 0 ? (
              <p className="text-sm text-muted-foreground">
                No data yet — click &quot;Sync Now&quot; to pull from Basecamp.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Data synced. Dashboard views coming in next update.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sync Health</CardTitle>
            <CardDescription>Recent sync activity and status</CardDescription>
          </CardHeader>
          <CardContent>
            {lastSync ? (
              <div className="space-y-1 text-sm">
                <p>
                  Status:{" "}
                  <span
                    className={
                      lastSync.status === "success"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {lastSync.status}
                  </span>
                </p>
                <p>Records synced: {lastSync.recordsSynced}</p>
                <p>
                  Duration:{" "}
                  {lastSync.durationMs
                    ? `${(lastSync.durationMs / 1000).toFixed(1)}s`
                    : "--"}
                </p>
                <p className="text-muted-foreground">
                  {lastSync.completedAt
                    ? new Date(lastSync.completedAt).toLocaleString()
                    : "--"}
                </p>
                {lastSync.errors && (
                  <p className="text-red-600">{lastSync.errors}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No sync runs yet — click &quot;Sync Now&quot; to start.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
