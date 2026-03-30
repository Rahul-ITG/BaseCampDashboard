export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Database, Clock, Settings } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProjectToggleList } from "@/components/dashboard/project-toggle";

export default async function SettingsPage() {
  const [projects, lastSync, syncCount] = await Promise.all([
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        syncEnabled: true,
        basecampId: true,
        _count: {
          select: {
            todoLists: true,
            cardTables: true,
            schedules: true,
            messageBoards: true,
            members: true,
          },
        },
      },
    }),
    prisma.syncLog.findFirst({
      orderBy: { startedAt: "desc" },
      where: { status: { not: "running" } },
    }),
    prisma.syncLog.count(),
  ]);

  const enabledCount = projects.filter((p) => p.syncEnabled).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="label-uppercase">Configuration</p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">Settings</h2>
      </div>

      {/* Sync stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Database}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="Projects Synced"
          value={`${enabledCount} / ${projects.length}`}
          subtitle="Enabled for sync"
        />
        <StatCard
          icon={Clock}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          label="Total Syncs"
          value={syncCount}
          subtitle="All time"
        />
        <StatCard
          icon={Settings}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-600"
          label="Last Sync"
          value={
            lastSync?.completedAt
              ? new Date(lastSync.completedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "Never"
          }
          subtitle={lastSync?.status || "No syncs yet"}
        />
      </div>

      {/* Active Projects with toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Project Sync Control</CardTitle>
          <CardDescription>
            Toggle which projects are synced. Disabled projects will have their
            data removed on the next sync.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects synced yet. Run a sync first.
            </p>
          ) : (
            <ProjectToggleList projects={projects} />
          )}
        </CardContent>
      </Card>

      {/* Sync Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sync Interval</span>
              <span className="font-medium">
                {process.env.SYNC_INTERVAL_MINUTES || 15} minutes
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Basecamp Account</span>
              <span className="font-medium">
                {process.env.BASECAMP_ACCOUNT_ID || "5402506"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate Limit</span>
              <span className="font-medium">50 requests / 10 seconds</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
