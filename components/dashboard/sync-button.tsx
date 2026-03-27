"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    const res = await fetch("/api/sync");
    const data = await res.json();
    const sync = data.lastSync;

    if (!sync) return;

    if (sync.status === "running") {
      setResult("Syncing...");
      return true; // still running
    }

    if (sync.status === "success" || sync.status === "partial") {
      setResult(
        `Synced ${sync.recordsSynced} records in ${((sync.durationMs || 0) / 1000).toFixed(1)}s`
      );
    } else {
      setResult(`Error: ${sync.errors || "Sync failed"}`);
    }

    setSyncing(false);
    return false; // done
  }, []);

  useEffect(() => {
    if (!syncing) return;

    const interval = setInterval(async () => {
      const stillRunning = await checkStatus();
      if (!stillRunning) {
        clearInterval(interval);
        // Refresh the page to show updated stats
        window.location.reload();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [syncing, checkStatus]);

  async function handleSync() {
    setSyncing(true);
    setResult("Starting sync...");

    try {
      await fetch("/api/sync", { method: "POST" });
      setResult("Syncing...");
    } catch {
      setResult("Error: Failed to reach sync endpoint");
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
