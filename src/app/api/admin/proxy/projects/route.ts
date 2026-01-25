import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const targetUserId = request.nextUrl.searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, targetUserId))
    .orderBy(sql`CAST(${projects.sortOrder} AS INTEGER)`);

  return NextResponse.json(userProjects);
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, ...projectData } = body;
  
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const existingProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId));

  const [newProject] = await db
    .insert(projects)
    .values({
      ...projectData,
      userId,
      sortOrder: String(existingProjects.length),
    })
    .returning();

  return NextResponse.json(newProject);
}
