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
import { ScrollText, CheckCircle, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { format, formatDistanceToNow } from "date-fns";

export default async function LogsPage() {
  const [logs, totalCount, successCount, errorCount] = await Promise.all([
    prisma.syncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
    prisma.syncLog.count(),
    prisma.syncLog.count({ where: { status: "success" } }),
    prisma.syncLog.count({
      where: { status: { in: ["error", "crashed", "partial"] } },
    }),
  ]);

  function getStatusBadge(status: string) {
    switch (status) {
      case "success":
        return <Badge variant="active">Success</Badge>;
      case "partial":
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            Partial
          </Badge>
        );
      case "error":
        return <Badge variant="overdue">Error</Badge>;
      case "crashed":
        return <Badge variant="destructive">Crashed</Badge>;
      case "running":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            Running
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="label-uppercase">System Monitoring</p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">Sync Logs</h2>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={ScrollText}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="Total Syncs"
          value={totalCount}
          subtitle="All time"
        />
        <StatCard
          icon={CheckCircle}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          label="Successful"
          value={successCount}
          subtitle={
            totalCount > 0
              ? `${Math.round((successCount / totalCount) * 100)}% success rate`
              : "No syncs yet"
          }
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-red-500/10"
          iconColor="text-destructive"
          label="Errors / Crashes"
          value={errorCount}
          subtitle="Need attention"
        />
      </div>

      {/* Sync history table */}
      <div>
        <h3 className="text-xl font-bold tracking-tight mb-4">Sync History</h3>
        <Card>
          <CardContent className="pt-7">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sync logs yet. Run a sync to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {format(
                              new Date(log.startedAt),
                              "MMM d, yyyy h:mm a"
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.startedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {log.recordsSynced.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {log.durationMs
                          ? log.durationMs >= 60000
                            ? `${(log.durationMs / 60000).toFixed(1)}m`
                            : `${(log.durationMs / 1000).toFixed(1)}s`
                          : "--"}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {log.errors ? (
                          <p className="text-xs text-destructive truncate" title={log.errors}>
                            {log.errors}
                          </p>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            None
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {logs.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing {logs.length} of {totalCount} sync logs
          </p>
        )}
      </div>
    </div>
  );
}
