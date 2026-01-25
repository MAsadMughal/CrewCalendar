"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useProjects, useUpdateProjectOrder, useUpdateProject } from "@/hooks/use-projects";
import { useEmployees } from "@/hooks/use-employees";
import { useHolidays } from "@/hooks/use-holidays";
import { useBookings } from "@/hooks/use-bookings";
import { useUIStore } from "@/stores/ui-store";
import { AdminModeProvider, useAdminMode } from "@/contexts/admin-mode-context";
import { EmployeePillBar } from "@/components/employees/employee-pill-bar";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { ProjectModal } from "@/components/modals/project-modal";
import { EmployeeModal } from "@/components/modals/employee-modal";
import { HolidayModal } from "@/components/modals/holiday-modal";
import { Button } from "@/components/ui/button";
import { ShareModal } from "@/components/modals/share-modal";
import { ArrowLeft, Calendar, ChevronRight, Loader2, Shield, Undo2, Share2 } from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Employee } from "@shared/schema";

function AdminUserEditContent() {
  const router = useRouter();
  const adminMode = useAdminMode();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { data: holidays = [], isLoading: holidaysLoading } = useHolidays();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings();
  const updateProjectOrder = useUpdateProjectOrder();
  const updateProject = useUpdateProject();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tNavbar = useTranslations("navbar");

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const {
    isProjectModalOpen,
    isEmployeeModalOpen,
    isHolidayModalOpen,
    setExpandedProjects,
    selectedEmployeeFilters,
  } = useUIStore();

  useEffect(() => {
    if (projects.length > 0) {
      setExpandedProjects(projects.slice(0, 3).map((p) => p.id));
    }
  }, [projects.length]);

  useEffect(() => {
    if (scrollContainerRef.current && !projectsLoading) {
      const todayColumn = scrollContainerRef.current.querySelector(
        '[data-today="true"]'
      );
      if (todayColumn) {
        todayColumn.scrollIntoView({ behavior: "smooth", inline: "center" });
      }
    }
  }, [projectsLoading]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "employee") {
      const employee = employees.find((e) => e.id === active.id);
      if (employee) setActiveEmployee(employee);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEmployee(null);

    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === "employee") {
      if (overType === "project-drop" || overType === "project") {
        const employeeId = active.id as string;
        const projectId =
          overType === "project-drop"
            ? (over.data.current?.projectId as string)
            : (over.id as string);
        const project = projects.find((p) => p.id === projectId);

        if (
          project &&
          !(project.assignedEmployees || []).includes(employeeId)
        ) {
          updateProject.mutate({
            id: projectId,
            assignedEmployees: [
              ...(project.assignedEmployees || []),
              employeeId,
            ],
          });
        }
      }
      return;
    }

    if (activeType === "project" && overType === "project") {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);

      if (oldIndex !== newIndex) {
        const newOrder = arrayMove(projects, oldIndex, newIndex);
        updateProjectOrder.mutate(newOrder.map((p) => p.id));
      }
    }
  };

  const filteredProjects =
    selectedEmployeeFilters.length > 0
      ? projects.filter((p) =>
          (p.assignedEmployees || []).some((empId) =>
            selectedEmployeeFilters.includes(empId)
          )
        )
      : projects;

  const isLoading =
    projectsLoading || employeesLoading || holidaysLoading || bookingsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="min-h-screen h-screen flex flex-col bg-gray-50 overflow-hidden">
        <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">CrewCalendar</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <Link href="/admin" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <Shield className="h-4 w-4 text-purple-600" />
              {tNavbar("admin")}
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900">{adminMode?.targetUserName}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              {t("shareUsersCalendar")}
            </Button>
            {adminMode && adminMode.undoStack.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => adminMode.popUndo()}
                disabled={adminMode.isUndoing}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                {tCommon("undo")} ({adminMode.undoStack.length})
              </Button>
            )}
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("backToAdmin")}
              </Button>
            </Link>
          </div>
        </nav>

        <EmployeePillBar employees={employees} />

        <div className="flex-1 flex overflow-hidden">
          <SortableContext
            items={filteredProjects.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div ref={scrollContainerRef} className="flex-1 flex overflow-auto">
              <ProjectSidebar
                projects={filteredProjects}
                employees={employees}
                bookings={bookings}
              />
              <CalendarGrid
                projects={filteredProjects}
                employees={employees}
                holidays={holidays}
                bookings={bookings}
              />
            </div>
          </SortableContext>
        </div>

        {isProjectModalOpen && <ProjectModal />}
        {isEmployeeModalOpen && <EmployeeModal />}
        {isHolidayModalOpen && <HolidayModal />}

        {adminMode && (
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            userId={adminMode.targetUserId}
            userName={adminMode.targetUserName}
            isAdmin={true}
          />
        )}

        <DragOverlay>
          {activeEmployee && (
            <div
              className="px-3 py-1.5 rounded-full text-white text-sm font-medium shadow-lg"
              style={{ backgroundColor: activeEmployee.teamColor }}
            >
              {activeEmployee.name}
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

export default function AdminUserEditPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { data: authUser, isLoading: authLoading } = useAuth();

  const { data: userData, isLoading: userDataLoading } = useQuery({
    queryKey: ["admin-user-info", userId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!authUser && authUser.role === "admin",
  });

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push("/login");
    } else if (!authLoading && authUser && authUser.role !== "admin") {
      router.push("/");
    }
  }, [authUser, authLoading, router]);

  if (authLoading || userDataLoading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <AdminModeProvider
      targetUserId={userId}
      targetUserName={userData.user?.email || "Unknown User"}
    >
      <AdminUserEditContent />
    </AdminModeProvider>
  );
}
