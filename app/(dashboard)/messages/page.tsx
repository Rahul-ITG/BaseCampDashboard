export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, TrendingUp, Folder, ExternalLink } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatDistanceToNow } from "date-fns";

export default async function MessagesPage() {
  const enabledBoard = { board: { project: { syncEnabled: true } } };

  const [messages, totalCount, thisWeekCount] = await Promise.all([
    prisma.message.findMany({
      where: { ...enabledBoard },
      include: {
        board: {
          include: {
            project: { select: { name: true } },
          },
        },
      },
      orderBy: { postedAt: "desc" },
      take: 50,
    }),
    prisma.message.count({ where: { ...enabledBoard } }),
    prisma.message.count({
      where: {
        ...enabledBoard,
        postedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  // Look up creator avatars
  const creatorIds = Array.from(
    new Set(messages.map((m) => m.creatorId))
  );
  const people =
    creatorIds.length > 0
      ? await prisma.person.findMany({
          where: { basecampId: { in: creatorIds } },
          select: { basecampId: true, name: true, avatarUrl: true },
        })
      : [];
  const personMap = new Map(
    people.map((p) => [
      p.basecampId.toString(),
      { name: p.name, avatarUrl: p.avatarUrl },
    ])
  );

  // Find most active project
  const projectCounts = new Map<string, number>();
  for (const msg of messages) {
    const name = msg.board.project.name;
    projectCounts.set(name, (projectCounts.get(name) || 0) + 1);
  }
  const mostActiveProject =
    Array.from(projectCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "N/A";

  return (
    <div className="space-y-8">
      <div>
        <p className="label-uppercase">Communications</p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">
          Activity Feed
        </h2>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={MessageSquare}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="Total Messages"
          value={totalCount}
          subtitle="Across all projects"
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          label="This Week"
          value={thisWeekCount}
          subtitle="Last 7 days"
        />
        <StatCard
          icon={Folder}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-600"
          label="Most Active"
          value={mostActiveProject}
          subtitle="By message count"
        />
      </div>

      {/* Message feed */}
      <div>
        <h3 className="text-xl font-bold tracking-tight mb-4">
          Recent Messages
        </h3>
        <Card>
          <CardContent className="pt-7">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No messages found. Run a sync to pull data from Basecamp.
              </p>
            ) : (
              <div className="space-y-1">
                {messages.map((msg) => {
                  const creator = personMap.get(msg.creatorId.toString());
                  const initials = (creator?.name || msg.creatorName)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-secondary"
                    >
                      <Avatar className="h-9 w-9 mt-0.5 shrink-0">
                        {creator?.avatarUrl && (
                          <AvatarImage
                            src={creator.avatarUrl}
                            alt={creator.name}
                          />
                        )}
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            {msg.url ? (
                              <a
                                href={msg.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-sm hover:text-primary transition-colors inline-flex items-center gap-1"
                              >
                                {msg.subject}
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                              </a>
                            ) : (
                              <p className="font-medium text-sm">
                                {msg.subject}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {creator?.name || msg.creatorName} &bull;{" "}
                              {formatDistanceToNow(new Date(msg.postedAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {msg.board.project.name}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        {messages.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing {messages.length} of {totalCount.toLocaleString()} messages
          </p>
        )}
      </div>
    </div>
  );
}
