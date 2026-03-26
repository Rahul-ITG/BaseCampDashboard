import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TimelinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Timeline</h2>
        <p className="text-muted-foreground">
          Calendar view of schedule entries and milestones.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Schedule Entries</CardTitle>
          <CardDescription>
            Past-due items flagged in red, upcoming milestones highlighted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon — connect Basecamp to populate schedule data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
