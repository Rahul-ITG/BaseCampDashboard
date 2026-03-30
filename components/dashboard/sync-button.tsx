"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult("Syncing... (this may take a few minutes)");

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setResult(
          `Synced ${data.recordsSynced} records in ${(data.durationMs / 1000).toFixed(1)}s`
        );
        window.location.reload();
      } else {
        setResult(`Error: ${data.error || "Sync failed"}`);
      }
    } catch {
      setResult("Error: Failed to reach sync endpoint");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync Now"}
      </Button>
      {result && (
        <span className="text-sm text-muted-foreground">{result}</span>
      )}
    </div>
  );
}

export function SyncButtonCompact() {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      }
    } catch {
      // silently fail — full status is on home page
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      title="Sync Now"
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
    </Button>
  );
}
