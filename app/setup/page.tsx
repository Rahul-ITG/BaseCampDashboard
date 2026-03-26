import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink } from "lucide-react";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const token = await prisma.basecampToken.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  const isConnected = !!token;
  const showSuccess = searchParams.success === "true";

  const clientId = process.env.BASECAMP_CLIENT_ID;
  const redirectUri = process.env.BASECAMP_REDIRECT_URI;
  const authUrl = `https://launchpad.37signals.com/authorization/new?type=web_server&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri || "")}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Basecamp Setup</CardTitle>
          <CardDescription>
            Connect your Basecamp account to start syncing data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showSuccess && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              Successfully connected to Basecamp!
            </div>
          )}

          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant="default">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Token expires
                </span>
                <span className="text-sm">
                  {token.expiresAt.toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Last updated
                </span>
                <span className="text-sm">
                  {token.updatedAt.toLocaleDateString()}
                </span>
              </div>
              <a href={authUrl}>
                <Button variant="outline" className="w-full mt-2">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Reconnect Basecamp
                </Button>
              </a>
            </div>
          ) : (
            <a href={authUrl}>
              <Button className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect to Basecamp
              </Button>
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
