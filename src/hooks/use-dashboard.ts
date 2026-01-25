"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { Project, Employee, Holiday, Booking } from "@shared/schema";
import { useAdminMode } from "@/contexts/admin-mode-context";
import { useCallback } from "react";

interface DashboardData {
  projects: Project[];
  employees: Employee[];
  holidays: Holiday[];
  bookings: Booking[];
}

export function useDashboard() {
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useQuery<DashboardData>({
    queryKey: isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"],
    queryFn: async () => {
      const url = isAdmin
        ? `/api/admin/proxy/dashboard?userId=${targetUserId}`
        : "/api/dashboard";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
}

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useCallback(() => {
    const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
    queryClient.invalidateQueries({ queryKey: dashboardKey });
    
    const projectsKey = isAdmin ? ["admin-projects", targetUserId] : ["projects"];
    const employeesKey = isAdmin ? ["admin-employees", targetUserId] : ["employees"];
    const holidaysKey = isAdmin ? ["admin-holidays", targetUserId] : ["holidays"];
    const bookingsKey = isAdmin ? ["admin-bookings", targetUserId] : ["bookings"];
    
    queryClient.invalidateQueries({ queryKey: projectsKey });
    queryClient.invalidateQueries({ queryKey: employeesKey });
    queryClient.invalidateQueries({ queryKey: holidaysKey });
    queryClient.invalidateQueries({ queryKey: bookingsKey });
  }, [queryClient, isAdmin, targetUserId]);
}
