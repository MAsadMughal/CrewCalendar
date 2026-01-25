import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@shared/schema";
import { eq, asc, sql } from "drizzle-orm";
import { projectSchema } from "@shared/validations";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const allProjects = await db.select().from(projects)
      .where(eq(projects.userId, user.id))
      .orderBy(sql`CAST(${projects.sortOrder} AS INTEGER)`);
    
    return NextResponse.json(allProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validated = projectSchema.parse(body);

    const [project] = await db.insert(projects).values({
      ...validated,
      userId: user.id,
    }).returning();

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Error creating project:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "Project name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create project" }, { status: 400 });
  }
}
