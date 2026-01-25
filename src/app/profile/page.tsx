"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, useUpdateProfile, useLogout } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, ChevronRight, Key, LogOut, Loader2, CheckCircle2, User, Mail, Shield, Clock } from "lucide-react";

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: user, isLoading } = useAuth();
  const updateProfile = useUpdateProfile();
  const logout = useLogout();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const t = useTranslations("profile");
  const tNavbar = useTranslations("navbar");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    updateProfile.mutate({ name, email }, {
      onSuccess: () => setSuccess(true),
    });
  };

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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">CrewCalendar</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span className="text-gray-600 dark:text-gray-300 font-medium">{t("title")}</span>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              {t("backToDashboard")}
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
              {getInitials(user.name, user.email)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
              <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                {t("accountInformation")}
              </CardTitle>
              <CardDescription className="dark:text-gray-400">{t("updateProfileDetails")}</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {success && (
                  <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-300">
                      {t("profileUpdatedSuccess")}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("fullName")}</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  disabled={updateProfile.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    t("saveChanges")
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Key className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                {t("security")}
              </CardTitle>
              <CardDescription className="dark:text-gray-400">{t("securityDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/change-password">
                <Button variant="outline" className="gap-2">
                  <Key className="h-4 w-4" />
                  {tNavbar("changePassword")}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                {t("accountDetails")}
              </CardTitle>
              <CardDescription className="dark:text-gray-400">{t("accountDetailsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t("role")}</span>
                  </div>
                  <p className="font-medium capitalize dark:text-white">{user.role}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t("memberSince")}</span>
                  </div>
                  <p className="font-medium dark:text-white">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t("lastLogin")}</span>
                  </div>
                  <p className="font-medium dark:text-white">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900 dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <LogOut className="h-5 w-5" />
                {t("signOutTitle")}
              </CardTitle>
              <CardDescription className="dark:text-gray-400">{t("signOutDescription")}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                variant="destructive"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                {logout.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tNavbar("signingOut")}
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    {tNavbar("signOut")}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
