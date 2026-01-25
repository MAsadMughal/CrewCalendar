"use client";

import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const t = useTranslations("authLayout");
  
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">CrewCalendar</span>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            {t("tagline")}
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            {t("description")}
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <div className="text-3xl font-bold text-white">90+</div>
              <div className="text-blue-200 text-sm">{t("dayVisibility")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">Drag</div>
              <div className="text-blue-200 text-sm">{t("dragAndDrop")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">Teams</div>
              <div className="text-blue-200 text-sm">{t("teamsColorCoded")}</div>
            </div>
          </div>
        </div>
        
        <div className="text-blue-200 text-sm">
          {t("trustedBy")}
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">CrewCalendar</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
