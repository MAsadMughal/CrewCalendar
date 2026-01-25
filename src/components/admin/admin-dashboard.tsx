"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";
import { 
  Edit, 
  Loader2, 
  Shield, 
  Users,
  Activity,
  UserCheck,
  Clock
} from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  loginHistory: string[] | null;
  createdAt: string;
}

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

interface AdminDashboardProps {
  currentUserId: string;
}

export function AdminDashboard({ currentUserId }: AdminDashboardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [togglingUsers, setTogglingUsers] = useState<Set<string>>(new Set());
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");

  const { data, isLoading } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const toggleApproval = async (userId: string, currentStatus: boolean) => {
    setTogglingUsers(prev => new Set(prev).add(userId));
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ 
        title: !currentStatus ? t("accessGranted") : t("accessRevoked"),
        description: !currentStatus ? t("userCanLogIn") : t("userCannotLogIn")
      });
    } catch (error) {
      toast({ title: tCommon("error"), description: t("failedToUpdateAccess"), variant: "destructive" });
    } finally {
      setTogglingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="mt-3 text-gray-500 dark:text-gray-400">{t("loadingDashboard")}</p>
        </div>
      </div>
    );
  }

  const allUsers = data?.users || [];
  const users = allUsers.filter(u => u.id !== currentUserId);
  const totalUsers = users.length;
  const activeToday = users.filter(u => {
    if (!u.lastLoginAt) return false;
    const lastLogin = new Date(u.lastLoginAt);
    const today = new Date();
    return lastLogin.toDateString() === today.toDateString();
  }).length;
  const totalLogins30d = users.reduce((acc, u) => acc + (u.loginHistory?.length || 0), 0);

  const handleEditUser = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("dashboard")}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t("welcomeBack")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("totalUsers")}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{totalUsers}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{t("registeredAccounts")}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("activeToday")}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{activeToday}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{t("usersLoggedInToday")}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("logins30d")}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{totalLogins30d}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{t("totalLoginActivity")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg dark:text-white">
              <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Users className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </div>
              {t("userManagement")}
            </CardTitle>
            <span className="px-3 py-1 text-sm font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full">
              {users.length} {t("users")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-gray-800/80 hover:bg-gray-50/80 dark:hover:bg-gray-800/80">
                <TableHead className="font-semibold text-gray-600 dark:text-gray-300">{t("user")}</TableHead>
                <TableHead className="font-semibold text-gray-600 dark:text-gray-300">{t("role")}</TableHead>
                <TableHead className="font-semibold text-gray-600 dark:text-gray-300 text-center">{t("email")}</TableHead>
                <TableHead className="font-semibold text-gray-600 dark:text-gray-300 text-center">{t("access")}</TableHead>
                <TableHead className="font-semibold text-gray-600 dark:text-gray-300">{t("lastActive")}</TableHead>
                <TableHead className="font-semibold text-gray-600 dark:text-gray-300 text-center">{t("activity")}</TableHead>
                <TableHead className="font-semibold text-gray-600 dark:text-gray-300">{t("joined")}</TableHead>
                <TableHead className="text-right font-semibold text-gray-600 dark:text-gray-300">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-lg ${
                        u.role === "admin" 
                          ? "bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/20" 
                          : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20"
                      }`}>
                        {getInitials(u.name, u.email)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        u.role === "admin"
                          ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {u.role === "admin" && <Shield className="h-3 w-3" />}
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                      u.emailVerified 
                        ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300" 
                        : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                    }`}>
                      {u.emailVerified ? t("verified") : t("pending")}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => toggleApproval(u.id, u.isApproved)}
                      disabled={togglingUsers.has(u.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                        u.isApproved ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                          u.isApproved ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      {u.lastLoginAt
                        ? formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true })
                        : t("never")}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] h-8 px-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                      {u.loginHistory?.length || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.role !== "admin" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(u.id)}
                        className="gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                      >
                        <Edit className="h-4 w-4" />
                        {tCommon("manage")}
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
