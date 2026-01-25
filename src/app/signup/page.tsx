"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignup, useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const signup = useSignup();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const t = useTranslations("auth");

  useEffect(() => {
    if (user && !isAuthLoading) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("passwordMinLength"));
      return;
    }

    signup.mutate({ name, email, password });
  };

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

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
          <CardTitle className="text-2xl font-bold">{t("createAccountTitle")}</CardTitle>
          <CardDescription>
            {t("getStarted")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {(error || signup.error) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error || signup.error?.message || t("failedToCreateAccount")}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">{t("fullName")}</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="h-11"
              />
            </div>
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
              <Label htmlFor="password">{t("password")}</Label>
              <PasswordInput
                id="password"
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-11"
                showStrength
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <div className="relative">
                <PasswordInput
                  id="confirmPassword"
                  placeholder={t("confirmPassword")}
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
              disabled={signup.isPending}
            >
              {signup.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("creatingAccount")}
                </>
              ) : (
                t("createAccount")
              )}
            </Button>
            <p className="text-sm text-center text-gray-600">
              {t("hasAccount")}{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                {t("signInButton")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
}
