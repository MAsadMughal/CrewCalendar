"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useResetPassword } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, XCircle } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const resetPassword = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const t = useTranslations("resetPassword");
  const tAuth = useTranslations("auth");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(tAuth("passwordsDoNotMatch"));
      return;
    }

    if (password.length < 6) {
      setError(tAuth("passwordMinLength"));
      return;
    }

    if (!token) {
      setError(t("invalidLink"));
      return;
    }

    resetPassword.mutate({ token, password }, {
      onSuccess: () => setSuccess(true),
      onError: (err) => setError(err.message || t("failedToResetPassword")),
    });
  };

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  if (!token) {
    return (
      <AuthLayout>
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-4 pb-4 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold">{t("invalidLink")}</CardTitle>
            <CardDescription className="text-base">
              {t("linkExpired")}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-3">
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700">
                {t("requestNewLink")}
              </Button>
            </Link>
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tAuth("signInButton")}
            </Link>
          </CardFooter>
        </Card>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout>
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-4 pb-4 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">{t("passwordResetSuccess")}</CardTitle>
            <CardDescription className="text-base">
              {t("passwordResetSuccessDescription")}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700">
                {tAuth("signInButton")}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="border-0 shadow-xl">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">{t("newPassword")}</Label>
              <PasswordInput
                id="password"
                placeholder={t("enterNewPassword")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-11"
                showStrength
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{tAuth("confirmPassword")}</Label>
              <div className="relative">
                <PasswordInput
                  id="confirmPassword"
                  placeholder={t("confirmNewPassword")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-11"
                />
                {passwordsMatch && (
                  <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700"
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("resetting")}
                </>
              ) : (
                t("resetButton")
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
