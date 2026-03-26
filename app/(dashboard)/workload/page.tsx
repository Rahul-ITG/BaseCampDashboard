import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WorkloadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Workload</h2>
        <p className="text-muted-foreground">
          Open items per person with drill-down views.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Team Workload</CardTitle>
          <CardDescription>
            Bar chart of assignments per team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon — connect Basecamp to populate workload data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
