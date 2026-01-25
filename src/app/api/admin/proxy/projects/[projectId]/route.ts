import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, bookings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { projectId } = await params;
  const body = await request.json();

  const [updatedProject] = await db
    .update(projects)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  if (!updatedProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(updatedProject);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { projectId } = await params;

  await db.delete(bookings).where(eq(bookings.projectId, projectId));
  
  const [deletedProject] = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning();

  if (!deletedProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
