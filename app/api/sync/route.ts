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

  try {
    const result = await runFullSync();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return latest sync status
  const { prisma } = await import("@/lib/db");
  const lastSync = await prisma.syncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json({ lastSync });
}
