export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { KanbanBoard } from "@/components/dashboard/kanban-board";

export default async function KanbanPage() {
  const cardTables = await prisma.cardTable.findMany({
    where: { project: { syncEnabled: true } },
    include: {
      project: { select: { name: true, createdAt: true } },
      columns: {
        orderBy: { position: "asc" },
        include: {
          cards: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { project: { createdAt: "desc" } },
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

  // Serialize for client component (BigInt → string)
  const personMap: Record<string, { name: string; avatarUrl: string | null }> =
    Object.fromEntries(
      people.map((p) => [
        p.basecampId.toString(),
        { name: p.name, avatarUrl: p.avatarUrl },
      ])
    );

  const tables = cardTables.map((table) => ({
    id: table.id,
    projectName: table.project.name,
    tableName: table.name,
    columns: table.columns.map((col) => ({
      id: col.id,
      title: col.title,
      cards: col.cards.map((card) => ({
        id: card.id,
        title: card.title,
        dueOn: card.dueOn ? card.dueOn.toISOString() : null,
        url: card.url,
        assigneeIds: card.assigneeIds.map(String),
      })),
    })),
  }));

  const totalCards = tables.reduce(
    (sum, t) => sum + t.columns.reduce((s, c) => s + c.cards.length, 0),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="label-uppercase">Projects / Board View</p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">
          Project Kanban
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {totalCards} total cards across {tables.length} boards
        </p>
      </div>

      <KanbanBoard
        tables={tables}
        personMap={personMap}
        totalCards={totalCards}
      />
    </div>
  );
}
