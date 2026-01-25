import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shareLinks, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import crypto from "crypto";
import { z } from "zod";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const createShareLinkSchema = z.object({
  name: z.string().max(255, "Name is too long").optional(),
  userId: z.string().min(1, "User ID is required").optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    let userShareLinks;
    
    if (user.role === "admin" && targetUserId) {
      userShareLinks = await db
        .select({
          id: shareLinks.id,
          token: shareLinks.token,
          name: shareLinks.name,
          userId: shareLinks.userId,
          createdBy: shareLinks.createdBy,
          expiresAt: shareLinks.expiresAt,
          createdAt: shareLinks.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(shareLinks)
        .leftJoin(users, eq(shareLinks.userId, users.id))
        .where(eq(shareLinks.userId, targetUserId))
        .orderBy(shareLinks.createdAt);
    } else if (user.role === "admin") {
      userShareLinks = await db
        .select({
          id: shareLinks.id,
          token: shareLinks.token,
          name: shareLinks.name,
          userId: shareLinks.userId,
          createdBy: shareLinks.createdBy,
          expiresAt: shareLinks.expiresAt,
          createdAt: shareLinks.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(shareLinks)
        .leftJoin(users, eq(shareLinks.userId, users.id))
        .orderBy(shareLinks.createdAt);
    } else {
      userShareLinks = await db
        .select({
          id: shareLinks.id,
          token: shareLinks.token,
          name: shareLinks.name,
          userId: shareLinks.userId,
          createdBy: shareLinks.createdBy,
          expiresAt: shareLinks.expiresAt,
          createdAt: shareLinks.createdAt,
        })
        .from(shareLinks)
        .where(eq(shareLinks.userId, user.id))
        .orderBy(shareLinks.createdAt);
    }

    return NextResponse.json(userShareLinks);
  } catch (error) {
    console.error("Error fetching share links:", error);
    return NextResponse.json({ error: "Failed to fetch share links" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    
    const validation = createShareLinkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, userId, expiresAt } = validation.data;
    
    let targetUserId = user.id;
    if (userId && user.role === "admin") {
      const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!targetUser) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 });
      }
      targetUserId = userId;
    } else if (userId && userId !== user.id) {
      return NextResponse.json({ error: "Not authorized to create links for other users" }, { status: 403 });
    }

    if (name) {
      const existingLink = await db
        .select()
        .from(shareLinks)
        .where(and(eq(shareLinks.userId, targetUserId), eq(shareLinks.name, name)));
      
      if (existingLink.length > 0) {
        return NextResponse.json(
          { error: "A share link with this name already exists" },
          { status: 409 }
        );
      }
    }

    const token = generateToken();
    const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;

    const [shareLink] = await db
      .insert(shareLinks)
      .values({
        token,
        name: name || null,
        userId: targetUserId,
        createdBy: user.id,
        expiresAt: parsedExpiresAt,
      })
      .returning();

    return NextResponse.json(shareLink);
  } catch (error: any) {
    console.error("Error creating share link:", error);
    return NextResponse.json({ error: error.message || "Failed to create share link" }, { status: 400 });
  }
}
