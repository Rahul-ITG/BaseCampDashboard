export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar, ExternalLink } from "lucide-react";
import { AvatarGroup } from "@/components/dashboard/avatar-group";
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

  const allAssigneeIds = cardTables.flatMap((t) =>
    t.columns.flatMap((c) => c.cards.flatMap((card) => card.assigneeIds))
  );
  const uniqueIds = Array.from(new Set(allAssigneeIds.map(String)));
  const people =
    uniqueIds.length > 0
      ? await prisma.person.findMany({
          where: { basecampId: { in: uniqueIds.map(BigInt) } },
          select: { basecampId: true, name: true, avatarUrl: true },
        })
      : [];
  const personMap = new Map(
    people.map((p) => [
      p.basecampId.toString(),
      { name: p.name, avatarUrl: p.avatarUrl },
    ])
  );

  const totalCards = cardTables.reduce(
    (sum, t) => sum + t.columns.reduce((s, c) => s + c.cards.length, 0),
    0
  );

  function getAssigneePeople(ids: bigint[]) {
    return ids
      .map((id) => personMap.get(id.toString()))
      .filter(Boolean) as { name: string; avatarUrl: string | null }[];
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="label-uppercase">Projects / Board View</p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">
          Project Kanban
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {totalCards} total cards across {cardTables.length} boards
        </p>
      </div>

      {cardTables.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-sm text-muted-foreground">
              No card tables found. Your projects may not have kanban boards, or
              run a sync.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={cardTables.map((t) => t.id)}
          className="space-y-4"
        >
          {cardTables.map((table) => {
            const tableCardCount = table.columns.reduce(
              (s, c) => s + c.cards.length,
              0
            );
            return (
              <AccordionItem
                key={table.id}
                value={table.id}
                className="rounded-xl bg-card overflow-hidden"
              >
                <AccordionTrigger className="px-7 py-5 hover:no-underline hover:bg-secondary/50">
                  <div className="flex items-center gap-3 text-left">
                    <div>
                      <p className="font-semibold text-base">
                        {table.project.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {table.name} &mdash; {tableCardCount} cards,{" "}
                        {table.columns.length} columns
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  <ScrollArea className="w-full">
                    <div className="flex gap-4 pb-4">
                      {table.columns.map((column) => (
                        <div
                          key={column.id}
                          className="min-w-[280px] max-w-[300px] shrink-0 rounded-xl bg-secondary p-4"
                        >
                          {/* Column header */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="label-uppercase">
                              {column.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-muted text-muted-foreground text-[10px] h-5 min-w-5 justify-center"
                            >
                              {column.cards.length}
                            </Badge>
                          </div>

                          {/* Cards */}
                          <div className="space-y-3">
                            {column.cards.map((card) => (
                              <Card
                                key={card.id}
                                className="hover:shadow-ambient"
                              >
                                <CardContent className="p-4">
                                  {card.url ? (
                                    <a
                                      href={card.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-sm hover:text-primary transition-colors flex items-start gap-1"
                                    >
                                      <span className="flex-1">
                                        {card.title}
                                      </span>
                                      <ExternalLink className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                                    </a>
                                  ) : (
                                    <p className="font-medium text-sm">
                                      {card.title}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between mt-3">
                                    {card.dueOn ? (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {format(
                                          new Date(card.dueOn),
                                          "MMM d"
                                        )}
                                      </div>
                                    ) : (
                                      <span />
                                    )}
                                    {card.assigneeIds.length > 0 && (
                                      <AvatarGroup
                                        people={getAssigneePeople(
                                          card.assigneeIds
                                        )}
                                        max={2}
                                        size="sm"
                                      />
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {column.cards.length === 0 && (
                              <p className="text-xs text-muted-foreground py-6 text-center">
                                No cards
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
