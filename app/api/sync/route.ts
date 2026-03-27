import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runFullSync } from "@/lib/sync/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Run sync within the request so Railway doesn't kill the process
  try {
    const result = await runFullSync();
    return NextResponse.json({
      ...result,
      message: `Sync completed: ${result.recordsSynced} records in ${(result.durationMs / 1000).toFixed(1)}s`,
    });
  } catch (err) {
    console.error("[sync] Sync failed:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/db");
  const lastSync = await prisma.syncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json({ lastSync });
}
