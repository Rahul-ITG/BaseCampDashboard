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

import { format } from "date-fns";

export default async function KanbanPage() {
  const cardTables = await prisma.cardTable.findMany({
    include: {
      project: { select: { name: true } },
      columns: {
        orderBy: { position: "asc" },
        include: {
          cards: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get assignee names
  const allAssigneeIds = cardTables.flatMap((t) =>
    t.columns.flatMap((c) => c.cards.flatMap((card) => card.assigneeIds))
  );
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

  const totalCards = cardTables.reduce(
    (sum, t) => sum + t.columns.reduce((s, c) => s + c.cards.length, 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kanban</h2>
        <p className="text-muted-foreground">
          Card tables across all projects. {totalCards} total cards.
        </p>
      </div>

      {cardTables.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-sm text-muted-foreground">
              No card tables found. Your projects may not have kanban boards with cards, or run a sync.
            </p>
          </CardContent>
        </Card>
      ) : (
        cardTables.map((table) => {
          const tableCardCount = table.columns.reduce(
            (s, c) => s + c.cards.length,
            0
          );
          return (
            <Card key={table.id}>
              <CardHeader>
                <CardTitle>{table.project.name}</CardTitle>
                <CardDescription>
                  {table.name} — {tableCardCount} cards across{" "}
                  {table.columns.length} columns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {table.columns.map((column) => (
                    <div
                      key={column.id}
                      className="min-w-[250px] max-w-[300px] flex-shrink-0"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold">
                          {column.title}
                        </h4>
                        <Badge variant="secondary">
                          {column.cards.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {column.cards.map((card) => (
                          <div
                            key={card.id}
                            className="rounded-md border bg-card p-3 text-sm shadow-sm"
                          >
                            {card.url ? (
                              <a
                                href={card.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium hover:underline"
                              >
                                {card.title}
                              </a>
                            ) : (
                              <p className="font-medium">{card.title}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {card.assigneeIds.map((id) => (
                                <Badge
                                  key={id.toString()}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {personMap.get(id.toString()) || "Unknown"}
                                </Badge>
                              ))}
                            </div>
                            {card.dueOn && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Due: {format(new Date(card.dueOn), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        ))}
                        {column.cards.length === 0 && (
                          <p className="text-xs text-muted-foreground py-4 text-center">
                            No cards
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
