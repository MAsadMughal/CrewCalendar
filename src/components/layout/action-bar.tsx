"use client";

import { Plus, Users, FolderKanban, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";

export function ActionBar() {
  const { openEmployeeModal, openProjectModal, openHolidayModal } = useUIStore();
  const t = useTranslations("sidebar");

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
      <Button 
        size="sm" 
        onClick={() => openEmployeeModal()}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        <Users className="h-4 w-4" />
        {t("employee")}
      </Button>
      
      <Button 
        size="sm" 
        onClick={() => openProjectModal()}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        <FolderKanban className="h-4 w-4" />
        {t("project")}
      </Button>
      
      <Button 
        size="sm" 
        onClick={() => openHolidayModal()}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        <Calendar className="h-4 w-4" />
        {t("holiday")}
      </Button>
    </div>
  );
}
