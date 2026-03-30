import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { syncEnabled } = body;

    if (typeof syncEnabled !== "boolean") {
      return NextResponse.json(
        { error: "syncEnabled must be a boolean" },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: { syncEnabled },
      select: { id: true, name: true, syncEnabled: true },
    });

    return NextResponse.json(project);
  } catch (err) {
    console.error("Toggle sync error:", err);
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }
}
