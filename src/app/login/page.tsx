"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLogin, useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const t = useTranslations("auth");

  const message = searchParams.get("message");
  const error = searchParams.get("error");

  const getSuccessMessage = () => {
    switch (message) {
      case "email_verified":
        return t("emailVerifiedSuccess");
      case "already_verified":
        return t("emailAlreadyVerified");
      default:
        return null;
    }
  };

  const getErrorMessage = () => {
    switch (error) {
      case "missing_token":
        return t("verificationLinkInvalid");
      case "invalid_token":
        return t("verificationLinkInvalid");
      case "verification_failed":
        return t("emailVerificationFailed");
      default:
        return null;
    }
  };

  const successMessage = getSuccessMessage();
  const errorMessage = getErrorMessage();

  useEffect(() => {
    if (user && !isAuthLoading) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <AuthLayout>
      <Card className="border-0 shadow-xl">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold">{t("welcomeBack")}</CardTitle>
          <CardDescription>
            {t("signInToAccount")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {successMessage && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}
            {(errorMessage || login.error) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage || login.error?.message || t("invalidCredentials")}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("password")}</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700"
              disabled={login.isPending}
            >
              {login.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("signingIn")}
                </>
              ) : (
                t("signInButton")
              )}
            </Button>
            <p className="text-sm text-center text-gray-600">
              {t("noAccount")}{" "}
              <Link href="/signup" className="text-blue-600 hover:text-blue-500 font-medium">
                {t("createAccount")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
