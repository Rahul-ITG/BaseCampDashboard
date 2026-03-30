export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Kanban, Calendar, Users, CheckCircle } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { SyncButton } from "@/components/dashboard/sync-button";

// Reusable filter for enabled projects
const enabledProject = { project: { syncEnabled: true } };
const enabledViaList = { list: { project: { syncEnabled: true } } };

export default async function HomePage() {
  const [openTodos, activeCards, scheduleCount, teamMembers, lastSync, overdueTodos] =
    await Promise.all([
      prisma.todoItem.count({
        where: { completed: false, ...enabledViaList },
      }),
      prisma.card.count({
        where: { column: { table: { ...enabledProject } } },
      }),
      prisma.scheduleEntry.count({
        where: { ...enabledProject },
      }),
      prisma.person.count(),
      prisma.syncLog.findFirst({
        orderBy: { startedAt: "desc" },
        where: { status: { not: "running" } },
      }),
      prisma.todoItem.findMany({
        where: { completed: false, dueOn: { lt: new Date() }, ...enabledViaList },
        include: {
          list: {
            include: {
              project: { select: { name: true } },
            },
          },
        },
        orderBy: { dueOn: "asc" },
        take: 5,
      }),
    ]);

  const upcomingSchedule = await prisma.scheduleEntry.findMany({
    where: {
      startsAt: { gte: new Date() },
      ...enabledProject,
    },
    include: {
      project: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 8,
  });

  const isHealthy = lastSync?.status === "success" || lastSync?.status === "partial";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-uppercase">Dashboard Overview</p>
          <h2 className="text-2xl font-bold tracking-tight mt-1">
            Executive Summary
          </h2>
        </div>
        <SyncButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CheckSquare}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="To-Dos"
          value={openTodos}
          subtitle="Open tasks"
        />
        <StatCard
          icon={Kanban}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          label="Active Cards"
          value={activeCards}
          subtitle="In progress"
        />
        <StatCard
          icon={Calendar}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
          label="Schedule"
          value={scheduleCount}
          subtitle="Entries tracked"
        />
        <StatCard
          icon={Users}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-600"
          label="Team"
          value={teamMembers}
          subtitle="Collaborators"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold tracking-tight">Overdue Items</h3>
          </div>
          <Card>
            <CardContent className="pt-7">
              {overdueTodos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No overdue items. All caught up.
                </p>
              ) : (
                <div className="space-y-1">
                  {overdueTodos.map((todo) => {
                    const daysLate = Math.floor(
                      (Date.now() - new Date(todo.dueOn!).getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    return (
                      <div
                        key={todo.id}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-secondary"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {todo.url ? (
                              <a href={todo.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                {todo.content}
                              </a>
                            ) : todo.content}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {todo.list.project.name} &bull; {todo.list.name}
                          </p>
                        </div>
                        <Badge variant="overdue" className="shrink-0">
                          {daysLate === 1 ? "Delayed 1 day" : `Delayed ${daysLate} days`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-primary text-primary-foreground hover:shadow-none">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                {isHealthy ? (
                  <Badge className="bg-green-500/20 text-green-300 hover:bg-green-500/20">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    System Stable
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-300 hover:bg-red-500/20">
                    Needs Attention
                  </Badge>
                )}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-white/50">
                Last Successful Sync
              </p>
              <CardTitle className="text-2xl text-white">
                {lastSync?.completedAt
                  ? new Date(lastSync.completedAt).toLocaleString("en-US", {
                      hour: "numeric", minute: "2-digit", hour12: true,
                    }) + " " + new Date(lastSync.completedAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                    })
                  : "No syncs yet"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastSync ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/50 text-xs uppercase tracking-wider">Status</p>
                    <p className="font-medium text-white capitalize">{lastSync.status}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs uppercase tracking-wider">Records</p>
                    <p className="font-medium text-white">{lastSync.recordsSynced.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/60">Click &quot;Sync Now&quot; to pull data from Basecamp.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {upcomingSchedule.length > 0 && (
        <div>
          <h3 className="text-xl font-bold tracking-tight mb-4">Upcoming Timeline</h3>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {upcomingSchedule.map((entry, i) => (
                <Card key={entry.id} className="w-52 shrink-0">
                  <CardContent className="pt-5 pb-5 px-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`h-2 w-2 rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      <p className="label-uppercase">
                        {entry.startsAt
                          ? new Date(entry.startsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                          : "TBD"}
                      </p>
                    </div>
                    <p className="font-semibold text-sm leading-snug">{entry.summary}</p>
                    <p className="text-xs text-muted-foreground mt-1">{entry.project.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
