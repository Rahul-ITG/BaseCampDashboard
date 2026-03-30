"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar, ExternalLink, Search } from "lucide-react";
import { AvatarGroup } from "@/components/dashboard/avatar-group";
import { format } from "date-fns";

interface KanbanCard {
  id: string;
  title: string;
  dueOn: string | null;
  url: string | null;
  assigneeIds: string[];
}

interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

interface KanbanTable {
  id: string;
  projectName: string;
  tableName: string;
  columns: KanbanColumn[];
}

interface PersonInfo {
  name: string;
  avatarUrl: string | null;
}

interface KanbanBoardProps {
  tables: KanbanTable[];
  personMap: Record<string, PersonInfo>;
  totalCards: number;
}

export function KanbanBoard({ tables, personMap }: KanbanBoardProps) {
  const [search, setSearch] = useState("");

  const filteredTables = useMemo(() => {
    if (!search.trim()) return tables;

    const q = search.toLowerCase();
    return tables
      .map((table) => {
        // Check if project name matches
        const projectMatch = table.projectName.toLowerCase().includes(q);
        if (projectMatch) return table;

        // Filter columns and cards
        const filteredColumns = table.columns
          .map((col) => {
            const colMatch = col.title.toLowerCase().includes(q);
            if (colMatch) return col;

            const filteredCards = col.cards.filter(
              (card) =>
                card.title.toLowerCase().includes(q) ||
                card.assigneeIds.some((id) =>
                  personMap[id]?.name.toLowerCase().includes(q)
                )
            );

            if (filteredCards.length === 0) return null;
            return { ...col, cards: filteredCards };
          })
          .filter(Boolean) as KanbanColumn[];

        if (filteredColumns.length === 0) return null;
        return { ...table, columns: filteredColumns };
      })
      .filter(Boolean) as KanbanTable[];
  }, [tables, search, personMap]);

  function getAssigneePeople(ids: string[]) {
    return ids
      .map((id) => personMap[id])
      .filter(Boolean) as PersonInfo[];
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search cards, columns, projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-full bg-secondary py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Results info */}
      {search && (
        <p className="text-sm text-muted-foreground">
          {filteredTables.length === 0
            ? "No matching results"
            : `Showing ${filteredTables.length} of ${tables.length} boards`}
        </p>
      )}

      {filteredTables.length === 0 && !search ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-sm text-muted-foreground">
              No card tables found. Your projects may not have kanban boards, or
              run a sync.
            </p>
          </CardContent>
        </Card>
      ) : filteredTables.length === 0 && search ? null : (
        <Accordion
          type="multiple"
          defaultValue={[]}
          className="space-y-4"
        >
          {filteredTables.map((table) => {
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
                        {table.projectName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {table.tableName} &mdash; {tableCardCount} cards,{" "}
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
                                        {format(new Date(card.dueOn), "MMM d")}
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
