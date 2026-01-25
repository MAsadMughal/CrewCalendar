"use client";

import { useState } from "react";
import Link from "next/link";
import { useForgotPassword } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const t = useTranslations("forgotPassword");
  const tAuth = useTranslations("auth");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPassword.mutate({ email }, {
      onSuccess: () => setSubmitted(true),
    });
  };

  if (submitted) {
    return (
      <AuthLayout>
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-4 pb-4 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">{t("checkYourEmail")}</CardTitle>
            <CardDescription className="text-base">
              {t("sentPasswordResetLink")}<br />
              <span className="font-medium text-gray-900">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                {t("checkSpamFolder")}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full h-11">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("backToSignIn")}
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              {t("tryDifferentEmail")}
            </button>
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
            <div className="space-y-2">
              <Label htmlFor="email">{tAuth("email")}</Label>
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700"
              disabled={forgotPassword.isPending}
            >
              {forgotPassword.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                t("sendResetLink")
              )}
            </Button>
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToSignIn")}
            </Link>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
}
