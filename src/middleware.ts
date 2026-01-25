import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isDev = process.env.NODE_ENV === "development";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  
  const scriptSrc = isDev 
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" 
    : "script-src 'self' 'unsafe-inline'";
  
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self';`
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
