"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, useChangePassword } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Calendar, ChevronRight, Key, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: user, isLoading } = useAuth();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const t = useTranslations("changePasswordPage");
  const tAuth = useTranslations("auth");
  const tProfile = useTranslations("profile");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(tAuth("newPasswordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 6) {
      setError(tAuth("newPasswordMinLength"));
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setSuccess(true);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err) => {
          setError(err.message || t("failedToChangePassword"));
        },
      }
    );
  };

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">CrewCalendar</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Link href="/profile" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              {tProfile("title")}
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span className="text-gray-600 dark:text-gray-300 font-medium">{t("title")}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Key className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              {t("title")}
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
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
              {success && (
                <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-300">
                    {t("passwordChangedSuccess")}
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
                <PasswordInput
                  id="currentPassword"
                  placeholder={t("enterCurrentPassword")}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("newPassword")}</Label>
                <PasswordInput
                  id="newPassword"
                  placeholder={t("enterNewPassword")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-11"
                  showStrength
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("confirmNewPassword")}</Label>
                <div className="relative">
                  <PasswordInput
                    id="confirmPassword"
                    placeholder={t("confirmNewPasswordPlaceholder")}
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
            <CardFooter className="flex justify-between">
              <Link href="/profile">
                <Button variant="outline" type="button">
                  {tCommon("cancel")}
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={changePassword.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {changePassword.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("changing")}
                  </>
                ) : (
                  t("changeButton")
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
