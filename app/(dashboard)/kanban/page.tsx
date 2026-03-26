import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function KanbanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kanban</h2>
        <p className="text-muted-foreground">
          Unified card tables across all projects.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Card Tables</CardTitle>
          <CardDescription>
            Filterable by project, assignee, and due date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon — connect Basecamp to populate card data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
