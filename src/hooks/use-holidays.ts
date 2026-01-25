"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Holiday, InsertHoliday } from "@shared/schema";
import type { HolidayFormData } from "@shared/validations";
import { useToast } from "./use-toast";
import { useAdminMode } from "@/contexts/admin-mode-context";

export function useHolidays() {
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useQuery<Holiday[]>({
    queryKey: isAdmin ? ["admin-holidays", targetUserId] : ["holidays"],
    queryFn: async () => {
      const url = isAdmin 
        ? `/api/admin/proxy/holidays?userId=${targetUserId}`
        : "/api/holidays";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch holidays");
      return res.json();
    },
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;
  const pushUndo = adminMode?.pushUndo;

  return useMutation({
    mutationFn: async (data: HolidayFormData) => {
      const url = isAdmin ? "/api/admin/proxy/holidays" : "/api/holidays";
      const body = isAdmin ? { ...data, userId: targetUserId } : data;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create holiday");
      }
      return res.json();
    },
    onSuccess: (newHoliday) => {
      const queryKey = isAdmin ? ["admin-holidays", targetUserId] : ["holidays"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ["admin-bookings", targetUserId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
      }
      toast({ title: "Holiday created successfully" });
      
      if (isAdmin && pushUndo) {
        pushUndo({
          description: `Created holiday "${newHoliday.name}"`,
          undoFn: async () => {
            await fetch(`/api/admin/proxy/holidays/${newHoliday.id}`, { method: "DELETE" });
            queryClient.invalidateQueries({ queryKey });
          },
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InsertHoliday> & { id: string }) => {
      const url = isAdmin 
        ? `/api/admin/proxy/holidays/${id}`
        : `/api/holidays/${id}`;
      
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update holiday");
      }
      return res.json();
    },
    onSuccess: () => {
      const queryKey = isAdmin ? ["admin-holidays", targetUserId] : ["holidays"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
      toast({ title: "Holiday updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useMutation({
    mutationFn: async (id: string) => {
      const url = isAdmin 
        ? `/api/admin/proxy/holidays/${id}`
        : `/api/holidays/${id}`;
      
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete holiday");
      return res.json();
    },
    onSuccess: () => {
      const queryKey = isAdmin ? ["admin-holidays", targetUserId] : ["holidays"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
      toast({ title: "Holiday deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
