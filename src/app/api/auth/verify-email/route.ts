import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function notifyAdminOfVerifiedUser(userName: string, userEmail: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!resendApiKey || !adminEmail) {
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CrewCalendar <onboarding@resend.dev>",
        to: adminEmail,
        subject: "New User Verified - Approval Required",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">CrewCalendar</h1>
              <p style="color: #6b7280; margin-top: 5px;">Admin Notification</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 30px; color: white; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px 0; font-size: 20px;">Email Verified</h2>
              <p style="margin: 0; opacity: 0.9;">A user has verified their email and is waiting for your approval.</p>
            </div>
            
            <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #374151;">User Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 100px;">Name:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500;">${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0;"><span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">Verified</span></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Access:</td>
                  <td style="padding: 8px 0;"><span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">Pending Approval</span></td>
                </tr>
              </table>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Log in to your admin dashboard to approve this user.
            </p>
          </div>
        `,
      }),
    });
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
    }

    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    
    if (!user) {
      return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
    }

    if (user.emailVerified) {
      return NextResponse.redirect(new URL("/login?message=already_verified", request.url));
    }

    await db.update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    notifyAdminOfVerifiedUser(user.name, user.email);

    return NextResponse.redirect(new URL("/login?message=email_verified", request.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/login?error=verification_failed", request.url));
  }
}
