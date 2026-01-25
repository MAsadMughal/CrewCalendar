import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { signupSchema } from "@shared/validations";

function generateVerificationToken(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}

async function sendVerificationEmail(userName: string, userEmail: string, token: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.log("Verification email skipped: RESEND_API_KEY not configured");
    return false;
  }

  const baseUrl = process.env.APP_BASE_URL 
    || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null)
    || 'http://localhost:5000';
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CrewCalendar <onboarding@resend.dev>",
        to: userEmail,
        subject: "Verify your email - CrewCalendar",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">CrewCalendar</h1>
              <p style="color: #6b7280; margin-top: 5px;">Email Verification</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); border-radius: 12px; padding: 30px; color: white; margin-bottom: 20px; text-align: center;">
              <h2 style="margin: 0 0 10px 0; font-size: 20px;">Welcome, ${userName}!</h2>
              <p style="margin: 0; opacity: 0.9;">Please verify your email to complete registration.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Verify Email Address</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              After verification, an admin will review your account for approval.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              If you didn't create this account, you can ignore this email.
            </p>
          </div>
        `,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
}

async function sendAdminNotificationEmail(userName: string, userEmail: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!resendApiKey || !adminEmail) {
    console.log("Admin notification skipped: RESEND_API_KEY or ADMIN_EMAIL not configured");
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CrewCalendar <onboarding@resend.dev>",
        to: adminEmail,
        subject: "New User Registration - Approval Required",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">CrewCalendar</h1>
              <p style="color: #6b7280; margin-top: 5px;">Admin Notification</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); border-radius: 12px; padding: 30px; color: white; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px 0; font-size: 20px;">New User Registration</h2>
              <p style="margin: 0; opacity: 0.9;">A new user has registered and is waiting for your approval.</p>
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
                  <td style="padding: 8px 0; color: #6b7280;">Status:</td>
                  <td style="padding: 8px 0;"><span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">Pending Approval</span></td>
                </tr>
              </table>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Log in to your admin dashboard to approve or deny this request.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This is an automated message from CrewCalendar.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send admin notification email:", await response.text());
    }
  } catch (error) {
    console.error("Error sending admin notification email:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const rateLimitKey = `signup:${ip}`;
    const rateCheck = checkRateLimit(rateLimitKey);
    
    if (!rateCheck.allowed) {
      const minutesRemaining = Math.ceil(rateCheck.resetInMs / 60000);
      return NextResponse.json(
        { error: `Too many signup attempts. Please try again in ${minutesRemaining} minutes.` },
        { status: 429 }
      );
    }

    const body = await request.json();

    if (body.role === "admin") {
      return NextResponse.json(
        { error: "Invalid registration request" },
        { status: 400 }
      );
    }

    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;

    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const verificationToken = generateVerificationToken();

    await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role: "user",
      isApproved: false,
      emailVerified: false,
      emailVerificationToken: verificationToken,
    });

    const emailSent = await sendVerificationEmail(name, email, verificationToken);
    
    if (emailSent) {
      return NextResponse.json({
        message: "Account created! Please check your email to verify your address.",
        pendingVerification: true,
      });
    } else {
      sendAdminNotificationEmail(name, email);
      return NextResponse.json({
        message: "Account created successfully. Please wait for admin approval before logging in.",
        pendingApproval: true,
      });
    }
  } catch (error: any) {
    console.error("Signup error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
