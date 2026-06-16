import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderedIds } = body as { orderedIds: string[] };

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "orderedIds is required" }, { status: 400 });
    }

    await Promise.all(
      orderedIds.map((id, idx) =>
        prisma.project.update({
          where: { id },
          data: { sortOrder: idx },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/projects/reorder error:", err);
    return NextResponse.json({ error: "重新排序失败" }, { status: 500 });
  }
}
