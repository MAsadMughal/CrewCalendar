import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
  try {
    const { projectIds } = await request.json();

    for (let i = 0; i < projectIds.length; i++) {
      await db.update(projects)
        .set({ sortOrder: String(i) })
        .where(eq(projects.id, projectIds[i]));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating project order:", error);
    return NextResponse.json({ error: "Failed to update project order" }, { status: 500 });
  }
}
