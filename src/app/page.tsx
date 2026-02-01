"use client";

import { useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useDashboard } from "@/hooks/use-dashboard";
import {
  useUpdateProjectOrder,
  useUpdateProject,
} from "@/hooks/use-projects";
import { useUIStore } from "@/stores/ui-store";
import { Navbar } from "@/components/layout/navbar";
import { EmployeePillBar } from "@/components/employees/employee-pill-bar";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { ProjectModal } from "@/components/modals/project-modal";
import { EmployeeModal } from "@/components/modals/employee-modal";
import { HolidayModal } from "@/components/modals/holiday-modal";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import type { Employee } from "@shared/schema";

export default function HomePage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: dashboardData, isLoading: dashboardLoading } = useDashboard();

  const projects = dashboardData?.projects ?? [];
  const employees = dashboardData?.employees ?? [];
  const holidays = dashboardData?.holidays ?? [];
  const bookings = dashboardData?.bookings ?? [];

  const updateProjectOrder = useUpdateProjectOrder();
  const updateProject = useUpdateProject();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);

  const {
    isProjectModalOpen,
    isEmployeeModalOpen,
    isHolidayModalOpen,
    setExpandedProjects,
    selectedEmployeeFilters,
  } = useUIStore();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (projects.length > 0) {
      setExpandedProjects(projects.slice(0, 3).map((p) => p.id));
    }
  }, [projects.length]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const todayColumn = scrollContainerRef.current.querySelector(
        '[data-today="true"]',
      );
      if (todayColumn) {
        todayColumn.scrollIntoView({ behavior: "smooth", inline: "center" });
      }
    }
  }, [dashboardLoading]);

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

  const filteredProjects = useMemo(() =>
    selectedEmployeeFilters.length > 0
      ? projects.filter((p) =>
        (p.assignedEmployees || []).some((empId) =>
          selectedEmployeeFilters.includes(empId),
        ),
      )
      : projects,
    [projects, selectedEmployeeFilters]
  );

  const isLoading = userLoading || (!isAdmin && dashboardLoading);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Navbar user={user} />
        <AdminDashboard currentUserId={user.id} />
      </div>
    );
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="min-h-screen h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <Navbar user={user} />
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
