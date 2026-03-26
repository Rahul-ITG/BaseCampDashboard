import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TodosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">To-Dos</h2>
        <p className="text-muted-foreground">
          Progress bars, overdue items, and completion stats across all projects.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>To-Do Lists</CardTitle>
          <CardDescription>
            Completion ratios and overdue to-dos per list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon — connect Basecamp to populate to-do data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
