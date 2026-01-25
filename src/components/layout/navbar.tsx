"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Calendar, LogOut, Shield, User, Key, ChevronDown, Share2, Sun, Moon, Globe } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-auth";
import { ShareModal } from "@/components/modals/share-modal";
import { useLocale } from "@/i18n/provider";
import { locales, localeNames, type Locale } from "@/i18n/config";
import type { User as UserType } from "@shared/schema";

interface NavbarProps {
  user: UserType | { id: string; name: string; email: string; role: string } | null | undefined;
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

export function Navbar({ user }: NavbarProps) {
  const logout = useLogout();
  const [isOpen, setIsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const t = useTranslations("navbar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="p-1.5 bg-blue-600 rounded-lg">
          <Calendar className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">CrewCalendar</h1>
      </Link>
      
      <div className="flex items-center gap-3">
        {user && (
          <>
            {user.role === "admin" && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-2">
                  <Shield className="h-4 w-4" />
                  {t("adminPanel")}
                </Button>
              </Link>
            )}

            {user.role !== "admin" && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setIsShareModalOpen(true)}
              >
                <Share2 className="h-4 w-4" />
                {t("share")}
              </Button>
            )}

            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm text-gray-700 dark:text-gray-300"
              >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{localeNames[locale]}</span>
              </button>
              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  {locales.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setLocale(loc);
                        setIsLangOpen(false);
                      }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
                        locale === loc
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {localeNames[loc]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                  {getInitials(user.name, user.email)}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.name || user.email}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    {user.role === "admin" && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Shield className="h-3 w-3" />
                        {t("admin")}
                      </span>
                    )}
                  </div>
                  
                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    {t("profile")}
                  </Link>
                  
                  <Link
                    href="/change-password"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Key className="h-4 w-4" />
                    {t("changePassword")}
                  </Link>

                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {mounted && theme === "dark" ? t("lightMode") : t("darkMode")}
                  </button>
                  
                  <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        logout.mutate();
                      }}
                      disabled={logout.isPending}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {logout.isPending ? t("signingOut") : t("signOut")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        {!user && (
          <Link href="/login">
            <Button size="sm">
              {t("signIn")}
            </Button>
          </Link>
        )}
      </div>

      {user && user.role !== "admin" && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          userId={user.id}
          userName={user.name}
        />
      )}
    </nav>
  );
}
