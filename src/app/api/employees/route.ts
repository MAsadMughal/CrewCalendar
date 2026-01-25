import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@shared/schema";
import { eq } from "drizzle-orm";
import { employeeSchema } from "@shared/validations";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const allEmployees = await db.select().from(employees)
      .where(eq(employees.userId, user.id));
    
    return NextResponse.json(allEmployees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validated = employeeSchema.parse(body);

    const [employee] = await db.insert(employees).values({
      ...validated,
      userId: user.id,
    }).returning();

    return NextResponse.json(employee);
  } catch (error: any) {
    console.error("Error creating employee:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "Employee name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create employee" }, { status: 400 });
  }
}
