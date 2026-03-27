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

  // Start sync in background — don't await, return immediately
  runFullSync().catch((err) => {
    console.error("[sync] Background sync failed:", err);
  });

  return NextResponse.json({
    success: true,
    message: "Sync started. Check /api/sync for status.",
  });
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
