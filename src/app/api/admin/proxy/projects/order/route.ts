import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { projectIds } = await request.json();

  if (!Array.isArray(projectIds)) {
    return NextResponse.json({ error: "projectIds must be an array" }, { status: 400 });
  }

  for (let i = 0; i < projectIds.length; i++) {
    await db
      .update(projects)
      .set({ sortOrder: String(i), updatedAt: new Date() })
      .where(eq(projects.id, projectIds[i]));
  }

  return NextResponse.json({ success: true });
}
